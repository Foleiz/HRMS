using ExcelDataReader;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using MiniExcelLibs;
using ShiftEntity = Hrms.Domain.Entities.Shift;

namespace Hrms.Application.Features.Attendance.Services;

public class AttendanceImportService : IAttendanceImportService
{
    private readonly IHrmsDbContext _context;

    public AttendanceImportService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<AttendanceImportResultDto> ImportFileAsync(
        Stream fileStream,
        string fileName,
        string? source,
        string? deviceName,
        bool allowDuplicate,
        long? importedByUserId = null,
        CancellationToken cancellationToken = default)
    {
        // 1. Read Stream and Compute SHA-256 Hash
        using var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream, cancellationToken);
        var fileBytes = memoryStream.ToArray();

        var hashBytes = SHA256.HashData(fileBytes);
        var fileHash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        // 2. Check Duplicate File Hash
        var existingBatch = await _context.AttendanceImportBatches
            .AsNoTracking()
            .Include(b => b.ImportedByUser)
            .FirstOrDefaultAsync(b => b.FileHash == fileHash, cancellationToken);

        if (existingBatch != null && !allowDuplicate)
        {
            var uName = existingBatch.ImportedByUser?.Username ?? "ผู้ดูแลระบบ";
            return new AttendanceImportResultDto
            {
                BatchId = existingBatch.Id,
                FileName = fileName,
                FileHash = fileHash,
                Source = existingBatch.Source ?? source ?? "EXCEL",
                TotalRecords = existingBatch.TotalRecords ?? 0,
                SuccessRecords = existingBatch.SuccessRecords ?? 0,
                FailedRecords = existingBatch.FailedRecords ?? 0,
                Status = existingBatch.Status,
                DateFrom = existingBatch.DateFrom?.ToString("yyyy-MM-dd"),
                DateTo = existingBatch.DateTo?.ToString("yyyy-MM-dd"),
                IsDuplicate = true,
                Errors = new List<AttendanceImportErrorDto>
                {
                    new AttendanceImportErrorDto
                    {
                        RowNumber = 0,
                        ErrorMessage = $"ไฟล์นี้เคยถูกนำเข้าแล้วเมื่อ {existingBatch.ImportedAt:dd/MM/yyyy HH:mm} น. โดย {uName} (Batch #{existingBatch.Id}) หากต้องการนำเข้าใหม่ กรุณาเลือก 'อนุญาตให้อัปโหลดซ้ำ'",
                        ErrorCode = "DUPLICATE_FILE"
                    }
                }
            };
        }

        // 3. Read All Rows Dynamically with ExcelDataReader (supports .xls, .xlsx, .csv)
        memoryStream.Position = 0;
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        List<IDictionary<string, object?>> allRawRows = new();

        try
        {
            System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

            using var reader = ext == ".csv"
                ? ExcelReaderFactory.CreateCsvReader(memoryStream, new ExcelReaderConfiguration { FallbackEncoding = System.Text.Encoding.UTF8 })
                : ExcelReaderFactory.CreateReader(memoryStream);

            while (reader.Read())
            {
                var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                for (int col = 0; col < reader.FieldCount; col++)
                {
                    var val = reader.GetValue(col);
                    string colKey = GetColumnName(col);
                    row[colKey] = val;
                }
                allRawRows.Add(row);
            }
        }
        catch (Exception ex)
        {
            return new AttendanceImportResultDto
            {
                BatchId = 0,
                FileName = fileName,
                FileHash = fileHash,
                Source = source ?? "EXCEL",
                TotalRecords = 0,
                SuccessRecords = 0,
                FailedRecords = 0,
                Status = "FAILED",
                Errors = new List<AttendanceImportErrorDto>
                {
                    new AttendanceImportErrorDto
                    {
                        RowNumber = 0,
                        ErrorMessage = $"ไม่สามารถอ่านโครงสร้างไฟล์ได้: {ex.Message}",
                        ErrorCode = "PARSE_ERROR"
                    }
                }
            };
        }

        if (allRawRows.Count == 0)
        {
            return new AttendanceImportResultDto
            {
                BatchId = 0,
                FileName = fileName,
                FileHash = fileHash,
                Source = source ?? "EXCEL",
                TotalRecords = 0,
                SuccessRecords = 0,
                FailedRecords = 0,
                Status = "FAILED",
                Errors = new List<AttendanceImportErrorDto>
                {
                    new AttendanceImportErrorDto
                    {
                        RowNumber = 0,
                        ErrorMessage = "ไฟล์ไม่มีข้อมูลแถวสำหรับประมวลผล",
                        ErrorCode = "EMPTY_FILE"
                    }
                }
            };
        }

        // 4. Dynamic Header Row Detection & Metadata Extraction (Syaco & Biometric Exports)
        int headerRowIndex = -1;
        string? extractedUnit = null;
        DateOnly? metadataDateFrom = null;
        DateOnly? metadataDateTo = null;
        DateTime? metadataExportedAt = null;

