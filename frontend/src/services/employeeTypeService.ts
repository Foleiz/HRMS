import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  EmployeeType,
  CreateEmployeeTypePayload,
  UpdateEmployeeTypePayload,
  EmployeeTypeStats,
} from '@/types/employeeType';

export const employeeTypeService = {
  // ดึงรายการประเภทพนักงาน/สัญญาจ้างทั้งหมด
  async getAll(params?: { search?: string; status?: string }): Promise<EmployeeType[]> {
    const res = await apiClient.get<ApiResponse<EmployeeType[]>>('/employee-types', {
      params,
    });
    return res.data.data;
  },

  // สรุปสถิติสำหรับแสดงใน KPI Stat Cards
  async getStats(): Promise<EmployeeTypeStats> {
    const res = await apiClient.get<ApiResponse<EmployeeTypeStats>>('/employee-types/stats');
    return res.data.data;
  },

  // ดึงข้อมูลตาม ID
  async getById(id: number): Promise<EmployeeType> {
    const res = await apiClient.get<ApiResponse<EmployeeType>>(`/employee-types/${id}`);
    return res.data.data;
  },

  // สร้างประเภทสัญญา/การจ้างงานใหม่
  async create(data: CreateEmployeeTypePayload): Promise<EmployeeType> {
    const res = await apiClient.post<ApiResponse<EmployeeType>>('/employee-types', data);
    return res.data.data;
  },

  // แก้ไขประเภทสัญญา/การจ้างงาน
  async update(id: number, data: UpdateEmployeeTypePayload): Promise<EmployeeType> {
    const res = await apiClient.put<ApiResponse<EmployeeType>>(`/employee-types/${id}`, data);
    return res.data.data;
  },

  // ลบหรือปิดการใช้งานประเภทสัญญา
  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/employee-types/${id}`);
  },
};
