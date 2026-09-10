using System.Text;
using Hrms.Api.Middlewares;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Services;
using Hrms.Application.Features.MasterData.Services;
using Hrms.Infrastructure.Persistence;
using Hrms.Infrastructure.Security;
using Hrms.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Connection (PostgreSQL - Schema: hrms)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<HrmsDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "hrms");
    });
});

builder.Services.AddScoped<IHrmsDbContext>(provider => provider.GetRequiredService<HrmsDbContext>());

// 2. Core Infrastructure & Security Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddSingleton<IAesEncryptionService, AesEncryptionService>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();

// 3. Application Services DI
builder.Services.AddScoped<IBankService, BankService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// 4. JWT Authentication
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
});

builder.Services.AddAuthorization();

// 5. CORS Policy (สำหรับ Next.js Frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 6. Controllers & JSON Options
builder.Services.AddControllers();

// 7. OpenAPI / Swagger Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

// 10. Authentication & Authorization Middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
