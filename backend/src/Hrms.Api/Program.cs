using System.Text;
using Hrms.Api.Middlewares;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Announcements.Services;
using Hrms.Application.Features.Approvals.Services;
using Hrms.Application.Features.Attendance.Services;
using Hrms.Application.Features.Auth.Services;
using Hrms.Application.Features.Contracts.Services;
using Hrms.Application.Features.Employees.Services;
using Hrms.Application.Features.MasterData.Services;
using Hrms.Application.Features.Organization.Services;
using Hrms.Application.Features.Schedule.Services;
using Hrms.Application.Features.Reports.Services;
using Hrms.Application.Features.Shift.Services;
using Hrms.Application.Features.Notifications.Services;
using Hrms.Application.Features.Leave.Services;
using Hrms.Application.Features.Settings.Services;
using Hrms.Application.Features.Transfers.Services;
using Hrms.Application.Features.WorkCalendar.Services;
using Hrms.Application.Features.Certificates.Services;
using Hrms.Application.Features.Resignation.Services;
using Hrms.Application.Features.Payroll.Services;
using Hrms.Infrastructure.Persistence;
using Hrms.Infrastructure.Persistence.Interceptors;
using Hrms.Infrastructure.Security;
using Hrms.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

using System.Globalization;

// Enforce InvariantCulture globally so dates consistently use Gregorian calendar
CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.InvariantCulture;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Connection (PostgreSQL - Schema: hrms)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddScoped<AuditSaveChangesInterceptor>();
builder.Services.AddSingleton<QueryCountingInterceptor>();
builder.Services.AddDbContext<HrmsDbContext>((sp, options) =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "hrms");
    });
    options.AddInterceptors(sp.GetRequiredService<AuditSaveChangesInterceptor>(), sp.GetRequiredService<QueryCountingInterceptor>());
});

builder.Services.AddScoped<IHrmsDbContext>(provider => provider.GetRequiredService<HrmsDbContext>());

// 2. Core Infrastructure & Security Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddSingleton<IAesEncryptionService, AesEncryptionService>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<UserAccessLoader>();
builder.Services.AddScoped<IDataScopeService, DataScopeService>();

// 3. Application Services DI
builder.Services.AddScoped<IBankService, BankService>();
builder.Services.AddScoped<IDocumentTypeService, DocumentTypeService>();
builder.Services.AddScoped<ILookupMasterService, LookupMasterService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IOrganizationService, OrganizationService>();
builder.Services.AddScoped<ICompanyBankAccountService, CompanyBankAccountService>();
builder.Services.AddScoped<IWorkCalendarService, WorkCalendarService>();
builder.Services.AddScoped<IShiftService, ShiftService>();
builder.Services.AddScoped<IEmployeeShiftService, EmployeeShiftService>();
builder.Services.AddScoped<IAttendanceDailyService, AttendanceDailyService>();
builder.Services.AddScoped<IAttendanceImportService, AttendanceImportService>();
builder.Services.AddScoped<IEmploymentContractService, EmploymentContractService>();
builder.Services.AddScoped<IAttendanceAdjustmentService, AttendanceAdjustmentService>();
builder.Services.AddScoped<IOperationalReportService, OperationalReportService>();
builder.Services.AddScoped<IEmployeeTypeService, EmployeeTypeService>();
builder.Services.AddScoped<IBenefitService, BenefitService>();
builder.Services.AddScoped<IBenefitClaimRequestService, BenefitClaimRequestService>();
builder.Services.AddScoped<IEmployeeTransferService, EmployeeTransferService>();
builder.Services.AddScoped<ILeaveTypeService, LeaveTypeService>();
builder.Services.AddScoped<ILeavePolicyService, LeavePolicyService>();
builder.Services.AddScoped<ILeaveBalanceService, LeaveBalanceService>();
builder.Services.AddScoped<ILeaveEntitlementSync, LeaveEntitlementSync>();
builder.Services.AddScoped<ILeaveInsightsService, LeaveInsightsService>();
builder.Services.AddScoped<ILeaveYearEndService, LeaveYearEndService>();
builder.Services.AddScoped<ILeaveRequestService, LeaveRequestService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IApprovalFlowService, ApprovalFlowService>();
builder.Services.AddScoped<IApprovalWorkflowService, ApprovalWorkflowService>();
builder.Services.AddScoped<ISalaryService, SalaryService>();
builder.Services.AddScoped<IMySalaryService, MySalaryService>();
builder.Services.AddScoped<IPayslipService, PayslipService>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ICertificateService, CertificateService>();
builder.Services.AddScoped<Hrms.Application.Features.GeneralRequests.Services.IGeneralRequestService, Hrms.Application.Features.GeneralRequests.Services.GeneralRequestService>();
builder.Services.AddScoped<Hrms.Application.Features.Employees.Services.IEmployeeChangeHistoryService, Hrms.Application.Features.Employees.Services.EmployeeChangeHistoryService>();
builder.Services.AddScoped<Hrms.Application.Features.EmployeeDocuments.Services.IEmployeeDocumentService, Hrms.Application.Features.EmployeeDocuments.Services.EmployeeDocumentService>();
builder.Services.AddScoped<Hrms.Application.Features.EmployeeDocuments.Services.IDocumentExpiryNotifier, Hrms.Application.Features.EmployeeDocuments.Services.DocumentExpiryNotifier>();
builder.Services.AddScoped<Hrms.Application.Features.Contracts.Services.IContractAlertNotifier, Hrms.Application.Features.Contracts.Services.ContractAlertNotifier>();
// งานเบื้องหลัง: แจ้งเตือนเอกสารใกล้หมดอายุ / ทดลองงาน / สัญญาจ้าง / รายการค้างอนุมัติ
builder.Services.AddHostedService<Hrms.Api.BackgroundJobs.ScheduledNotificationWorker>();
// เข้ารหัสเลขบัญชีธนาคารเดิม (ครั้งเดียว ทำเฉพาะแถวที่ยังไม่ได้ทำ)
builder.Services.AddHostedService<Hrms.Api.BackgroundJobs.BankAccountProtectionBackfill>();
builder.Services.AddScoped<IResignationService, ResignationService>();


