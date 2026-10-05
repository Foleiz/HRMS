using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Api.BackgroundJobs;

/// <summary>
/// งานครั้งเดียวตอนเปิดระบบ: เข้ารหัสเลขบัญชีธนาคารเดิมที่ยังเป็นตัวเลขล้วน (PDPA)
/// และเติม account_hash สำหรับตรวจเลขบัญชีซ้ำ — รันซ้ำได้ ทำเฉพาะแถวที่ยังไม่ได้ทำ
/// </summary>
public class BankAccountProtectionBackfill : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BankAccountProtectionBackfill> _logger;

    public BankAccountProtectionBackfill(IServiceScopeFactory scopeFactory, ILogger<BankAccountProtectionBackfill> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
            var crypto = scope.ServiceProvider.GetRequiredService<IAesEncryptionService>();

            // ---- บัญชีพนักงาน ----
            var empIds = await db.Database
                .SqlQueryRaw<long>("SELECT id AS \"Value\" FROM hrms.employee_bank_account WHERE account_number NOT LIKE 'enc:v1:%' OR account_hash IS NULL")
                .ToListAsync(stoppingToken);
            if (empIds.Count > 0)
            {
                var takenHashes = (await db.EmployeeBankAccounts.AsNoTracking()
                        .Where(b => b.AccountHash != null && (b.Status == "ACTIVE" || b.Status == "PENDING_VERIFY") && !empIds.Contains(b.Id))
                        .Select(b => new { b.BankId, b.AccountHash })
                        .ToListAsync(stoppingToken))
                    .Select(x => $"{x.BankId}:{x.AccountHash}")
                    .ToHashSet();

                var rows = await db.EmployeeBankAccounts.Where(b => empIds.Contains(b.Id)).OrderBy(b => b.Id).ToListAsync(stoppingToken);
                foreach (var row in rows)
                {
                    var hash = crypto.HashAccountNumber(row.AccountNumber);
                    var key = $"{row.BankId}:{hash}";
                    bool counts = row.Status is "ACTIVE" or "PENDING_VERIFY";
                    if (counts && takenHashes.Contains(key))
                    {
                        _logger.LogWarning("บัญชีธนาคารพนักงาน #{EmployeeId} (แถว {Id}) เลขซ้ำกับพนักงานอื่น — ไม่ใส่ account_hash กรุณาตรวจสอบ", row.EmployeeId, row.Id);
                    }
                    else
                    {
                        row.AccountHash = hash;
                        if (counts) takenHashes.Add(key);
                    }
                    db.Entry(row).Property(b => b.AccountNumber).IsModified = true; // เขียนกลับผ่าน converter = เข้ารหัส
                }
                await db.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("เข้ารหัสเลขบัญชีพนักงานแล้ว {Count} รายการ", rows.Count);
            }

            // ---- บัญชีบริษัท ----
            var compIds = await db.Database
                .SqlQueryRaw<long>("SELECT id AS \"Value\" FROM hrms.company_bank_account WHERE account_number NOT LIKE 'enc:v1:%'")
                .ToListAsync(stoppingToken);
            if (compIds.Count > 0)
            {
                var rows = await db.CompanyBankAccounts.Where(b => compIds.Contains(b.Id)).ToListAsync(stoppingToken);
                foreach (var row in rows)
                    db.Entry(row).Property(b => b.AccountNumber).IsModified = true;
                await db.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("เข้ารหัสเลขบัญชีบริษัทแล้ว {Count} รายการ", rows.Count);
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "เข้ารหัสเลขบัญชีธนาคารเดิมไม่สำเร็จ (ตรวจว่ารัน bank_account_hardening.sql แล้ว)");
        }
    }
}
