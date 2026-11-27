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
using Hrms.Application.Features.Commission.Services;
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
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<UserAccessLoader>();
builder.Services.AddScoped<IDataScopeService, DataScopeService>();
builder.Services.AddHostedService<AuditLogRetentionHostedService>();

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
builder.Services.AddScoped<ICommissionService, CommissionService>();
builder.Services.AddScoped<IMySalaryService, MySalaryService>();
builder.Services.AddScoped<IPayslipService, PayslipService>();
// ล็อกสลิปของรอบที่จ่าย/ปิดแล้วแบบเบื้องหลัง (ปุ่มจ่าย/ปิดรอบไม่ต้องรอสร้าง PDF)
builder.Services.AddSingleton<Hrms.Api.BackgroundJobs.PayslipFreezeQueue>();
builder.Services.AddSingleton<Hrms.Application.Features.Payroll.Services.IPayslipFreezeQueue>(sp => sp.GetRequiredService<Hrms.Api.BackgroundJobs.PayslipFreezeQueue>());
builder.Services.AddHostedService<Hrms.Api.BackgroundJobs.PayslipFreezeWorker>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ICertificateService, CertificateService>();
builder.Services.AddScoped<Hrms.Application.Features.GeneralRequests.Services.IGeneralRequestService, Hrms.Application.Features.GeneralRequests.Services.GeneralRequestService>();
builder.Services.AddScoped<Hrms.Application.Features.Employees.Services.IEmployeeChangeHistoryService, Hrms.Application.Features.Employees.Services.EmployeeChangeHistoryService>();
builder.Services.AddScoped<Hrms.Application.Features.EmployeeDocuments.Services.IEmployeeDocumentService, Hrms.Application.Features.EmployeeDocuments.Services.EmployeeDocumentService>();
builder.Services.AddScoped<Hrms.Application.Features.EmployeeDocuments.Services.IDocumentExpiryNotifier, Hrms.Application.Features.EmployeeDocuments.Services.DocumentExpiryNotifier>();
builder.Services.AddScoped<Hrms.Application.Features.Contracts.Services.IContractAlertNotifier, Hrms.Application.Features.Contracts.Services.ContractAlertNotifier>();
// งานเบื้องหลัง: แจ้งเตือนเอกสารใกล้หมดอายุ / ทดลองงาน / สัญญาจ้าง / รายการค้างอนุมัติ
// ตัวสร้าง PDF ใบลาออก (เก็บเข้าแฟ้มเอกสารพนักงานตอนอนุมัติครบ)
Hrms.Application.Features.Resignation.Services.ResignationOffboarding.PdfRenderer = new Hrms.Infrastructure.Services.ResignationPdfRenderer();
builder.Services.AddHostedService<Hrms.Api.BackgroundJobs.ScheduledNotificationWorker>();
// เข้ารหัสเลขบัญชีธนาคารเดิม (ครั้งเดียว ทำเฉพาะแถวที่ยังไม่ได้ทำ)
builder.Services.AddHostedService<Hrms.Api.BackgroundJobs.BankAccountProtectionBackfill>();
builder.Services.AddHostedService<Hrms.Api.BackgroundJobs.CitizenIdProtectionBackfill>();
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
                  // Production: ระบุ domain ที่อนุญาตผ่าน config/env เช่น Cors__AllowedOrigins__0=https://hrms.syaco.co.th
                  var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
                  if (configuredOrigins != null && configuredOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)) return true;
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

// 6. Controllers, Rate Limiting & JSON Options
builder.Services.AddRateLimiter(limiterOptions =>
{
    limiterOptions.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    limiterOptions.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json; charset=utf-8";
        var payload = Hrms.Application.Common.Models.ApiResponse<object>.Fail(
            "มีการส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง");
        await context.HttpContext.Response.WriteAsJsonAsync(payload, cancellationToken: token);
    };
    limiterOptions.AddPolicy("AuthEndpoints", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ip,
            factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
});

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

// อยู่หลัง nginx (reverse proxy): เชื่อ X-Forwarded-For / X-Forwarded-Proto เพื่อให้ได้ IP และ scheme จริงของผู้ใช้
// (container เปิดพอร์ตที่ 127.0.0.1 เท่านั้น จึงมีแต่ nginx ในเครื่องที่ส่ง header นี้ได้)
builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                       | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