        for (int r = 0; r < Math.Min(15, allRawRows.Count); r++)
        {
            var row = allRawRows[r];
            var cellValues = row.Values
                .Where(v => v != null && !string.IsNullOrWhiteSpace(v.ToString()))
                .Select(v => v!.ToString()!.Trim())
                .ToList();

            if (cellValues.Count == 0) continue;

            bool hasEmpCode = cellValues.Any(IsEmpCodeHeader);
            bool hasOtherHeader = cellValues.Any(IsOtherHeader);

            if (hasEmpCode && (hasOtherHeader || cellValues.Count >= 3))
            {
                headerRowIndex = r;
                break;
            }
        }

        if (headerRowIndex == -1)
        {
            headerRowIndex = 0; // Fallback
        }

        // Scan rows before headerRowIndex for metadata (e.g. unit: Syaco date from: 2026-08-03 to ...)
        for (int r = 0; r < headerRowIndex; r++)
        {
            var text = string.Join(" ", allRawRows[r].Values
                .Where(v => v != null)
                .Select(v => v!.ToString()));

            if (string.IsNullOrWhiteSpace(text)) continue;

            var unitMatch = Regex.Match(text, @"unit\s*:\s*([^\s]+)", RegexOptions.IgnoreCase);
            if (unitMatch.Success && string.IsNullOrWhiteSpace(extractedUnit))
            {
                extractedUnit = unitMatch.Groups[1].Value.Trim();
            }

            var dateRangeMatch = Regex.Match(text, @"date\s+from\s*:\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})(?:\s+[\d:]+)?\s+to\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2})", RegexOptions.IgnoreCase);
            if (dateRangeMatch.Success)
            {
                if (DateOnly.TryParse(dateRangeMatch.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture, out var df))
                    metadataDateFrom = df;
                if (DateOnly.TryParse(dateRangeMatch.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture, out var dt))
                    metadataDateTo = dt;
            }

            var printMatch = Regex.Match(text, @"print\s*:\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)", RegexOptions.IgnoreCase);
            if (printMatch.Success)
            {
                if (DateTime.TryParse(printMatch.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var prDt))
                    metadataExportedAt = AttendanceDailyService.ToUtcTime(prDt);
            }
        }

