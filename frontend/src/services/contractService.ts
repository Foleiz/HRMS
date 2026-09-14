import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  EmploymentContract,
  ContractSummaryStats,
  CreateContractRequest,
  UpdateContractRequest,
} from '@/types/contract';

/**
 * Service สำหรับเรียก API จัดการสัญญาจ้างงานและวงจรชีวิตพนักงาน
 */
export const contractService = {
  // ดึงรายการสัญญาจ้างงานทั้งหมด พร้อมตัวกรอง
  async getAll(params?: { search?: string; contractType?: string; status?: string }): Promise<EmploymentContract[]> {
    const res = await apiClient.get<ApiResponse<EmploymentContract[]>>('/employment-contracts', { params });
    return res.data.data;
  },

  // ดึงข้อมูลสถิติสรุป KPI (ทดลองงาน, ประจำ, ใกล้ครบกำหนด 7 วัน)
  async getStats(): Promise<ContractSummaryStats> {
    const res = await apiClient.get<ApiResponse<ContractSummaryStats>>('/employment-contracts/stats');
    return res.data.data;
  },

  // ดึงรายละเอียดสัญญาจ้างตาม ID
  async getById(id: number): Promise<EmploymentContract> {
    const res = await apiClient.get<ApiResponse<EmploymentContract>>(`/employment-contracts/${id}`);
    return res.data.data;
  },

  // ดึงประวัติสัญญาจ้างงานของพนักงานตาม Employee ID
  async getByEmployeeId(employeeId: number): Promise<EmploymentContract[]> {
    const res = await apiClient.get<ApiResponse<EmploymentContract[]>>(`/employees/${employeeId}/contracts`);
    return res.data.data;
  },

  // สร้างสัญญาจ้างงานใหม่
  async create(data: CreateContractRequest): Promise<EmploymentContract> {
    const res = await apiClient.post<ApiResponse<EmploymentContract>>('/employment-contracts', data);
    return res.data.data;
  },

  // แก้ไขสัญญาจ้างงาน
  async update(id: number, data: UpdateContractRequest): Promise<EmploymentContract> {
    const res = await apiClient.put<ApiResponse<EmploymentContract>>(`/employment-contracts/${id}`, data);
    return res.data.data;
  },

  // บันทึกสิ้นสุด/บอกเลิกสัญญา
  async terminate(id: number, reason?: string, terminationDate?: string): Promise<boolean> {
    const res = await apiClient.put<ApiResponse<boolean>>(`/employment-contracts/${id}/terminate`, {
      reason,
      terminationDate,
    });
    return res.data.data;
  },

  // ลบสัญญาจ้างงาน
  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/employment-contracts/${id}`);
  },
};
