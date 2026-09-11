using System.Security.Cryptography;
using System.Text.Json;
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

        // 3. Parse Rows with MiniExcel
        memoryStream.Position = 0;
        List<IDictionary<string, object>> rawRows;
        try
        {
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            var excelType = ext == ".csv" ? ExcelType.CSV : ExcelType.XLSX;
            rawRows = memoryStream.Query(useHeaderRow: true, excelType: excelType)
                .Select(r => (IDictionary<string, object>)r)
                .ToList();
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
                        ErrorMessage = "ไฟล์ไม่มีข้อมูลแถวสำหรับประมวลผล",
                        ErrorCode = "EMPTY_FILE"
                    }
                }
            };
        }

        // 4. Create Batch Entity
        var batch = new AttendanceImportBatch
        {
            FileName = fileName,
            FileHash = fileHash,
            FileData = fileBytes,
            Source = string.IsNullOrWhiteSpace(source) ? "EXCEL" : source.Trim(),
            DeviceName = deviceName?.Trim(),
            ImportedByUserId = importedByUserId,
            ImportedAt = DateTime.UtcNow,
            Status = "IMPORTED"
        };
        _context.AttendanceImportBatches.Add(batch);
        await _context.SaveChangesAsync(cancellationToken);

        // 5. Preload Employees and Assignments for Fast O(1) Lookup
        var employees = await _context.Employees
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var empByCode = new Dictionary<string, Employee>(StringComparer.OrdinalIgnoreCase);
        foreach (var emp in employees)
        {
            if (!string.IsNullOrWhiteSpace(emp.EmployeeCode))
            {
                empByCode[emp.EmployeeCode.Trim()] = emp;
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

        // 6. Process Rows
        int totalRecords = rawRows.Count;
        int successRecords = 0;
        int failedRecords = 0;
        DateOnly? minDate = null;
        DateOnly? maxDate = null;

        var errorsList = new List<AttendanceImportError>();
        var errorDtos = new List<AttendanceImportErrorDto>();

        // In-memory collection of AttendanceDaily for updating / creating
        var dailyDict = new Dictionary<(long EmployeeId, DateOnly WorkDate), AttendanceDaily>();

        for (int i = 0; i < rawRows.Count; i++)
        {
            int rowNumber = i + 2; // 1-indexed, skipping header row
            var row = rawRows[i];

            string rawRowJson = JsonSerializer.Serialize(row);

            // Extract fields using flexible keys
            var empCodeRaw = GetStringValue(row, "employeecode", "empcode", "badgeno", "userid", "employeeid", "empid", "รหัสพนักงาน", "รหัส", "เลขประจำตัว");
            var empNameRaw = GetStringValue(row, "employeename", "name", "empname", "ชื่อพนักงาน", "ชื่อ", "ชื่อสกุล", "ชื่อนามสกุล");
            var deptRaw = GetStringValue(row, "department", "dept", "แผนก", "ฝ่าย");
            var dateRaw = GetValue(row, "workdate", "date", "วันที่", "วันที่ทำงาน");
            var timeRaw = GetValue(row, "punchtime", "timestamp", "datetime", "time", "เวลา", "เวลาสแกน", "วันเวลา");
            var stateRaw = GetStringValue(row, "punchstate", "state", "type", "inout", "status", "สถานะ", "ประเภท", "ประเภทการสแกน", "การเข้าออก");
            var timeInRaw = GetValue(row, "timein", "checkin", "in", "เวลาเข้า", "เวลาเข้างาน", "เข้างาน");
            var timeOutRaw = GetValue(row, "timeout", "checkout", "out", "เวลาออก", "เวลาเลิกงาน", "ออกงาน");

            // Validation 1: Employee Code
            if (string.IsNullOrWhiteSpace(empCodeRaw))
            {
                failedRecords++;
                AddError(batch.Id, rowNumber, rawRowJson, "ไม่พบข้อมูลรหัสพนักงานในแถวนี้", "MISSING_EMPLOYEE_CODE", empCodeRaw, empNameRaw, deptRaw, null, stateRaw, errorsList, errorDtos);
                continue;
            }

            if (!empByCode.TryGetValue(empCodeRaw.Trim(), out var employee))
            {
                failedRecords++;
                AddError(batch.Id, rowNumber, rawRowJson, $"ไม่พบรหัสพนักงาน '{empCodeRaw.Trim()}' ในฐานข้อมูลระบบ", "EMPLOYEE_NOT_FOUND", empCodeRaw, empNameRaw, deptRaw, null, stateRaw, errorsList, errorDtos);
                continue;
            }

            // Fill employee info from DB if missing in row
            var empName = !string.IsNullOrWhiteSpace(empNameRaw) ? empNameRaw : $"{employee.FirstName} {employee.LastName}".Trim();
            var deptName = !string.IsNullOrWhiteSpace(deptRaw) 
                ? deptRaw 
                : (currentAssignments.TryGetValue(employee.Id, out var asg) ? asg.Department?.DepartmentName : null);

            // Validation 2: Parse WorkDate
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
                    workDate = DateOnly.FromDateTime(parsedDt.Value);
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
                // Format B: Two distinct columns for In and Out
                if (timeInRaw != null)
                {
                    punchInUtc = ParseTimeToUtc(timeInRaw, workDate);
                }
                if (timeOutRaw != null)
                {
                    punchOutUtc = ParseTimeToUtc(timeOutRaw, workDate);
                }
            }
            else if (timeRaw != null)
            {
                // Format A: Single punch time with state/type
                var punchUtc = ParseTimeToUtc(timeRaw, workDate);
                if (punchUtc.HasValue)
                {
                    var punchType = DeterminePunchType(stateRaw, punchUtc.Value);
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
                // Check if already in DB
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

                    // Resolve shift assignment
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

            // Resolve shift for calculation if not attached
            var activeShift = dailyRecord.Shift ?? ResolveShiftForEmployee(employeeShifts, employee.Id, workDate);

            // Merge punch times
            if (punchInUtc.HasValue)
            {
                if (!dailyRecord.ActualIn.HasValue || punchInUtc.Value < dailyRecord.ActualIn.Value)
                {
                    dailyRecord.ActualIn = punchInUtc.Value;
                }
            }

            if (punchOutUtc.HasValue)
            {
                if (!dailyRecord.ActualOut.HasValue || punchOutUtc.Value > dailyRecord.ActualOut.Value)
                {
                    dailyRecord.ActualOut = punchOutUtc.Value;
                }
            }

            dailyRecord.IsAbsent = false;

            // Recalculate late, early, worked hours, and status
            AttendanceDailyService.RecalculateAttendance(dailyRecord, activeShift);

            successRecords++;
        }

        // 7. Save errors and batch updates
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
        var sampleRows = new[]
        {
            new
            {
                รหัสพนักงาน = "EMP001",
                ชื่อพนักงาน = "สมชาย ใจดี",
                แผนก = "ฝ่ายพัฒนาซอฟต์แวร์",
                วันที่ = "2026-10-06",
                เวลา = "08:30:00",
                ประเภทการสแกน = "เข้า",
                หมายเหตุ = "เวลาสแกนเข้างานปกติ (IN)"
            },
            new
            {
                รหัสพนักงาน = "EMP001",
                ชื่อพนักงาน = "สมชาย ใจดี",
                แผนก = "ฝ่ายพัฒนาซอฟต์แวร์",
                วันที่ = "2026-10-06",
                เวลา = "17:35:00",
                ประเภทการสแกน = "ออก",
                หมายเหตุ = "เวลาสแกนออกงานปกติ (OUT)"
            },
            new
            {
                รหัสพนักงาน = "EMP002",
                ชื่อพนักงาน = "สมหญิง สดใส",
                แผนก = "ฝ่ายบุคคล",
                วันที่ = "2026-10-06",
                เวลา = "08:45:00",
                ประเภทการสแกน = "เข้า",
                หมายเหตุ = "ตัวอย่างการสแกนเข้างานสาย"
            },
            new
            {
                รหัสพนักงาน = "EMP002",
                ชื่อพนักงาน = "สมหญิง สดใส",
                แผนก = "ฝ่ายบุคคล",
                วันที่ = "2026-10-06",
                เวลา = "17:30:00",
                ประเภทการสแกน = "ออก",
                หมายเหตุ = "ตัวอย่างการสแกนออกงานปกติ"
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

    private static string? GetStringValue(IDictionary<string, object> row, params string[] candidates)
    {
        var val = GetValue(row, candidates);
        if (val == null) return null;
        var s = val.ToString()?.Trim();
        return string.IsNullOrWhiteSpace(s) ? null : s;
    }

    private static object? GetValue(IDictionary<string, object> row, params string[] candidates)
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
            return DateOnly.FromDateTime(dt);
        }

        var str = val.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(str)) return null;

        var formats = new[] { "yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "yyyy/MM/dd", "d-M-yyyy", "dd-MM-yyyy" };
        if (DateOnly.TryParseExact(str, formats, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d))
        {
            return d;
        }

        if (DateTime.TryParse(str, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedDt))
        {
            return DateOnly.FromDateTime(parsedDt);
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
            if (dt.TimeOfDay != TimeSpan.Zero)
            {
                var local = new DateTime(workDate.Year, workDate.Month, workDate.Day, dt.Hour, dt.Minute, dt.Second);
                return AttendanceDailyService.ToUtcTime(local);
            }
        }

        if (val is TimeSpan ts)
        {
            var local = new DateTime(workDate.Year, workDate.Month, workDate.Day, ts.Hours, ts.Minutes, ts.Seconds);
            return AttendanceDailyService.ToUtcTime(local);
        }

        var str = val.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(str)) return null;

        var timeFormats = new[] { "HH:mm:ss", "HH:mm", "H:mm:ss", "H:mm", "h:mm tt", "hh:mm tt" };

        // Try time-only formats first
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

        // Check if string contains full datetime
        if (DateTime.TryParse(str, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var fullDt) && fullDt.TimeOfDay != TimeSpan.Zero)
        {
            var local = new DateTime(workDate.Year, workDate.Month, workDate.Day, fullDt.Hour, fullDt.Minute, fullDt.Second);
            return AttendanceDailyService.ToUtcTime(local);
        }

        return null;
    }

    private static string DeterminePunchType(string? stateRaw, DateTime punchUtc)
    {
        if (!string.IsNullOrWhiteSpace(stateRaw))
        {
            var s = stateRaw.Trim().ToLowerInvariant();
            if (s.Contains("in") || s.Contains("เข้า") || s == "0" || s.Contains("checkin"))
            {
                return "IN";
            }
            if (s.Contains("out") || s.Contains("ออก") || s == "1" || s.Contains("checkout"))
            {
                return "OUT";
            }
        }

        // Fallback based on Thai local hour
        var localTime = AttendanceDailyService.ToThaiLocalTime(punchUtc);
        return localTime.Hour < 12 ? "IN" : "OUT";
    }
}
