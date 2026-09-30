using Hrms.Application.Features.EmployeeDocuments.Services;

namespace Hrms.Api.BackgroundJobs;

/// <summary>
/// งานเบื้องหลัง: ตรวจเอกสารพนักงานใกล้หมดอายุ / หมดอายุ แล้วส่งแจ้งเตือน
/// รันครั้งแรกหลังเปิดระบบ 1 นาที จากนั้นทุก 6 ชั่วโมง (เอกสารแต่ละใบแจ้งแต่ละสถานะครั้งเดียว)
/// </summary>
public class DocumentExpiryWorker : BackgroundService
{
    private static readonly TimeSpan FirstRunDelay = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DocumentExpiryWorker> _logger;

    public DocumentExpiryWorker(IServiceScopeFactory scopeFactory, ILogger<DocumentExpiryWorker> logger)
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
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var notifier = scope.ServiceProvider.GetRequiredService<IDocumentExpiryNotifier>();
                var result = await notifier.RunAsync(stoppingToken);
                if (result.ExpiringSoonNotified > 0 || result.ExpiredNotified > 0)
                {
                    _logger.LogInformation(
                        "แจ้งเตือนเอกสารใกล้หมดอายุ {Expiring} รายการ / หมดอายุ {Expired} รายการ",
                        result.ExpiringSoonNotified, result.ExpiredNotified);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // ห้ามทำให้ระบบหลักล้ม — รอรอบถัดไป
                _logger.LogError(ex, "ตรวจเอกสารใกล้หมดอายุไม่สำเร็จ");
            }

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
}
