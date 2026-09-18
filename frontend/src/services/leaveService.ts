import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  LeaveType,
  CreateLeaveTypePayload,
  UpdateLeaveTypePayload,
  LeavePolicy,
  CreateLeavePolicyPayload,
  UpdateLeavePolicyPayload,
  LeaveBalance,
  LeaveBalanceAdjustmentPayload,
  LeaveBalanceTransaction,
  InitializeYearBalancePayload,
  InitializeYearBalanceResult,
  LeaveRequest,
  LeaveStats,
  CreateLeaveRequestPayload,
  CreateMyLeaveRequestPayload,
  ApprovalTimeline,
} from '@/types/leave';

/**
 * Service สำหรับเรียก API จัดการการลา (Leave Management)
 */
export const leaveService = {
  // === 1. Leave Types (ประเภทการลา) ===
  async getLeaveTypes(): Promise<LeaveType[]> {
    const res = await apiClient.get<ApiResponse<LeaveType[]>>('/leave-types');
    return res.data.data;
  },

  async getLeaveTypeById(id: number): Promise<LeaveType> {
    const res = await apiClient.get<ApiResponse<LeaveType>>(`/leave-types/${id}`);
    return res.data.data;
  },

  async createLeaveType(data: CreateLeaveTypePayload): Promise<LeaveType> {
    const res = await apiClient.post<ApiResponse<LeaveType>>('/leave-types', data);
    return res.data.data;
  },

  async updateLeaveType(id: number, data: UpdateLeaveTypePayload): Promise<LeaveType> {
    const res = await apiClient.put<ApiResponse<LeaveType>>(`/leave-types/${id}`, data);
    return res.data.data;
  },

  async deleteLeaveType(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/leave-types/${id}`);
    return res.data.data;
  },

  // === 2. Leave Policies (สิทธิ์การลา) ===
  async getLeavePolicies(): Promise<LeavePolicy[]> {
    const res = await apiClient.get<ApiResponse<LeavePolicy[]>>('/leave-policies');
    return res.data.data;
  },

  async createLeavePolicy(data: CreateLeavePolicyPayload): Promise<LeavePolicy> {
    const res = await apiClient.post<ApiResponse<LeavePolicy>>('/leave-policies', data);
    return res.data.data;
  },

  async updateLeavePolicy(id: number, data: UpdateLeavePolicyPayload): Promise<LeavePolicy> {
    const res = await apiClient.put<ApiResponse<LeavePolicy>>(`/leave-policies/${id}`, data);
    return res.data.data;
  },

  async deleteLeavePolicy(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/leave-policies/${id}`);
    return res.data.data;
  },

  // === 3. Leave Balances & Transactions (ยอดวันลาพนักงาน) ===
  async getLeaveBalances(params?: { employeeId?: number; year?: number; leaveTypeId?: number }): Promise<LeaveBalance[]> {
    const res = await apiClient.get<ApiResponse<LeaveBalance[]>>('/leave-balances', { params });
    return res.data.data;
  },

  async getLeaveBalanceTransactions(balanceId: number): Promise<LeaveBalanceTransaction[]> {
    const res = await apiClient.get<ApiResponse<LeaveBalanceTransaction[]>>(`/leave-balances/${balanceId}/transactions`);
    return res.data.data;
  },

  async adjustLeaveBalance(data: LeaveBalanceAdjustmentPayload): Promise<LeaveBalance> {
    const res = await apiClient.post<ApiResponse<LeaveBalance>>('/leave-balances/adjust', data);
    return res.data.data;
  },

  async initializeYearBalance(data: InitializeYearBalancePayload): Promise<InitializeYearBalanceResult> {
    const res = await apiClient.post<ApiResponse<InitializeYearBalanceResult>>('/leave-balances/initialize-year', data);
    return res.data.data;
  },

  // === 4. Leave Requests (คำร้องขอลาหยุดงาน) ===
  async getLeaveRequests(params?: { employeeId?: number; status?: string; page?: number; pageSize?: number }): Promise<LeaveRequest[]> {
    const res = await apiClient.get<ApiResponse<LeaveRequest[]>>('/leave-requests', { params });
    return res.data.data;
  },

  async getLeaveStats(): Promise<LeaveStats> {
    const res = await apiClient.get<ApiResponse<LeaveStats>>('/leave-requests/stats');
    return res.data.data;
  },

  async createLeaveRequest(data: CreateLeaveRequestPayload): Promise<LeaveRequest> {
    const res = await apiClient.post<ApiResponse<LeaveRequest>>('/leave-requests', data);
    return res.data.data;
  },

  async downloadDocument(requestId: number, documentId: number, fileName?: string | null): Promise<void> {
    const res = await apiClient.get(`/leave-requests/${requestId}/documents/${documentId}`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || `attachment-${documentId}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async approveLeaveRequest(id: number, comment?: string): Promise<LeaveRequest> {
    const res = await apiClient.put<ApiResponse<LeaveRequest>>(`/leave-requests/${id}/approve`, { comment });
    return res.data.data;
  },

  async getApprovalTimeline(id: number): Promise<ApprovalTimeline> {
    const res = await apiClient.get<ApiResponse<ApprovalTimeline>>(`/leave-requests/${id}/approval-timeline`);
    return res.data.data;
  },

  /** ดาวน์โหลดเอกสารแนบ → คืน Blob สำหรับ create Object URL */
  async downloadLeaveDocument(requestId: number, documentId: number): Promise<Blob> {
    const res = await apiClient.get(`/leave-requests/${requestId}/documents/${documentId}`, {
      responseType: 'blob',
    });
    return new Blob([res.data]);
  },

  async rejectLeaveRequest(id: number, reason?: string): Promise<LeaveRequest> {
    const res = await apiClient.put<ApiResponse<LeaveRequest>>(`/leave-requests/${id}/reject`, { reason });
    return res.data.data;
  },

  async cancelLeaveRequest(id: number, reason?: string): Promise<LeaveRequest> {
    const res = await apiClient.put<ApiResponse<LeaveRequest>>(`/leave-requests/${id}/cancel`, { reason });
    return res.data.data;
  },

  // === 5. ESS (Employee Self-Service) — ยื่นคำขอลาด้วยตนเอง ===
  // ข้อมูลถูก scope โดย EmployeeId จาก JWT Token อัตโนมัติ ไม่ต้องส่ง employeeId มาเอง

  /** [ESS] ดึงรายการคำขอลาของตนเอง */
  async getMyLeaveRequests(params?: { status?: string; page?: number; pageSize?: number }): Promise<LeaveRequest[]> {
    const res = await apiClient.get<ApiResponse<LeaveRequest[]>>('/leave-requests/my', { params });
    return res.data.data;
  },

  /** [ESS] ยื่นคำขอลาใหม่ด้วยตนเอง (หรือบันทึกเป็นแบบร่างถ้า data.saveAsDraft = true) */
  async createMyLeaveRequest(data: CreateMyLeaveRequestPayload): Promise<LeaveRequest> {
    const res = await apiClient.post<ApiResponse<LeaveRequest>>('/leave-requests/my', data);
    return res.data.data;
  },

  /** [ESS] แก้ไขคำขอลาที่ยังเป็นแบบร่างของตนเอง (บันทึกแบบร่างซ้ำ หรือยื่นจริงจากแบบร่างเดิม) */
  async updateMyLeaveRequest(id: number, data: CreateMyLeaveRequestPayload): Promise<LeaveRequest> {
    const res = await apiClient.put<ApiResponse<LeaveRequest>>(`/leave-requests/my/${id}`, data);
    return res.data.data;
  },

  /** [ESS] ยกเลิกคำขอลาของตนเอง (เฉพาะที่เป็นเจ้าของคำขอ) */
  async cancelMyLeaveRequest(id: number, reason?: string): Promise<LeaveRequest> {
    const res = await apiClient.put<ApiResponse<LeaveRequest>>(`/leave-requests/my/${id}/cancel`, { reason });
    return res.data.data;
  },

  /** [ESS] ลบคำขอลาที่ยังเป็นแบบร่างของตนเองแบบถาวร (เฉพาะที่เป็นเจ้าของและยังเป็น DRAFT เท่านั้น) */
  async deleteMyLeaveRequest(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<object>>(`/leave-requests/my/${id}`);
  },
};