app.UseForwardedHeaders();

// ตัวเข้ารหัสคอลัมน์ข้อมูลอ่อนไหว (เลขบัญชีธนาคาร) ที่ EF ValueConverter ใช้
SensitiveFieldCipher.Service = app.Services.GetRequiredService<IAesEncryptionService>();

app.UseCors("AllowFrontend");

// อนุญาตให้เบราว์เซอร์โหลด Subresource (รูปภาพโปรไฟล์, เอกสาร) ข้าม Origin ได้โดยไม่ติด Chrome ORB
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("Cross-Origin-Resource-Policy", "cross-origin");
    await next();
});

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

// 10. Authentication, Rate Limiting & Authorization Middleware
app.UseRateLimiter();
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
            ALTER TABLE hrms.role ADD COLUMN IF NOT EXISTS color varchar(30) NULL;
            UPDATE hrms.role SET color = '#2563EB' WHERE (role_code = 'ADMIN' OR role_code = 'SYSTEM_SUPER') AND color IS NULL;
            UPDATE hrms.role SET color = '#059669' WHERE role_code LIKE '%HR%' AND color IS NULL;
            UPDATE hrms.role SET color = '#7C3AED' WHERE (role_code LIKE '%MGR%' OR role_code LIKE '%HEAD%' OR role_code LIKE '%LEAD%') AND color IS NULL;
            UPDATE hrms.role SET color = '#0284C7' WHERE (role_code LIKE '%EMPLOYEE%' OR role_code LIKE '%STAFF%') AND color IS NULL;
            UPDATE hrms.role SET color = '#4F46E5' WHERE color IS NULL;

            ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_file_name varchar(255) NULL;
            ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_file_data bytea NULL;
            ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_mime_type varchar(100) NULL;
            ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_file_size bigint NULL;
            ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_uploaded_at timestamptz NULL;

            ALTER TABLE hrms.approval_instance ADD COLUMN IF NOT EXISTS flow_snapshot_json text NULL;
            ALTER TABLE hrms.attendance_adjustment ADD COLUMN IF NOT EXISTS original_status varchar(30) NULL;
            ALTER TABLE hrms.attendance_adjustment ADD COLUMN IF NOT EXISTS requested_status varchar(30) NULL;
            ALTER TABLE hrms.company ADD COLUMN IF NOT EXISTS leave_include_holidays boolean NOT NULL DEFAULT false;
            ALTER TABLE hrms.leave_policy ADD COLUMN IF NOT EXISTS include_holidays boolean NOT NULL DEFAULT false;

            -- ระบบทีม (Team Master)
            CREATE TABLE IF NOT EXISTS hrms.team (
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                department_id bigint NOT NULL REFERENCES hrms.department(id) ON DELETE CASCADE,
                team_code varchar(50) NOT NULL,
                team_name varchar(255) NOT NULL,
                lead_employee_id bigint NULL REFERENCES hrms.employee(id) ON DELETE SET NULL,
                description text NULL,
                status varchar(20) NOT NULL DEFAULT 'ACTIVE',
                created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_team_dept_code UNIQUE (department_id, team_code)
            );

            ALTER TABLE hrms.employee_assignment ADD COLUMN IF NOT EXISTS team_id bigint NULL REFERENCES hrms.team(id) ON DELETE SET NULL;
            CREATE INDEX IF NOT EXISTS idx_employee_assignment_team_id ON hrms.employee_assignment(team_id) WHERE is_current = true;

            -- Backfill approved_by_employee_id ใน hrms.employee_salary สำหรับข้อมูลเดิมที่ยังเป็น NULL
            UPDATE hrms.employee_salary
            SET approved_by_employee_id = (SELECT id FROM hrms.employee ORDER BY id ASC LIMIT 1)
            WHERE approved_by_employee_id IS NULL;

            -- ตารางรีเซ็ตรหัสผ่านแบบ Self-Service (OTP / Token)
            CREATE TABLE IF NOT EXISTS hrms.password_reset_token (
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                user_account_id bigint NOT NULL REFERENCES hrms.user_account(id) ON DELETE CASCADE,
                token varchar(255) NOT NULL,
                otp_code varchar(10) NULL,
                expires_at timestamptz NOT NULL,
                is_used boolean NOT NULL DEFAULT false,
                failed_attempts int NOT NULL DEFAULT 0,
                created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE hrms.password_reset_token ADD COLUMN IF NOT EXISTS failed_attempts int NOT NULL DEFAULT 0;
            CREATE INDEX IF NOT EXISTS idx_password_reset_token_token ON hrms.password_reset_token(token);
            CREATE INDEX IF NOT EXISTS idx_password_reset_token_user_id ON hrms.password_reset_token(user_account_id);
            CREATE INDEX IF NOT EXISTS idx_password_reset_token_otp ON hrms.password_reset_token(user_account_id, otp_code);

            -- ตารางเอกสารแนบสัญญาจ้างงานหลายไฟล์ (Multi-file contract attachments)
            CREATE TABLE IF NOT EXISTS hrms.employment_contract_document (
                id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                contract_id bigint NOT NULL REFERENCES hrms.employment_contract(id) ON DELETE CASCADE,
                file_name varchar(255) NOT NULL,
                mime_type varchar(100) NULL,
                file_size bigint NULL,
                file_data bytea NOT NULL,
                uploaded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS ix_employment_contract_document_contract ON hrms.employment_contract_document(contract_id);

            -- บันทึกเหตุผลการแก้ไขบันทึกเวลาทำงานด้วยมือ (Audit manual attendance edits)
            ALTER TABLE hrms.attendance_daily ADD COLUMN IF NOT EXISTS edit_reason varchar(500) NULL;
            ALTER TABLE hrms.attendance_daily ADD COLUMN IF NOT EXISTS edited_by_user_id bigint NULL;
            ALTER TABLE hrms.attendance_daily ADD COLUMN IF NOT EXISTS edited_at timestamptz NULL;

            -- กำหนดระยะเวลาผ่อนผันการแนบเอกสารการลา (Leave document grace period)
            ALTER TABLE hrms.leave_policy ADD COLUMN IF NOT EXISTS document_grace_days integer NULL;
            ALTER TABLE hrms.leave_request ADD COLUMN IF NOT EXISTS document_due_date date NULL;

            -- ตราประทับบริษัท และอายุหนังสือรับรอง (Company seal & Certificate validity)
            ALTER TABLE hrms.company ADD COLUMN IF NOT EXISTS seal_data bytea NULL;
            ALTER TABLE hrms.certificate_type ADD COLUMN IF NOT EXISTS validity_months integer NULL;
            UPDATE hrms.certificate_type SET validity_months = 3 WHERE validity_months IS NULL;

            -- สีและจำนวนวันทำงานต่อสัปดาห์ของกะ และสีประเภทการลา (Shift & Leave Type UI settings)
            ALTER TABLE hrms.shift ADD COLUMN IF NOT EXISTS color varchar(20) NULL;
            ALTER TABLE hrms.shift ADD COLUMN IF NOT EXISTS weekly_workdays varchar(20) NULL;
            ALTER TABLE hrms.leave_type ADD COLUMN IF NOT EXISTS color varchar(20) NULL;

            -- จัดเก็บรูปประจำตัวและลายมือชื่อพนักงาน (Employee avatar & signature)
            CREATE TABLE IF NOT EXISTS hrms.employee_avatar (
                employee_id bigint PRIMARY KEY REFERENCES hrms.employee(id) ON DELETE CASCADE,
                image_data bytea NOT NULL,
                mime_type varchar(50) NOT NULL,
                file_size bigint NOT NULL,
                updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS hrms.employee_signature (
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                employee_id bigint NOT NULL REFERENCES hrms.employee(id) ON DELETE CASCADE,
                signature_data bytea NOT NULL,
                file_name varchar(255) NULL,
                file_size bigint NULL,
                mime_type varchar(100) NULL,
                is_active boolean NOT NULL DEFAULT true,
                created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_employee_signature_employee_id ON hrms.employee_signature(employee_id);
            ALTER TABLE hrms.employee ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz NULL;

            -- ตารางประวัติและนำเข้าค่าคอมมิชชั่น (Commission import batch & entries)
            CREATE TABLE IF NOT EXISTS hrms.commission_import_batch (
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                file_name varchar(300) NULL,
                file_hash varchar(100) NULL,
                detected_type varchar(20) NOT NULL DEFAULT 'MONTH',
                date_from date NULL,
                date_to date NULL,
                total_rows int NOT NULL DEFAULT 0,
                success_rows int NOT NULL DEFAULT 0,
                failed_rows int NOT NULL DEFAULT 0,
                employee_count int NOT NULL DEFAULT 0,
                replaced_entries int NOT NULL DEFAULT 0,
                total_amount numeric(14, 2) NOT NULL DEFAULT 0,
                status varchar(20) NOT NULL DEFAULT 'IMPORTED',
                errors_json text NULL,
                imported_by_user_id bigint NULL REFERENCES hrms.user_account(id) ON DELETE SET NULL,
                imported_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                reverted_at timestamptz NULL,
                reverted_by_user_id bigint NULL REFERENCES hrms.user_account(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_commission_import_batch_hash ON hrms.commission_import_batch(file_hash);
            CREATE INDEX IF NOT EXISTS idx_commission_import_batch_imported_at ON hrms.commission_import_batch(imported_at DESC);

            CREATE TABLE IF NOT EXISTS hrms.employee_commission_entry (
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                employee_id bigint NOT NULL REFERENCES hrms.employee(id) ON DELETE CASCADE,
                date_from date NOT NULL,
                date_to date NOT NULL,
                sales_amount numeric(14, 2) NOT NULL DEFAULT 0,
                commission_rate numeric(6, 2) NOT NULL DEFAULT 0,
                commission_amount numeric(14, 2) NOT NULL DEFAULT 0,
                special_amount numeric(14, 2) NOT NULL DEFAULT 0,
                total_amount numeric(14, 2) NOT NULL DEFAULT 0,
                note text NULL,
                source varchar(20) NOT NULL DEFAULT 'FILE',
                status varchar(20) NOT NULL DEFAULT 'ACTIVE',
                batch_id bigint NULL REFERENCES hrms.commission_import_batch(id) ON DELETE SET NULL,
                superseded_by_batch_id bigint NULL REFERENCES hrms.commission_import_batch(id) ON DELETE SET NULL,
                created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT employee_commission_entry_range_check CHECK (date_to >= date_from)
            );
            CREATE INDEX IF NOT EXISTS idx_commission_entry_emp_date ON hrms.employee_commission_entry(employee_id, date_from, date_to);
            CREATE INDEX IF NOT EXISTS idx_commission_entry_batch ON hrms.employee_commission_entry(batch_id);
            CREATE INDEX IF NOT EXISTS idx_commission_entry_superseded ON hrms.employee_commission_entry(superseded_by_batch_id);

            -- ตารางขอบเขตข้อมูลสิทธิ์ตามบทบาท (Role Data Scoping - Granular RBAC)
            CREATE TABLE IF NOT EXISTS hrms.role_data_scope (
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                role_id bigint NOT NULL REFERENCES hrms.role(id) ON DELETE CASCADE,
                permission_id bigint NOT NULL REFERENCES hrms.permission(id) ON DELETE CASCADE,
                data_visibility_scope varchar(30) NOT NULL,
                CONSTRAINT uq_role_permission_scope UNIQUE (role_id, permission_id, data_visibility_scope)
            );
            CREATE INDEX IF NOT EXISTS idx_role_data_scope_role_id ON hrms.role_data_scope(role_id);

            -- ตั้งค่ารอบเงินเดือนแยกตามประเภทสัญญา/ประเภทพนักงาน (Payroll Schedule Config per Employee Type)
            CREATE TABLE IF NOT EXISTS hrms.payroll_schedule_config (
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                employee_type_id bigint NOT NULL REFERENCES hrms.employee_type(id) ON DELETE CASCADE,
                pay_cycle varchar(20) NOT NULL DEFAULT 'MONTHLY',
                start_day_type varchar(20) NOT NULL DEFAULT 'FIRST_DAY',
                start_day integer NOT NULL DEFAULT 1,
                end_day_type varchar(20) NOT NULL DEFAULT 'LAST_DAY',
                end_day integer NOT NULL DEFAULT 31,
                payment_day integer NOT NULL DEFAULT 29,
                semi_monthly_first_cutoff_day integer NOT NULL DEFAULT 15,
                semi_monthly_first_pay_day integer NOT NULL DEFAULT 15,
                semi_monthly_second_pay_day integer NOT NULL DEFAULT 31,
                weekly_start_day_of_week integer NOT NULL DEFAULT 1,
                weekly_pay_offset_days integer NOT NULL DEFAULT 3,
                adjust_weekend boolean NOT NULL DEFAULT true,
                claim_cutoff_type varchar(20) NOT NULL DEFAULT 'CUSTOM_DAY',
                claim_cutoff_day integer NOT NULL DEFAULT 25,
                default_payment_method varchar(30) NOT NULL DEFAULT 'BANK_BATCH',
                note text NULL,
                updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_payroll_schedule_config_emp_type UNIQUE (employee_type_id)
            );

            -- รองรับรอบเงินเดือนแยกตามประเภทสัญญาและหลายงวดต่อเดือน (รายเดือน/รายปักษ์/รายสัปดาห์)
            ALTER TABLE hrms.payroll_period ADD COLUMN IF NOT EXISTS employee_type_id bigint NULL REFERENCES hrms.employee_type(id) ON DELETE SET NULL;
            ALTER TABLE hrms.payroll_period ADD COLUMN IF NOT EXISTS pay_cycle varchar(20) NOT NULL DEFAULT 'MONTHLY';
            ALTER TABLE hrms.payroll_period ADD COLUMN IF NOT EXISTS period_sequence integer NOT NULL DEFAULT 1;
            ALTER TABLE hrms.payroll_period ADD COLUMN IF NOT EXISTS period_name varchar(150) NULL;
            CREATE INDEX IF NOT EXISTS idx_payroll_period_emp_type ON hrms.payroll_period(employee_type_id, year, month);

            -- ลบ UNIQUE(year, month) เดิม เพื่อให้ 1 เดือนสร้างได้หลายรอบ (แยกตามประเภทสัญญาหรืองวดย่อย)
            DO $$
            DECLARE
                c_name text;
            BEGIN
                SELECT con.conname INTO c_name
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                WHERE nsp.nspname = 'hrms'
                  AND rel.relname = 'payroll_period'
                  AND con.contype = 'u'
                  AND pg_get_constraintdef(con.oid) = 'UNIQUE (year, month)';
                IF c_name IS NOT NULL THEN
                    EXECUTE format('ALTER TABLE hrms.payroll_period DROP CONSTRAINT %I', c_name);
                END IF;
            END $$;
        ");

        // อัปเกรดสคีมาและความปลอดภัยของระบบ Audit Log (Actor Snapshot, Write-time Subject, Immutability Trigger, FK RESTRICT)
        var candidateSqlPaths = new[]
        {
            Path.Combine(app.Environment.ContentRootPath, "..", "..", "scripts", "audit_log_hardening_v2.sql"),
            Path.Combine(app.Environment.ContentRootPath, "backend", "scripts", "audit_log_hardening_v2.sql"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "scripts", "audit_log_hardening_v2.sql")
        };
        var auditHardeningSqlPath = candidateSqlPaths.Select(Path.GetFullPath).FirstOrDefault(File.Exists);
        if (auditHardeningSqlPath != null)
        {
            var auditHardeningSql = await File.ReadAllTextAsync(auditHardeningSqlPath);
            await db.Database.ExecuteSqlRawAsync(auditHardeningSql);
        }

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

        // ตรวจสอบและซิงก์สิทธิ์มาตรฐานของระบบตั้งแต่ตอนสตาร์ทเซิร์ฟเวอร์
        var roleService = scope.ServiceProvider.GetRequiredService<Hrms.Application.Features.Settings.Services.IRoleService>();
        await roleService.EnsurePermissionsInitializedAsync();
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
