using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using ExcelDataReader;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Commission.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using MiniExcelLibs;

namespace Hrms.Application.Features.Commission.Services;

public class CommissionService : ICommissionService
{
    private readonly IHrmsDbContext _context;

    public CommissionService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<CommissionPeriodSummaryDto> GetCommissionPeriodAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        var records = await _context.EmployeeCommissions
            .Include(c => c.Employee)
                .ThenInclude(e => e.Assignments.Where(a => a.IsCurrent))
                    .ThenInclude(a => a.Department)
            .Include(c => c.Employee)
                .ThenInclude(e => e.Assignments.Where(a => a.IsCurrent))
                    .ThenInclude(a => a.Position)
            .Where(c => c.Year == year && c.Month == month)
            .OrderBy(c => c.Employee != null ? c.Employee.EmployeeCode : "")
            .ToListAsync(cancellationToken);

        var dtos = records.Select(MapToDto).ToList();
        var defaultRate = dtos.Count > 0 ? dtos[0].CommissionRate : 3.00m;
        var periodStatus = dtos.Count == 0 ? "DRAFT" : dtos.All(r => r.Status == "PAID") ? "PAID" : dtos.Any(r => r.Status == "CONFIRMED") ? "CONFIRMED" : "DRAFT";

        return new CommissionPeriodSummaryDto
        {
            Year = year,
            Month = month,
            TotalEmployees = dtos.Count,
            TotalSalesAmount = dtos.Sum(r => r.SalesAmount),
            TotalCommissionAmount = dtos.Sum(r => r.TotalCommission),
            DefaultRate = defaultRate > 0 ? defaultRate : 3.00m,
            Status = periodStatus,
            Records = dtos
        };
    }

    /// <summary>
    /// พรีวิวไฟล์ค่าคอมมิชชั่น ตรวจจับรูปแบบอัตโนมัติ (ทั้งเดือน, วันเดียว, หรือช่วงวัน) และคำนวณรายการที่จะถูกแทนที่
    /// </summary>
    public async Task<CommissionPreviewResultDto> PreviewCommissionFileAsync(
        int year,
        int month,
        decimal defaultRate,
        Stream fileStream,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        if (defaultRate <= 0) defaultRate = 3.00m;

        using var ms = new MemoryStream();
        await fileStream.CopyToAsync(ms, cancellationToken);
        var fileBytes = ms.ToArray();
        var fileHash = ComputeSha256(fileBytes);

        var parsedData = ParseFileRows(fileBytes, fileName, year, month, defaultRate);
        var items = parsedData.Items;
        var warnings = parsedData.Warnings;

        // ดึงพนักงานทั้งหมดที่ระบุในไฟล์
        var empCodes = items.Select(i => i.EmployeeCode.ToUpperInvariant()).Distinct().ToList();
        var employees = await _context.Employees
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.Department)
            .Where(e => empCodes.Contains(e.EmployeeCode.ToUpper()))
            .ToListAsync(cancellationToken);

        var empMap = employees.ToDictionary(e => e.EmployeeCode.ToUpperInvariant(), e => e);

        // ตรวจสอบความถูกต้องและผูกข้อมูลพนักงาน
        var previewRows = new List<CommissionPreviewItemDto>();
        var validEmpIds = new HashSet<long>();
        var touchedMonths = new HashSet<(int Year, int Month)>();

        foreach (var item in items)
        {
            var pItem = new CommissionPreviewItemDto
            {
                EmployeeCode = item.EmployeeCode,
                DateFrom = item.DateFrom.ToString("yyyy-MM-dd"),
                DateTo = item.DateTo.ToString("yyyy-MM-dd"),
                SalesAmount = item.SalesAmount,
                CommissionRate = item.CommissionRate,
                CommissionAmount = item.CommissionAmount,
                SpecialAmount = item.SpecialAmount,
                TotalAmount = item.TotalAmount,
                Note = item.Note
            };

            if (!empMap.TryGetValue(item.EmployeeCode.ToUpperInvariant(), out var emp))
            {
                pItem.IsValid = false;
                pItem.ErrorMessage = $"ไม่พบพนักงานรหัส '{item.EmployeeCode}' ในระบบ";
                warnings.Add(pItem.ErrorMessage);
            }
            else
            {
                pItem.EmployeeId = emp.Id;
                pItem.EmployeeName = $"{emp.FirstName} {emp.LastName}".Trim();
                pItem.DepartmentName = emp.Assignments?.FirstOrDefault()?.Department?.DepartmentName ?? "-";
                validEmpIds.Add(emp.Id);

                // บันทึกเดือนที่ได้รับผลกระทบ
                AddMonthsInRange(touchedMonths, item.DateFrom, item.DateTo);
            }

            previewRows.Add(pItem);
        }

        // ตรวจสอบการทับซ้อนกับรายการเดิม (Overlapping entries in employee_commission_entry)
        int replacedEntriesCount = 0;
        if (validEmpIds.Count > 0)
        {
            var existingActive = await _context.EmployeeCommissionEntries
                .Where(e => validEmpIds.Contains(e.EmployeeId) && e.Status == "ACTIVE")
                .ToListAsync(cancellationToken);

            foreach (var pItem in previewRows.Where(p => p.IsValid && p.EmployeeId.HasValue))
            {
                var dFrom = DateOnly.Parse(pItem.DateFrom);
                var dTo = DateOnly.Parse(pItem.DateTo);
                var overlapping = existingActive.Count(e =>
                    e.EmployeeId == pItem.EmployeeId.Value &&
                    e.DateFrom <= dTo && e.DateTo >= dFrom);

                pItem.ExistingOverlappingEntries = overlapping;
            }

            // คำนวณยอดรายการเดิมทั้งหมดที่จะถูกแทนที่ (นับรายการ active เดิมที่ถูกทับ)
            foreach (var active in existingActive)
            {
                var isOverlapped = previewRows.Any(p =>
                    p.IsValid && p.EmployeeId == active.EmployeeId &&
                    active.DateFrom <= DateOnly.Parse(p.DateTo) && active.DateTo >= DateOnly.Parse(p.DateFrom));
                if (isOverlapped)
                {
                    replacedEntriesCount++;
                }
            }
        }

        // ตรวจสอบการล็อกงวดเงินเดือน (PAID)
        bool isLocked = false;
        string? lockReason = null;
        foreach (var (y, m) in touchedMonths)
        {
            var isPaid = await _context.EmployeeCommissions.AnyAsync(c => c.Year == y && c.Month == m && c.Status == "PAID", cancellationToken);
            if (isPaid)
            {
                isLocked = true;
                lockReason = $"รอบค่าคอมมิชชั่นประจำเดือน {m}/{y + 543} มีสถานะจ่ายเงินแล้ว (PAID) ไม่สามารถนำเข้าทับได้";
                break;
            }
        }

        var validRows = previewRows.Count(p => p.IsValid);
        var invalidRows = previewRows.Count(p => !p.IsValid);
        var totalSales = previewRows.Where(p => p.IsValid).Sum(p => p.SalesAmount);
        var totalComm = previewRows.Where(p => p.IsValid).Sum(p => p.TotalAmount);

        return new CommissionPreviewResultDto
        {
            FileName = fileName,
            FileHash = fileHash,
            DetectedType = parsedData.DetectedType,
            DetectedTypeLabel = parsedData.DetectedTypeLabel,
            DateFrom = parsedData.MinDate?.ToString("yyyy-MM-dd"),
            DateTo = parsedData.MaxDate?.ToString("yyyy-MM-dd"),
            TargetYear = year,
            TargetMonth = month,
            TotalRows = previewRows.Count,
            ValidRows = validRows,
            InvalidRows = invalidRows,
            EmployeeCount = previewRows.Where(p => p.IsValid && p.EmployeeId.HasValue).Select(p => p.EmployeeId!.Value).Distinct().Count(),
            TotalSalesAmount = totalSales,
            TotalCommissionAmount = totalComm,
            ReplacedEntriesCount = replacedEntriesCount,
            IsLockedPeriod = isLocked,
            LockReason = lockReason,
            Warnings = warnings.Distinct().ToList(),
            PreviewRows = previewRows.Take(100).ToList()
        };
    }

    /// <summary>
    /// นำเข้าไฟล์ค่าคอมมิชชั่นจริง บันทึก Batch, ปรับสถานะรายการเดิมที่ทับกันเป็น SUPERSEDED, บันทึกรายการใหม่ และคำนวณยอดรวมรายเดือนใหม่
    /// </summary>
    public async Task<ImportCommissionResultDto> ImportCommissionFileAsync(
        int year,
        int month,
        decimal defaultRate,
        Stream fileStream,
        string fileName,
        long? userId = null,
        CancellationToken cancellationToken = default)
    {
        if (defaultRate <= 0) defaultRate = 3.00m;

        using var ms = new MemoryStream();
        await fileStream.CopyToAsync(ms, cancellationToken);
        var fileBytes = ms.ToArray();
        var fileHash = ComputeSha256(fileBytes);

        var parsedData = ParseFileRows(fileBytes, fileName, year, month, defaultRate);
        var items = parsedData.Items;
        var warnings = parsedData.Warnings;

        if (items.Count == 0)
        {
            throw new BusinessRuleException("ไม่พบแถวข้อมูลยอดขายที่สามารถนำเข้าได้ในไฟล์");
        }

        // ดึงพนักงาน
        var empCodes = items.Select(i => i.EmployeeCode.ToUpperInvariant()).Distinct().ToList();
        var employees = await _context.Employees
            .Where(e => empCodes.Contains(e.EmployeeCode.ToUpper()))
            .ToListAsync(cancellationToken);

        var empMap = employees.ToDictionary(e => e.EmployeeCode.ToUpperInvariant(), e => e);

        // กรองเฉพาะรายการที่รหัสพนักงานถูกต้อง
        var validRows = new List<(Employee Emp, ParsedCommissionRow Row)>();
        int skippedCount = 0;

        foreach (var item in items)
        {
            if (empMap.TryGetValue(item.EmployeeCode.ToUpperInvariant(), out var emp))
            {
                validRows.Add((emp, item));
            }
            else
            {
                warnings.Add($"ไม่พบพนักงานรหัส '{item.EmployeeCode}' ในระบบ (ข้ามข้อมูล)");
                skippedCount++;
            }
        }

        if (validRows.Count == 0)
        {
            throw new BusinessRuleException("ไม่พบข้อมูลพนักงานที่ถูกต้องในระบบจากไฟล์ที่ระบุ");
        }

        // ตรวจสอบล็อกงวดเงินเดือน (PAID)
        var touchedMonths = new HashSet<(int Year, int Month)>();
        foreach (var (_, row) in validRows)
        {
            AddMonthsInRange(touchedMonths, row.DateFrom, row.DateTo);
        }

        foreach (var (y, m) in touchedMonths)
        {
            var isPaid = await _context.EmployeeCommissions.AnyAsync(c => c.Year == y && c.Month == m && c.Status == "PAID", cancellationToken);
            if (isPaid)
            {
                throw new BusinessRuleException($"รอบค่าคอมมิชชั่นประจำเดือน {m}/{y + 543} มีสถานะจ่ายเงินแล้ว (PAID) ไม่สามารถนำเข้าทับได้");
            }
        }

        // 1. สร้าง Import Batch
        var batch = new CommissionImportBatch
        {
            FileName = fileName,
            FileHash = fileHash,
            DetectedType = parsedData.DetectedType,
            DateFrom = parsedData.MinDate,
            DateTo = parsedData.MaxDate,
            TotalRows = items.Count,
            SuccessRows = validRows.Count,
            FailedRows = skippedCount,
            EmployeeCount = validRows.Select(v => v.Emp.Id).Distinct().Count(),
            TotalAmount = validRows.Sum(v => v.Row.TotalAmount),
            Status = "IMPORTED",
            ErrorsJson = warnings.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(warnings) : null,
            ImportedByUserId = userId,
            ImportedAt = DateTime.UtcNow
        };

        _context.CommissionImportBatches.Add(batch);
        await _context.SaveChangesAsync(cancellationToken);

        // 2. ปรับสถานะรายการเดิมที่ทับซ้อนเป็น SUPERSEDED
        var empIds = validRows.Select(v => v.Emp.Id).Distinct().ToList();
        var existingActiveEntries = await _context.EmployeeCommissionEntries
            .Where(e => empIds.Contains(e.EmployeeId) && e.Status == "ACTIVE")
            .ToListAsync(cancellationToken);

        int replacedCount = 0;
        foreach (var active in existingActiveEntries)
        {
            var isOverlapped = validRows.Any(v =>
                v.Emp.Id == active.EmployeeId &&
                active.DateFrom <= v.Row.DateTo && active.DateTo >= v.Row.DateFrom);

            if (isOverlapped)
            {
                active.Status = "SUPERSEDED";
                active.SupersededByBatchId = batch.Id;
                replacedCount++;
            }
        }

        batch.ReplacedEntries = replacedCount;

        // 3. เพิ่มรายการใหม่ใน employee_commission_entry
        foreach (var (emp, row) in validRows)
        {
            var entry = new EmployeeCommissionEntry
            {
                EmployeeId = emp.Id,
                DateFrom = row.DateFrom,
                DateTo = row.DateTo,
                SalesAmount = row.SalesAmount,
                CommissionRate = row.CommissionRate,
                CommissionAmount = row.CommissionAmount,
                SpecialAmount = row.SpecialAmount,
                TotalAmount = row.TotalAmount,
                Note = row.Note,
                Source = "FILE",
                Status = "ACTIVE",
                BatchId = batch.Id,
                CreatedAt = DateTime.UtcNow
            };
            _context.EmployeeCommissionEntries.Add(entry);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // 4. คำนวณยอดรวมรายเดือน (employee_commission) ใหม่สำหรับพนักงานและเดือนที่เกี่ยวข้อง
        await RecalculateMonthlyCommissionsAsync(empIds, touchedMonths, defaultRate, cancellationToken);

        var updatedSummary = await GetCommissionPeriodAsync(year, month, cancellationToken);

        return new ImportCommissionResultDto
        {
            BatchId = batch.Id,
            DetectedType = parsedData.DetectedType,
            DetectedTypeLabel = parsedData.DetectedTypeLabel,
            DateFrom = parsedData.MinDate?.ToString("yyyy-MM-dd"),
            DateTo = parsedData.MaxDate?.ToString("yyyy-MM-dd"),
            TotalRowsInFile = items.Count,
            TotalImported = validRows.Count,
            SuccessCount = validRows.Count,
            UpdatedCount = 0,
            ReplacedCount = replacedCount,
            SkippedCount = skippedCount,
            TotalSalesAmount = validRows.Sum(v => v.Row.SalesAmount),
            TotalCommissionAmount = validRows.Sum(v => v.Row.TotalAmount),
            Warnings = warnings.Distinct().ToList(),
            Summary = updatedSummary
        };
    }

    /// <summary>
    /// ดึงประวัติชุดการนำเข้า (Batches) พร้อมข้อมูลผู้ใช้และสถานะ
    /// </summary>
    public async Task<PagedCommissionBatchResult> GetCommissionBatchesAsync(int page = 1, int pageSize = 10, CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var query = _context.CommissionImportBatches
            .Include(b => b.ImportedByUser)
                .ThenInclude(u => u!.Employee)
            .Include(b => b.RevertedByUser)
                .ThenInclude(u => u!.Employee)
            .OrderByDescending(b => b.ImportedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var batches = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = batches.Select(b => new CommissionBatchDto
        {
            Id = b.Id,
            FileName = b.FileName,
            FileHash = b.FileHash,
            DetectedType = b.DetectedType,
            DetectedTypeLabel = GetDetectedTypeLabel(b.DetectedType, b.DateFrom, b.DateTo),
            DateFrom = b.DateFrom?.ToString("yyyy-MM-dd"),
            DateTo = b.DateTo?.ToString("yyyy-MM-dd"),
            TotalRows = b.TotalRows,
            SuccessRows = b.SuccessRows,
            FailedRows = b.FailedRows,
            EmployeeCount = b.EmployeeCount,
            ReplacedEntries = b.ReplacedEntries,
            TotalAmount = b.TotalAmount,
            Status = b.Status,
            ImportedByUserName = b.ImportedByUser != null ? (b.ImportedByUser.Employee != null ? $"{b.ImportedByUser.Employee.FirstName} {b.ImportedByUser.Employee.LastName}".Trim() : b.ImportedByUser.Username) : "-",
            ImportedAt = b.ImportedAt,
            RevertedAt = b.RevertedAt,
            RevertedByUserName = b.RevertedByUser != null ? (b.RevertedByUser.Employee != null ? $"{b.RevertedByUser.Employee.FirstName} {b.RevertedByUser.Employee.LastName}".Trim() : b.RevertedByUser.Username) : null
        }).ToList();

        return new PagedCommissionBatchResult
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    /// <summary>
    /// ยกเลิกชุดการนำเข้า (Revert Batch) คืนค่ารายการที่เคยถูกแทนที่ และคำนวณยอดรวมรายเดือนใหม่
    /// </summary>
    public async Task<RevertCommissionBatchResultDto> RevertCommissionBatchAsync(long batchId, long? userId = null, CancellationToken cancellationToken = default)
    {
        var batch = await _context.CommissionImportBatches
            .FirstOrDefaultAsync(b => b.Id == batchId, cancellationToken)
            ?? throw new KeyNotFoundException($"ไม่พบชุดการนำเข้า ID: {batchId}");

        if (batch.Status == "REVERTED")
        {
            throw new InvalidOperationException($"ชุดการนำเข้า #{batchId} ถูกยกเลิกไปแล้ว");
        }

        // หารายการที่สร้างโดย batch นี้
        var activeEntries = await _context.EmployeeCommissionEntries
            .Where(e => e.BatchId == batchId && e.Status == "ACTIVE")
            .ToListAsync(cancellationToken);

        // หารายการเดิมที่ถูกแทนที่โดย batch นี้
        var supersededEntries = await _context.EmployeeCommissionEntries
            .Where(e => e.SupersededByBatchId == batchId && e.Status == "SUPERSEDED")
            .ToListAsync(cancellationToken);

        // หาพนักงานและเดือนที่ได้รับผลกระทบ
        var affectedEmpIds = activeEntries.Select(e => e.EmployeeId)
            .Concat(supersededEntries.Select(e => e.EmployeeId))
            .Distinct()
            .ToList();

        var touchedMonths = new HashSet<(int Year, int Month)>();
        foreach (var entry in activeEntries.Concat(supersededEntries))
        {
            AddMonthsInRange(touchedMonths, entry.DateFrom, entry.DateTo);
        }

        // ตรวจสอบล็อกงวดเงินเดือน
        foreach (var (y, m) in touchedMonths)
        {
            var isPaid = await _context.EmployeeCommissions.AnyAsync(c => c.Year == y && c.Month == m && c.Status == "PAID", cancellationToken);
            if (isPaid)
            {
                throw new BusinessRuleException($"รอบค่าคอมมิชชั่นประจำเดือน {m}/{y + 543} มีสถานะจ่ายเงินแล้ว (PAID) ไม่สามารถยกเลิกการนำเข้าได้");
            }
        }

        // 1. เปลี่ยนสถานะรายการของ batch นี้เป็น REVERTED
        foreach (var e in activeEntries)
        {
            e.Status = "REVERTED";
        }

        // 2. คืนค่ารายการเดิมที่เคยถูกทับกลับมาเป็น ACTIVE
        foreach (var e in supersededEntries)
        {
            e.Status = "ACTIVE";
            e.SupersededByBatchId = null;
        }

        // 3. ปรับสถานะ Batch
        batch.Status = "REVERTED";
        batch.RevertedAt = DateTime.UtcNow;
        batch.RevertedByUserId = userId;

        await _context.SaveChangesAsync(cancellationToken);

        // 4. คำนวณยอดรวมรายเดือนใหม่
        await RecalculateMonthlyCommissionsAsync(affectedEmpIds, touchedMonths, 3.00m, cancellationToken);

        return new RevertCommissionBatchResultDto
        {
            BatchId = batch.Id,
            FileName = batch.FileName,
            RevertedEntriesCount = activeEntries.Count,
            RestoredEntriesCount = supersededEntries.Count,
            AffectedEmployeesCount = affectedEmpIds.Count,
            Message = $"ยกเลิกชุดนำเข้าสำเร็จ: ลบรายการ {activeEntries.Count} รายการ, กู้คืนรายการเดิม {supersededEntries.Count} รายการ"
        };
    }

    public async Task<CommissionRecordDto> UpdateCommissionRecordAsync(long id, UpdateCommissionItemRequest request, CancellationToken cancellationToken = default)
    {
        var record = await _context.EmployeeCommissions
            .Include(c => c.Employee)
                .ThenInclude(e => e.Assignments.Where(a => a.IsCurrent))
                    .ThenInclude(a => a.Department)
            .Include(c => c.Employee)
                .ThenInclude(e => e.Assignments.Where(a => a.IsCurrent))
                    .ThenInclude(a => a.Position)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"ไม่พบรายการค่าคอมมิชชั่น ID: {id}");

        if (record.Status == "PAID")
        {
            throw new BusinessRuleException("รายการนี้ถูกจ่ายเงินไปแล้วในงวดเงินเดือน ไม่สามารถแก้ไขได้");
        }

        if (request.SalesAmount.HasValue) record.SalesAmount = request.SalesAmount.Value;
        if (request.CommissionRate.HasValue) record.CommissionRate = request.CommissionRate.Value;
        if (request.SpecialAmount.HasValue) record.SpecialAmount = request.SpecialAmount.Value;
        if (request.Note != null) record.Note = request.Note;

        record.CommissionAmount = Math.Round(record.SalesAmount * (record.CommissionRate / 100m), 2, MidpointRounding.AwayFromZero);
        record.TotalCommission = record.CommissionAmount + record.SpecialAmount;
        record.Status = "DRAFT";
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(record);
    }

    public async Task<CommissionRecordDto> AddManualCommissionRecordAsync(AddManualCommissionRequest request, CancellationToken cancellationToken = default)
    {
        var emp = await _context.Employees
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.Department)
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.Position)
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, cancellationToken)
            ?? throw new KeyNotFoundException($"ไม่พบพนักงาน ID: {request.EmployeeId}");

        var isPaid = await _context.EmployeeCommissions
            .AnyAsync(c => c.EmployeeId == request.EmployeeId && c.Year == request.Year && c.Month == request.Month && c.Status == "PAID", cancellationToken);
        if (isPaid)
        {
            throw new BusinessRuleException($"รอบค่าคอมมิชชั่นประจำเดือน {request.Month}/{request.Year + 543} ของพนักงานคนนี้ถูกจ่ายไปแล้ว");
        }

        var rate = request.CommissionRate > 0 ? request.CommissionRate : 3.00m;
        var commAmount = Math.Round(request.SalesAmount * (rate / 100m), 2, MidpointRounding.AwayFromZero);
        var total = commAmount + request.SpecialAmount;

        // บันทึกเป็น Entry ของทั้งเดือน
        var startOfMonth = new DateOnly(request.Year, request.Month, 1);
        var endOfMonth = new DateOnly(request.Year, request.Month, DateTime.DaysInMonth(request.Year, request.Month));

        var entry = new EmployeeCommissionEntry
        {
            EmployeeId = request.EmployeeId,
            DateFrom = startOfMonth,
            DateTo = endOfMonth,
            SalesAmount = request.SalesAmount,
            CommissionRate = rate,
            CommissionAmount = commAmount,
            SpecialAmount = request.SpecialAmount,
            TotalAmount = total,
            Note = request.Note,
            Source = "MANUAL",
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };
        _context.EmployeeCommissionEntries.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);

        // คำนวณยอดเดือนใหม่
        var touchedMonths = new HashSet<(int Year, int Month)> { (request.Year, request.Month) };
        await RecalculateMonthlyCommissionsAsync(new[] { request.EmployeeId }, touchedMonths, rate, cancellationToken);

        var updatedRecord = await _context.EmployeeCommissions
            .Include(c => c.Employee)
                .ThenInclude(e => e.Assignments.Where(a => a.IsCurrent))
                    .ThenInclude(a => a.Department)
            .Include(c => c.Employee)
                .ThenInclude(e => e.Assignments.Where(a => a.IsCurrent))
                    .ThenInclude(a => a.Position)
            .FirstAsync(c => c.EmployeeId == request.EmployeeId && c.Year == request.Year && c.Month == request.Month, cancellationToken);

        return MapToDto(updatedRecord);
    }

    public async Task DeleteCommissionRecordAsync(long id, CancellationToken cancellationToken = default)
    {
        var record = await _context.EmployeeCommissions.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"ไม่พบรายการค่าคอมมิชชั่น ID: {id}");

        if (record.Status == "PAID")
        {
            throw new BusinessRuleException("รายการนี้ถูกจ่ายเงินไปแล้วในงวดเงินเดือน ไม่สามารถลบได้");
        }

        // ยกเลิก Active entries ทั้งหมดของเดือนนี้
        var startOfMonth = new DateOnly(record.Year, record.Month, 1);
        var endOfMonth = new DateOnly(record.Year, record.Month, DateTime.DaysInMonth(record.Year, record.Month));

        var entries = await _context.EmployeeCommissionEntries
            .Where(e => e.EmployeeId == record.EmployeeId && e.Status == "ACTIVE" && e.DateFrom <= endOfMonth && e.DateTo >= startOfMonth)
            .ToListAsync(cancellationToken);

        foreach (var e in entries)
        {
            e.Status = "REMOVED";
        }

        _context.EmployeeCommissions.Remove(record);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<CommissionPeriodSummaryDto> ConfirmCommissionPeriodAsync(int year, int month, long confirmedByEmployeeId, CancellationToken cancellationToken = default)
    {
        var records = await _context.EmployeeCommissions
            .Where(c => c.Year == year && c.Month == month)
            .ToListAsync(cancellationToken);

        if (records.Count == 0)
        {
            throw new BusinessRuleException("ไม่มีรายการค่าคอมมิชชั่นในงวดที่เลือก");
        }

        foreach (var r in records)
        {
            if (r.Status != "PAID")
            {
                r.Status = "CONFIRMED";
                r.ConfirmedAt = DateTime.UtcNow;
                r.ConfirmedByEmployeeId = confirmedByEmployeeId;
                r.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return await GetCommissionPeriodAsync(year, month, cancellationToken);
    }

    public async Task<CommissionPeriodSummaryDto> ResetCommissionPeriodAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        var records = await _context.EmployeeCommissions
            .Where(c => c.Year == year && c.Month == month)
            .ToListAsync(cancellationToken);

        if (records.Any(r => r.Status == "PAID"))
        {
            throw new BusinessRuleException("ไม่สามารถรีเซ็ตได้เนื่องจากมีบางรายการถูกจ่ายเงินไปแล้ว");
        }

        var startOfMonth = new DateOnly(year, month, 1);
        var endOfMonth = new DateOnly(year, month, DateTime.DaysInMonth(year, month));

        var entries = await _context.EmployeeCommissionEntries
            .Where(e => e.Status == "ACTIVE" && e.DateFrom <= endOfMonth && e.DateTo >= startOfMonth)
            .ToListAsync(cancellationToken);

        foreach (var e in entries)
        {
            e.Status = "REMOVED";
        }

        _context.EmployeeCommissions.RemoveRange(records);
        await _context.SaveChangesAsync(cancellationToken);
        return await GetCommissionPeriodAsync(year, month, cancellationToken);
    }

    public async Task<byte[]> GenerateExcelTemplateAsync(CancellationToken cancellationToken = default)
    {
        var rows = new List<Dictionary<string, object>>
        {
            new()
            {
                { "วันที่ (วว/ดด/ปปปป หรือ เว้นว่างถ้าทั้งเดือน)", "15/10/2026" },
                { "รหัสพนักงาน (จำเป็น)", "EMP0001" },
                { "ชื่อ-นามสกุล", "นายสมชาย ตัวอย่าง" },
                { "แผนก", "ฝ่ายขายและการตลาด" },
                { "ตำแหน่ง", "เจ้าหน้าที่ฝ่ายขาย" },
                { "ยอดขายรวม (บาท)", 250000 },
                { "หมายเหตุ", "ตัวอย่างยอดขาย" }
            }
        };

        using var ms = new MemoryStream();
        await ms.SaveAsAsync(rows);
        return ms.ToArray();
    }

    #region Calculation & Parsing Helpers

    private class ParsedCommissionRow
    {
        public string EmployeeCode { get; set; } = string.Empty;
        public DateOnly DateFrom { get; set; }
        public DateOnly DateTo { get; set; }
        public decimal SalesAmount { get; set; }
        public decimal? DirectCommission { get; set; }
        public decimal? Rate { get; set; }
        public decimal SpecialAmount { get; set; }
        public string? Note { get; set; }
        public decimal CommissionRate { get; set; }
        public decimal CommissionAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }

    private class ParsedFileData
    {
        public string DetectedType { get; set; } = "MONTH"; // MONTH, DAY, RANGE
        public string DetectedTypeLabel { get; set; } = string.Empty;
        public DateOnly? MinDate { get; set; }
        public DateOnly? MaxDate { get; set; }
        public List<ParsedCommissionRow> Items { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    private ParsedFileData ParseFileRows(byte[] fileBytes, string fileName, int targetYear, int targetMonth, decimal defaultRate)
    {
        System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
        var ext = Path.GetExtension(fileName).ToLowerInvariant();

        using var memoryStream = new MemoryStream(fileBytes);
        using var reader = ext == ".csv"
            ? ExcelReaderFactory.CreateCsvReader(memoryStream, new ExcelReaderConfiguration { FallbackEncoding = System.Text.Encoding.UTF8 })
            : ExcelReaderFactory.CreateReader(memoryStream);

        List<List<string>> rawRows = new();
        int headerRowIdx = -1;
        int codeCol = -1;
        int nameCol = -1;
        int salesCol = -1;
        int commCol = -1;
        int rateCol = -1;
        int specialCol = -1;
        int noteCol = -1;
        int dateCol = -1;
        int dateToCol = -1;

        do
        {
            var sheetRows = new List<List<string>>();
            while (reader.Read())
            {
                var row = new List<string>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var val = reader.GetValue(i)?.ToString()?.Trim() ?? string.Empty;
                    row.Add(val);
                }
                if (row.Any(c => !string.IsNullOrWhiteSpace(c)))
                {
                    sheetRows.Add(row);
                }
            }

            if (sheetRows.Count < 2) continue;

            for (int r = 0; r < Math.Min(30, sheetRows.Count); r++)
            {
                var row = sheetRows[r];
                int cCode = -1, cName = -1, cSales = -1, cComm = -1, cRate = -1, cSpecial = -1, cNote = -1;
                int cDate = -1, cDateTo = -1;

                for (int c = 0; c < row.Count; c++)
                {
                    var raw = row[c];
                    if (string.IsNullOrWhiteSpace(raw)) continue;
                    var text = CleanHeader(raw);
                    var rawLower = raw.ToLowerInvariant();

                    if (cDateTo == -1 && IsDateToHeader(text, rawLower)) cDateTo = c;
                    else if (cDate == -1 && IsDateHeader(text, rawLower)) cDate = c;
                    else if (cRate == -1 && IsRateHeader(text, rawLower)) cRate = c;
                    else if (cComm == -1 && IsCommissionAmountHeader(text, rawLower)) cComm = c;
                    else if (cSales == -1 && IsSalesHeader(text, rawLower)) cSales = c;
                    else if (cCode == -1 && IsCodeHeader(text, rawLower)) cCode = c;
                    else if (cName == -1 && IsNameHeader(text, rawLower)) cName = c;
                    else if (cSpecial == -1 && IsSpecialHeader(text, rawLower)) cSpecial = c;
                    else if (cNote == -1 && IsNoteHeader(text, rawLower)) cNote = c;
                }

                if (cCode != -1 && (cSales != -1 || cComm != -1) && cCode != cSales && cCode != cComm)
                {
                    headerRowIdx = r;
                    codeCol = cCode;
                    nameCol = cName;
                    salesCol = cSales;
                    commCol = cComm;
                    rateCol = cRate;
                    specialCol = cSpecial;
                    noteCol = cNote;
                    dateCol = cDate;
                    dateToCol = cDateTo;
                    rawRows = sheetRows;
                    break;
                }
            }

            if (headerRowIdx != -1) break;

        } while (reader.NextResult());

        if (headerRowIdx == -1 || codeCol == -1 || (salesCol == -1 && commCol == -1))
        {
            throw new BusinessRuleException(
                "ไม่พบคอลัมน์ 'รหัสพนักงาน' หรือ 'ยอดขาย/ค่าคอมมิชชั่น' ในไฟล์ กรุณาตรวจสอบหัวตาราง หรือดาวน์โหลดเทมเพลตตัวอย่าง");
        }

        var defaultMonthStart = new DateOnly(targetYear, targetMonth, 1);
        var defaultMonthEnd = new DateOnly(targetYear, targetMonth, DateTime.DaysInMonth(targetYear, targetMonth));

        var rawEntries = new List<ParsedCommissionRow>();
        var warnings = new List<string>();
        bool hasDateColumn = (dateCol != -1);

        for (int r = headerRowIdx + 1; r < rawRows.Count; r++)
        {
            var row = rawRows[r];
            if (row.Count <= codeCol) continue;

            var rawCode = row[codeCol]?.Trim();
            if (string.IsNullOrWhiteSpace(rawCode)) continue;

            if (rawCode.Contains("รวม", StringComparison.OrdinalIgnoreCase) ||
                rawCode.Contains("total", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            decimal sales = 0;
            if (salesCol != -1 && salesCol < row.Count && !string.IsNullOrWhiteSpace(row[salesCol]))
            {
                sales = ParseDecimal(row[salesCol]);
            }

            decimal? directComm = null;
            if (commCol != -1 && commCol < row.Count && !string.IsNullOrWhiteSpace(row[commCol]))
            {
                directComm = ParseDecimal(row[commCol]);
            }

            decimal? rate = null;
            if (rateCol != -1 && rateCol < row.Count && !string.IsNullOrWhiteSpace(row[rateCol]))
            {
                var parsedRate = ParseDecimal(row[rateCol]);
                if (parsedRate > 0) rate = parsedRate;
            }

            decimal special = 0;
            if (specialCol != -1 && specialCol < row.Count && !string.IsNullOrWhiteSpace(row[specialCol]))
            {
                special = ParseDecimal(row[specialCol]);
            }

            string? note = null;
            if (noteCol != -1 && noteCol < row.Count && !string.IsNullOrWhiteSpace(row[noteCol]))
            {
                note = row[noteCol].Trim();
            }

            // วันที่
            DateOnly rowDateFrom = defaultMonthStart;
            DateOnly rowDateTo = defaultMonthEnd;

            if (hasDateColumn && dateCol < row.Count && !string.IsNullOrWhiteSpace(row[dateCol]))
            {
                var parsedD1 = ParseDate(row[dateCol]);
                if (parsedD1.HasValue)
                {
                    rowDateFrom = parsedD1.Value;
                    rowDateTo = parsedD1.Value;

                    if (dateToCol != -1 && dateToCol < row.Count && !string.IsNullOrWhiteSpace(row[dateToCol]))
                    {
                        var parsedD2 = ParseDate(row[dateToCol]);
                        if (parsedD2.HasValue && parsedD2.Value >= parsedD1.Value)
                        {
                            rowDateTo = parsedD2.Value;
                        }
                    }
                }
                else
                {
                    warnings.Add($"แถวที่ {r + 1}: รูปแบบวันที่ '{row[dateCol]}' ไม่ถูกต้อง จึงใช้วันที่ของงวด ({defaultMonthStart:dd/MM/yyyy})");
                }
            }

            rawEntries.Add(new ParsedCommissionRow
            {
                EmployeeCode = rawCode.ToUpperInvariant(),
                DateFrom = rowDateFrom,
                DateTo = rowDateTo,
                SalesAmount = sales,
                DirectCommission = directComm,
                Rate = rate,
                SpecialAmount = special,
                Note = note
            });
        }

        // รวมยอดตาม (EmployeeCode, DateFrom, DateTo) เผื่อในไฟล์มีหลายแถวของพนักงานคนเดิมในช่วงวันเดียวกัน
        var grouped = rawEntries
            .GroupBy(e => (e.EmployeeCode, e.DateFrom, e.DateTo))
            .Select(g =>
            {
                var totalSales = g.Sum(x => x.SalesAmount);
                var totalSpecial = g.Sum(x => x.SpecialAmount);
                decimal? mergedDirectComm = g.Any(x => x.DirectCommission.HasValue)
                    ? g.Sum(x => x.DirectCommission ?? 0)
                    : null;
                var effectiveRate = g.FirstOrDefault(x => x.Rate.HasValue)?.Rate;
                var notes = g.Where(x => !string.IsNullOrWhiteSpace(x.Note)).Select(x => x.Note!).Distinct().ToList();

                decimal commAmount;
                decimal calcRate;

                if (mergedDirectComm.HasValue && mergedDirectComm.Value > 0)
                {
                    commAmount = Math.Round(mergedDirectComm.Value, 2, MidpointRounding.AwayFromZero);
                    if (effectiveRate.HasValue) calcRate = effectiveRate.Value;
                    else if (totalSales > 0) calcRate = Math.Round((commAmount / totalSales) * 100m, 2);
                    else calcRate = defaultRate;
                }
                else
                {
                    calcRate = effectiveRate ?? defaultRate;
                    commAmount = Math.Round(totalSales * (calcRate / 100m), 2, MidpointRounding.AwayFromZero);
                }

                return new ParsedCommissionRow
                {
                    EmployeeCode = g.Key.EmployeeCode,
                    DateFrom = g.Key.DateFrom,
                    DateTo = g.Key.DateTo,
                    SalesAmount = totalSales,
                    DirectCommission = mergedDirectComm,
                    Rate = effectiveRate,
                    SpecialAmount = totalSpecial,
                    CommissionRate = calcRate,
                    CommissionAmount = commAmount,
                    TotalAmount = commAmount + totalSpecial,
                    Note = notes.Count > 0 ? string.Join(", ", notes) : null
                };
            })
            .ToList();

        // ตรวจจับประเภทไฟล์ (DetectedType)
        string detectedType;
        string detectedLabel;
        DateOnly? minDate = null;
        DateOnly? maxDate = null;

        if (grouped.Count > 0)
        {
            minDate = grouped.Min(e => e.DateFrom);
            maxDate = grouped.Max(e => e.DateTo);
        }

        if (!hasDateColumn)
        {
            detectedType = "MONTH";
            detectedLabel = $"ทั้งเดือน (ไม่ระบุวันที่ - ประจำงวด {targetMonth}/{targetYear + 543})";
        }
        else if (minDate.HasValue && maxDate.HasValue)
        {
            if (minDate.Value == maxDate.Value)
            {
                detectedType = "DAY";
                detectedLabel = $"วันเดียว ({minDate.Value:dd/MM/yyyy})";
            }
            else if (minDate.Value.Day == 1 &&
                     maxDate.Value.Day == DateTime.DaysInMonth(maxDate.Value.Year, maxDate.Value.Month) &&
                     minDate.Value.Year == maxDate.Value.Year &&
                     minDate.Value.Month == maxDate.Value.Month)
            {
                detectedType = "MONTH";
                detectedLabel = $"ทั้งเดือน ({minDate.Value:MM/yyyy})";
            }
            else
            {
                detectedType = "RANGE";
                detectedLabel = $"ช่วงวัน ({minDate.Value:dd/MM/yyyy} - {maxDate.Value:dd/MM/yyyy})";
            }
        }
        else
        {
            detectedType = "MONTH";
            detectedLabel = $"ทั้งเดือน ({targetMonth}/{targetYear + 543})";
        }

        return new ParsedFileData
        {
            DetectedType = detectedType,
            DetectedTypeLabel = detectedLabel,
            MinDate = minDate,
            MaxDate = maxDate,
            Items = grouped,
            Warnings = warnings
        };
    }

    private static string GetDetectedTypeLabel(string detectedType, DateOnly? from, DateOnly? to)
    {
        return detectedType switch
        {
            "DAY" => from.HasValue ? $"วันเดียว ({from.Value:dd/MM/yyyy})" : "วันเดียว (Single Day)",
            "RANGE" => (from.HasValue && to.HasValue) ? $"ช่วงวัน ({from.Value:dd/MM/yyyy} - {to.Value:dd/MM/yyyy})" : "ช่วงวัน (Date Range)",
            _ => (from.HasValue && to.HasValue) ? $"ทั้งเดือน ({from.Value:MM/yyyy})" : "ทั้งเดือน (Full Month)"
        };
    }

    private static void AddMonthsInRange(HashSet<(int Year, int Month)> set, DateOnly from, DateOnly to)
    {
        var cur = new DateOnly(from.Year, from.Month, 1);
        var end = new DateOnly(to.Year, to.Month, 1);
        while (cur <= end)
        {
            set.Add((cur.Year, cur.Month));
            cur = cur.AddMonths(1);
        }
    }

    /// <summary>
    /// คำนวณยอดรวมรายเดือน (employee_commission) จากรายการย่อย active (employee_commission_entry) ให้เป็นปัจจุบัน 100%
    /// </summary>
    private async Task RecalculateMonthlyCommissionsAsync(
        IEnumerable<long> employeeIds,
        IEnumerable<(int Year, int Month)> months,
        decimal defaultRate,
        CancellationToken cancellationToken)
    {
        var empIdList = employeeIds.Distinct().ToList();
        var monthList = months.Distinct().ToList();

        if (empIdList.Count == 0 || monthList.Count == 0) return;

        foreach (var (year, month) in monthList)
        {
            var startOfMonth = new DateOnly(year, month, 1);
            var endOfMonth = new DateOnly(year, month, DateTime.DaysInMonth(year, month));

            // ดึง Active entries ของเดือนนี้สำหรับพนักงานเหล่านี้
            var activeEntries = await _context.EmployeeCommissionEntries
                .Where(e => empIdList.Contains(e.EmployeeId) &&
                            e.Status == "ACTIVE" &&
                            e.DateFrom <= endOfMonth &&
                            e.DateTo >= startOfMonth)
                .ToListAsync(cancellationToken);

            var groupedEntries = activeEntries.GroupBy(e => e.EmployeeId).ToDictionary(g => g.Key, g => g.ToList());

            // ดึง existing records ใน employee_commission
            var existingMonthlyRecords = await _context.EmployeeCommissions
                .Where(c => c.Year == year && c.Month == month && empIdList.Contains(c.EmployeeId))
                .ToListAsync(cancellationToken);

            var existingMonthlyMap = existingMonthlyRecords.ToDictionary(c => c.EmployeeId, c => c);

            foreach (var empId in empIdList)
            {
                if (groupedEntries.TryGetValue(empId, out var empEntries) && empEntries.Count > 0)
                {
                    var totalSales = empEntries.Sum(e => e.SalesAmount);
                    var totalComm = empEntries.Sum(e => e.CommissionAmount);
                    var totalSpecial = empEntries.Sum(e => e.SpecialAmount);
                    var netTotal = totalComm + totalSpecial;
                    var effRate = totalSales > 0 ? Math.Round((totalComm / totalSales) * 100m, 2) : defaultRate;
                    var notes = empEntries.Where(e => !string.IsNullOrWhiteSpace(e.Note)).Select(e => e.Note!).Distinct().ToList();
                    var combinedNote = notes.Count > 0 ? string.Join("; ", notes) : null;

                    if (existingMonthlyMap.TryGetValue(empId, out var existing))
                    {
                        if (existing.Status != "PAID")
                        {
                            existing.SalesAmount = totalSales;
                            existing.CommissionRate = effRate;
                            existing.CommissionAmount = totalComm;
                            existing.SpecialAmount = totalSpecial;
                            existing.TotalCommission = netTotal;
                            existing.CalculationMode = "PERCENTAGE";
                            existing.Status = "DRAFT";
                            existing.Note = combinedNote;
                            existing.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    else
                    {
                        var newMonthly = new EmployeeCommission
                        {
                            EmployeeId = empId,
                            Year = year,
                            Month = month,
                            SalesAmount = totalSales,
                            CommissionRate = effRate,
                            CommissionAmount = totalComm,
                            SpecialAmount = totalSpecial,
                            TotalCommission = netTotal,
                            CalculationMode = "PERCENTAGE",
                            Status = "DRAFT",
                            Note = combinedNote,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.EmployeeCommissions.Add(newMonthly);
                    }
                }
                else
                {
                    // พนักงานไม่มี active entries เหลือในเดือนนี้
                    if (existingMonthlyMap.TryGetValue(empId, out var existing) && existing.Status != "PAID")
                    {
                        _context.EmployeeCommissions.Remove(existing);
                    }
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static CommissionRecordDto MapToDto(EmployeeCommission c)
    {
        var assign = c.Employee?.Assignments?.FirstOrDefault(a => a.IsCurrent) ?? c.Employee?.Assignments?.FirstOrDefault();
        return new CommissionRecordDto
        {
            Id = c.Id,
            EmployeeId = c.EmployeeId,
            EmployeeCode = c.Employee?.EmployeeCode ?? string.Empty,
            EmployeeName = c.Employee != null ? $"{c.Employee.FirstName} {c.Employee.LastName}".Trim() : string.Empty,
            DepartmentName = assign?.Department?.DepartmentName,
            PositionName = assign?.Position?.PositionName,
            Year = c.Year,
            Month = c.Month,
            SalesAmount = c.SalesAmount,
            CommissionRate = c.CommissionRate,
            CommissionAmount = c.CommissionAmount,
            SpecialAmount = c.SpecialAmount,
            TotalCommission = c.TotalCommission,
            CalculationMode = c.CalculationMode,
            Status = c.Status,
            Note = c.Note,
            ConfirmedAt = c.ConfirmedAt
        };
    }

    private static string ComputeSha256(byte[] bytes)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(bytes);
        return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    }

    private static string CleanHeader(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        return Regex.Replace(text.Trim().ToLowerInvariant(), @"[\s_\-\(\)\%]", "");
    }

    private static bool IsDateHeader(string clean, string raw)
    {
        if (clean.Contains("ถึงวันที่") || clean.Contains("สิ้นสุด") || clean.Contains("dateto") || clean.Contains("enddate"))
            return false;

        return clean == "วันที่" || clean == "วัน" || clean == "date" || clean == "workdate" || clean == "transactiondate"
            || clean.Contains("วันที่ทำรายการ") || clean.Contains("วันที่ขาย") || clean.Contains("วันขาย")
            || clean.Contains("วันที่เริ่ม") || clean.Contains("เริ่มวันที่") || clean.Contains("startdate")
            || clean.Contains("datefrom") || clean.Contains("fromdate") || clean.Contains("ว/ด/ป") || clean == "ว/ด/ป";
    }

    private static bool IsDateToHeader(string clean, string raw)
    {
        return clean == "ถึงวันที่" || clean == "สิ้นสุดวันที่" || clean == "dateto" || clean == "enddate"
            || clean.Contains("ถึงวันที่") || clean.Contains("สิ้นสุดวันที่") || clean.Contains("todate");
    }

    private static bool IsCodeHeader(string clean, string raw)
    {
        if (clean.Contains("รหัสผ่าน") || clean.Contains("รหัสไปรษณีย์") || clean.Contains("password") || clean.Contains("postal"))
            return false;

        return clean.Contains("รหัสพนักงาน") || clean == "รหัส" || clean.StartsWith("รหัส")
            || clean.Contains("employeecode") || clean.Contains("empcode")
            || clean.Contains("employeeid") || clean.Contains("empid")
            || clean.Contains("staffid") || clean.Contains("staffcode")
            || clean.Contains("userid") || clean.Contains("usercode")
            || clean.Contains("idพนักงาน");
    }

    private static bool IsNameHeader(string clean, string raw)
    {
        if (clean.Contains("ลูกค้า") || clean.Contains("customer"))
            return false;

        return clean.Contains("ชื่อพนักงาน") || clean.Contains("ชื่อนามสกุล") || clean.Contains("ชื่อสกุล")
            || clean == "ชื่อ" || clean.Contains("fullname") || clean.Contains("employeename")
            || clean.Contains("empname");
    }

    private static bool IsRateHeader(string clean, string raw)
    {
        bool hasRateIndicator = raw.Contains("%") || clean.Contains("อัตรา") || clean.Contains("rate") || clean.Contains("เปอร์เซ็นต์") || clean.Contains("percent") || clean.Contains("pct");
        if (!hasRateIndicator) return false;

        return clean.Contains("คอมมิชชั่น") || clean.Contains("คอม") || clean.Contains("commission") || clean == "อัตรา" || clean == "อัตรา%" || clean == "rate";
    }

    private static bool IsCommissionAmountHeader(string clean, string raw)
    {
        if (raw.Contains("%") || clean.Contains("อัตรา") || clean.Contains("rate") || clean.Contains("เปอร์เซ็นต์") || clean.Contains("percent"))
            return false;

        return clean.Contains("ค่าคอมมิชชั่น") || clean.Contains("ค่าคอม") || clean.Contains("ยอดคอมมิชชั่น")
            || clean.Contains("ยอดคอม") || clean.Contains("เงินคอมมิชชั่น") || clean.Contains("คอมมิชชั่นบาท")
            || clean.Contains("คอมมิชชั่นสุทธิ") || clean.Contains("รวมคอมมิชชั่น") || clean.Contains("คอมมิชชั่น")
            || clean.Contains("commissionamount") || clean.Contains("commamount") || clean.Contains("totalcommission")
            || clean.Contains("commissionbaht") || clean == "commission" || clean == "comm";
    }

    private static bool IsSalesHeader(string clean, string raw)
    {
        if (clean.Contains("คอมมิชชั่น") || clean.Contains("commission") || clean.Contains("คอม") || clean.Contains("พิเศษ") || clean.Contains("special"))
            return false;

        return clean.Contains("ยอดขายรวม") || clean.Contains("ยอดขายสุทธิ") || clean.Contains("ยอดขาย")
            || clean.Contains("ยอดบิล") || clean.Contains("ยอดเงินขาย") || clean.Contains("ยอดขายจริง")
            || clean.Contains("totalsales") || clean.Contains("salesamount") || clean.Contains("netsales")
            || clean.Contains("sales") || clean.Contains("revenue");
    }

    private static bool IsSpecialHeader(string clean, string raw)
    {
        return clean.Contains("เงินพิเศษ") || clean.Contains("พิเศษ") || clean.Contains("โบนัส")
            || clean.Contains("เงินรางวัล") || clean.Contains("ปรับปรุง") || clean.Contains("specialamount")
            || clean.Contains("special") || clean.Contains("bonus") || clean.Contains("incentive")
            || clean.Contains("extra") || clean.Contains("adjustment");
    }

    private static bool IsNoteHeader(string clean, string raw)
    {
        return clean.Contains("หมายเหตุ") || clean.Contains("รายละเอียด") || clean.Contains("note")
            || clean.Contains("remark") || clean.Contains("remarks") || clean.Contains("comment")
            || clean.Contains("description");
    }

    private static decimal ParseDecimal(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return 0;
        var clean = Regex.Replace(text.Trim(), @"[^\d\.\-]", "");
        if (decimal.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out var result))
        {
            return result;
        }
        return 0;
    }

    private static DateOnly? ParseDate(object? val)
    {
        if (val == null) return null;
        if (val is DateTime dt)
        {
            var y = dt.Year > 2400 ? dt.Year - 543 : dt.Year;
            return new DateOnly(y, dt.Month, dt.Day);
        }

        var str = val.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(str)) return null;

        if (DateTime.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDt))
        {
            var y = parsedDt.Year > 2400 ? parsedDt.Year - 543 : parsedDt.Year;
            return new DateOnly(y, parsedDt.Month, parsedDt.Day);
        }

        var formats = new[] { 
            "yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "yyyy/MM/dd", "d-M-yyyy", "dd-MM-yyyy", 
            "yyyy-MM-dd HH:mm:ss", "dd/MM/yyyy HH:mm:ss", "yyyy-MM-dd HH:mm", "dd/MM/yyyy HH:mm",
            "d/M/yy", "dd/MM/yy"
        };
        if (DateTime.TryParseExact(str, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dtExact))
        {
            var y = dtExact.Year > 2400 ? dtExact.Year - 543 : dtExact.Year;
            return new DateOnly(y, dtExact.Month, dtExact.Day);
        }

        var thaiCulture = new CultureInfo("th-TH");
        if (DateTime.TryParse(str, thaiCulture, DateTimeStyles.None, out var dtThai))
        {
            var y = dtThai.Year > 2400 ? dtThai.Year - 543 : dtThai.Year;
            return new DateOnly(y, dtThai.Month, dtThai.Day);
        }

        return null;
    }

    #endregion
}
