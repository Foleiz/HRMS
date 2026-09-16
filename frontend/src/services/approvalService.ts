import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  ApprovalFlow,
  CreateApprovalFlowPayload,
  UpdateApprovalFlowPayload,
  ApprovalDelegation,
  CreateApprovalDelegationPayload,
} from '@/types/approval';

/**
 * Service สำหรับเรียก API ตั้งค่าสายการอนุมัติเอกสารกลาง (Approval Workflow Designer)
 * และการมอบอำนาจอนุมัติแทน (Approval Delegation)
 */
export const approvalService = {
  // === Approval Flows (สายการอนุมัติ) ===
  async getFlows(params?: { documentType?: string; status?: string }): Promise<ApprovalFlow[]> {
    const res = await apiClient.get<ApiResponse<ApprovalFlow[]>>('/approval-flows', { params });
    return res.data.data;
  },

  async getFlowById(id: number): Promise<ApprovalFlow> {
    const res = await apiClient.get<ApiResponse<ApprovalFlow>>(`/approval-flows/${id}`);
    return res.data.data;
  },

  async createFlow(data: CreateApprovalFlowPayload): Promise<ApprovalFlow> {
    const res = await apiClient.post<ApiResponse<ApprovalFlow>>('/approval-flows', data);
    return res.data.data;
  },

  async updateFlow(id: number, data: UpdateApprovalFlowPayload): Promise<ApprovalFlow> {
    const res = await apiClient.put<ApiResponse<ApprovalFlow>>(`/approval-flows/${id}`, data);
    return res.data.data;
  },

  async deleteFlow(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/approval-flows/${id}`);
    return res.data.data;
  },

  // === Approval Delegations (มอบอำนาจอนุมัติแทน) ===
  async getDelegations(params?: { delegatorEmployeeId?: number; status?: string }): Promise<ApprovalDelegation[]> {
    const res = await apiClient.get<ApiResponse<ApprovalDelegation[]>>('/approval-delegations', { params });
    return res.data.data;
  },

  async createDelegation(data: CreateApprovalDelegationPayload): Promise<ApprovalDelegation> {
    const res = await apiClient.post<ApiResponse<ApprovalDelegation>>('/approval-delegations', data);
    return res.data.data;
  },

  async setDelegationStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<ApprovalDelegation> {
    const res = await apiClient.put<ApiResponse<ApprovalDelegation>>(`/approval-delegations/${id}/status`, { status });
    return res.data.data;
  },
};
