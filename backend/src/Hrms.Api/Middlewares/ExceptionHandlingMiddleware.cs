using System.Net;
using System.Text.Json;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Models;
using Microsoft.EntityFrameworkCore;

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
                message = valEx.Errors?.Count == 1 ? valEx.Errors[0] : valEx.Message;
                errors = valEx.Errors;
                break;

            case DbUpdateException dbEx when dbEx.InnerException?.Message.Contains("23503") == true || dbEx.Message.Contains("23503"):
                statusCode = HttpStatusCode.BadRequest;
                message = "ไม่สามารถลบหรือแก้ไขข้อมูลนี้ได้ เนื่องจากมีข้อมูลอื่นในระบบกำลังเชื่อมโยงหรือใช้งานอยู่ (Foreign Key Constraint)";
                break;

            case DbUpdateException dbEx when dbEx.InnerException?.Message.Contains("23505") == true || dbEx.Message.Contains("23505"):
                statusCode = HttpStatusCode.BadRequest;
                message = "ไม่สามารถบันทึกได้ เนื่องจากข้อมูลซ้ำกับที่มีอยู่แล้วในระบบ";
                break;

            default:
                // ไม่ส่งข้อความ Exception ดิบ (เช่น error ของ Postgres) ให้หน้าเว็บ — ดูสาเหตุจริงได้จาก log ฝั่ง server
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
