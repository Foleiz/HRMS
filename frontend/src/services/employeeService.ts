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

  // ดึงรหัสพนักงานลำดับถัดไปที่ระบบสร้างให้อัตโนมัติ
  async getNextCode(): Promise<string> {
    const res = await apiClient.get<ApiResponse<string>>('/employees/next-code');
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

  // อัปโหลดรูปโปรไฟล์พนักงาน (เก็บลง PostgreSQL Binary โดยตรง)
  async uploadAvatar(id: number, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<string>>(`/employees/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  // ลบรูปโปรไฟล์พนักงาน
  async deleteAvatar(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<boolean>>(`/employees/${id}/avatar`);
  },

  // อัปโหลดไฟล์ลายเซ็นพนักงาน (เก็บลง PostgreSQL Binary hrms.employee_signature)
  async uploadSignature(id: number, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<string>>(`/employees/${id}/signature`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  // ลบไฟล์ลายเซ็นพนักงาน
  async deleteSignature(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<boolean>>(`/employees/${id}/signature`);
  },
};
