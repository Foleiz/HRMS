import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { EmployeeTransfer, TransferSummaryStats, CreateTransferRequest } from '@/types/transfer';
import { ApprovalTimeline } from '@/types/leave';

/**
 * Service สำหรับเรียก API การย้ายแผนกและการเลื่อนตำแหน่ง (Employee Transfers & Promotions)
 */
export const transferService = {
  // ดึงรายการคำขอย้าย/เลื่อนตำแหน่งทั้งหมด พร้อมตัวกรอง
  async getAll(params?: { search?: string; transferType?: string; status?: string }): Promise<EmployeeTransfer[]> {
    const res = await apiClient.get<ApiResponse<EmployeeTransfer[]>>('/employee-transfers', { params });
    return res.data.data;
  },

  // ดึงข้อมูลสถิติสรุป KPI 3 ใบ
  async getStats(): Promise<TransferSummaryStats> {
    const res = await apiClient.get<ApiResponse<TransferSummaryStats>>('/employee-transfers/stats');
    return res.data.data;
  },

  // ดึงรายละเอียดคำขอตาม ID
  async getById(id: number): Promise<EmployeeTransfer> {
    const res = await apiClient.get<ApiResponse<EmployeeTransfer>>(`/employee-transfers/${id}`);
    return res.data.data;
  },

  // สร้างคำขอย้าย/เลื่อนตำแหน่งใหม่
  async create(data: CreateTransferRequest): Promise<EmployeeTransfer> {
    const res = await apiClient.post<ApiResponse<EmployeeTransfer>>('/employee-transfers', data);
    return res.data.data;
  },

  // อนุมัติคำขอย้าย/เลื่อนตำแหน่ง
  async approve(id: number): Promise<EmployeeTransfer> {
    const res = await apiClient.put<ApiResponse<EmployeeTransfer>>(`/employee-transfers/${id}/approve`);
    return res.data.data;
  },

  // ปฏิเสธคำขอย้าย/เลื่อนตำแหน่ง
  async reject(id: number, reason?: string): Promise<EmployeeTransfer> {
    const res = await apiClient.put<ApiResponse<EmployeeTransfer>>(`/employee-transfers/${id}/reject`, { reason });
    return res.data.data;
  },

  // ดาวน์โหลดเอกสารคำสั่งย้าย
  async downloadDocument(id: number, fileName?: string): Promise<void> {
    const res = await apiClient.get(`/employee-transfers/${id}/document`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || `transfer-order-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ดูไทม์ไลน์การอนุมัติ
  async getApprovalTimeline(id: number): Promise<ApprovalTimeline> {
    const res = await apiClient.get<ApiResponse<ApprovalTimeline>>(`/employee-transfers/${id}/approval-timeline`);
    return res.data.data;
  },

  // ดำเนินการ Action ใน Approval Workflow (APPROVE / REJECT)
  async processAction(id: number, actionDecision: 'APPROVE' | 'REJECT', comment?: string): Promise<EmployeeTransfer> {
    const res = await apiClient.put<ApiResponse<EmployeeTransfer>>(`/employee-transfers/${id}/process-action`, {
      actionDecision,
      comment,
    });
    return res.data.data;
  },
};