// 4. JWT Authentication
// กุญแจลับต้องตั้งในค่า config เสมอเมื่อไม่ใช่เครื่องพัฒนา (ห้ามใช้ค่าตั้งต้นที่เขียนไว้ในโค้ด)
if (!builder.Environment.IsDevelopment())
{
    foreach (var requiredKey in new[] { "Jwt:SecretKey", "Encryption:SecretKey" })
    {
        if (string.IsNullOrWhiteSpace(builder.Configuration[requiredKey]))
            throw new InvalidOperationException($"ยังไม่ได้ตั้งค่า {requiredKey} (ตั้งผ่าน appsettings หรือ environment variable ก่อนเปิดระบบ)");
    }
}

var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] ?? "HrmsSecretKeyForEnterpriseSystemSecurity2026!@#VeryLongKeyForHmacSha256";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "HrmsApi",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "HrmsClient",
        ClockSkew = TimeSpan.Zero
    };
    // ใช้สถานะ/สิทธิ์ล่าสุดจากฐานข้อมูลทุกคำขอ: บัญชีที่ถูกระงับหรือลบจะใช้ token เดิมต่อไม่ได้
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async ctx =>
        {
            var sub = ctx.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                      ?? ctx.Principal?.FindFirst("sub")?.Value;
            if (!long.TryParse(sub, out var userId))
            {
                ctx.Fail("token ไม่ถูกต้อง");
                return;
            }
            var loader = ctx.HttpContext.RequestServices.GetRequiredService<UserAccessLoader>();
            var principal = await loader.LoadAsync(userId, JwtBearerDefaults.AuthenticationScheme, ctx.HttpContext.RequestAborted);
            if (principal == null)
            {
                ctx.Fail("บัญชีถูกระงับหรือไม่มีในระบบแล้ว");
                return;
            }
            ctx.Principal = principal;
        }
    };
});

builder.Services.AddAuthorization();

// 5. CORS Policy (สำหรับ Next.js Frontend เช่น localhost, Radmin VPN 26.x.x.x, LAN)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
              {
                  if (string.IsNullOrEmpty(origin)) return false;
                  try
                  {
                      var uri = new Uri(origin);
                      var host = uri.Host;
                      // อนุญาต localhost, 127.0.0.1, Radmin VPN (26.x.x.x), และ Private LAN IP ทั้งหมด
                      return host == "localhost"
                          || host == "127.0.0.1"
                          || host.StartsWith("26.")
                          || host.StartsWith("192.168.")
                          || host.StartsWith("10.")
                          || (host.StartsWith("172.") && uri.HostNameType == UriHostNameType.IPv4);
                  }
                  catch
                  {
                      return false;
                  }
              })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .WithExposedHeaders("X-Refreshed-Token", "Server-Timing", "X-Query-Count");
    });
});

// 6. Controllers & JSON Options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new NullableDateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .SelectMany(e => e.Value!.Errors.Select(x => $"{e.Key}: {x.ErrorMessage}"))
                .ToList();

            var message = errors.Count > 0 ? string.Join("; ", errors) : "ข้อมูลที่ส่งมาไม่ถูกต้อง";
            var response = Hrms.Application.Common.Models.ApiResponse<object>.Fail(message, errors);
            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(response);
        };
    });

