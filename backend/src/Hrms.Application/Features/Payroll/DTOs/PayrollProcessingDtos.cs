namespace Hrms.Application.Features.Payroll.DTOs;

public class PayrollPeriodDto
{
    public long Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string? PaymentDate { get; set; }
    public string Status { get; set; } = "REVIEW";
    public string StatusText { get; set; } = "รอตรวจสอบ";
    public int EmployeeCount { get; set; }
    public decimal TotalNetSalary { get; set; }
    // Payment Workflow
    public string? PaymentMethod { get; set; }
    public string? PaymentMethodText { get; set; }
    public DateTimeOffset? FinanceVerifiedAt { get; set; }
    public long? FinanceVerifiedBy { get; set; }
    public DateTimeOffset? PaymentConfirmedAt { get; set; }
    public long? PaymentConfirmedBy { get; set; }
    public DateTimeOffset? BankFileGeneratedAt { get; set; }
    public int TotalTransferredCount { get; set; }
    public string? PaymentNote { get; set; }
    public bool HasBankReceipt { get; set; }
    public string? BankReceiptFileName { get; set; }
    public bool CanConfirmPayment { get; set; } // true เมื่อทุกคนมี Slip และ Transferred
}

public class UploadBankReceiptRequest
{
    public string Base64Data { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string? Note { get; set; }
    public bool MarkAsPaid { get; set; } = true;
}

public class PayrollRecordDto
{
    public long Id { get; set; }
    public long PeriodId { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public decimal? TotalGrossIncome { get; set; }
    public decimal? TotalDeductionAmount { get; set; }
    public decimal? NetPayableSalary { get; set; }
    public string Status { get; set; } = "CALCULATED";
    public string StatusText { get; set; } = "คำนวณแล้ว";
    // Individual Payment Tracking
    public string PaymentStatus { get; set; } = "PENDING";
    public string PaymentStatusText { get; set; } = "รอโอน";
    public DateTimeOffset? TransferredAt { get; set; }
    public string? TransferReference { get; set; }
    public bool HasSlip { get; set; }
    public string? SlipFileName { get; set; }
    public DateTimeOffset? SlipUploadedAt { get; set; }

    // HR Pre-Payroll Verification Fields
    public decimal LeaveDays { get; set; }
    public string? LeaveSummary { get; set; }
    public decimal OvertimeHours { get; set; }
    public string? AdjustmentsSummary { get; set; }
    public string InputStatus { get; set; } = "COMPLETE";
    public string InputStatusText { get; set; } = "ครบแล้ว";

    // Finance & Banking Fields
    public string? BankCode { get; set; }
    public string? BankName { get; set; }
    public string? AccountNumber { get; set; }
}

public class PayrollDetailItemDto
{
    public long Id { get; set; }
    public long PayrollId { get; set; }
    public long PayrollItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string ItemType { get; set; } = "EARNING"; // EARNING, DEDUCTION
    public decimal? Quantity { get; set; }
    public decimal? Rate { get; set; }
    public decimal Amount { get; set; }
    public string? Subtext { get; set; }
}

public class UpdatePeriodStatusRequest
{
    public string Status { get; set; } = "REVIEW";
}

public class CreatePayrollPeriodRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string? PaymentDate { get; set; }
}

public class BankTransferItemDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal NetPayableSalary { get; set; }
    public string Status { get; set; } = "READY";
}

public class BankTransferSummaryDto
{
    public long PeriodId { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public string SelectedBankCode { get; set; } = "ALL";
    public decimal TotalTransferAmount { get; set; }
    public int TotalEmployees { get; set; }
    public List<BankTransferItemDto> Items { get; set; } = new();
}

public class TaxSsoItemDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string CitizenId { get; set; } = string.Empty;
    public decimal GrossIncome { get; set; }
    public decimal Pnd1Tax { get; set; }
    public decimal SsoEmployee { get; set; }
    public decimal SsoEmployer { get; set; }
}

