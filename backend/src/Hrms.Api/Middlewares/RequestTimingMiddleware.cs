using System.Data.Common;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Hrms.Api.Middlewares;

/// <summary>
/// นับจำนวน query และเวลาที่ใช้คุยกับฐานข้อมูลต่อ 1 คำขอ (ใช้หาว่า endpoint ไหนช้าเพราะยิง query เยอะ)
/// ผลแสดงใน log ของ backend และ header "Server-Timing" (เปิดดูได้ใน DevTools → Network → Timing)
/// </summary>
public sealed class RequestDbStats
{
    private static readonly AsyncLocal<RequestDbStats?> CurrentHolder = new();
    public static RequestDbStats? Current { get => CurrentHolder.Value; set => CurrentHolder.Value = value; }

    private int _count;
    private long _dbTicks;
    public int QueryCount => _count;
    public double DbMilliseconds => _dbTicks * 1000.0 / Stopwatch.Frequency;

    public void Add(TimeSpan duration)
    {
        Interlocked.Increment(ref _count);
        Interlocked.Add(ref _dbTicks, (long)(duration.TotalSeconds * Stopwatch.Frequency));
    }
}

/// <summary>EF Core interceptor ที่บันทึกทุกคำสั่ง SQL ที่ส่งไปฐานข้อมูลเข้า RequestDbStats ของคำขอปัจจุบัน</summary>
public sealed class QueryCountingInterceptor : DbCommandInterceptor
{
    public override DbDataReader ReaderExecuted(DbCommand command, CommandExecutedEventData eventData, DbDataReader result)
    { RequestDbStats.Current?.Add(eventData.Duration); return result; }

    public override ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command, CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
    { RequestDbStats.Current?.Add(eventData.Duration); return ValueTask.FromResult(result); }

    public override int NonQueryExecuted(DbCommand command, CommandExecutedEventData eventData, int result)
    { RequestDbStats.Current?.Add(eventData.Duration); return result; }

    public override ValueTask<int> NonQueryExecutedAsync(DbCommand command, CommandExecutedEventData eventData, int result, CancellationToken cancellationToken = default)
    { RequestDbStats.Current?.Add(eventData.Duration); return ValueTask.FromResult(result); }

    public override object? ScalarExecuted(DbCommand command, CommandExecutedEventData eventData, object? result)
    { RequestDbStats.Current?.Add(eventData.Duration); return result; }

    public override ValueTask<object?> ScalarExecutedAsync(DbCommand command, CommandExecutedEventData eventData, object? result, CancellationToken cancellationToken = default)
    { RequestDbStats.Current?.Add(eventData.Duration); return ValueTask.FromResult(result); }
}

public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments("/api"))
        {
            await _next(context);
            return;
        }

        var stats = new RequestDbStats();
        RequestDbStats.Current = stats;
        var sw = Stopwatch.StartNew();

        context.Response.OnStarting(() =>
        {
            var total = sw.Elapsed.TotalMilliseconds;
            context.Response.Headers["Server-Timing"] =
                $"db;desc=\"{stats.QueryCount} queries\";dur={stats.DbMilliseconds:0}, total;dur={total:0}";
            context.Response.Headers["X-Query-Count"] = stats.QueryCount.ToString();
            return Task.CompletedTask;
        });

        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            var ms = sw.Elapsed.TotalMilliseconds;
            // แจ้งเตือนเฉพาะคำขอที่ช้าหรือยิง query เยอะ เพื่อไม่ให้ log รก
            if (ms >= 1000 || stats.QueryCount >= 10)
            {
                _logger.LogWarning("[SLOW] {Method} {Path} -> {Status} ใช้ {Total:0} ms, query {Count} ครั้ง (DB {Db:0} ms)",
                    context.Request.Method, context.Request.Path + context.Request.QueryString,
                    context.Response.StatusCode, ms, stats.QueryCount, stats.DbMilliseconds);
            }
            RequestDbStats.Current = null;
        }
    }
}
