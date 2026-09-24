using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;

namespace Hrms.Application.Features.Leave.Services;

public interface ILeaveRequestService
{
    /// <summary>
    /// scopeToManagerEmployeeId: ถ้าระบุมา จะกรองให้เห็นเฉพาะคำขอลาของ "ลูกทีมสายตรง" ของหัวหน้างานคนนี้เท่านั้น
    /// (จับคู่จาก EmployeeAssignment.ManagerEmployeeId ที่ยัง IsCurrent อยู่) ใช้สำหรับหน้ารายการรออนุมัติ/ประวัติ
    /// ของหัวหน้างานที่ไม่ใช่ ADMIN — ถ้าเป็น null จะไม่กรอง (มองเห็นทั้งหมดตามเงื่อนไขอื่นตามปกติ)
    /// </summary>
    Task<(List<LeaveRequestDto> Items, int TotalCount)> GetAllAsync(
        long? employeeId = null,
        string? status = null,
        int page = 1,
        int pageSize = 20,
        long? scopeToManagerEmployeeId = null,
        long? currentViewerEmployeeId = null,
        CancellationToken cancellationToken = default);

    Task<LeaveStatsDto> GetStatsAsync(long? scopeToManagerEmployeeId = null, CancellationToken cancellationToken = default);
    Task<LeaveRequestDto?> GetByIdAsync(long id, long? currentViewerEmployeeId = null, CancellationToken cancellationToken = default);
    Task<LeaveRequestDto> CreateAsync(CreateLeaveRequestDto request, CancellationToken cancellationToken = default);

    /// <summary>
    /// แก้ไขคำขอลาที่ยังเป็นแบบร่าง (Status = DRAFT) เท่านั้น — ใช้ทั้งตอนบันทึกแบบร่างซ้ำ
    /// (request.IsDraft = true) และตอนกดยื่นจริงจากแบบร่างเดิม (request.IsDraft = false)
    /// </summary>
    Task<LeaveRequestDto> UpdateDraftAsync(long id, CreateLeaveRequestDto request, CancellationToken cancellationToken = default);

    Task<LeaveRequestDto> ApproveAsync(long id, long? approverId = null, string? comment = null, CancellationToken cancellationToken = default);
    Task<LeaveRequestDto> RejectAsync(long id, string? reason = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// ยกเลิกคำขอลา — ถ้าเคยอนุมัติแล้วจะคืนยอดวันลาให้อัตโนมัติแล้วตั้งสถานะเป็น CANCELLED
    /// ถ้า revertToDraftIfPending = true และคำขอยังอยู่ในสถานะ PENDING (ยังไม่ได้รับการอนุมัติ)
    /// จะถอนกลับไปเป็น DRAFT แทน เพื่อให้พนักงานแก้ไขและยื่นใหม่ได้เอง (ใช้เฉพาะฝั่ง ESS)
    /// </summary>
    Task<LeaveRequestDto> CancelAsync(long id, string? reason = null, long? cancelledBy = null, bool revertToDraftIfPending = false, CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงไฟล์เอกสารแนบ (เช่น ใบรับรองแพทย์) ของคำร้องขอลาตามรหัสเอกสาร
    /// </summary>
    Task<LeaveRequestDocument?> GetDocumentAsync(long requestId, long documentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ลบคำขอลาที่ยังเป็นแบบร่าง (Status = DRAFT) เท่านั้นแบบถาวร (hard delete) — รวมถึงเอกสารแนบที่ผูกอยู่
    /// (ลบทิ้งไปพร้อมกันโดย Cascade Delete ที่ตั้งค่าไว้ใน DbContext) เนื่องจากยังไม่เคยยื่นจริง
    /// จึงไม่กระทบยอดวันลาคงเหลือหรือประวัติที่ต้องเก็บไว้เพื่อตรวจสอบ
    /// </summary>
    Task DeleteDraftAsync(long id, CancellationToken cancellationToken = default);
}
