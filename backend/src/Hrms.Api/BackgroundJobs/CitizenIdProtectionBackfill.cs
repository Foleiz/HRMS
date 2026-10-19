using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Api.BackgroundJobs;

/// <summary>
/// งานครั้งเดียวตอนเปิดระบบ: เข้ารหัสเลขบัตรประชาชนเดิมที่ยังเป็นตัวเลขล้วน (พนักงาน + สมาชิกครอบครัว)
/// และเติม citizen_id_encrypted / citizen_id_masked ที่ยังว่าง — รันซ้ำได้ ทำเฉพาะแถวที่ยังไม่ได้ทำ
/// ต้องรัน scripts/citizen_id_hardening.sql ก่อน (ขยายคอลัมน์ citizen_id เป็น varchar(255))
/// </summary>
public class CitizenIdProtectionBackfill : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CitizenIdProtectionBackfill> _logger;

    public CitizenIdProtectionBackfill(IServiceScopeFactory scopeFactory, ILogger<CitizenIdProtectionBackfill> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
            var crypto = scope.ServiceProvider.GetRequiredService<IAesEncryptionService>();

            // ---- พนักงาน ----
            var empIds = await db.Database
                .SqlQueryRaw<long>("SELECT id AS \"Value\" FROM hrms.employee WHERE (citizen_id IS NOT NULL AND citizen_id <> '' AND citizen_id NOT LIKE 'enc:v1:%') OR (citizen_id IS NOT NULL AND citizen_id <> '' AND (citizen_id_encrypted IS NULL OR citizen_id_masked IS NULL))")
                .ToListAsync(stoppingToken);
            if (empIds.Count > 0)
            {
                var rows = await db.Employees.Where(e => empIds.Contains(e.Id)).ToListAsync(stoppingToken);
                foreach (var row in rows)
                {
                    var plain = row.CitizenId?.Trim();
                    if (string.IsNullOrEmpty(plain)) continue;
                    if (row.CitizenIdEncrypted is not { Length: > 0 }) row.CitizenIdEncrypted = crypto.Encrypt(plain);
                    if (string.IsNullOrWhiteSpace(row.CitizenIdMasked)) row.CitizenIdMasked = crypto.MaskCitizenId(plain);
                    db.Entry(row).Property(e => e.CitizenId).IsModified = true; // เขียนกลับผ่าน converter = เข้ารหัส
                }
                await db.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("เข้ารหัสเลขบัตรประชาชนพนักงานแล้ว {Count} รายการ", rows.Count);
            }

            // ---- สมาชิกครอบครัว ----
            var famIds = await db.Database
                .SqlQueryRaw<long>("SELECT id AS \"Value\" FROM hrms.family_member WHERE (citizen_id IS NOT NULL AND citizen_id <> '' AND citizen_id NOT LIKE 'enc:v1:%') OR (citizen_id IS NOT NULL AND citizen_id <> '' AND (citizen_id_encrypted IS NULL OR citizen_id_masked IS NULL))")
                .ToListAsync(stoppingToken);
            if (famIds.Count > 0)
            {
                var rows = await db.FamilyMembers.Where(f => famIds.Contains(f.Id)).ToListAsync(stoppingToken);
                foreach (var row in rows)
                {
                    var plain = row.CitizenId?.Trim();
                    if (string.IsNullOrEmpty(plain)) continue;
                    if (row.CitizenIdEncrypted is not { Length: > 0 }) row.CitizenIdEncrypted = crypto.Encrypt(plain);
                    if (string.IsNullOrWhiteSpace(row.CitizenIdMasked)) row.CitizenIdMasked = crypto.MaskCitizenId(plain);
                    db.Entry(row).Property(f => f.CitizenId).IsModified = true;
                }
                await db.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("เข้ารหัสเลขบัตรประชาชนสมาชิกครอบครัวแล้ว {Count} รายการ", rows.Count);
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "เข้ารหัสเลขบัตรประชาชนเดิมไม่สำเร็จ (ตรวจว่ารัน citizen_id_hardening.sql แล้ว)");
        }
    }
}
