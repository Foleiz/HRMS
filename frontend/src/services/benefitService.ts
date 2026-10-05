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

  // ดึงภาพรวมสวัสดิการของพนักงานทุกคน (HR Overview / Accordion List)
  async getEmployeesBenefitOverview(params?: { year?: number; search?: string }): Promise<import('@/types/benefit').EmployeeBenefitOverview[]> {
    const res = await apiClient.get<ApiResponse<import('@/types/benefit').EmployeeBenefitOverview[]>>(
      '/benefits/balances',
      { params }
    );
    return res.data.data;
  },

  // ดึงข้อมูลสรุปโควตาและการใช้สิทธิ์สวัสดิการของพนักงาน
  async getEmployeeUsageSummary(employeeId: number, year?: number) {
    const res = await apiClient.get<ApiResponse<import('@/types/benefit').EmployeeBenefitUsageSummary>>(
      `/benefits/usage/${employeeId}`,
      { params: year ? { year } : undefined }
    );
    return res.data.data;
  },

  // ดึงประวัติรายการเบิกจ่าย/ใช้สิทธิ์สวัสดิการของพนักงาน
  async getEmployeeClaims(employeeId: number, year?: number, benefitItemId?: number) {
    const res = await apiClient.get<ApiResponse<import('@/types/benefit').BenefitClaim[]>>(
      `/benefits/claims/${employeeId}`,
      {
        params: {
          ...(year ? { year } : {}),
          ...(benefitItemId ? { benefitItemId } : {}),
        },
      }
    );
    return res.data.data;
  },

  // บันทึกการขอเบิก/ใช้สิทธิ์สวัสดิการ
  async createClaim(data: import('@/types/benefit').CreateBenefitClaimPayload) {
    const res = await apiClient.post<ApiResponse<import('@/types/benefit').BenefitClaim>>(
      '/benefits/claims',
      data
    );
    return res.data.data;
  },

  // ยกเลิก/ลบรายการเบิกสวัสดิการ
  async deleteClaim(claimId: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/benefits/claims/${claimId}`);
  },
};

