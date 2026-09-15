using System.Net;
using System.Text.Json;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Models;

namespace Hrms.Api.Middlewares;

/// <summary>
/// Middleware ดักจับ Exception กลางของระบบทั้งหมด
/// คอยแปลง Error ให้ออกมาเป็น ApiResponse<object> ที่ได้มาตรฐานเสมอ
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "เกิดข้อผิดพลาดในการประมวลผลคำขอ: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex, _env);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception, IHostEnvironment env)
    {
        context.Response.ContentType = "application/json";

        var statusCode = HttpStatusCode.InternalServerError;
        var message = "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง";
        List<string>? errors = null;

        switch (exception)
        {
            case NotFoundException notFoundEx:
                statusCode = HttpStatusCode.NotFound;
                message = notFoundEx.Message;
                break;

            case ForbiddenException forbiddenEx:
                statusCode = HttpStatusCode.Forbidden;
                message = forbiddenEx.Message;
                break;

            case BusinessRuleException businessEx:
                statusCode = HttpStatusCode.BadRequest;
                message = businessEx.Message;
                break;

            case ValidationException valEx:
                statusCode = HttpStatusCode.BadRequest;
                message = valEx.Message;
                errors = valEx.Errors;
                break;

            default:
                // เฉพาะโหมด Development: แนบข้อความ Exception จริง (รวม InnerException ซึ่งมักเป็นสาเหตุจริง
                // เช่น จาก Postgres/EF Core) ต่อท้ายไปด้วย เพื่อให้เห็นสาเหตุที่แท้จริงได้ทันทีจากหน้าเว็บ
                // แทนที่จะเห็นแค่ข้อความกำกวมนี้เฉย ๆ (โหมด Production จะไม่แสดง เพื่อความปลอดภัย)
                if (env.IsDevelopment())
                {
                    var detail = exception.InnerException?.Message ?? exception.Message;
                    message = $"{message} [Detail: {detail}]";
                }
                break;
        }

        context.Response.StatusCode = (int)statusCode;
        var response = ApiResponse<object>.Fail(message, errors);

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
    }
}
