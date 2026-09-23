import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  ApprovalFlow,
  CreateApprovalFlowPayload,
  UpdateApprovalFlowPayload,
  WorkflowSimulationRequest,
  WorkflowSimulationResult,
} from '@/types/approval';

/**
 * Service สำหรับเรียก API ตั้งค่าสายการอนุมัติเอกสารกลาง (Approval Workflow Designer & Simulation Engine)
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
};
