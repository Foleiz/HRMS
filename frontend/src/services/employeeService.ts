import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { Employee, CreateEmployeePayload } from '@/types/employee';

/**
 * Service สำหรับเรียก API จัดการข้อมูลพนักงาน (Employee Core & PDPA)
 */
export const employeeService = {
  // ดึงรายการพนักงานทั้งหมด พร้อมกรองคำค้นหา
  async getAll(search?: string): Promise<Employee[]> {
    const params = search ? { search } : undefined;
    const res = await apiClient.get<ApiResponse<Employee[]>>('/employees', { params });
    return res.data.data;
  },

  // ดึงข้อมูลพนักงานตาม ID
  async getById(id: number): Promise<Employee> {
    const res = await apiClient.get<ApiResponse<Employee>>(`/employees/${id}`);
    return res.data.data;
  },

  // เพิ่มพนักงานใหม่
  async create(data: CreateEmployeePayload): Promise<Employee> {
    const res = await apiClient.post<ApiResponse<Employee>>('/employees', data);
    return res.data.data;
  },

  // แก้ไขข้อมูลพนักงาน
  async update(id: number, data: Partial<CreateEmployeePayload>): Promise<Employee> {
    const res = await apiClient.put<ApiResponse<Employee>>(`/employees/${id}`, data);
    return res.data.data;
  },

  // ลบข้อมูลพนักงาน
  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/employees/${id}`);
  },
};
