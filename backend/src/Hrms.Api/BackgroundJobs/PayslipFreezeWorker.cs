using System.Threading.Channels;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Payroll.Services;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Api.BackgroundJobs;

/// <summary>คิวในหน่วยความจำ (singleton) สำหรับรอบเงินเดือนที่ต้องล็อกสลิป</summary>
public class PayslipFreezeQueue : IPayslipFreezeQueue
{
    private readonly Channel<long> _channel = Channel.CreateUnbounded<long>(new UnboundedChannelOptions { SingleReader = true });

    public ChannelReader<long> Reader => _channel.Reader;

    public void Enqueue(long periodId) => _channel.Writer.TryWrite(periodId);
}

/// <summary>
/// งานเบื้องหลัง: สร้างและเก็บสลิป PDF ของรอบที่จ่าย/ปิดแล้ว ทีละรอบ
/// ตอนเปิดระบบจะเติมคิวด้วยรอบ PAID/CLOSED ทั้งหมด เผื่อระบบปิดไประหว่างทำ (รอบที่ล็อกครบแล้วจะข้ามเร็ว)
/// </summary>
public class PayslipFreezeWorker : BackgroundService
{
    private readonly PayslipFreezeQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PayslipFreezeWorker> _logger;

    public PayslipFreezeWorker(PayslipFreezeQueue queue, IServiceScopeFactory scopeFactory, ILogger<PayslipFreezeWorker> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IHrmsDbContext>();
            var ids = await db.PayrollPeriods.AsNoTracking()
                .Where(p => p.Status == "PAID" || p.Status == "CLOSED")
                .Select(p => p.Id)
                .ToListAsync(stoppingToken);
            foreach (var id in ids) _queue.Enqueue(id);
        }
        catch (OperationCanceledException) { return; }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "PayslipFreeze: เติมคิวตอนเปิดระบบไม่สำเร็จ");
        }

        await foreach (var periodId in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                var started = DateTime.UtcNow;
                using var scope = _scopeFactory.CreateScope();
                var payslips = scope.ServiceProvider.GetRequiredService<IPayslipService>();
                await payslips.FreezePeriodPayslipsAsync(periodId, stoppingToken);
                _logger.LogInformation("PayslipFreeze: รอบ {PeriodId} เสร็จใน {Seconds:F1} วินาที", periodId, (DateTime.UtcNow - started).TotalSeconds);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception ex)
            {
                // ไม่เป็นไร — สลิปที่ยังไม่ได้ล็อกจะถูกสร้างตอนดาวน์โหลดครั้งแรก
                _logger.LogWarning(ex, "PayslipFreeze: รอบ {PeriodId} ไม่สำเร็จ", periodId);
            }
        }
    }
}
