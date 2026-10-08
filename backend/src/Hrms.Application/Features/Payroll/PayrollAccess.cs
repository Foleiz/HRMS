using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;

namespace Hrms.Application.Features.Payroll;

/// <summary>
/// กำหนดสิทธิ์การเข้าถึงระบบเงินเดือนฝั่ง Backend (Server-side authorization)
/// แยกตามหน้าที่: HR (จัดทำ/คำนวณ), การเงิน (ตรวจสอบ/โอนเงิน), ผู้อนุมัติ (CEO)
/// หมายเหตุ: ADMIN ผ่านทุกสิทธิ์ผ่าน ICurrentUserService.HasPermission อยู่แล้ว
/// </summary>
public static class PayrollAccess
{
    // ===== Permission groups (รหัสสิทธิ์รูปแบบ {PREFIX}_{VIEW|CREATE|EDIT|APPROVE} จาก RoleService) =====
    private static readonly string[] HrPermissions =
    {
        "PAYROLL_CALC_CREATE", "PAYROLL_CALC_EDIT", "PAYROLL_HR_CREATE", "PAYROLL_HR_EDIT"
    };

    private static readonly string[] FinancePermissions =
    {
        "PAYROLL_FINANCE_CREATE", "PAYROLL_FINANCE_EDIT", "PAYROLL_FINANCE_APPROVE",
        "PAYROLL_BANK_CREATE", "PAYROLL_BANK_EDIT", "PAYROLL_TAX_EDIT", "PAYROLL_TAX_MANAGE"
    };

    private static readonly string[] ApproverPermissions =
    {
        "APPROVAL_PAYROLL_APPROVE", "PAYROLL_ADMIN_APPROVE", "PAYROLL_CALC_APPROVE", "PAYROLL_APPROVE"
    };

    private static readonly string[] ViewPermissions =
    {
        "PAYROLL_VIEW", "PAYROLL_HR_VIEW", "PAYROLL_FINANCE_VIEW", "PAYROLL_ADMIN_VIEW",
        "PAYROLL_CALC_VIEW", "PAYROLL_BANK_VIEW", "PAYROLL_TAX_VIEW", "PAYROLL_STRUCTURE_VIEW",
        "PAYROLL_ITEMS_VIEW", "PAYROLL_BONUS_VIEW", "APPROVAL_PAYROLL_VIEW"
    };

    private static readonly string[] HrRoles = { "HR_ADMIN", "HR_MGR" };
    private static readonly string[] FinanceRoles = { "PAYROLL_ADMIN" };
    private static readonly string[] ApproverRoles = { "CEO" };

    private static bool Any(ICurrentUserService u, string[] perms, string[] roles) =>
        u.HasRole("ADMIN") || u.HasRole("SYSTEM_SUPER") || perms.Any(u.HasPermission);

    /// <summary>HR: สร้างรอบ, คำนวณ, ส่งการเงิน, ลบรอบ, ปรับเงินเดือน</summary>
    public static bool IsHr(ICurrentUserService u) => Any(u, HrPermissions, HrRoles);

    /// <summary>การเงิน: ตรวจสอบตัวเลข, ตั้งวิธีจ่าย, สร้างไฟล์ธนาคาร, แนบสลิป</summary>
    public static bool IsFinance(ICurrentUserService u) => Any(u, FinancePermissions, FinanceRoles);

    /// <summary>ผู้อนุมัติ (CEO): อนุมัติรอบเงินเดือน, ยืนยันการจ่ายเงิน</summary>
    public static bool IsApprover(ICurrentUserService u) => Any(u, ApproverPermissions, ApproverRoles);

    /// <summary>ดูข้อมูลเงินเดือนของทุกคน (ทุกบทบาทที่เกี่ยวข้องกับเงินเดือน)</summary>
    public static bool CanView(ICurrentUserService u) =>
        Any(u, ViewPermissions, Array.Empty<string>()) || IsHr(u) || IsFinance(u) || IsApprover(u);

    /// <summary>ดูข้อมูลโครงสร้างเงินเดือน (เฉพาะผู้มีสิทธิ์โครงสร้าง หรือ HR/Admin)</summary>
    public static bool CanViewStructures(ICurrentUserService u) =>
        u.HasRole("ADMIN") || u.HasRole("SYSTEM_SUPER") || IsHr(u) ||
        u.HasPermission("PAYROLL_STRUCTURE_VIEW") || u.HasPermission("PAYROLL_STRUCTURE_CREATE") || u.HasPermission("PAYROLL_STRUCTURE_EDIT");

    /// <summary>ดูข้อมูลรายการได้และรายการหัก (เฉพาะผู้มีสิทธิ์รายการได้หัก หรือ HR/Admin)</summary>
    public static bool CanViewItems(ICurrentUserService u) =>
        u.HasRole("ADMIN") || u.HasRole("SYSTEM_SUPER") || IsHr(u) ||
        u.HasPermission("PAYROLL_ITEMS_VIEW") || u.HasPermission("PAYROLL_ITEMS_CREATE") || u.HasPermission("PAYROLL_ITEMS_EDIT");

    /// <summary>ดูข้อมูลการโอนเงินธนาคาร (เฉพาะฝ่ายการเงิน หรือผู้มีสิทธิ์โอนเงิน)</summary>
    public static bool CanViewBankTransfer(ICurrentUserService u) =>
        u.HasRole("ADMIN") || u.HasRole("SYSTEM_SUPER") || IsFinance(u) ||
        u.HasPermission("PAYROLL_BANK_VIEW") || u.HasPermission("PAYROLL_BANK_CREATE") || u.HasPermission("PAYROLL_BANK_EDIT");

    /// <summary>ดูข้อมูลภาษีและประกันสังคม (เฉพาะฝ่ายการเงิน หรือผู้มีสิทธิ์ภาษี)</summary>
    public static bool CanViewTaxSso(ICurrentUserService u) =>
        u.HasRole("ADMIN") || u.HasRole("SYSTEM_SUPER") || IsFinance(u) ||
        u.HasPermission("PAYROLL_TAX_VIEW") || u.HasPermission("PAYROLL_TAX_MANAGE") || u.HasPermission("PAYROLL_TAX_EDIT");

    /// <summary>ดูข้อมูลโบนัส (เฉพาะผู้มีสิทธิ์โบนัส หรือ Admin)</summary>
    public static bool CanViewBonus(ICurrentUserService u) =>
        u.HasRole("ADMIN") || u.HasRole("SYSTEM_SUPER") ||
        u.HasPermission("PAYROLL_BONUS_VIEW") || u.HasPermission("PAYROLL_BONUS_CREATE") ||
        u.HasPermission("PAYROLL_BONUS_EDIT") || u.HasPermission("PAYROLL_BONUS_APPROVE");

    /// <summary>จัดการข้อมูลตั้งค่าเฉพาะหมวด (เช่น PAYROLL_STRUCTURE, PAYROLL_ITEMS, PAYROLL_BONUS, PAYROLL_TAX) หรือเป็น HR</summary>
    public static bool CanManage(ICurrentUserService u, string prefix) =>
        IsHr(u) || u.HasPermission($"{prefix}_CREATE") || u.HasPermission($"{prefix}_EDIT");

    public static void Ensure(bool allowed, string action)
    {
        if (!allowed)
            throw new ForbiddenException($"คุณไม่มีสิทธิ์{action}");
    }
}