        // Map column indices to actual header names
        var headerRow = allRawRows[headerRowIndex];
        var colKeyToHeaderName = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var kvp in headerRow)
        {
            if (kvp.Value != null)
            {
                var hStr = kvp.Value.ToString()?.Trim();
                if (!string.IsNullOrWhiteSpace(hStr))
                {
                    colKeyToHeaderName[kvp.Key] = hStr;
                }
            }
        }

        // Build data rows
        var rawRows = new List<(int RowNumber, IDictionary<string, object?> Data)>();
        for (int r = headerRowIndex + 1; r < allRawRows.Count; r++)
        {
            var row = allRawRows[r];
            var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            bool hasData = false;

            foreach (var kvp in row)
            {
                if (kvp.Value != null && !string.IsNullOrWhiteSpace(kvp.Value.ToString()))
                {
                    hasData = true;
                }
                if (colKeyToHeaderName.TryGetValue(kvp.Key, out var headerName))
                {
                    dict[headerName] = kvp.Value;
                }
                else
                {
                    dict[kvp.Key] = kvp.Value;
                }
            }

            if (hasData)
            {
                rawRows.Add((r + 1, dict));
            }
        }

        if (rawRows.Count == 0)
        {
            return new AttendanceImportResultDto
            {
                BatchId = 0,
                FileName = fileName,
                FileHash = fileHash,
                Source = source ?? "EXCEL",
                TotalRecords = 0,
                SuccessRecords = 0,
                FailedRecords = 0,
                Status = "FAILED",
                Errors = new List<AttendanceImportErrorDto>
                {
                    new AttendanceImportErrorDto
                    {
                        RowNumber = 0,
                        ErrorMessage = "ไม่พบรายการข้อมูลบันทึกเวลาที่สามารถประมวลผลได้หลังจากแถวหัวตาราง",
                        ErrorCode = "NO_DATA_ROWS"
                    }
                }
            };
        }

        // 5. Create Batch Entity
        var resolvedSource = !string.IsNullOrWhiteSpace(source) 
            ? source.Trim() 
            : (!string.IsNullOrWhiteSpace(extractedUnit) ? "FINGERPRINT" : "EXCEL");

        var batch = new AttendanceImportBatch
        {
            FileName = fileName,
            FileHash = fileHash,
            FileData = fileBytes,
            Source = resolvedSource,
            DeviceName = !string.IsNullOrWhiteSpace(deviceName) ? deviceName.Trim() : extractedUnit,
            UnitName = extractedUnit,
            DateFrom = metadataDateFrom,
            DateTo = metadataDateTo,
            ExportedAt = metadataExportedAt,
            ImportedByUserId = importedByUserId,
            ImportedAt = DateTime.UtcNow,
            Status = "IMPORTED"
        };
        _context.AttendanceImportBatches.Add(batch);
        await _context.SaveChangesAsync(cancellationToken);

        // 6. Preload Employees and Assignments for Fast O(1) Lookup
        var employees = await _context.Employees
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var empByCode = new Dictionary<string, Employee>(StringComparer.OrdinalIgnoreCase);
        var empByNumericCode = new Dictionary<string, Employee>(StringComparer.OrdinalIgnoreCase);
        var empByName = new Dictionary<string, Employee>(StringComparer.OrdinalIgnoreCase);

        foreach (var emp in employees)
        {
            if (!string.IsNullOrWhiteSpace(emp.EmployeeCode))
            {
                var c = emp.EmployeeCode.Trim();
                empByCode[c] = emp;

                var digits = new string(c.Where(char.IsDigit).ToArray());
                if (!string.IsNullOrEmpty(digits))
                {
                    empByNumericCode[digits] = emp;
                    if (int.TryParse(digits, out int numVal))
                    {
                        empByNumericCode[numVal.ToString()] = emp;
                    }
                }
            }

            var fullName = $"{emp.FirstName} {emp.LastName}".Trim();
            var normalizedName = NormalizeThaiName(fullName);
            if (!string.IsNullOrEmpty(normalizedName))
            {
                empByName[normalizedName] = emp;
            }
        }

        var currentAssignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Where(ea => ea.IsCurrent)
            .ToDictionaryAsync(ea => ea.EmployeeId, cancellationToken);

        var employeeShifts = await _context.EmployeeShifts
            .AsNoTracking()
            .Include(es => es.Shift)
            .ToListAsync(cancellationToken);

        // 7. Process Rows
        int totalRecords = rawRows.Count;
        int successRecords = 0;
        int failedRecords = 0;
        DateOnly? minDate = metadataDateFrom;
        DateOnly? maxDate = metadataDateTo;

        var errorsList = new List<AttendanceImportError>();
        var errorDtos = new List<AttendanceImportErrorDto>();

        // In-memory collection of AttendanceDaily for updating / creating
        var dailyDict = new Dictionary<(long EmployeeId, DateOnly WorkDate), AttendanceDaily>();

        for (int i = 0; i < rawRows.Count; i++)
        {
            var (rowNumber, row) = rawRows[i];
            string rawRowJson = JsonSerializer.Serialize(row);

            // Extract fields using flexible keys
            var empCodeRaw = GetStringValue(row, "employeecode", "empcode", "badgeno", "userid", "employeeid", "empid", "รหัสพนักงาน", "รหัส", "เลขประจำตัว");
            var empNameRaw = GetStringValue(row, "employeename", "name", "empname", "ชื่อพนักงาน", "ชื่อ", "ชื่อสกุล", "ชื่อนามสกุล", "ชื่อ-สกุล");
            var deptRaw = GetStringValue(row, "department", "dept", "แผนก", "ฝ่าย", "แผนก-ฝ่าย.", "แผนกฝ่าย.", "แผนกฝ่าย", "แผนก-ฝ่าย");
            var dateRaw = GetValue(row, "workdate", "date", "วันที่", "วันที่ทำงาน", "วันที่-เวลา", "วันที่เวลา", "วันที่และเวลา");
            var timeRaw = GetValue(row, "punchtime", "timestamp", "datetime", "time", "เวลา", "เวลาสแกน", "วันเวลา", "วันที่-เวลา", "วันที่เวลา", "วันที่และเวลา");
            var stateRaw = GetStringValue(row, "punchstate", "state", "type", "inout", "status", "สถานะ", "ประเภท", "ประเภทการสแกน", "การเข้าออก");
            var timeInRaw = GetValue(row, "timein", "checkin", "in", "เวลาเข้า", "เวลาเข้างาน", "เข้างาน");
            var timeOutRaw = GetValue(row, "timeout", "checkout", "out", "เวลาออก", "เวลาเลิกงาน", "ออกงาน");
            var deviceRaw = GetStringValue(row, "เครื่อง", "ชื่อเครื่อง", "อุปกรณ์", "เครื่องสแกน", "device", "devicename", "machine");
            var remarkRaw = GetStringValue(row, "ประมวลผล", "การประมวลผล", "หมายเหตุ", "remark", "processed");

            // Skip sub-headers / empty separator rows (e.g. unit subheadings where code & time are null)
            if (string.IsNullOrWhiteSpace(empCodeRaw) && string.IsNullOrWhiteSpace(empNameRaw) && dateRaw == null && timeRaw == null)
            {
                totalRecords--;
                continue;
            }

            // If batch device name is empty and row has device, set it
            if (string.IsNullOrWhiteSpace(batch.DeviceName) && !string.IsNullOrWhiteSpace(deviceRaw))
            {
                batch.DeviceName = deviceRaw.Trim();
            }

            // Employee Matching (Multi-level: Code -> Numeric Suffix -> Full Name)
            Employee? employee = null;
            if (!string.IsNullOrWhiteSpace(empCodeRaw))
            {
                var cleanCode = empCodeRaw.Trim();
                if (empByCode.TryGetValue(cleanCode, out employee))
                {
                    // direct code match
                }
                else if (empByNumericCode.TryGetValue(cleanCode, out employee))
                {
                    // numeric code match (e.g. "001" -> EMP001)
                }
                else if (cleanCode.All(char.IsDigit) && int.TryParse(cleanCode, out int nId))
                {
                    if (empByCode.TryGetValue($"EMP{cleanCode}", out employee) ||
                        empByCode.TryGetValue($"EMP{nId:D3}", out employee))
                    {
                        // prefix match
                    }
                }
                else
                {
                    var digitsOnly = new string(cleanCode.Where(char.IsDigit).ToArray());
                    if (!string.IsNullOrEmpty(digitsOnly) && empByNumericCode.TryGetValue(digitsOnly, out employee))
                    {
                        // digits only match
                    }
                }
            }

            // Fallback match by Name
            if (employee == null && !string.IsNullOrWhiteSpace(empNameRaw))
            {
                var cleanName = NormalizeThaiName(empNameRaw);
                if (empByName.TryGetValue(cleanName, out employee))
                {
                    // name matched
                }
            }

            if (employee == null)
            {
                failedRecords++;
                AddError(batch.Id, rowNumber, rawRowJson, 
                    $"ไม่พบข้อมูลพนักงานสำหรับรหัส '{empCodeRaw}' {(string.IsNullOrWhiteSpace(empNameRaw) ? "" : $"หรือชื่อ '{empNameRaw}'")} ในระบบ", 
                    "EMPLOYEE_NOT_FOUND", empCodeRaw, empNameRaw, deptRaw, null, stateRaw, errorsList, errorDtos);
                continue;
            }

            var empName = !string.IsNullOrWhiteSpace(empNameRaw) ? empNameRaw : $"{employee.FirstName} {employee.LastName}".Trim();
            var deptName = !string.IsNullOrWhiteSpace(deptRaw) 
                ? deptRaw 
                : (currentAssignments.TryGetValue(employee.Id, out var asg) ? asg.Department?.DepartmentName : null);

            // Parse WorkDate
            DateOnly workDate;
            if (dateRaw != null)
            {
                var parsedDate = ParseDate(dateRaw);
                if (parsedDate.HasValue)
                {
                    workDate = parsedDate.Value;
                }
                else
                {
                    failedRecords++;
                    AddError(batch.Id, rowNumber, rawRowJson, $"รูปแบบวันที่ไม่ถูกต้อง: '{dateRaw}'", "INVALID_DATE", empCodeRaw, empName, deptName, dateRaw.ToString(), stateRaw, errorsList, errorDtos);
                    continue;
                }
            }
            else if (timeRaw != null)
            {
                var parsedDt = ParseDateTime(timeRaw);
                if (parsedDt.HasValue)
                {
                    var y = parsedDt.Value.Year > 2400 ? parsedDt.Value.Year - 543 : parsedDt.Value.Year;
                    workDate = new DateOnly(y, parsedDt.Value.Month, parsedDt.Value.Day);
                }
                else
                {
                    failedRecords++;
                    AddError(batch.Id, rowNumber, rawRowJson, "ไม่สามารถระบุวันที่จากข้อมูลเวลาที่ให้มาได้", "INVALID_DATE", empCodeRaw, empName, deptName, timeRaw.ToString(), stateRaw, errorsList, errorDtos);
                    continue;
                }
            }
            else
            {
                failedRecords++;
                AddError(batch.Id, rowNumber, rawRowJson, "ไม่พบคอลัมน์วันที่หรือเวลาในแถวนี้", "MISSING_DATE_TIME", empCodeRaw, empName, deptName, null, stateRaw, errorsList, errorDtos);
                continue;
            }

            // Update Date Range
            if (!minDate.HasValue || workDate < minDate.Value) minDate = workDate;
            if (!maxDate.HasValue || workDate > maxDate.Value) maxDate = workDate;

            // Determine In/Out times
            DateTime? punchInUtc = null;
            DateTime? punchOutUtc = null;

            if (timeInRaw != null || timeOutRaw != null)
            {
                if (timeInRaw != null) punchInUtc = ParseTimeToUtc(timeInRaw, workDate);
                if (timeOutRaw != null) punchOutUtc = ParseTimeToUtc(timeOutRaw, workDate);
            }
            else if (timeRaw != null)
            {
                var punchUtc = ParseTimeToUtc(timeRaw, workDate);
                if (punchUtc.HasValue)
                {
                    var punchType = DeterminePunchType(stateRaw, remarkRaw, punchUtc.Value);
                    if (punchType == "IN")
                    {
                        punchInUtc = punchUtc;
                    }
                    else
                    {
                        punchOutUtc = punchUtc;
                    }
                }
                else
                {
                    failedRecords++;
                    AddError(batch.Id, rowNumber, rawRowJson, $"รูปแบบเวลาไม่ถูกต้อง: '{timeRaw}'", "INVALID_TIME", empCodeRaw, empName, deptName, timeRaw.ToString(), stateRaw, errorsList, errorDtos);
                    continue;
                }
            }
            else
            {
                failedRecords++;
                AddError(batch.Id, rowNumber, rawRowJson, "ไม่พบข้อมูลเวลาสแกนในแถวนี้", "MISSING_TIME", empCodeRaw, empName, deptName, null, stateRaw, errorsList, errorDtos);
                continue;
            }

            // Fetch or create AttendanceDaily
            var key = (employee.Id, workDate);
            if (!dailyDict.TryGetValue(key, out var dailyRecord))
            {
                dailyRecord = await _context.AttendanceDailies
                    .Include(a => a.Shift)
                    .FirstOrDefaultAsync(a => a.EmployeeId == employee.Id && a.WorkDate == workDate, cancellationToken);

                if (dailyRecord == null)
                {
                    dailyRecord = new AttendanceDaily
                    {
                        EmployeeId = employee.Id,
                        WorkDate = workDate,
                        IsAbsent = false,
                        Status = "PRESENT"
                    };

                    var shift = ResolveShiftForEmployee(employeeShifts, employee.Id, workDate);
                    if (shift != null)
                    {
                        dailyRecord.ShiftId = shift.Id;
                        AttendanceDailyService.PopulateScheduledTimes(dailyRecord, shift, workDate);
                    }

                    _context.AttendanceDailies.Add(dailyRecord);
                }

                dailyDict[key] = dailyRecord;
            }

            var activeShift = dailyRecord.Shift ?? ResolveShiftForEmployee(employeeShifts, employee.Id, workDate);

            // Merge punch times (Smart Earliest = In, Latest = Out)
            var currentPunchUtc = punchInUtc ?? punchOutUtc;
            if (currentPunchUtc.HasValue)
            {
                if (!dailyRecord.ActualIn.HasValue)
                {
                    dailyRecord.ActualIn = currentPunchUtc.Value;
                }
                else if (currentPunchUtc.Value < dailyRecord.ActualIn.Value)
                {
                    if (!dailyRecord.ActualOut.HasValue)
                    {
                        dailyRecord.ActualOut = dailyRecord.ActualIn.Value;
                    }
                    dailyRecord.ActualIn = currentPunchUtc.Value;
                }
                else if (currentPunchUtc.Value > dailyRecord.ActualIn.Value)
                {
                    if (!dailyRecord.ActualOut.HasValue || currentPunchUtc.Value > dailyRecord.ActualOut.Value)
                    {
                        dailyRecord.ActualOut = currentPunchUtc.Value;
                    }
                }
            }

            if (dailyRecord.ActualIn.HasValue && dailyRecord.ActualOut.HasValue && dailyRecord.ActualIn.Value > dailyRecord.ActualOut.Value)
            {
                var temp = dailyRecord.ActualIn.Value;
                dailyRecord.ActualIn = dailyRecord.ActualOut.Value;
                dailyRecord.ActualOut = temp;
            }

            dailyRecord.IsAbsent = false;

            // Recalculate late, early, worked hours, and status
            AttendanceDailyService.RecalculateAttendance(dailyRecord, activeShift);

            successRecords++;
        }

        // 8. Save errors and batch updates
        if (errorsList.Count > 0)
        {
            _context.AttendanceImportErrors.AddRange(errorsList);
        }

        batch.TotalRecords = totalRecords;
        batch.SuccessRecords = successRecords;
        batch.FailedRecords = failedRecords;
        batch.DateFrom = minDate;
        batch.DateTo = maxDate;
        batch.Status = failedRecords == 0 ? "IMPORTED" : (successRecords > 0 ? "PARTIAL" : "FAILED");

        await _context.SaveChangesAsync(cancellationToken);

        return new AttendanceImportResultDto
        {
            BatchId = batch.Id,
            FileName = fileName,
            FileHash = fileHash,
            Source = batch.Source ?? "EXCEL",
            TotalRecords = totalRecords,
            SuccessRecords = successRecords,
            FailedRecords = failedRecords,
            Status = batch.Status,
            DateFrom = minDate?.ToString("yyyy-MM-dd"),
            DateTo = maxDate?.ToString("yyyy-MM-dd"),
            IsDuplicate = false,
            Errors = errorDtos
        };
    }

    public async Task<PagedImportBatchResult> GetBatchesAsync(AttendanceImportBatchFilterQuery query, CancellationToken cancellationToken = default)
    {
        var q = _context.AttendanceImportBatches
            .AsNoTracking()
            .Include(b => b.ImportedByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Source))
        {
            q = q.Where(b => b.Source == query.Source.Trim());
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            q = q.Where(b => b.Status == query.Status.Trim());
        }

        if (query.StartDate.HasValue)
        {
            q = q.Where(b => b.DateFrom >= query.StartDate.Value || (b.DateTo != null && b.DateTo >= query.StartDate.Value));
        }

        if (query.EndDate.HasValue)
        {
            q = q.Where(b => b.DateTo <= query.EndDate.Value || (b.DateFrom != null && b.DateFrom <= query.EndDate.Value));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(b => (b.FileName != null && b.FileName.ToLower().Contains(s)) ||
                             (b.DeviceName != null && b.DeviceName.ToLower().Contains(s)) ||
                             (b.UnitName != null && b.UnitName.ToLower().Contains(s)) ||
                             (b.Source != null && b.Source.ToLower().Contains(s)));
        }

        var total = await q.CountAsync(cancellationToken);

        var page = query.Page > 0 ? query.Page : 1;
        var pageSize = query.PageSize > 0 ? query.PageSize : 20;

        var items = await q.OrderByDescending(b => b.ImportedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new AttendanceImportBatchDto
            {
                Id = b.Id,
                FileName = b.FileName,
                FileHash = b.FileHash,
                Source = b.Source,
                DeviceName = b.DeviceName,
                UnitName = b.UnitName,
                DateFrom = b.DateFrom.HasValue ? b.DateFrom.Value.ToString("yyyy-MM-dd") : null,
                DateTo = b.DateTo.HasValue ? b.DateTo.Value.ToString("yyyy-MM-dd") : null,
                ImportedByUserId = b.ImportedByUserId,
                ImportedByUserName = b.ImportedByUser != null ? b.ImportedByUser.Username : null,
                ImportedAt = b.ImportedAt,
                TotalRecords = b.TotalRecords ?? 0,
                SuccessRecords = b.SuccessRecords ?? 0,
                FailedRecords = b.FailedRecords ?? 0,
                Status = b.Status
            })
            .ToListAsync(cancellationToken);

        return new PagedImportBatchResult
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AttendanceImportBatchDto?> GetBatchByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var b = await _context.AttendanceImportBatches
            .AsNoTracking()
            .Include(x => x.ImportedByUser)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (b == null) return null;

        return new AttendanceImportBatchDto
        {
            Id = b.Id,
            FileName = b.FileName,
            FileHash = b.FileHash,
            Source = b.Source,
            DeviceName = b.DeviceName,
            UnitName = b.UnitName,
            DateFrom = b.DateFrom?.ToString("yyyy-MM-dd"),
            DateTo = b.DateTo?.ToString("yyyy-MM-dd"),
            ImportedByUserId = b.ImportedByUserId,
            ImportedByUserName = b.ImportedByUser?.Username,
            ImportedAt = b.ImportedAt,
            TotalRecords = b.TotalRecords ?? 0,
            SuccessRecords = b.SuccessRecords ?? 0,
            FailedRecords = b.FailedRecords ?? 0,
            Status = b.Status
        };
    }

    public async Task<PagedImportErrorResult> GetBatchErrorsAsync(long batchId, int page = 1, int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var q = _context.AttendanceImportErrors
            .AsNoTracking()
            .Where(e => e.ImportBatchId == batchId)
            .OrderBy(e => e.RowNumber);

        var total = await q.CountAsync(cancellationToken);
        var p = page > 0 ? page : 1;
        var ps = pageSize > 0 ? pageSize : 50;

        var items = await q.Skip((p - 1) * ps).Take(ps)
            .Select(e => new AttendanceImportErrorDto
            {
                Id = e.Id,
                ImportBatchId = e.ImportBatchId,
                RowNumber = e.RowNumber,
                RawRowData = e.RawRowData,
                ErrorMessage = e.ErrorMessage,
                ErrorCode = e.ErrorCode,
                EmployeeCode = e.EmployeeCode,
                EmployeeName = e.EmployeeName,
                DepartmentName = e.DepartmentName,
                RawPunchTimestamp = e.RawPunchTimestamp,
                DevicePunchState = e.DevicePunchState,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedImportErrorResult
        {
            Items = items,
            TotalCount = total,
            Page = p,
            PageSize = ps
        };
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> GenerateTemplateAsync(string format = "xlsx", CancellationToken cancellationToken = default)
    {
        var sampleRows = new List<Dictionary<string, object?>>
        {
            new Dictionary<string, object?>
            {
                ["รหัส"] = "EMP001",
                ["ชื่อ-สกุล"] = "ธนพล สิริโภคินทร์",
                ["แผนก-ฝ่าย."] = "ฝ่ายบริหาร",
                ["วันที่-เวลา"] = "2026-08-03 08:25:00",
                ["สถานะ"] = "เข้า",
                ["ลงเวลาด้วย"] = "สแกนใบหน้า",
                ["การตรวจอุณหภูมิ"] = "ปกติ",
                ["เครื่อง"] = "Syaco",
                ["ประมวลผล"] = "สำเร็จ"
            },
            new Dictionary<string, object?>
            {
                ["รหัส"] = "EMP001",
                ["ชื่อ-สกุล"] = "ธนพล สิริโภคินทร์",
                ["แผนก-ฝ่าย."] = "ฝ่ายบริหาร",
                ["วันที่-เวลา"] = "2026-08-03 17:35:00",
                ["สถานะ"] = "ออก",
                ["ลงเวลาด้วย"] = "สแกนใบหน้า",
                ["การตรวจอุณหภูมิ"] = "ปกติ",
                ["เครื่อง"] = "Syaco",
                ["ประมวลผล"] = "สำเร็จ"
            },
            new Dictionary<string, object?>
            {
                ["รหัส"] = "EMP002",
                ["ชื่อ-สกุล"] = "พิมพ์ใจ กิตติพาณิชย์",
                ["แผนก-ฝ่าย."] = "ฝ่ายบุคคล",
                ["วันที่-เวลา"] = "2026-08-03 08:45:00",
                ["สถานะ"] = "เข้า",
                ["ลงเวลาด้วย"] = "ลายนิ้วมือ",
                ["การตรวจอุณหภูมิ"] = "ปกติ",
                ["เครื่อง"] = "Syaco",
                ["ประมวลผล"] = "สำเร็จ"
            },
            new Dictionary<string, object?>
            {
                ["รหัส"] = "EMP002",
                ["ชื่อ-สกุล"] = "พิมพ์ใจ กิตติพาณิชย์",
                ["แผนก-ฝ่าย."] = "ฝ่ายบุคคล",
                ["วันที่-เวลา"] = "2026-08-03 17:30:00",
                ["สถานะ"] = "ออก",
                ["ลงเวลาด้วย"] = "ลายนิ้วมือ",
                ["การตรวจอุณหภูมิ"] = "ปกติ",
                ["เครื่อง"] = "Syaco",
                ["ประมวลผล"] = "สำเร็จ"
            }
        };

        using var ms = new MemoryStream();
        await ms.SaveAsAsync(sampleRows, cancellationToken: cancellationToken);
        var bytes = ms.ToArray();

        return (bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "attendance_import_template.xlsx");
    }

    // ---------------------------------------------------------
    // Helper Methods
    // ---------------------------------------------------------

    private static bool IsEmpCodeHeader(string text)
    {
        var norm = NormalizeHeader(text);
        return norm is "รหัส" or "รหัสพนักงาน" or "เลขประจำตัว" or "employeecode" or "empcode" or "badgeno" or "userid" or "empid" or "employeeid";
    }

    private static bool IsOtherHeader(string text)
    {
        var norm = NormalizeHeader(text);
        return norm is "ชื่อ" or "ชื่อสกุล" or "ชื่อนามสกุล" or "ชื่อพนักงาน" or "ชื่อสกุล"
            or "แผนก" or "ฝ่าย" or "แผนกฝ่าย" or "แผนกฝ่าย."
            or "วันที่" or "เวลา" or "วันที่เวลา" or "สถานะ" or "ประเภท" or "ลงเวลาด้วย" or "เครื่อง" or "การตรวจอุณหภูมิ"
            or "name" or "department" or "date" or "time" or "status";
    }

    private static string NormalizeThaiName(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return string.Empty;
        return name.Trim()
            .Replace(" ", "")
            .Replace("นาย", "")
            .Replace("นางสาว", "")
            .Replace("น.ส.", "")
            .Replace("นาง", "")
            .Replace("คุณ", "")
            .Replace("ด.ช.", "")
            .Replace("ด.ญ.", "")
            .ToLowerInvariant();
    }

    private static ShiftEntity? ResolveShiftForEmployee(List<EmployeeShift> employeeShifts, long employeeId, DateOnly workDate)
    {
        return employeeShifts
            .Where(es => es.EmployeeId == employeeId && es.EffectiveFrom <= workDate && (es.EffectiveTo == null || es.EffectiveTo >= workDate))
            .OrderByDescending(es => es.EffectiveFrom)
            .Select(es => es.Shift)
            .FirstOrDefault();
    }

    private static void AddError(
        long batchId,
        int rowNumber,
        string rawJson,
        string message,
        string code,
        string? empCode,
        string? empName,
        string? dept,
        string? punchRaw,
        string? state,
        List<AttendanceImportError> errorEntities,
        List<AttendanceImportErrorDto> errorDtos)
    {
        var entity = new AttendanceImportError
        {
            ImportBatchId = batchId,
            RowNumber = rowNumber,
            RawRowData = rawJson,
            ErrorMessage = message,
            ErrorCode = code,
            EmployeeCode = empCode,
            EmployeeName = empName,
            DepartmentName = dept,
            RawPunchTimestamp = punchRaw,
            DevicePunchState = state,
            CreatedAt = DateTime.UtcNow
        };
        errorEntities.Add(entity);

        errorDtos.Add(new AttendanceImportErrorDto
        {
            ImportBatchId = batchId,
            RowNumber = rowNumber,
            RawRowData = rawJson,
            ErrorMessage = message,
            ErrorCode = code,
            EmployeeCode = empCode,
            EmployeeName = empName,
            DepartmentName = dept,
            RawPunchTimestamp = punchRaw,
            DevicePunchState = state,
            CreatedAt = DateTime.UtcNow
        });
    }

    private static string? GetStringValue(IDictionary<string, object?> row, params string[] candidates)
    {
        var val = GetValue(row, candidates);
        if (val == null) return null;
        var s = val.ToString()?.Trim();
        return string.IsNullOrWhiteSpace(s) ? null : s;
    }

    private static object? GetValue(IDictionary<string, object?> row, params string[] candidates)
    {
        foreach (var key in row.Keys)
        {
            var normalizedKey = NormalizeHeader(key);
            foreach (var cand in candidates)
            {
                if (normalizedKey == NormalizeHeader(cand))
                {
                    return row[key];
                }
            }
        }
        return null;
    }

        private static string GetColumnName(int index)
    {
        string name = "";
        while (index >= 0)
        {
            name = (char)('A' + (index % 26)) + name;
            index = (index / 26) - 1;
        }
        return name;
    }

private static string NormalizeHeader(string header)
    {
        return header.Trim().ToLowerInvariant()
            .Replace(" ", "")
            .Replace("_", "")
            .Replace("-", "")
            .Replace(".", "")
            .Replace(":", "");
    }

    private static DateOnly? ParseDate(object val)
    {
        if (val is DateTime dt)
        {
            var y = dt.Year > 2400 ? dt.Year - 543 : dt.Year;
            return new DateOnly(y, dt.Month, dt.Day);
        }

        var str = val.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(str)) return null;

        if (DateTime.TryParse(str, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedDt))
        {
            var y = parsedDt.Year > 2400 ? parsedDt.Year - 543 : parsedDt.Year;
            return new DateOnly(y, parsedDt.Month, parsedDt.Day);
        }

        var formats = new[] { "yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "yyyy/MM/dd", "d-M-yyyy", "dd-MM-yyyy", "yyyy-MM-dd HH:mm:ss", "dd/MM/yyyy HH:mm:ss", "yyyy-MM-dd HH:mm", "dd/MM/yyyy HH:mm" };
        if (DateTime.TryParseExact(str, formats, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dtExact))
        {
            var y = dtExact.Year > 2400 ? dtExact.Year - 543 : dtExact.Year;
            return new DateOnly(y, dtExact.Month, dtExact.Day);
        }

        return null;
    }

    private static DateTime? ParseDateTime(object val)
    {
        if (val is DateTime dt)
        {
            return dt;
        }

        var str = val.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(str)) return null;

        if (DateTime.TryParse(str, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedDt))
        {
            return parsedDt;
        }

        return null;
    }

    private static DateTime? ParseTimeToUtc(object val, DateOnly workDate)
    {
        if (val is DateTime dt)
        {
            var local = new DateTime(workDate.Year, workDate.Month, workDate.Day, dt.Hour, dt.Minute, dt.Second);
            return AttendanceDailyService.ToUtcTime(local);
        }

        if (val is TimeSpan ts)
        {
            var local = new DateTime(workDate.Year, workDate.Month, workDate.Day, ts.Hours, ts.Minutes, ts.Seconds);
            return AttendanceDailyService.ToUtcTime(local);
        }

        var str = val.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(str)) return null;

        // Check if string contains full datetime like "2026-08-03 08:25:00"
        if (DateTime.TryParse(str, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var fullDt))
        {
            var local = new DateTime(workDate.Year, workDate.Month, workDate.Day, fullDt.Hour, fullDt.Minute, fullDt.Second);
            return AttendanceDailyService.ToUtcTime(local);
        }

        var timeFormats = new[] { "HH:mm:ss", "HH:mm", "H:mm:ss", "H:mm", "h:mm tt", "hh:mm tt" };
        if (TimeOnly.TryParseExact(str, timeFormats, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var timeOnly))
        {
            var local = new DateTime(workDate.Year, workDate.Month, workDate.Day, timeOnly.Hour, timeOnly.Minute, timeOnly.Second);
            return AttendanceDailyService.ToUtcTime(local);
        }

        if (TimeOnly.TryParse(str, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var timeFallback))
        {
            var local = new DateTime(workDate.Year, workDate.Month, workDate.Day, timeFallback.Hour, timeFallback.Minute, timeFallback.Second);
            return AttendanceDailyService.ToUtcTime(local);
        }

        return null;
    }

    private static string DeterminePunchType(string? stateRaw, string? remarkRaw, DateTime punchUtc)
    {
        var combined = $"{(stateRaw ?? "")} {(remarkRaw ?? "")}".Trim().ToLowerInvariant();
        if (combined.Contains("cin") || combined.Contains("c/in") || combined.Contains("checkin") || combined.Contains("เข้า") || combined.Contains(" in") || combined.StartsWith("in"))
        {
            return "IN";
        }
        if (combined.Contains("cout") || combined.Contains("c/out") || combined.Contains("checkout") || combined.Contains("ออก") || combined.Contains(" out") || combined.StartsWith("out") || combined.Contains("early"))
        {
            return "OUT";
        }

        var localTime = AttendanceDailyService.ToThaiLocalTime(punchUtc);
        return localTime.Hour < 12 ? "IN" : "OUT";
    }
}
