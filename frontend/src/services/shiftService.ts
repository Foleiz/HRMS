import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { Shift, CreateShiftRequest, UpdateShiftRequest } from '@/types/shift';

export const shiftService = {
  async getShifts(status?: string): Promise<Shift[]> {
    const params = status && status !== 'ALL' ? { status } : {};
    const res = await apiClient.get<ApiResponse<Shift[]>>('/shifts', { params });
    return res.data.data || [];
  },

  async getShift(id: number): Promise<Shift> {
    const res = await apiClient.get<ApiResponse<Shift>>(`/shifts/${id}`);
    return res.data.data!;
  },

  async createShift(data: CreateShiftRequest): Promise<Shift> {
    const res = await apiClient.post<ApiResponse<Shift>>('/shifts', data);
    return res.data.data!;
  },

  async updateShift(id: number, data: UpdateShiftRequest): Promise<Shift> {
    const res = await apiClient.put<ApiResponse<Shift>>(`/shifts/${id}`, data);
    return res.data.data!;
  },

  async deleteShift(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/shifts/${id}`);
    return res.data.data || false;
  },
};
