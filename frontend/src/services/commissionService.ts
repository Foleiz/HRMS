import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  CommissionPeriodSummary,
  CommissionRecord,
  CommissionPreviewResult,
  ImportCommissionResult,
  PagedCommissionBatches,
  RevertCommissionBatchResult,
  CommissionBatchEntry,
  CommissionMonthlyPeriod,
  UpdateCommissionItemPayload,
  AddManualCommissionPayload,
} from '@/types/commission';

export const commissionService = {
  async getCommissionPeriod(year: number, month: number): Promise<CommissionPeriodSummary> {
    const res = await apiClient.get<ApiResponse<CommissionPeriodSummary>>('/salary/commission', {
      params: { year, month },
    });
    return res.data.data;
  },

  async getMonthlyPeriods(year?: number): Promise<CommissionMonthlyPeriod[]> {
    const res = await apiClient.get<ApiResponse<CommissionMonthlyPeriod[]>>(
      '/salary/commission/periods',
      {
        params: { year },
      }
    );
    return res.data.data;
  },

  async getPeriodAllEntries(year: number, month: number): Promise<CommissionBatchEntry[]> {
    const res = await apiClient.get<ApiResponse<CommissionBatchEntry[]>>(
      '/salary/commission/periods/all-entries',
      {
        params: { year, month },
      }
    );
    return res.data.data;
  },

  async previewCommissionFile(
    file: File,
    year: number,
    month: number,
    defaultRate: number = 3.0
  ): Promise<CommissionPreviewResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', String(year));
    formData.append('month', String(month));
    formData.append('defaultRate', String(defaultRate));

    const res = await apiClient.post<ApiResponse<CommissionPreviewResult>>(
      '/salary/commission/preview',
      formData,
      {
        params: { year, month, defaultRate },
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return res.data.data;
  },

  async importCommissionFile(
    file: File,
    year: number,
    month: number,
    defaultRate: number = 3.0,
    overlapResolutionMode: 'USE_NEW' | 'USE_OLD' | 'COMBINE_ALL' = 'USE_NEW'
  ): Promise<ImportCommissionResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', String(year));
    formData.append('month', String(month));
    formData.append('defaultRate', String(defaultRate));
    formData.append('overlapResolutionMode', overlapResolutionMode);

    const res = await apiClient.post<ApiResponse<ImportCommissionResult>>(
      '/salary/commission/import',
      formData,
      {
        params: { year, month, defaultRate, overlapResolutionMode },
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return res.data.data;
  },

  async getCommissionBatches(
    page: number = 1,
    pageSize: number = 10
  ): Promise<PagedCommissionBatches> {
    const res = await apiClient.get<ApiResponse<PagedCommissionBatches>>(
      '/salary/commission/batches',
      {
        params: { page, pageSize },
      }
    );
    return res.data.data;
  },

  async revertCommissionBatch(batchId: number): Promise<RevertCommissionBatchResult> {
    const res = await apiClient.post<ApiResponse<RevertCommissionBatchResult>>(
      `/salary/commission/batches/${batchId}/revert`
    );
    return res.data.data;
  },

  async getBatchRecords(batchId: number): Promise<CommissionBatchEntry[]> {
    const res = await apiClient.get<ApiResponse<CommissionBatchEntry[]>>(
      `/salary/commission/batches/${batchId}/records`
    );
    return res.data.data;
  },

  async getEmployeePeriodEntries(
    employeeId: number,
    year: number,
    month: number
  ): Promise<CommissionBatchEntry[]> {
    const res = await apiClient.get<ApiResponse<CommissionBatchEntry[]>>(
      `/salary/commission/employees/${employeeId}/entries`,
      { params: { year, month } }
    );
    return res.data.data;
  },

  async updateCommissionItem(
    id: number,
    payload: UpdateCommissionItemPayload
  ): Promise<CommissionRecord> {
    const res = await apiClient.put<ApiResponse<CommissionRecord>>(
      `/salary/commission/${id}`,
      payload
    );
    return res.data.data;
  },

  async addManualCommission(payload: AddManualCommissionPayload): Promise<CommissionRecord> {
    const res = await apiClient.post<ApiResponse<CommissionRecord>>(
      '/salary/commission/manual',
      payload
    );
    return res.data.data;
  },

  async deleteCommissionItem(id: number): Promise<void> {
    await apiClient.delete(`/salary/commission/${id}`);
  },

  async confirmCommissionPeriod(
    year: number,
    month: number
  ): Promise<CommissionPeriodSummary> {
    const res = await apiClient.post<ApiResponse<CommissionPeriodSummary>>(
      '/salary/commission/confirm',
      { year, month }
    );
    return res.data.data;
  },

  async resetCommissionPeriod(year: number, month: number): Promise<CommissionPeriodSummary> {
    const res = await apiClient.post<ApiResponse<CommissionPeriodSummary>>(
      '/salary/commission/reset',
      { year, month }
    );
    return res.data.data;
  },

  async downloadTemplate(): Promise<Blob> {
    const res = await apiClient.get('/salary/commission/template', {
      responseType: 'blob',
    });
    return res.data instanceof Blob
      ? res.data
      : new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
  },
};
