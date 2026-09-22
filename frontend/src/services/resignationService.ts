import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  CreateResignationRequestPayload,
  ResignationRequest,
} from '@/types/resignation';

/**
 * Service สำหรับเรียก API ระบบยื่นคำขอลาออก (ESS Resignation Service)
 */
export const resignationService = {
  /**
   * ดึงรายการคำขอลาออกของพนักงานที่ล็อกอินอยู่ (ESS)
   */
  async getMyRequests(): Promise<ResignationRequest[]> {
    const res = await apiClient.get<ApiResponse<ResignationRequest[]>>('/resignation/my-requests');
    return res.data.data;
  },

  /**
   * ดึงรายการคำขอลาออกทั้งหมด (สำหรับ HR / Admin / Manager)
   */
  async getAllRequests(status?: string): Promise<ResignationRequest[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await apiClient.get<ApiResponse<ResignationRequest[]>>(`/resignation/requests${params}`);
    return res.data.data;
  },

  /**
   * ดึงรายละเอียดคำขอลาออกตาม ID
   */
  async getRequestById(id: number): Promise<ResignationRequest> {
    const res = await apiClient.get<ApiResponse<ResignationRequest>>(`/resignation/requests/${id}`);
    return res.data.data;
  },

  /**
   * ยื่นคำขอลาออกใหม่
   */
  async createRequest(payload: CreateResignationRequestPayload): Promise<ResignationRequest> {
    const res = await apiClient.post<ApiResponse<ResignationRequest>>('/resignation/requests', payload);
    return res.data.data;
  },

  /**
   * ขอยกเลิกคำขอลาออก
   */
  async cancelRequest(id: number, reason?: string): Promise<boolean> {
    const res = await apiClient.post<ApiResponse<boolean>>(`/resignation/requests/${id}/cancel`, {
      cancelReason: reason,
    });
    return res.data.data;
  },
};
