import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  CompanyBankAccount,
  CreateCompanyBankAccountRequest,
  UpdateCompanyBankAccountRequest,
} from '@/types/organization';

export const companyBankAccountService = {
  // ดึงรายการบัญชีธนาคารบริษัททั้งหมด
  async getAll(companyId?: number): Promise<CompanyBankAccount[]> {
    const params = companyId ? { companyId } : undefined;
    const res = await apiClient.get<ApiResponse<CompanyBankAccount[]>>('/company-bank-accounts', { params });
    return res.data.data;
  },

  // ดึงบัญชีตาม ID
  async getById(id: number): Promise<CompanyBankAccount> {
    const res = await apiClient.get<ApiResponse<CompanyBankAccount>>(`/company-bank-accounts/${id}`);
    return res.data.data;
  },

  // สร้างบัญชีใหม่
  async create(data: CreateCompanyBankAccountRequest): Promise<CompanyBankAccount> {
    const res = await apiClient.post<ApiResponse<CompanyBankAccount>>('/company-bank-accounts', data);
    return res.data.data;
  },

  // แก้ไขบัญชี
  async update(id: number, data: UpdateCompanyBankAccountRequest): Promise<CompanyBankAccount> {
    const res = await apiClient.put<ApiResponse<CompanyBankAccount>>(`/company-bank-accounts/${id}`, data);
    return res.data.data;
  },

  // ตั้งเป็นบัญชีหลักสำหรับจ่ายเงินเดือน
  async setPrimary(id: number): Promise<CompanyBankAccount> {
    const res = await apiClient.put<ApiResponse<CompanyBankAccount>>(`/company-bank-accounts/${id}/set-primary`);
    return res.data.data;
  },

  // ลบบัญชี
  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/company-bank-accounts/${id}`);
  },
};
