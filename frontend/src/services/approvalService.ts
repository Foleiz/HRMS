import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  ApprovalFlow,
  CreateApprovalFlowPayload,
  UpdateApprovalFlowPayload,
  ApprovalDelegation,
  CreateApprovalDelegationPayload,
  UpdateApprovalDelegationPayload,
  WorkflowSimulationRequest,
  WorkflowSimulationResult,
} from '@/types/approval';

/**
 * Service สำหรับเรียก API ตั้งค่าสายการอนุมัติเอกสารกลาง (Approval Workflow Designer & Delegation Hub)
 */
export const approvalService = {
  // === 1. Approval Flows (สายการอนุมัติ) ===
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

  // === 2. Workflow Simulation (การจำลองสายการอนุมัติ) ===
  async simulateWorkflow(payload: WorkflowSimulationRequest): Promise<WorkflowSimulationResult> {
    const res = await apiClient.post<ApiResponse<WorkflowSimulationResult>>('/approval-flows/simulate', payload);
    return res.data.data;
  },

  // === 3. Approval Delegations (การมอบอำนาจอนุมัติแทน) ===
  async getDelegations(params?: {
    status?: string;
    delegatorId?: number;
    delegateId?: number;
    documentType?: string;
  }): Promise<ApprovalDelegation[]> {
    const res = await apiClient.get<ApiResponse<ApprovalDelegation[]>>('/approval-delegations', { params });
    return res.data.data;
  },

  async getDelegationById(id: number): Promise<ApprovalDelegation> {
    const res = await apiClient.get<ApiResponse<ApprovalDelegation>>(`/approval-delegations/${id}`);
    return res.data.data;
  },

  async createDelegation(payload: CreateApprovalDelegationPayload): Promise<ApprovalDelegation> {
    const res = await apiClient.post<ApiResponse<ApprovalDelegation>>('/approval-delegations', payload);
    return res.data.data;
  },

  async updateDelegation(id: number, payload: UpdateApprovalDelegationPayload): Promise<ApprovalDelegation> {
    const res = await apiClient.put<ApiResponse<ApprovalDelegation>>(`/approval-delegations/${id}`, payload);
    return res.data.data;
  },

  async deleteDelegation(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/approval-delegations/${id}`);
    return res.data.data;
  },
};
