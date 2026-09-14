import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  BenefitItem,
  CreateBenefitPayload,
  UpdateBenefitPayload,
} from '@/types/benefit';

export const benefitService = {
  // ดึงรายการสิทธิประโยชน์/สวัสดิการทั้งหมด
  async getAll(params?: { category?: string; status?: string }): Promise<BenefitItem[]> {
    const res = await apiClient.get<ApiResponse<BenefitItem[]>>('/benefits', {
      params,
    });
    return res.data.data;
  },

  // ดึงข้อมูลตาม ID
  async getById(id: number): Promise<BenefitItem> {
    const res = await apiClient.get<ApiResponse<BenefitItem>>(`/benefits/${id}`);
    return res.data.data;
  },

  // สร้างสิทธิประโยชน์/สวัสดิการใหม่
  async create(data: CreateBenefitPayload): Promise<BenefitItem> {
    const res = await apiClient.post<ApiResponse<BenefitItem>>('/benefits', data);
    return res.data.data;
  },

  // แก้ไขสิทธิประโยชน์/สวัสดิการ
  async update(id: number, data: UpdateBenefitPayload): Promise<BenefitItem> {
    const res = await apiClient.put<ApiResponse<BenefitItem>>(`/benefits/${id}`, data);
    return res.data.data;
  },

  // ลบสิทธิประโยชน์
  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/benefits/${id}`);
  },
};
