import { apiClient } from '@/lib/api-client';
import { ApiResponse, Bank, CreateBankInput, UpdateBankInput } from '@/types/api';

/**
 * Service สำหรับเรียก API จัดการข้อมูลธนาคาร
 * ตัวอย่างต้นแบบ (Reference Pattern) ให้ทั้ง Dev 1 และ Dev 2 นำไปประยุกต์ใช้
 */
export const bankService = {
  // ดึงรายการธนาคารทั้งหมด
  async getAll(): Promise<Bank[]> {
    const res = await apiClient.get<ApiResponse<Bank[]>>('/banks');
    return res.data.data;
  },

  // ดึงธนาคารตาม ID
  async getById(id: number): Promise<Bank> {
    const res = await apiClient.get<ApiResponse<Bank>>(`/banks/${id}`);
    return res.data.data;
  },

  // เพิ่มธนาคารใหม่
  async create(data: CreateBankInput): Promise<Bank> {
    const res = await apiClient.post<ApiResponse<Bank>>('/banks', data);
    return res.data.data;
  },

  // แก้ไขธนาคาร
  async update(id: number, data: UpdateBankInput): Promise<Bank> {
    const res = await apiClient.put<ApiResponse<Bank>>(`/banks/${id}`, data);
    return res.data.data;
  },

  // ลบธนาคาร
  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/banks/${id}`);
  },
};
