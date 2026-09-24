using Hrms.Application.Features.Approvals.DTOs;

namespace Hrms.Application.Features.Approvals.Services;

/// <summary>
/// สัญญาระบบสายงานการอนุมัติเอกสารกลาง (Approval Workflow Engine)
/// </summary>
public interface IApprovalWorkflowService
{
    /// <summary>
    /// เริ่มกระบวนการ Approval Flow ให้กับเอกสารใบใหม่
    /// ค้นหา ApprovalFlow ที่สอดคล้องกับ DocumentType, Department, EmployeeLevel ของผู้ยื่น
    /// </summary>
    Task<long?> StartWorkflowAsync(string documentType, long sourceDocumentId, long requesterEmployeeId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ตรวจสอบว่าพนักงานคนนี้มีสิทธิ์อนุมัติขั้นตอนปัจจุบันของ ApprovalInstance นี้หรือไม่
    /// </summary>
    Task<bool> CanUserApproveStepAsync(long instanceId, long employeeId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ดำเนินการ Action (APPROVE, REJECT, CANCEL) บนขั้นตอนปัจจุบัน
    /// </summary>
    Task<WorkflowActionResult> ProcessActionAsync(long instanceId, long approverEmployeeId, string actionDecision, string? comment = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงไทม์ไลน์และประวัติการอนุมัติของ ApprovalInstance
    /// </summary>
    Task<ApprovalTimelineDto?> GetTimelineAsync(long instanceId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงไทม์ไลน์และประวัติการอนุมัติตามประเภทและรหัสเอกสารต้นทาง
    /// </summary>
    Task<ApprovalTimelineDto?> GetTimelineByDocumentAsync(string documentType, long sourceDocumentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงรหัส Instance ID ทั้งหมดที่อยู่ระหว่างรอการอนุมัติ (PENDING) และถึงคิวของพนักงานคนนี้
    /// </summary>
    Task<List<long>> GetPendingInstanceIdsForUserAsync(long employeeId, string? documentType = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// ตรวจสอบว่าพนักงานคนนี้อยู่ในสายการอนุมัติ (เป็นผู้อนุมัติในขั้นตอนใดขั้นตอนหนึ่ง หรือเคยดำเนินการไปแล้ว หรือเป็น ADMIN) ของ ApprovalInstance นี้หรือไม่
    /// </summary>
    Task<bool> IsUserInWorkflowAsync(long instanceId, long employeeId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงรหัส Instance ID ทั้งหมดที่พนักงานคนนี้มีสิทธิ์มองเห็นในหน้ารายการอนุมัติ/ประวัติ
    /// (เป็นผู้อนุมัติในขั้นตอนใดขั้นตอนหนึ่งในสายอนุมัติ หรือเคยดำเนินการไปแล้ว หรือเป็น ADMIN)
    /// </summary>
    Task<List<long>> GetInstanceIdsForApproverUserAsync(long employeeId, string? documentType = null, CancellationToken cancellationToken = default);
}