// 7. OpenAPI / Swagger Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ตัวเข้ารหัสคอลัมน์ข้อมูลอ่อนไหว (เลขบัญชีธนาคาร) ที่ EF ValueConverter ใช้
SensitiveFieldCipher.Service = app.Services.GetRequiredService<IAesEncryptionService>();

app.UseCors("AllowFrontend");

// วัดเวลา + จำนวน query ต่อคำขอ (log [SLOW] และ header Server-Timing)
app.UseMiddleware<RequestTimingMiddleware>();

// 8. Global Exception Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// 9. Swagger UI
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "HRMS Enterprise API V1");
        c.RoutePrefix = "swagger";
    });
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// 10. Authentication & Authorization Middleware
app.UseAuthentication();
app.UseAuthorization();

// 11. Audit Logging Middleware (HTTP Level)
app.UseMiddleware<AuditLoggingMiddleware>();

app.MapControllers();

// ตรวจสอบและสร้างคอลัมน์แนบเอกสารสัญญาจ้างงาน และ flow_snapshot_json ใน approval_instance อัตโนมัติ (idempotent)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<Hrms.Infrastructure.Persistence.HrmsDbContext>();
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_file_name varchar(255) NULL;
            ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_file_data bytea NULL;
            ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_mime_type varchar(100) NULL;
            ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_file_size bigint NULL;
            ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_uploaded_at timestamptz NULL;

            ALTER TABLE hrms.approval_instance ADD COLUMN IF NOT EXISTS flow_snapshot_json text NULL;
        ");

        // Backfill flow_snapshot_json ให้กับ approval_instance ที่ยังไม่มี snapshot
        var unSnapshottedInstances = await db.ApprovalInstances
            .Include(i => i.ApprovalFlow)!.ThenInclude(f => f!.Steps)!.ThenInclude(s => s.ApproverRole)
            .Include(i => i.ApprovalFlow)!.ThenInclude(f => f!.Steps)!.ThenInclude(s => s.ApproverEmployee)
            .Where(i => i.FlowSnapshotJson == null && i.ApprovalFlow != null)
            .ToListAsync();

        if (unSnapshottedInstances.Any())
        {
            foreach (var inst in unSnapshottedInstances)
            {
                if (inst.ApprovalFlow != null && inst.ApprovalFlow.Steps.Any())
                {
                    inst.FlowSnapshotJson = Hrms.Application.Features.Approvals.Services.ApprovalWorkflowService.SerializeFlowSnapshot(inst.ApprovalFlow);
                }
            }
            await db.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "ไม่สามารถตรวจสอบ schema หรือ backfill snapshot ใน approval_instance ได้");
    }
}

app.Run();

/// <summary>
/// JSON Converter สำหรับ DateOnly? เพื่อรองรับค่าว่าง "" หรือ null ให้แปลงเป็น null ได้อย่างถูกต้อง
/// </summary>
public class NullableDateOnlyJsonConverter : System.Text.Json.Serialization.JsonConverter<DateOnly?>
{
    public override DateOnly? Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
    {
        if (reader.TokenType == System.Text.Json.JsonTokenType.Null)
            return null;

        if (reader.TokenType == System.Text.Json.JsonTokenType.String)
        {
            var str = reader.GetString();
            if (string.IsNullOrWhiteSpace(str))
                return null;

            if (DateOnly.TryParse(str, out var date))
                return date;
        }

        return null;
    }

    public override void Write(System.Text.Json.Utf8JsonWriter writer, DateOnly? value, System.Text.Json.JsonSerializerOptions options)
    {
        if (value.HasValue)
            writer.WriteStringValue(value.Value.ToString("yyyy-MM-dd"));
        else
            writer.WriteNullValue();
    }
}

/// <summary>
/// JSON Converter สำหรับ DateOnly เพื่อรองรับการแปลงวันที่อย่างปลอดภัย
/// </summary>
public class DateOnlyJsonConverter : System.Text.Json.Serialization.JsonConverter<DateOnly>
{
    public override DateOnly Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
    {
        if (reader.TokenType == System.Text.Json.JsonTokenType.String)
        {
            var str = reader.GetString();
            if (!string.IsNullOrWhiteSpace(str) && DateOnly.TryParse(str, out var date))
                return date;
        }
        return default;
    }

    public override void Write(System.Text.Json.Utf8JsonWriter writer, DateOnly value, System.Text.Json.JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString("yyyy-MM-dd"));
    }
}
