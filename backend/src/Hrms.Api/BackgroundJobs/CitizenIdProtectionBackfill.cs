using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Api.BackgroundJobs;

/// <summary>
/// งานตอนเปิดระบบ (รันซ้ำได้ ทำเฉพาะแถวที่ยังไม่เรียบร้อย):
///  1) เลขบัตรประชาชนพนักงาน + สมาชิกครอบครัวที่ยังเป็นตัวเลขล้วน → เข้ารหัส (enc:v1 ผ่าน EF converter)
///  2) citizen_id_masked ให้เปิดเผยแค่ 4 ตัวท้าย
///  3) เลขประกันสังคม: ถ้ายังไม่มีตัวเข้ารหัส ใช้เลขบัตรประชาชนของพนักงาน (เลขเดียวกัน) + ปิดบังรูปแบบใหม่
/// </summary>
public class CitizenIdProtectionBackfill : BackgroundService
{
    private const string NeedsWorkSql =
        "(citizen_id IS NOT NULL AND citizen_id <> '' AND citizen_id NOT LIKE 'enc:v1:%')" +
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

            // ---- พนักงาน ----
            var empIds = await db.Database
                .SqlQueryRaw<long>("SELECT id AS \"Value\" FROM hrms.employee WHERE " + NeedsWorkSql)
                .ToListAsync(stoppingToken);
            if (empIds.Count > 0)
            {
                var rows = await db.Employees.Where(e => empIds.Contains(e.Id)).ToListAsync(stoppingToken);
                foreach (var row in rows)
                {
                    var plain = row.CitizenId?.Trim();
                    if (string.IsNullOrEmpty(plain)) continue;
                    row.CitizenId = plain;
                    row.CitizenIdMasked = crypto.MaskCitizenId(plain);
                    db.Entry(row).Property(e => e.CitizenId).IsModified = true; // เขียนกลับผ่าน converter = เข้ารหัส
                }
                await db.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("ปรับเลขบัตรประชาชนพนักงานแล้ว {Count} รายการ", rows.Count);
            }

            // ---- สมาชิกครอบครัว ----
            var famIds = await db.Database
                .SqlQueryRaw<long>("SELECT id AS \"Value\" FROM hrms.family_member WHERE " + NeedsWorkSql)
                .ToListAsync(stoppingToken);
            if (famIds.Count > 0)
            {
                var rows = await db.FamilyMembers.Where(f => famIds.Contains(f.Id)).ToListAsync(stoppingToken);
                foreach (var row in rows)
                {
                    var plain = row.CitizenId?.Trim();
                    if (string.IsNullOrEmpty(plain)) continue;
                    row.CitizenId = plain;
                    row.CitizenIdMasked = crypto.MaskCitizenId(plain);
                    db.Entry(row).Property(f => f.CitizenId).IsModified = true;
                }
                await db.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("ปรับเลขบัตรประชาชนสมาชิกครอบครัวแล้ว {Count} รายการ", rows.Count);
            }

            // ---- เลขประกันสังคม ----
            var ssoIds = await db.Database
                .SqlQueryRaw<long>("SELECT id AS \"Value\" FROM hrms.employee_social_security WHERE social_security_no_encrypted IS NULL OR social_security_no_masked IS NULL OR social_security_no_masked !~ '^x'")
                .ToListAsync(stoppingToken);
            if (ssoIds.Count > 0)
            {
                var rows = await db.EmployeeSocialSecurities.Where(s => ssoIds.Contains(s.Id)).ToListAsync(stoppingToken);
                var empIdsForSso = rows.Select(r => r.EmployeeId).Distinct().ToList();
                var citizenByEmp = (await db.Employees.AsNoTracking()
                        .Where(e => empIdsForSso.Contains(e.Id))
                        .Select(e => new { e.Id, e.CitizenId })
                        .ToListAsync(stoppingToken))
                    .ToDictionary(x => x.Id, x => x.CitizenId);

                var updated = 0;
                foreach (var row in rows)
                {
                    string? plain = null;
                    if (row.SocialSecurityNoEncrypted is { Length: > 0 })
                    {
                        try { plain = crypto.Decrypt(row.SocialSecurityNoEncrypted); } catch { plain = null; }
                    }
                    if (string.IsNullOrWhiteSpace(plain) && citizenByEmp.TryGetValue(row.EmployeeId, out var cid) && !string.IsNullOrWhiteSpace(cid))
                    {
                        // เลขประกันสังคมใช้เลขเดียวกับบัตรประชาชน
                        plain = cid.Trim();
                        row.SocialSecurityNoEncrypted = crypto.Encrypt(plain);
                    }
                    if (string.IsNullOrWhiteSpace(plain)) continue;
                    row.SocialSecurityNoMasked = crypto.MaskCitizenId(plain);
                    updated++;
                }
                await db.SaveChangesAsync(stoppingToken);
                _logger.LogInformation("ปรับเลขประกันสังคมแล้ว {Count} รายการ", updated);
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ปรับเลขบัตรประชาชน/ประกันสังคมเดิมไม่สำเร็จ");
        }
    }
}
