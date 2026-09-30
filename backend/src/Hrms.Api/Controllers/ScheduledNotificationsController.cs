using Hrms.Application.Common.Models;
using Hrms.Application.Features.Approvals.Services;
using Hrms.Application.Features.Contracts.Services;
using Hrms.Application.Features.EmployeeDocuments.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// สั่งรันงานแจ้งเตือนตามเวลาทันที (ปกติงานเบื้องหลังรันเองทุก 6 ชั่วโมง) — ฝ่ายบุคคล/แอดมิน
/// </summary>
[ApiController]
[Route("api/scheduled-notifications")]
[Authorize]
public class ScheduledNotificationsController : ControllerBase
{
    private static readonly string[] AllowedRoles = { "ADMIN", "SUPER_ADMIN", "SYS_ADMIN", "SYSTEM_SUPER", "HR", "HR_ADMIN", "HR_MGR" };

    private readonly IDocumentExpiryNotifier _documents;
    private readonly IContractAlertNotifier _contracts;
    private readonly IApprovalWorkflowService _approvals;

    public ScheduledNotificationsController(IDocumentExpiryNotifier documents, IContractAlertNotifier contracts, IApprovalWorkflowService approvals)
    {
        _documents = documents;
        _contracts = contracts;
        _approvals = approvals;
    }

    [HttpPost("run")]
    public async Task<ActionResult<ApiResponse<object>>> Run(CancellationToken cancellationToken)
    {
        if (!AllowedRoles.Any(User.IsInRole))
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object>.Fail("เฉพาะฝ่ายบุคคลเท่านั้นที่สั่งรันการแจ้งเตือนได้"));

        var documents = await _documents.RunAsync(cancellationToken);
        var contracts = await _contracts.RunAsync(cancellationToken);
        var reminders = await _approvals.SendPendingRemindersAsync(Hrms.Api.BackgroundJobs.ScheduledNotificationWorker.PendingApprovalReminderDays, cancellationToken);

        var result = new
        {
            documentsExpiringSoon = documents.ExpiringSoonNotified,
            documentsExpired = documents.ExpiredNotified,
            probationEnding = contracts.ProbationNotified,
            contractsExpiring = contracts.ContractExpiryNotified,
            pendingApprovalReminders = reminders
        };
        return Ok(ApiResponse<object>.Ok(result, "ส่งแจ้งเตือนเรียบร้อย"));
    }
}
