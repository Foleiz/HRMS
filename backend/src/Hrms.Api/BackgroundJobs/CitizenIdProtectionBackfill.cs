using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Api.BackgroundJobs;

/// <summary>
/// งานตอนเปิดระบบ (รันซ้ำได้ ทำเฉพาะแถวที่ยังไม่เรียบร้อย) สำหรับเลขบัตรประชาชนของพนักงาน + สมาชิกครอบครัว:
///  1) เข้ารหัส citizen_id ที่ยังเป็นตัวเลขล้วน (enc:v1 ผ่าน EF converter)
///  2) คืนเลขจาก citizen_id_encrypted (bytea) กรณี citizen_id ว่าง แล้วล้าง citizen_id_encrypted ทิ้ง (เลิกเก็บซ้ำ)
///  3) สร้าง citizen_id_masked ใหม่ให้เปิดเผยแค่ 4 ตัวท้าย (รูปแบบเก่าเปิดเผยตัวหน้าด้วย)
///  4) เลขประกันสังคมแบบปิดบัง (social_security_no_masked) ใช้รูปแบบใหม่เช่นกัน
/// ต้องรัน scripts/citizen_id_hardening.sql ก่อน (citizen_id varchar(255))
/// </summary>
public class CitizenIdProtectionBackfill : BackgroundService
{
    private const string NeedsWorkSql =
        "(citizen_id IS NOT NULL AND citizen_id <> '' AND citizen_id NOT LIKE 'enc:v1:%')" +
        " OR citizen_id_encrypted IS NOT NULL" +
        " OR (citizen_id_masked IS NOT NULL AND citizen_id_masked !~ '^x')" +
        " OR (citizen_id IS NOT NULL AND citizen_id <> '' AND citizen_id_masked IS NULL)";

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

            string? Decrypt(byte[]? bytes)
            {
                if (bytes is not { Length: > 0 }) return null;
                try { return crypto.Decrypt(bytes); } catch { return null; }
            }

            // ---- พนักงาน ----
            var empIds = await db.Database
                .SqlQueryRaw<long>($"SELECT id AS \"Value\" FROM hrms.employee WHERE {NeedsWorkSql}")
                .ToListAsync(stoppingToken);
            if (empIds.Count > 0)
            {
                var rows = await db.Employees.Where(e => empIds.Contains(e.Id)).ToListAsync(stoppingToken);
                foreach (var row in rows)
                {
                    var plain = string.IsNullOrWhiteSpace(row.CitizenId) ? Decrypt(row.CitizenIdEncrypted) : row.CitizenId.Trim();
                    if (string.IsNullOrEmpty(plain))
                    {
                        // ถอดรหัสไม่ได้ (key ไม่ตรง) — ไม่ลบข้อมูลทิ้ง
                        if (row.CitizenIdEncrypted is { Length: > 0 })
                            _logger.LogWarning("พนักงาน #{Id}: ถอดรหัส citizen_id_encrypted ไม่ได้ — ข้ามไว้ก่อน", row.Id);
                        continue;
                    }
                    row.CitizenId = plain;
                    row.CitizenIdEncrypted = null;
                    row.CitizenIdMasked = crypto.MaskCitizenId(plain);
                    db.Entry(row).Property(e => e.CitizenId).IsModified = true; // เขียนกลับผ่าน converter = เข้ารหัส
                }
                await db.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("ปรับเลขบัตรประชาชนพนักงานแล้ว {Count} รายการ (เข้ารหัส + ปิดบังเหลือ 4 ตัวท้าย)", rows.Count);
            }

            // ---- สมาชิกครอบครัว ----
            var famIds = await db.Database
                .SqlQueryRaw<long>($"SELECT id AS \"Value\" FROM hrms.family_member WHERE {NeedsWorkSql}")
                .ToListAsync(stoppingToken);
            if (famIds.Count > 0)
            {
                var rows = await db.FamilyMembers.Where(f => famIds.Contains(f.Id)).ToListAsync(stoppingToken);
                foreach (var row in rows)
                {
                    var plain = string.IsNullOrWhiteSpace(row.CitizenId) ? Decrypt(row.CitizenIdEncrypted) : row.CitizenId.Trim();
                    if (string.IsNullOrEmpty(plain))
                    {
                        if (row.CitizenIdEncrypted is { Length: > 0 })
                            _logger.LogWarning("สมาชิกครอบครัว #{Id}: ถอดรหัส citizen_id_encrypted ไม่ได้ — ข้ามไว้ก่อน", row.Id);
                        continue;
                    }
                    row.CitizenId = plain;
                    row.CitizenIdEncrypted = null;
                    row.CitizenIdMasked = crypto.MaskCitizenId(plain);
                    db.Entry(row).Property(f => f.CitizenId).IsModified = true;
                }
                await db.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("ปรับเลขบัตรประชาชนสมาชิกครอบครัวแล้ว {Count} รายการ", rows.Count);
            }

            // ---- เลขประกันสังคมแบบปิดบัง ----
            var ssoIds = await db.Database
                .SqlQueryRaw<long>("SELECT id AS \"Value\" FROM hrms.employee_social_security WHERE social_security_no_encrypted IS NOT NULL AND (social_security_no_masked IS NULL OR social_security_no_masked !~ '^x')")
                .ToListAsync(stoppingToken);
            if (ssoIds.Count > 0)
            {
                var rows = await db.EmployeeSocialSecurities.Where(s => ssoIds.Contains(s.Id)).ToListAsync(stoppingToken);
                var updated = 0;
                foreach (var row in rows)
                {
                    var plain = Decrypt(row.SocialSecurityNoEncrypted);
                    if (string.IsNullOrEmpty(plain)) continue;
                    row.SocialSecurityNoMasked = crypto.MaskCitizenId(plain);
                    updated++;
                }
                await db.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("ปรับเลขประกันสังคมแบบปิดบังแล้ว {Count} รายการ", updated);
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ปรับเลขบัตรประชาชนเดิมไม่สำเร็จ (ตรวจว่ารัน citizen_id_hardening.sql แล้ว)");
        }
    }
}
