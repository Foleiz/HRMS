using System.Collections.Concurrent;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Settings.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Settings.Services;

public class RoleService : IRoleService
{
    private readonly IHrmsDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    // Cache ในหน่วยความจำเพื่อลดการ Query หนักๆ ของ Role Matrix (<10ms)
    private static readonly ConcurrentDictionary<long, (DateTime Expiry, RoleDetailDto Data)> _matrixCache = new();
    private static (DateTime Expiry, List<RoleSummaryDto> Data)? _allRolesCache;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);

    public static void InvalidateMatrixCache(long? roleId = null)
    {
        _allRolesCache = null;
        Hrms.Application.Common.Utilities.UserAccessVersion.Bump(); // สิทธิ์ที่แก้มีผลกับคำขอถัดไปทันที
        if (roleId.HasValue)
        {
            _matrixCache.TryRemove(roleId.Value, out _);
        }
        else
        {
            _matrixCache.Clear();
        }
    }

    private record ModuleDefinition(
        string Code,
        string Name,
        string Prefix,
        string CategoryCode,
        string CategoryName,
        string ParentPermissionPrefix);

    // รายการระบบงานและเมนูย่อยมาตรฐาน ตรงตามเมนูใน Sidebar ครบทั้ง 19 เมนู
    private static readonly List<ModuleDefinition> StandardModules = new()
    {
        // 1. แดชบอร์ด (DASHBOARD)
        new("DASHBOARD_EMPLOYEE", "แดชบอร์ดพนักงาน", "DASHBOARD_EMP", "DASHBOARD", "แดชบอร์ด", "DASHBOARD"),
        new("DASHBOARD_DEPT", "แดชบอร์ดหัวหน้าแผนก", "DASHBOARD_DEPT", "DASHBOARD", "แดชบอร์ด", "DASHBOARD"),
        new("DASHBOARD_DIV", "แดชบอร์ดผู้จัดการฝ่าย", "DASHBOARD_DIV", "DASHBOARD", "แดชบอร์ด", "DASHBOARD"),
        new("DASHBOARD_CEO", "แดชบอร์ดผู้บริหาร (CEO)", "DASHBOARD_CEO", "DASHBOARD", "แดชบอร์ด", "DASHBOARD"),
        new("DASHBOARD_ADMIN", "แดชบอร์ดฝ่ายบุคคล", "DASHBOARD_ADMIN", "DASHBOARD", "แดชบอร์ด", "DASHBOARD"),

        // 1.1 แผนผังองค์กร (ORG_CHART)
        new("ORG_CHART", "แผนผังองค์กร", "ORG_CHART", "ORG_CHART", "แผนผังองค์กร", "ORG_CHART"),

        // 2. พนักงาน (EMPLOYEE)
        new("EMP_PROFILE", "ทะเบียนประวัติพนักงาน", "EMP_PROFILE", "EMPLOYEE", "พนักงาน", "EMP"),
        new("EMP_CONTRACT", "สัญญาจ้างงาน", "EMP_CONTRACT", "EMPLOYEE", "พนักงาน", "EMP"),
        new("EMP_TRANSFER", "การโอนย้าย / ปรับตำแหน่ง", "EMP_TRANSFER", "EMPLOYEE", "พนักงาน", "EMP"),
        new("EMP_TYPE", "ประเภทพนักงาน", "EMP_TYPE", "EMPLOYEE", "พนักงาน", "EMP"),
        new("EMP_DOC", "แฟ้มเอกสารพนักงาน", "EMP_DOC", "EMPLOYEE", "พนักงาน", "EMP"),
        new("EMP_HISTORY", "ประวัติการเปลี่ยนแปลง", "EMP_HISTORY", "EMPLOYEE", "พนักงาน", "EMP"),

        // 2.1 สวัสดิการ (BENEFIT)
        new("BENEFIT_BALANCE", "ยอดสวัสดิการพนักงาน", "BENEFIT_BALANCE", "BENEFIT", "สวัสดิการ", "BENEFIT"),


        // 3. เงินเดือนของฉัน (MY_SALARY)
        new("ESS_SALARY", "สลิปและเงินเดือนส่วนบุคคล", "ESS_SALARY", "MY_SALARY", "เงินเดือนของฉัน", "ESS_SALARY"),

        // 4. โปรไฟล์ของฉัน (ESS) (MY_PROFILE)
        new("ESS_PROFILE", "ข้อมูลและแก้ไขโปรไฟล์ส่วนบุคคล", "ESS_PROFILE", "MY_PROFILE", "โปรไฟล์ของฉัน (ESS)", "ESS_PROFILE"),

        // 5. ยอดวันลาคงเหลือ (MY_LEAVE)
        new("ESS_LEAVE", "ยอดวันลาคงเหลือและประวัติการลา", "ESS_LEAVE", "MY_LEAVE", "ยอดวันลาคงเหลือ", "ESS_LEAVE"),

        // 6. บันทึกเวลาของฉัน (ESS) (MY_ATTENDANCE)
        new("ESS_TIME", "ประวัติบันทึกเวลาของตนเอง", "ESS_TIME", "MY_ATTENDANCE", "บันทึกเวลาของฉัน (ESS)", "ESS_TIME"),

        // 7. ข่าวสารสำหรับฉัน (MY_NEWS)
        new("ESS_NEWS", "ข่าวสารและประกาศสำหรับฉัน", "ESS_NEWS", "MY_NEWS", "ข่าวสารสำหรับฉัน", "ESS_NEWS"),

        // 8. ยื่นเอกสาร (MY_DOCS)
        new("ESS_DOCS", "ยื่นคำร้องและเอกสาร", "ESS_DOCS", "MY_DOCS", "ยื่นเอกสาร", "ESS_DOCS"),
        new("ESS_RESIGN", "ยื่นคำขอลาออก", "ESS_RESIGN", "MY_DOCS", "ยื่นเอกสาร", "ESS_RESIGN"),

        // 8.1 สวัสดิการของฉัน (MY_BENEFITS)
        new("ESS_BENEFIT", "ยอดสวัสดิการของฉัน", "ESS_BENEFIT", "MY_BENEFITS", "สวัสดิการของฉัน", "ESS_BENEFIT"),
        new("ESS_BENEFIT_CLAIM", "ประวัติการเบิกจ่ายและใช้สิทธิ์สวัสดิการ", "ESS_BENEFIT_CLAIM", "MY_BENEFITS", "สวัสดิการของฉัน", "ESS_BENEFIT"),

        // 9. ตรวจบันทึกเวลา (ATTENDANCE_DAILY)
        new("TIME_DAILY", "ตรวจบันทึกเวลาประจำวัน", "TIME_DAILY", "ATTENDANCE_DAILY", "ตรวจบันทึกเวลา", "TIME"),
        new("TIME_IMPORT", "นำเข้าเวลาสแกนนิ้ว / ไฟล์เวลา", "TIME_IMPORT", "ATTENDANCE_DAILY", "ตรวจบันทึกเวลา", "TIME"),

        // 10. การจัดตารางงาน (ATTENDANCE_SCHEDULE)
        new("TIME_SCHEDULE", "ตารางกะและการจัดกะการทำงาน", "TIME_SCHEDULE", "ATTENDANCE_SCHEDULE", "การจัดตารางงาน", "TIME"),

        // 11. สิทธิ์การลา (LEAVE)
        new("LEAVE_TYPE", "ประเภทการลา", "LEAVE_TYPE", "LEAVE", "สิทธิ์การลา", "LEAVE"),
        new("LEAVE_POLICY", "กำหนดสิทธิ์การลา", "LEAVE_POLICY", "LEAVE", "สิทธิ์การลา", "LEAVE"),
        new("LEAVE_BALANCE", "ยอดวันลาพนักงาน", "LEAVE_BALANCE", "LEAVE", "สิทธิ์การลา", "LEAVE"),

        // 12. เงินเดือน (PAYROLL)
        new("PAYROLL_PERIOD", "รอบเงินเดือน (Payroll Periods)", "PAYROLL_PERIOD", "PAYROLL", "เงินเดือน", "PAYROLL"),
        new("PAYROLL_HR", "หน้าต่างเงินเดือนฝ่ายบุคคล (HR)", "PAYROLL_HR", "PAYROLL", "เงินเดือน", "PAYROLL"),
        new("PAYROLL_FINANCE", "หน้าต่างเงินเดือนฝ่ายการเงิน (Finance)", "PAYROLL_FINANCE", "PAYROLL", "เงินเดือน", "PAYROLL"),
        new("PAYROLL_ADMIN", "หน้าต่างเงินเดือนผู้ดูแลระบบ/ผู้อนุมัติ (Admin & CEO)", "PAYROLL_ADMIN", "PAYROLL", "เงินเดือน", "PAYROLL"),
        new("PAYROLL_CALC", "ประมวลผลเงินเดือน / ปิดงวด", "PAYROLL_CALC", "PAYROLL", "เงินเดือน", "PAYROLL"),
        new("PAYROLL_STRUCTURE", "โครงสร้างเงินเดือน (Salary Structure)", "PAYROLL_STRUCTURE", "PAYROLL", "เงินเดือน", "PAYROLL"),
        new("PAYROLL_ITEMS", "รายการรายได้และรายหัก (Payroll Items)", "PAYROLL_ITEMS", "PAYROLL", "เงินเดือน", "PAYROLL"),
        new("PAYROLL_BONUS", "การจัดสรรโบนัสประจำปี (Bonus Management)", "PAYROLL_BONUS", "PAYROLL", "เงินเดือน", "PAYROLL"),
        new("PAYROLL_BANK", "การโอนเงินธนาคารและแนบสลิป (Bank Transfer)", "PAYROLL_BANK", "PAYROLL", "เงินเดือน", "PAYROLL"),
        new("PAYROLL_TAX", "สรุปภาษีและประกันสังคม (Tax & SSO)", "PAYROLL_TAX", "PAYROLL", "เงินเดือน", "PAYROLL"),
        new("PAYROLL_SLIP", "สลิปเงินเดือนพนักงาน (Payslip)", "PAYROLL_SLIP", "PAYROLL", "เงินเดือน", "PAYROLL"),

        // 13. การอนุมัติ (APPROVALS)
        new("APPROVAL_LEAVE", "อนุมัติคำขอลา", "APPROVAL_LEAVE", "APPROVALS", "การอนุมัติ", "APPROVALS"),
        new("APPROVAL_TIME", "อนุมัติเวลาเข้างานและ OT", "APPROVAL_TIME", "APPROVALS", "การอนุมัติ", "APPROVALS"),
        new("APPROVAL_EMP", "อนุมัติการปรับเปลี่ยนข้อมูลพนักงาน", "APPROVAL_EMP", "APPROVALS", "การอนุมัติ", "APPROVALS"),
        new("APPROVAL_PAYROLL", "อนุมัติงวดเงินเดือน", "APPROVAL_PAYROLL", "APPROVALS", "การอนุมัติ", "APPROVALS"),

        // 14. โครงสร้างองค์กร (ORGANIZATION)
        new("ORG_STRUCT", "ฝ่ายและแผนก", "ORG_STRUCT", "ORGANIZATION", "โครงสร้างองค์กร", "ORG"),
        new("ORG_POS", "ตำแหน่งและระดับงาน", "ORG_POS", "ORGANIZATION", "โครงสร้างองค์กร", "ORG"),
        new("ORG_BENEFIT", "สวัสดิการพนักงาน", "ORG_BENEFIT", "ORGANIZATION", "โครงสร้างองค์กร", "ORG"),
        new("ORG_COMP", "ข้อมูลบริษัทและสาขา", "ORG_COMP", "ORGANIZATION", "โครงสร้างองค์กร", "ORG"),

        // 15. วันทำงานและวันหยุด (WORK_CALENDAR)
        new("WORK_CALENDAR", "ปฏิทินวันทำงานและวันหยุดประจำปี", "WORK_CALENDAR", "WORK_CALENDAR", "วันทำงานและวันหยุด", "WORK_CALENDAR"),

        // 16. รายงาน (REPORT)
        new("REPORT_ATT", "รายงานการลงเวลาและวันลา", "REPORT_ATT", "REPORT", "รายงาน", "REPORT"),
        new("REPORT_HEADCOUNT", "รายงานกำลังพลและอัตราการลาออก", "REPORT_HEADCOUNT", "REPORT", "รายงาน", "REPORT"),
        new("REPORT_LEAVE", "รายงานสรุปการลา", "REPORT_LEAVE", "REPORT", "รายงาน", "REPORT"),

        // 17. จัดการประกาศ (ANNOUNCEMENTS)
        new("ANNOUNCEMENTS_GENERAL", "ประกาศข่าวสารทั่วไป", "ANNOUNCEMENTS_GENERAL", "ANNOUNCEMENTS", "จัดการประกาศ", "ANNOUNCEMENTS"),
        new("ANNOUNCEMENTS_ACTIVITY", "ประกาศกิจกรรม", "ANNOUNCEMENTS_ACTIVITY", "ANNOUNCEMENTS", "จัดการประกาศ", "ANNOUNCEMENTS"),

        // 18. ข้อมูลหลัก (Master Data) (MASTER_DATA)
        new("MASTER_DATA", "จัดการข้อมูลหลักระบบและธนาคาร", "MASTER_DATA", "MASTER_DATA", "ข้อมูลหลัก (Master Data)", "MASTER_DATA"),

        // 19. ตั้งค่า (SETTINGS)
        new("SETTINGS_USERS", "บัญชีผู้ใช้งาน", "SETTINGS_USERS", "SETTINGS", "ตั้งค่า", "SETTINGS"),
        new("SETTINGS_ROLES", "บทบาทและสิทธิ์", "SETTINGS_ROLES", "SETTINGS", "ตั้งค่า", "SETTINGS"),
        new("SETTINGS_AUDIT", "บันทึกการใช้งานระบบ (Audit Log)", "SETTINGS_AUDIT", "SETTINGS", "ตั้งค่า", "SETTINGS"),

        // 20. วิธีการใช้งาน (GUIDE)
        new("GUIDE_ONBOARDING", "ไกด์: เพิ่มพนักงานใหม่", "GUIDE_ONBOARDING", "GUIDE", "วิธีการใช้งาน", "GUIDE"),
        new("GUIDE_PAYROLL_HR", "ไกด์: การประมวลผลรอบเงินเดือน (ฝ่ายบุคคล / HR)", "GUIDE_PAYROLL_HR", "GUIDE", "วิธีการใช้งาน", "GUIDE_PAYROLL"),
        new("GUIDE_PAYROLL_FINANCE", "ไกด์: การตรวจสอบและจ่ายเงินเดือน (ฝ่ายการเงิน)", "GUIDE_PAYROLL_FINANCE", "GUIDE", "วิธีการใช้งาน", "GUIDE_PAYROLL"),
        new("GUIDE_PAYROLL_CEO", "ไกด์: การอนุมัติรอบเงินเดือน (ผู้บริหาร / CEO)", "GUIDE_PAYROLL_CEO", "GUIDE", "วิธีการใช้งาน", "GUIDE_PAYROLL"),
        new("GUIDE_OFFBOARDING", "ไกด์: การพ้นสภาพพนักงาน (ลาออก)", "GUIDE_OFFBOARDING", "GUIDE", "วิธีการใช้งาน", "GUIDE"),
        new("GUIDE_SHIFT_SCHEDULE", "ไกด์: การจัดตารางกะงานพนักงาน", "GUIDE_SHIFT_SCHEDULE", "GUIDE", "วิธีการใช้งาน", "GUIDE"),
        new("GUIDE_ATTENDANCE_IMPORT", "ไกด์: การนำเข้าเวลาสแกนนิ้วและตรวจเช็คประจำวัน", "GUIDE_ATTENDANCE_IMPORT", "GUIDE", "วิธีการใช้งาน", "GUIDE"),
        new("GUIDE_TRANSFER", "ไกด์: การโอนย้ายแผนกและปรับตำแหน่ง", "GUIDE_TRANSFER", "GUIDE", "วิธีการใช้งาน", "GUIDE"),
        new("GUIDE_LEAVE_SETUP", "ไกด์: การตั้งค่าเริ่มต้นระบบการลาประจำปี", "GUIDE_LEAVE_SETUP", "GUIDE", "วิธีการใช้งาน", "GUIDE"),
        new("GUIDE_LEAVE_APPROVAL", "ไกด์: การอนุมัติคำขอลาและตรวจผลกระทบต่อทีม", "GUIDE_LEAVE_APPROVAL", "GUIDE", "วิธีการใช้งาน", "GUIDE"),
        new("GUIDE_COMPANY_SETUP", "ไกด์: การตั้งค่าระบบองค์กรสำหรับบริษัทใหม่", "GUIDE_COMPANY_SETUP", "GUIDE", "วิธีการใช้งาน", "GUIDE")
    };

    public RoleService(IHrmsDbContext dbContext, IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public async Task<List<RoleSummaryDto>> GetAllRolesAsync(CancellationToken cancellationToken = default)
    {
        if (_allRolesCache.HasValue && _allRolesCache.Value.Expiry > DateTime.UtcNow)
        {
            return _allRolesCache.Value.Data;
        }

        var roles = await _dbContext.Roles
            .AsNoTracking()
            .Select(r => new RoleSummaryDto
            {
                Id = r.Id,
                RoleCode = r.RoleCode,
                RoleName = r.RoleName,
                Description = r.Description,
                Status = r.Status,
                Color = r.Color ?? "#2563EB",
                UserCount = r.UserRoles.Count,
                IsSystemDefault = r.RoleCode == "ADMIN" || r.RoleCode == "SYSTEM_SUPER",
                LastModifiedAt = DateTime.UtcNow.AddHours(-2)
            })
            .OrderByDescending(r => r.IsSystemDefault)
            .ThenBy(r => r.Id)
            .ToListAsync(cancellationToken);

        _allRolesCache = (DateTime.UtcNow.Add(CacheTtl), roles);
        return roles;
    }

    private static volatile bool _permissionsInitialized = false;
    private static readonly SemaphoreSlim _permInitLock = new(1, 1);
    private static Dictionary<string, long>? _cachedPermMap;
    private static HashSet<long>? _cachedRelevantPermIds;

    private async Task<(Dictionary<string, long> PermMap, HashSet<long> RelevantPermIds)> GetOrInitPermissionsCacheAsync(CancellationToken cancellationToken = default)
    {
        if (_permissionsInitialized && _cachedPermMap != null && _cachedRelevantPermIds != null)
        {
            return (_cachedPermMap, _cachedRelevantPermIds);
        }

        await _permInitLock.WaitAsync(cancellationToken);
        try
        {
            if (_permissionsInitialized && _cachedPermMap != null && _cachedRelevantPermIds != null)
            {
                return (_cachedPermMap, _cachedRelevantPermIds);
            }

            var permissions = await _dbContext.Permissions
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var existingPerms = permissions.Select(p => p.PermissionCode).ToHashSet();
            var toAdd = new List<Permission>();
            var actions = new[] { "VIEW", "CREATE", "EDIT", "APPROVE" };

            foreach (var mod in StandardModules)
            {
                foreach (var act in actions)
                {
                    var code = $"{mod.Prefix}_{act}";
                    string actionLabel = act switch
                    {
                        "VIEW" => "ดูข้อมูล",
                        "CREATE" => "สร้าง/เพิ่ม",
                        "EDIT" => "แก้ไข",
                        "APPROVE" => "อนุมัติ",
                        _ => act
                    };

                    var expectedName = $"{mod.Name} ({actionLabel})";
                    var existing = permissions.FirstOrDefault(p => p.PermissionCode == code);
                    if (existing == null)
                    {
                        toAdd.Add(new Permission
                        {
                            PermissionCode = code,
                            PermissionName = expectedName,
                            Description = $"สิทธิ์ระดับระบบสำหรับ {mod.Name} ({actionLabel})"
                        });
                        existingPerms.Add(code);
                    }
                    else if (existing.PermissionName != expectedName)
                    {
                        existing.PermissionName = expectedName;
                        existing.Description = $"สิทธิ์ระดับระบบสำหรับ {mod.Name} ({actionLabel})";
                        _dbContext.Permissions.Update(existing);
                    }
                }
            }

            // Parent permissions for backward compatibility and broad modules
            var parentCodes = new[] { "DASHBOARD_VIEW", "EMP_VIEW", "LEAVE_VIEW", "TIME_VIEW", "PAYROLL_VIEW", "ORG_VIEW", "REPORT_VIEW", "SETTINGS_VIEW", "DOCS_VIEW", "APPROVALS_VIEW", "ORG_CHART_VIEW", "BENEFIT_VIEW", "ESS_BENEFIT_VIEW", "GUIDE_VIEW", "ANNOUNCEMENTS_VIEW" };
            foreach (var pCode in parentCodes)
            {
                if (!existingPerms.Contains(pCode))
                {
                    toAdd.Add(new Permission
                    {
                        PermissionCode = pCode,
                        PermissionName = $"สิทธิ์ส่วนกลาง ({pCode})",
                        Description = $"สิทธิ์ส่วนกลางระบบสำหรับ {pCode}"
                    });
                    existingPerms.Add(pCode);
                }
            }

            if (toAdd.Count > 0)
            {
                _dbContext.Permissions.AddRange(toAdd);
                await _dbContext.SaveChangesAsync(cancellationToken);
                permissions = await _dbContext.Permissions.AsNoTracking().ToListAsync(cancellationToken);
            }

            _cachedPermMap = permissions.ToDictionary(p => p.PermissionCode, p => p.Id);

            var prefixList = StandardModules.Select(m => m.Prefix).Distinct().ToList();
            var parentPrefixList = StandardModules.Select(m => m.ParentPermissionPrefix).Distinct().ToList();
            prefixList.AddRange(parentPrefixList);

            _cachedRelevantPermIds = _cachedPermMap
                .Where(kvp => prefixList.Any(pref => kvp.Key.StartsWith(pref + "_") || kvp.Key == pref))
                .Select(kvp => kvp.Value)
                .ToHashSet();

            // Auto-migrate existing roles that have legacy ANNOUNCEMENTS permissions to ANNOUNCEMENTS_GENERAL and ANNOUNCEMENTS_ACTIVITY
            var legacyAnnouncePerms = await _dbContext.RolePermissions
                .Include(rp => rp.Permission)
                .Where(rp => rp.Permission.PermissionCode.StartsWith("ANNOUNCEMENTS_") && !rp.Permission.PermissionCode.StartsWith("ANNOUNCEMENTS_GENERAL_") && !rp.Permission.PermissionCode.StartsWith("ANNOUNCEMENTS_ACTIVITY_"))
                .ToListAsync(cancellationToken);

            if (legacyAnnouncePerms.Count > 0)
            {
                var newRolePerms = new List<RolePermission>();
                var newRoleScopes = new List<RoleDataScope>();

                var legacyPermIds = legacyAnnouncePerms.Select(lp => lp.PermissionId).ToHashSet();
                var legacyScopes = await _dbContext.RoleDataScopes
                    .Where(rds => legacyPermIds.Contains(rds.PermissionId))
                    .ToListAsync(cancellationToken);

                var existingRolePermKeys = (await _dbContext.RolePermissions
                    .Select(rp => $"{rp.RoleId}_{rp.PermissionId}")
                    .ToListAsync(cancellationToken)).ToHashSet();

                var existingScopeKeys = (await _dbContext.RoleDataScopes
                    .Select(rds => $"{rds.RoleId}_{rds.PermissionId}_{rds.DataVisibilityScope}")
                    .ToListAsync(cancellationToken)).ToHashSet();

                foreach (var lp in legacyAnnouncePerms)
                {
                    var action = lp.Permission.PermissionCode.Replace("ANNOUNCEMENTS_", "");
                    var targetCodes = new[] { $"ANNOUNCEMENTS_GENERAL_{action}", $"ANNOUNCEMENTS_ACTIVITY_{action}" };

                    foreach (var tc in targetCodes)
                    {
                        if (_cachedPermMap.TryGetValue(tc, out var tcId))
                        {
                            if (existingRolePermKeys.Add($"{lp.RoleId}_{tcId}"))
                            {
                                newRolePerms.Add(new RolePermission { RoleId = lp.RoleId, PermissionId = tcId });
                            }

                            var matchedScopes = legacyScopes.Where(ls => ls.RoleId == lp.RoleId && ls.PermissionId == lp.PermissionId);
                            foreach (var ms in matchedScopes)
                            {
                                if (existingScopeKeys.Add($"{lp.RoleId}_{tcId}_{ms.DataVisibilityScope}"))
                                {
                                    newRoleScopes.Add(new RoleDataScope
                                    {
                                        RoleId = lp.RoleId,
                                        PermissionId = tcId,
                                        DataVisibilityScope = ms.DataVisibilityScope
                                    });
                                }
                            }
                        }
                    }
                }

                if (newRolePerms.Count > 0) _dbContext.RolePermissions.AddRange(newRolePerms);
                if (newRoleScopes.Count > 0) _dbContext.RoleDataScopes.AddRange(newRoleScopes);
                if (newRolePerms.Count > 0 || newRoleScopes.Count > 0)
                {
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            // Auto-migrate existing roles that have legacy GUIDE_PAYROLL permissions to GUIDE_PAYROLL_HR, GUIDE_PAYROLL_FINANCE, and GUIDE_PAYROLL_CEO
            var legacyPayrollPerms = await _dbContext.RolePermissions
                .Include(rp => rp.Permission)
                .Where(rp => rp.Permission.PermissionCode.StartsWith("GUIDE_PAYROLL_")
                          && !rp.Permission.PermissionCode.StartsWith("GUIDE_PAYROLL_HR_")
                          && !rp.Permission.PermissionCode.StartsWith("GUIDE_PAYROLL_FINANCE_")
                          && !rp.Permission.PermissionCode.StartsWith("GUIDE_PAYROLL_CEO_"))
                .ToListAsync(cancellationToken);

            if (legacyPayrollPerms.Count > 0)
            {
                var newRolePerms = new List<RolePermission>();
                var newRoleScopes = new List<RoleDataScope>();

                var legacyPermIds = legacyPayrollPerms.Select(lp => lp.PermissionId).ToHashSet();
                var legacyScopes = await _dbContext.RoleDataScopes
                    .Where(rds => legacyPermIds.Contains(rds.PermissionId))
                    .ToListAsync(cancellationToken);

                var existingRolePermKeys = (await _dbContext.RolePermissions
                    .Select(rp => $"{rp.RoleId}_{rp.PermissionId}")
                    .ToListAsync(cancellationToken)).ToHashSet();

                var existingScopeKeys = (await _dbContext.RoleDataScopes
                    .Select(rds => $"{rds.RoleId}_{rds.PermissionId}_{rds.DataVisibilityScope}")
                    .ToListAsync(cancellationToken)).ToHashSet();

                foreach (var lp in legacyPayrollPerms)
                {
                    var action = lp.Permission.PermissionCode.Replace("GUIDE_PAYROLL_", "");
                    var targetCodes = new[] { $"GUIDE_PAYROLL_HR_{action}", $"GUIDE_PAYROLL_FINANCE_{action}", $"GUIDE_PAYROLL_CEO_{action}" };

                    foreach (var tc in targetCodes)
                    {
                        if (_cachedPermMap.TryGetValue(tc, out var tcId))
                        {
                            if (existingRolePermKeys.Add($"{lp.RoleId}_{tcId}"))
                            {
                                newRolePerms.Add(new RolePermission { RoleId = lp.RoleId, PermissionId = tcId });
                            }

                            var matchedScopes = legacyScopes.Where(ls => ls.RoleId == lp.RoleId && ls.PermissionId == lp.PermissionId);
                            foreach (var ms in matchedScopes)
                            {
                                if (existingScopeKeys.Add($"{lp.RoleId}_{tcId}_{ms.DataVisibilityScope}"))
                                {
                                    newRoleScopes.Add(new RoleDataScope
                                    {
                                        RoleId = lp.RoleId,
                                        PermissionId = tcId,
                                        DataVisibilityScope = ms.DataVisibilityScope
                                    });
                                }
                            }
                        }
                    }
                }

                if (newRolePerms.Count > 0) _dbContext.RolePermissions.AddRange(newRolePerms);
                if (newRoleScopes.Count > 0) _dbContext.RoleDataScopes.AddRange(newRoleScopes);
                if (newRolePerms.Count > 0 || newRoleScopes.Count > 0)
                {
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            // Auto-migrate existing roles that have ESS_DOCS permissions to ESS_RESIGN if not already present
            var existingEssDocsPerms = await _dbContext.RolePermissions
                .Include(rp => rp.Permission)
                .Where(rp => rp.Permission.PermissionCode.StartsWith("ESS_DOCS_"))
                .ToListAsync(cancellationToken);

            if (existingEssDocsPerms.Count > 0)
            {
                var newRolePerms = new List<RolePermission>();
                var newRoleScopes = new List<RoleDataScope>();

                var essDocsPermIds = existingEssDocsPerms.Select(lp => lp.PermissionId).ToHashSet();
                var essDocsScopes = await _dbContext.RoleDataScopes
                    .Where(rds => essDocsPermIds.Contains(rds.PermissionId))
                    .ToListAsync(cancellationToken);

                var existingRolePermKeys = (await _dbContext.RolePermissions
                    .Select(rp => $"{rp.RoleId}_{rp.PermissionId}")
                    .ToListAsync(cancellationToken)).ToHashSet();

                var existingScopeKeys = (await _dbContext.RoleDataScopes
                    .Select(rds => $"{rds.RoleId}_{rds.PermissionId}_{rds.DataVisibilityScope}")
                    .ToListAsync(cancellationToken)).ToHashSet();

                foreach (var lp in existingEssDocsPerms)
                {
                    var action = lp.Permission.PermissionCode.Replace("ESS_DOCS_", "");
                    var targetCode = $"ESS_RESIGN_{action}";

                    if (_cachedPermMap.TryGetValue(targetCode, out var tcId))
                    {
                        if (existingRolePermKeys.Add($"{lp.RoleId}_{tcId}"))
                        {
                            newRolePerms.Add(new RolePermission { RoleId = lp.RoleId, PermissionId = tcId });
                        }

                        var matchedScopes = essDocsScopes.Where(ls => ls.RoleId == lp.RoleId && ls.PermissionId == lp.PermissionId);
                        foreach (var ms in matchedScopes)
                        {
                            if (existingScopeKeys.Add($"{lp.RoleId}_{tcId}_{ms.DataVisibilityScope}"))
                            {
                                newRoleScopes.Add(new RoleDataScope
                                {
                                    RoleId = lp.RoleId,
                                    PermissionId = tcId,
                                    DataVisibilityScope = ms.DataVisibilityScope
                                });
                            }
                        }
                    }
                }

                if (newRolePerms.Count > 0) _dbContext.RolePermissions.AddRange(newRolePerms);
                if (newRoleScopes.Count > 0) _dbContext.RoleDataScopes.AddRange(newRoleScopes);
                if (newRolePerms.Count > 0 || newRoleScopes.Count > 0)
                {
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            // Auto-migrate existing roles that have BENEFIT_CLAIM permissions to BENEFIT_BALANCE if not already present
            var existingBenefitClaimPerms = await _dbContext.RolePermissions
                .Include(rp => rp.Permission)
                .Where(rp => rp.Permission.PermissionCode.StartsWith("BENEFIT_CLAIM_"))
                .ToListAsync(cancellationToken);

            if (existingBenefitClaimPerms.Count > 0)
            {
                var newRolePerms = new List<RolePermission>();
                var newRoleScopes = new List<RoleDataScope>();

                var benefitClaimPermIds = existingBenefitClaimPerms.Select(lp => lp.PermissionId).ToHashSet();
                var benefitClaimScopes = await _dbContext.RoleDataScopes
                    .Where(rds => benefitClaimPermIds.Contains(rds.PermissionId))
                    .ToListAsync(cancellationToken);

                var existingRolePermKeys = (await _dbContext.RolePermissions
                    .Select(rp => $"{rp.RoleId}_{rp.PermissionId}")
                    .ToListAsync(cancellationToken)).ToHashSet();

                var existingScopeKeys = (await _dbContext.RoleDataScopes
                    .Select(rds => $"{rds.RoleId}_{rds.PermissionId}_{rds.DataVisibilityScope}")
                    .ToListAsync(cancellationToken)).ToHashSet();

                foreach (var lp in existingBenefitClaimPerms)
                {
                    var action = lp.Permission.PermissionCode.Replace("BENEFIT_CLAIM_", "");
                    var targetCode = $"BENEFIT_BALANCE_{action}";

                    if (_cachedPermMap.TryGetValue(targetCode, out var tcId))
                    {
                        if (existingRolePermKeys.Add($"{lp.RoleId}_{tcId}"))
                        {
                            newRolePerms.Add(new RolePermission { RoleId = lp.RoleId, PermissionId = tcId });
                        }

                        var matchedScopes = benefitClaimScopes.Where(ls => ls.RoleId == lp.RoleId && ls.PermissionId == lp.PermissionId);
                        foreach (var ms in matchedScopes)
                        {
                            if (existingScopeKeys.Add($"{lp.RoleId}_{tcId}_{ms.DataVisibilityScope}"))
                            {
                                newRoleScopes.Add(new RoleDataScope
                                {
                                    RoleId = lp.RoleId,
                                    PermissionId = tcId,
                                    DataVisibilityScope = ms.DataVisibilityScope
                                });
                            }
                        }
                    }
                }

                if (newRolePerms.Count > 0) _dbContext.RolePermissions.AddRange(newRolePerms);
                if (newRoleScopes.Count > 0) _dbContext.RoleDataScopes.AddRange(newRoleScopes);
                if (newRolePerms.Count > 0 || newRoleScopes.Count > 0)
                {
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            _permissionsInitialized = true;
            return (_cachedPermMap, _cachedRelevantPermIds);
        }
        finally
        {
            _permInitLock.Release();
        }
    }

    private RoleDetailDto BuildRoleMatrixDto(
        long roleId,
        string roleCode,
        string roleName,
        string? description,
        string status,
        IReadOnlySet<string> grantedPermCodes,
        IReadOnlySet<(string PermissionCode, string DataVisibilityScope)> activeScopes,
        string? color = null)
    {
        var moduleDtos = new List<ModulePermissionScopeDto>(StandardModules.Count);

        foreach (var mod in StandardModules)
        {
            var viewCode = $"{mod.Prefix}_VIEW";
            var createCode = $"{mod.Prefix}_CREATE";
            var editCode = $"{mod.Prefix}_EDIT";
            var approveCode = $"{mod.Prefix}_APPROVE";

            bool HasScope(string permCode, string scopeName)
            {
                if (activeScopes.Contains((permCode, scopeName))) return true;
                if (!string.IsNullOrEmpty(mod.ParentPermissionPrefix))
                {
                    var action = permCode.Substring(permCode.LastIndexOf('_') + 1);
                    if (activeScopes.Contains(($"{mod.ParentPermissionPrefix}_{action}", scopeName)))
                    {
                        return true;
                    }
                }
                return false;
            }

            var selfPerms = new ScopeActionPermissionsDto
            {
                View = HasScope(viewCode, "SELF"),
                Create = HasScope(createCode, "SELF"),
                Edit = HasScope(editCode, "SELF") || HasScope(approveCode, "SELF"),
                Approve = HasScope(approveCode, "SELF") || HasScope(editCode, "SELF")
            };

            var teamPerms = new ScopeActionPermissionsDto
            {
                View = HasScope(viewCode, "TEAM"),
                Create = HasScope(createCode, "TEAM"),
                Edit = HasScope(editCode, "TEAM") || HasScope(approveCode, "TEAM"),
                Approve = HasScope(approveCode, "TEAM") || HasScope(editCode, "TEAM")
            };

            var deptPerms = new ScopeActionPermissionsDto
            {
                View = HasScope(viewCode, "DEPARTMENT"),
                Create = HasScope(createCode, "DEPARTMENT"),
                Edit = HasScope(editCode, "DEPARTMENT") || HasScope(approveCode, "DEPARTMENT"),
                Approve = HasScope(approveCode, "DEPARTMENT") || HasScope(editCode, "DEPARTMENT")
            };

            var divPerms = new ScopeActionPermissionsDto
            {
                View = HasScope(viewCode, "DIVISION"),
                Create = HasScope(createCode, "DIVISION"),
                Edit = HasScope(editCode, "DIVISION") || HasScope(approveCode, "DIVISION"),
                Approve = HasScope(approveCode, "DIVISION") || HasScope(editCode, "DIVISION")
            };

            var orgPerms = new ScopeActionPermissionsDto
            {
                View = HasScope(viewCode, "ORGANIZATION"),
                Create = HasScope(createCode, "ORGANIZATION"),
                Edit = HasScope(editCode, "ORGANIZATION") || HasScope(approveCode, "ORGANIZATION"),
                Approve = HasScope(approveCode, "ORGANIZATION") || HasScope(editCode, "ORGANIZATION")
            };

            // Legacy Fallback: หากใน role_permission มีสิทธิ์รหัสนี้โดยตรงอยู่แล้ว แต่ใน role_data_scope ยังไม่มีบันทึก scope ใดๆ เลย
            if (!selfPerms.View && !teamPerms.View && !deptPerms.View && !divPerms.View && !orgPerms.View && grantedPermCodes.Contains(viewCode))
            {
                if (roleCode is "ADMIN" or "SYSTEM_SUPER") orgPerms.View = true;
                else selfPerms.View = true;
            }
            if (!selfPerms.Create && !teamPerms.Create && !deptPerms.Create && !divPerms.Create && !orgPerms.Create && grantedPermCodes.Contains(createCode))
            {
                if (roleCode is "ADMIN" or "SYSTEM_SUPER") orgPerms.Create = true;
                else selfPerms.Create = true;
            }
            if (!selfPerms.Edit && !teamPerms.Edit && !deptPerms.Edit && !divPerms.Edit && !orgPerms.Edit && grantedPermCodes.Contains(editCode))
            {
                if (roleCode is "ADMIN" or "SYSTEM_SUPER") orgPerms.Edit = true;
                else selfPerms.Edit = true;
            }
            if (!selfPerms.Approve && !teamPerms.Approve && !deptPerms.Approve && !divPerms.Approve && !orgPerms.Approve && grantedPermCodes.Contains(approveCode))
            {
                if (roleCode is "ADMIN" or "SYSTEM_SUPER") orgPerms.Approve = true;
                else selfPerms.Approve = true;
            }

            moduleDtos.Add(new ModulePermissionScopeDto
            {
                ModuleCode = mod.Code,
                ModuleName = mod.Name,
                GroupName = mod.CategoryName,
                CategoryCode = mod.CategoryCode,
                CategoryName = mod.CategoryName,
                Self = selfPerms,
                Team = teamPerms,
                Department = deptPerms,
                Division = divPerms,
                Organization = orgPerms,
                CanView = selfPerms.View || teamPerms.View || deptPerms.View || divPerms.View || orgPerms.View,
                CanCreate = selfPerms.Create || teamPerms.Create || deptPerms.Create || divPerms.Create || orgPerms.Create,
                CanEdit = selfPerms.Edit || teamPerms.Edit || deptPerms.Edit || divPerms.Edit || orgPerms.Edit,
                CanApprove = selfPerms.Approve || teamPerms.Approve || deptPerms.Approve || divPerms.Approve || orgPerms.Approve,
                DataScope = orgPerms.View ? "ORGANIZATION" : divPerms.View ? "DIVISION" : deptPerms.View ? "DEPARTMENT" : teamPerms.View ? "TEAM" : "SELF"
            });
        }

        return new RoleDetailDto
        {
            Id = roleId,
            RoleCode = roleCode,
            RoleName = roleName,
            Description = description,
            Status = status,
            Color = color ?? "#2563EB",
            IsSystemDefault = roleCode is "ADMIN" or "SYSTEM_SUPER",
            LastModifiedAt = DateTime.UtcNow,
            Modules = moduleDtos
        };
    }

    public async Task<RoleDetailDto> GetRoleMatrixAsync(long roleId, CancellationToken cancellationToken = default)
    {
        if (_matrixCache.TryGetValue(roleId, out var cached) && cached.Expiry > DateTime.UtcNow)
        {
            return cached.Data;
        }

        await GetOrInitPermissionsCacheAsync(cancellationToken);

        var role = await _dbContext.Roles
            .AsNoTracking()
            .Select(r => new { r.Id, r.RoleCode, r.RoleName, r.Description, r.Status, r.Color })
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        if (role == null)
        {
            throw new NotFoundException("Role", roleId);
        }

        // ดึงเฉพาะสิทธิ์ของบทบาทนี้โดยตรง ไม่ Join Cartesian Product (เร็วขึ้น >10 เท่า)
        var grantedPermCodes = (await _dbContext.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .Select(rp => rp.Permission.PermissionCode)
            .AsNoTracking()
            .ToListAsync(cancellationToken))
            .ToHashSet();

        var activeScopes = (await _dbContext.RoleDataScopes
            .Where(rds => rds.RoleId == roleId)
            .Select(rds => new { rds.Permission.PermissionCode, rds.DataVisibilityScope })
            .AsNoTracking()
            .ToListAsync(cancellationToken))
            .Select(x => (x.PermissionCode, x.DataVisibilityScope))
            .ToHashSet();

        var result = BuildRoleMatrixDto(
            role.Id,
            role.RoleCode,
            role.RoleName,
            role.Description,
            role.Status,
            grantedPermCodes,
            activeScopes,
            role.Color);

        _matrixCache[roleId] = (DateTime.UtcNow.Add(CacheTtl), result);
        return result;
    }

    public async Task<RoleSummaryDto> CreateRoleAsync(CreateRoleRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RoleName))
        {
            throw new ValidationException("กรุณากรอกชื่อบทบาท");
        }

        string code;
        if (!string.IsNullOrWhiteSpace(request.RoleCode))
        {
            code = request.RoleCode.Trim().ToUpperInvariant();
        }
        else
        {
            code = await GenerateUniqueRoleCodeAsync(request.RoleName, cancellationToken);
        }

        var exists = await _dbContext.Roles.AnyAsync(r => r.RoleCode == code, cancellationToken);
        if (exists)
        {
            throw new BusinessRuleException($"รหัสบทบาท '{code}' มีอยู่ในระบบแล้ว");
        }

        var role = new Role
        {
            RoleCode = code,
            RoleName = request.RoleName.Trim(),
            Description = request.Description?.Trim(),
            Status = "ACTIVE",
            Color = string.IsNullOrWhiteSpace(request.Color) ? "#2563EB" : request.Color.Trim()
        };

        _dbContext.Roles.Add(role);
        await _dbContext.SaveChangesAsync(cancellationToken);
        InvalidateMatrixCache();

        await _auditLogService.LogAsync(
            "INSERT", "ROLE", role.Id, "RoleCode",
            null, role.RoleCode, currentUserId, ipAddress, cancellationToken: cancellationToken);

        return new RoleSummaryDto
        {
            Id = role.Id,
            RoleCode = role.RoleCode,
            RoleName = role.RoleName,
            Description = role.Description,
            Status = role.Status,
            Color = role.Color ?? "#2563EB",
            UserCount = 0,
            IsSystemDefault = false,
            LastModifiedAt = DateTime.UtcNow
        };
    }

    public async Task<RoleSummaryDto> UpdateRoleAsync(long roleId, UpdateRoleRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var role = await _dbContext.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        if (role == null)
        {
            throw new NotFoundException("Role", roleId);
        }

        var oldName = role.RoleName;
        role.RoleName = request.RoleName.Trim();
        role.Description = request.Description?.Trim();
        role.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.Color))
        {
            role.Color = request.Color.Trim();
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        InvalidateMatrixCache(role.Id);

        await _auditLogService.LogAsync(
            "UPDATE", "ROLE", role.Id, "RoleName",
            oldName, role.RoleName, currentUserId, ipAddress, cancellationToken: cancellationToken);

        return new RoleSummaryDto
        {
            Id = role.Id,
            RoleCode = role.RoleCode,
            RoleName = role.RoleName,
            Description = role.Description,
            Status = role.Status,
            Color = role.Color ?? "#2563EB",
            UserCount = role.UserRoles.Count,
            IsSystemDefault = role.RoleCode is "ADMIN" or "SYSTEM_SUPER",
            LastModifiedAt = DateTime.UtcNow
        };
    }

    public async Task<RoleDetailDto> UpdateRoleMatrixAsync(long roleId, UpdateRoleMatrixRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var role = await _dbContext.Roles
            .AsNoTracking()
            .Select(r => new { r.Id, r.RoleCode, r.RoleName, r.Description, r.Status, r.Color })
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        if (role == null)
        {
            throw new NotFoundException("Role", roleId);
        }

        // Lockout protection: Cannot revoke all access for super admins
        bool hasAnyPermission = request.Modules.Any(m =>
            (m.Self != null && (m.Self.View || m.Self.Create || m.Self.Edit || m.Self.Approve)) ||
            (m.Team != null && (m.Team.View || m.Team.Create || m.Team.Edit || m.Team.Approve)) ||
            (m.Department != null && (m.Department.View || m.Department.Create || m.Department.Edit || m.Department.Approve)) ||
            (m.Division != null && (m.Division.View || m.Division.Create || m.Division.Edit || m.Division.Approve)) ||
            (m.Organization != null && (m.Organization.View || m.Organization.Create || m.Organization.Edit || m.Organization.Approve)) ||
            m.CanView);

        if (role.RoleCode is "ADMIN" or "SYSTEM_SUPER" && !hasAnyPermission)
        {
            throw new BusinessRuleException("ไม่อนุญาตให้ยกเลิกสิทธิ์ทั้งหมดของบทบาทผู้ดูแลระบบสูงสุด (Lockout Protection)");
        }

        var (permMap, relevantPermIds) = await GetOrInitPermissionsCacheAsync(cancellationToken);

        // Fast set-based delete in PostgreSQL - NO 86,000-row Cartesian product!
        await _dbContext.RoleDataScopes
            .Where(rds => rds.RoleId == role.Id && relevantPermIds.Contains(rds.PermissionId))
            .ExecuteDeleteAsync(cancellationToken);

        await _dbContext.RolePermissions
            .Where(rp => rp.RoleId == role.Id && relevantPermIds.Contains(rp.PermissionId))
            .ExecuteDeleteAsync(cancellationToken);

        var addedPermCodes = new HashSet<string>();
        var addedPermIds = new HashSet<long>();
        void AddPerm(string code)
        {
            if (permMap.TryGetValue(code, out var pId) && addedPermIds.Add(pId))
            {
                addedPermCodes.Add(code);
            }
        }

        var addedScopes = new HashSet<(string PermCode, long PermId, string Scope)>();
        void AddDataScope(string permCode, string scopeVal)
        {
            if (permMap.TryGetValue(permCode, out var permId) && addedScopes.Add((permCode, permId, scopeVal)))
            {
            }
        }

        // Re-add based on independent checkboxes across 5 scopes
        foreach (var mod in request.Modules)
        {
            var match = StandardModules.FirstOrDefault(m => m.Code == mod.ModuleCode);
            if (match == default) continue;

            string pref = match.Prefix;
            var viewCode = $"{pref}_VIEW";
            var createCode = $"{pref}_CREATE";
            var editCode = $"{pref}_EDIT";
            var approveCode = $"{pref}_APPROVE";

            var scopeList = new (string ScopeName, ScopeActionPermissionsDto? Perms)[]
            {
                ("SELF", mod.Self),
                ("TEAM", mod.Team),
                ("DEPARTMENT", mod.Department),
                ("DIVISION", mod.Division),
                ("ORGANIZATION", mod.Organization)
            };

            foreach (var (scopeName, perms) in scopeList)
            {
                if (perms == null) continue;

                if (perms.View)
                {
                    AddPerm(viewCode);
                    AddDataScope(viewCode, scopeName);
                }
                if (perms.Create)
                {
                    AddPerm(createCode);
                    AddDataScope(createCode, scopeName);
                }
                if (perms.Edit || perms.Approve)
                {
                    AddPerm(editCode);
                    AddDataScope(editCode, scopeName);
                    AddPerm(approveCode);
                    AddDataScope(approveCode, scopeName);
                }
            }
        }


        // Bulk insert new records in a single save
        var newPerms = addedPermIds.Select(pId => new RolePermission { RoleId = role.Id, PermissionId = pId }).ToList();
        var newScopes = addedScopes.Select(s => new RoleDataScope
        {
            RoleId = role.Id,
            PermissionId = s.PermId,
            DataVisibilityScope = s.Scope
        }).ToList();

        if (newPerms.Count > 0)
        {
            _dbContext.RolePermissions.AddRange(newPerms);
        }
        if (newScopes.Count > 0)
        {
            _dbContext.RoleDataScopes.AddRange(newScopes);
        }

        // Log audit trail in the same transaction
        _dbContext.AuditLogs.Add(new AuditLog
        {
            Action = "UPDATE",
            EntityType = "ROLE_PERMISSIONS",
            EntityId = role.Id,
            FieldName = "PermissionMatrix",
            OldValue = "{}",
            NewValue = System.Text.Json.JsonSerializer.Serialize(new { message = $"Updated matrix with {request.Modules.Count} modules" }),
            UserId = currentUserId,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        // เคลียร์แคชรายชื่อผู้ใช้เพื่อให้สิทธิ์ใหม่มีผลทันที
        UserService.InvalidateUsersCache();
        Hrms.Application.Common.Utilities.UserAccessVersion.Bump();

        // Build result in memory without redundant DB queries
        var activeScopesSet = addedScopes.Select(s => (s.PermCode, s.Scope)).ToHashSet();
        var result = BuildRoleMatrixDto(
            role.Id,
            role.RoleCode,
            role.RoleName,
            role.Description,
            role.Status,
            addedPermCodes,
            activeScopesSet,
            role.Color);

        _matrixCache[role.Id] = (DateTime.UtcNow.Add(CacheTtl), result);

        return result;
    }

    public async Task<bool> DeleteRoleAsync(long roleId, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var role = await _dbContext.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        if (role == null)
        {
            throw new NotFoundException("Role", roleId);
        }

        if (role.RoleCode is "ADMIN" or "SYSTEM_SUPER")
        {
            throw new BusinessRuleException("ไม่สามารถลบบทบาทมาตรฐานของระบบ (System Default Role) ได้");
        }

        if (role.UserRoles.Any())
        {
            throw new BusinessRuleException($"ไม่สามารถลบบทบาทนี้ได้เนื่องจากยังมีผู้ใช้งานจำนวน {role.UserRoles.Count} คนผูกอยู่");
        }

        _dbContext.Roles.Remove(role);
        await _dbContext.SaveChangesAsync(cancellationToken);
        InvalidateMatrixCache(roleId);

        await _auditLogService.LogAsync(
            "DELETE", "ROLE", role.Id, "Role",
            role.RoleCode, null, currentUserId, ipAddress, cancellationToken: cancellationToken);

        return true;
    }

    private async Task<string> GenerateUniqueRoleCodeAsync(string roleName, CancellationToken cancellationToken)
    {
        var englishOnly = System.Text.RegularExpressions.Regex.Replace(roleName, @"[^a-zA-Z0-9\s_-]", " ").Trim();
        var words = englishOnly.Split(new[] { ' ', '_', '-' }, StringSplitOptions.RemoveEmptyEntries);

        string baseCode;
        if (words.Length > 0 && words.Any(w => w.Length >= 2))
        {
            baseCode = string.Join("_", words).ToUpperInvariant();
            if (baseCode.Length > 30) baseCode = baseCode[..30];
        }
        else
        {
            var thaiKeywords = new (string Pattern, string Code)[]
            {
                ("ผู้จัดการ|ผจก", "MGR"),
                ("ผู้อำนวยการ|ผอ", "DIRECTOR"),
                ("หัวหน้า|ลีด", "LEAD"),
                ("เจ้าหน้าที่|พนักงาน", "OFFICER"),
                ("ผู้ช่วย", "ASST"),
                ("บุคคล|ทรัพยากรบุคคล", "HR"),
                ("การเงิน", "FIN"),
                ("บัญชี", "ACC"),
                ("จัดซื้อ", "PURCHASE"),
                ("การตลาด", "MKT"),
                ("ขาย|เซลส์", "SALES"),
                ("ธุรการ", "ADMIN"),
                ("ไอที", "IT"),
                ("ตรวจสอบ", "AUDITOR"),
                ("สรรหา", "RECRUIT"),
                ("ฝึกอบรม", "TRAIN")
            };

            var matched = new List<string>();
            foreach (var (pat, kwCode) in thaiKeywords)
            {
                if (System.Text.RegularExpressions.Regex.IsMatch(roleName, pat, System.Text.RegularExpressions.RegexOptions.IgnoreCase))
                {
                    matched.Add(kwCode);
                }
            }

            if (matched.Count > 0)
            {
                baseCode = $"ROLE_{string.Join("_", matched)}";
            }
            else
            {
                var count = await _dbContext.Roles.CountAsync(cancellationToken);
                baseCode = $"ROLE_{(count + 1):D2}";
            }
        }

        var candidate = baseCode;
        int suffix = 1;
        while (await _dbContext.Roles.AnyAsync(r => r.RoleCode == candidate, cancellationToken))
        {
            candidate = $"{baseCode}_{suffix++}";
        }

        return candidate;
    }
}
