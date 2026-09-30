using Hrms.Application.Features.Approvals.Services;
using Hrms.Application.Features.Contracts.Services;
using Hrms.Application.Features.EmployeeDocuments.Services;
using Hrms.Application.Features.Leave.Services;

namespace Hrms.Api.BackgroundJobs;

/// <summary>
/// งานเบื้องหลังส่งแจ้งเตือนตามเวลา (ขอบเขต: การอนุมัติและการแจ้งเตือน)
/// - เอกสารพนักงานใกล้หมดอายุ / หมดอายุ
/// - สิ้นสุดทดลองงาน / สัญญาจ้างใกล้หมดอายุ
/// - เตือนรายการค้างอนุมัติเกิน 2 วัน (เตือนซ้ำทุก 2 วัน)
/// - ตัดยอดวันลายกมาที่หมดอายุแล้ว (ส่วนที่ยังไม่ได้ใช้)
/// รันครั้งแรกหลังเปิดระบบ 1 นาที จากนั้นทุก 6 ชั่วโมง — แต่ละงานแยก try/catch ไม่ให้ล้มพร้อมกัน
/// </summary>
public class ScheduledNotificationWorker : BackgroundService
{
    private static readonly TimeSpan FirstRunDelay = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);
    public const int PendingApprovalReminderDays = 2;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScheduledNotificationWorker> _logger;

    public ScheduledNotificationWorker(IServiceScopeFactory scopeFactory, ILogger<ScheduledNotificationWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(FirstRunDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            await RunJobAsync("เอกสารใกล้หมดอายุ", async sp =>
            {
                var r = await sp.GetRequiredService<IDocumentExpiryNotifier>().RunAsync(stoppingToken);
                return r.ExpiringSoonNotified + r.ExpiredNotified;
            }, stoppingToken);

            await RunJobAsync("ทดลองงาน/สัญญาจ้าง", async sp =>
            {
                var r = await sp.GetRequiredService<IContractAlertNotifier>().RunAsync(stoppingToken);
                return r.ProbationNotified + r.ContractExpiryNotified;
            }, stoppingToken);

            await RunJobAsync("รายการค้างอนุมัติ", sp =>
                sp.GetRequiredService<IApprovalWorkflowService>().SendPendingRemindersAsync(PendingApprovalReminderDays, stoppingToken),
                stoppingToken);

            await RunJobAsync("ยอดวันลายกมาหมดอายุ", sp =>
                sp.GetRequiredService<ILeaveYearEndService>().ExpireCarryForwardAsync(stoppingToken),
                stoppingToken);

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task RunJobAsync(string name, Func<IServiceProvider, Task<int>> job, CancellationToken stoppingToken)
    {
        if (stoppingToken.IsCancellationRequested) return;
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var count = await job(scope.ServiceProvider);
            if (count > 0) _logger.LogInformation("แจ้งเตือน{Job} {Count} รายการ", name, count);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            // ห้ามทำให้ระบบหลักล้ม — รอรอบถัดไป
            _logger.LogError(ex, "งานแจ้งเตือน{Job} ไม่สำเร็จ", name);
        }
    }
}