public class TaxSsoSummaryDto
{
    public long PeriodId { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public decimal TotalGrossIncome { get; set; }
    public decimal TotalPnd1Tax { get; set; }
    public decimal TotalSsoEmployee { get; set; }
    public decimal TotalSsoEmployer { get; set; }
    public decimal TotalSsoCombined { get; set; }
    public int EmployeeCount { get; set; }
    public List<TaxSsoItemDto> Items { get; set; } = new();
}

public class EmployeeBonusDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string? PositionName { get; set; }
    public int Year { get; set; }
    public decimal BaseSalary { get; set; }
    public decimal Multiplier { get; set; }
    public decimal BonusAmount { get; set; }
    public string CalculationMode { get; set; } = "MULTIPLIER";
    public string? Note { get; set; }
    public string Status { get; set; } = "DRAFT";
    public string StatusText { get; set; } = "ร่าง";
}

public class CalculateBonusRequest
{
    public int Year { get; set; }
    public decimal DefaultMultiplier { get; set; } = 2.0m;
}

public class UpdateBonusItemDto
{
    public long EmployeeId { get; set; }
    public decimal BonusAmount { get; set; }
    public decimal? Multiplier { get; set; }
    public string? Note { get; set; }
}

public class SaveEmployeeBonusesRequest
{
    public int Year { get; set; }
    public string CalculationMode { get; set; } = "MANUAL";
    public List<UpdateBonusItemDto> Items { get; set; } = new();
}

// ===== PAYMENT WORKFLOW DTOs =====

/// <summary>Request: ตั้งค่าวิธีการจ่ายเงิน</summary>
public class SetPaymentMethodRequest
{
    /// <summary>BANK_BATCH หรือ DIRECT_TRANSFER</summary>
    public string PaymentMethod { get; set; } = string.Empty;
}

/// <summary>Request: Mark พนักงานว่าโอนเงินแล้ว (พร้อม Slip)</summary>
public class MarkTransferredRequest
{
    /// <summary>เลข Reference การโอน (เช่น เลขที่รายการจาก Internet Banking)</summary>
    public string? TransferReference { get; set; }
    /// <summary>ชื่อไฟล์ Slip เดิม</summary>
    public string SlipFileName { get; set; } = string.Empty;
    /// <summary>MIME type เช่น image/jpeg, image/png, application/pdf</summary>
    public string SlipContentType { get; set; } = string.Empty;
    /// <summary>ข้อมูล Slip เป็น Base64 string</summary>
    public string SlipBase64 { get; set; } = string.Empty;
}

/// <summary>Request: CEO Confirm การจ่ายเงินทั้งหมด</summary>
public class ConfirmPaymentRequest
{
    /// <summary>หมายเหตุการจ่ายเงิน (optional)</summary>
    public string? Note { get; set; }
}

/// <summary>ข้อมูลพนักงานในตารางโอนเงิน (Direct Transfer)</summary>
public class PayrollTransferItemDto
{
    public long PayrollId { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    // Bank Account
    public string BankCode { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    // Salary
    public decimal NetPayableSalary { get; set; }
    // Payment Status
    public string PaymentStatus { get; set; } = "PENDING";
    public string PaymentStatusText { get; set; } = "รอโอน";
    public DateTimeOffset? TransferredAt { get; set; }
    public string? TransferReference { get; set; }
    // Slip
    public bool HasSlip { get; set; }
    public string? SlipFileName { get; set; }
    public DateTimeOffset? SlipUploadedAt { get; set; }
}

/// <summary>สรุปรายการโอนเงินทั้งหมดของรอบ</summary>
public class PayrollTransferListDto
{
    public long PeriodId { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public string? PaymentMethod { get; set; }
    public string Status { get; set; } = string.Empty;
    public int TotalEmployees { get; set; }
    public int TransferredCount { get; set; }
    public int PendingCount { get; set; }
    public decimal TotalNetSalary { get; set; }
    public bool CanConfirmPayment { get; set; }
    public List<PayrollTransferItemDto> Items { get; set; } = new();
}

/// <summary>Response: ดาวน์โหลด Slip ของพนักงาน</summary>
public class SlipDownloadDto
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public byte[] Data { get; set; } = Array.Empty<byte>();
}

/// <summary>Request: Mark ทุกคนว่าโอนแล้ว (Bulk) - ไม่มี slip (ต้องมี slip ทีละคนแยก)</summary>
public class GenerateBankFileRequest
{
    /// <summary>Bank Code สำหรับกรอง (null = ทุกธนาคาร)</summary>
    public string? BankCode { get; set; }
}


