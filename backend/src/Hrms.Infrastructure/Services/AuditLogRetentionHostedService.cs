using System.Text.Json;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// บริการเบื้องหลังสำหรับบังคับใช้นโยบายเก็บรักษาและทำนิรนามข้อมูลส่วนบุคคลใน Audit Log (PDPA Retention & Anonymization Policy)
/// - ทำ Anonymize ข้อมูล PII ใน old_value ของแถว DELETE ที่เก่าเกินกำหนด (ค่าเริ่มต้น 365 วัน)
/// - ลบประวัติที่พ้นกำหนดอายุความตามกฎหมาย (ค่าเริ่มต้น 1,825 วัน / 5 ปี) โดยเปิด Session Flag เฉพาะใน Transaction
/// </summary>
public sealed class AuditLogRetentionHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuditLogRetentionHostedService> _logger;

    public AuditLogRetentionHostedService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<AuditLogRetentionHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // รอให้ระบบสตาร์ทและอัปเกรด Schema เสร็จก่อน 2 นาที
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            var enabled = _configuration.GetValue("AuditRetention:Enabled", true);
            var intervalHours = Math.Max(1, _configuration.GetValue("AuditRetention:RunIntervalHours", 24));

            if (enabled)
            {
                try
                {
                    await RunRetentionCycleAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "AuditLogRetentionHostedService: เกิดข้อผิดพลาดระหว่างรันรอบจัดการข้อมูลเก่า");
                }
            }

            try
            {
                await Task.Delay(TimeSpan.FromHours(intervalHours), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task RunRetentionCycleAsync(CancellationToken cancellationToken)
    {
        int anonymizeDays = Math.Max(30, _configuration.GetValue("AuditRetention:AnonymizeDeletedPiiAfterDays", 365));
        int retainDays = Math.Max(anonymizeDays, _configuration.GetValue("AuditRetention:RetainLogsDays", 1825));

        var anonymizeCutoff = DateTime.UtcNow.AddDays(-anonymizeDays);
        var purgeCutoff = DateTime.UtcNow.AddDays(-retainDays);

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();

        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);

        // เปิด Session Flag เฉพาะภายใน Transaction นี้เพื่อให้ Trigger อนุญาตเฉพาะงาน Retention ตามนโยบาย
        await db.Database.ExecuteSqlRawAsync("SELECT set_config('hrms.allow_audit_maintenance', 'on', true);", cancellationToken);

        // 1. ทำนิรนาม (Anonymize) ฟิลด์ข้อมูลส่วนบุคคลใน old_value ของแถว DELETE ที่พ้นระยะเวลาเก็บข้อมูลดิบ
        int anonymizedCount = await db.Database.ExecuteSqlInterpolatedAsync($@"
            UPDATE hrms.audit_log
            SET old_value = (
                    old_value
                    - 'PersonalPhone' - 'PersonalEmail' - 'PrimaryPhone' - 'SecondaryPhone'
                    - 'AddressLine' - 'Address' - 'BirthDate' - 'CitizenId' - 'SocialSecurityNo' - 'AccountNumber'
                ) || jsonb_build_object('_pdpaAnonymizedAt', CURRENT_TIMESTAMP),
                subject_employee_name = CASE WHEN subject_employee_name IS NOT NULL THEN '[ANONYMIZED]' ELSE NULL END,
                metadata = COALESCE(metadata, '{{}}'::jsonb) || '{{""piiAnonymized"": true}}'::jsonb
            WHERE audit_action = 'DELETE'
              AND old_value IS NOT NULL
              AND jsonb_typeof(old_value) = 'object'
              AND created_at < {anonymizeCutoff}
              AND COALESCE((metadata->>'piiAnonymized')::boolean, false) = false;
        ", cancellationToken);

        // 2. ลบประวัติที่เก่าเกินอายุความเก็บรักษาสูงสุด (เช่น 5 ปี) ยกเว้นแถว CLEANUP เอง
        int purgedCount = await db.Database.ExecuteSqlInterpolatedAsync($@"
            DELETE FROM hrms.audit_log
            WHERE created_at < {purgeCutoff}
              AND audit_action <> 'CLEANUP';
        ", cancellationToken);

        if (anonymizedCount > 0 || purgedCount > 0)
        {
            db.AuditLogs.Add(new AuditLog
            {
                Action = "CLEANUP",
                EntityType = "AUDIT_LOG",
                FieldName = "RetentionPolicy",
                NewValue = JsonSerializer.Serialize(new
                {
                    anonymizedDeleteLogs = anonymizedCount,
                    purgedExpiredLogs = purgedCount,
                    anonymizeAfterDays = anonymizeDays,
                    retainDays
                }),
                Metadata = JsonSerializer.Serialize(new
                {
                    anonymizedCount,
                    purgedCount,
                    anonymizeDays,
                    retainDays
                }),
                ActorType = "SYSTEM",
                ActorUsername = "SYSTEM",
                ActorName = "ระบบจัดการข้อมูลตามนโยบาย PDPA",
                ActorRole = "SYSTEM",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "AuditLogRetentionHostedService: ทำนิรนามแถว DELETE {Anonymized} รายการ และล้าง Log เกินกำหนด {Purged} รายการ",
                anonymizedCount, purgedCount);
        }

        await tx.CommitAsync(cancellationToken);
    }
}
