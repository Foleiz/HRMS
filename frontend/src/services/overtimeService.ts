import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  OvertimeRequest,
  CreateOvertimeRequest,
  ReviewOvertimeRequest,
  OvertimeFilterQuery,
} from '@/types/overtime';

export const overtimeService = {
  async getOvertimeRequests(filter: OvertimeFilterQuery = {}): Promise<OvertimeRequest[]> {
    const params: Record<string, string | number> = {};
    if (filter.employeeId) params.employeeId = filter.employeeId;
    if (filter.departmentId && filter.departmentId > 0) params.departmentId = filter.departmentId;
    if (filter.year) params.year = filter.year;
    if (filter.month) params.month = filter.month;
    if (filter.status && filter.status !== 'ALL') params.status = filter.status;
    if (filter.search) params.search = filter.search;

    const res = await apiClient.get<ApiResponse<OvertimeRequest[]>>('/attendance/overtime', { params });
    return res.data.data || [];
  },

  async getOvertimeRequestById(id: number): Promise<OvertimeRequest> {
    const res = await apiClient.get<ApiResponse<OvertimeRequest>>(`/attendance/overtime/${id}`);
    return res.data.data!;
  },

  async createOvertimeRequest(request: CreateOvertimeRequest): Promise<OvertimeRequest> {
    const res = await apiClient.post<ApiResponse<OvertimeRequest>>('/attendance/overtime', request);
    return res.data.data!;
  },

  async reviewOvertimeRequest(id: number, request: ReviewOvertimeRequest): Promise<OvertimeRequest> {
    const res = await apiClient.post<ApiResponse<OvertimeRequest>>(`/attendance/overtime/${id}/review`, request);
    return res.data.data!;
  },

  async cancelOvertimeRequest(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/attendance/overtime/${id}`);
    return res.data.data ?? false;
  },
};
