import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { EmployeeDocument, CreateEmployeeDocumentPayload } from '@/types/employeeDocument';

/** แฟ้มเอกสารพนักงาน */
export const employeeDocumentService = {
  /** เอกสารทั้งหมดของพนักงาน */
  async getByEmployee(employeeId: number): Promise<EmployeeDocument[]> {
    const res = await apiClient.get<ApiResponse<EmployeeDocument[]>>(`/employees/${employeeId}/documents`);
    return res.data.data || [];
  },

  /** เอกสารของพนักงานที่ล็อกอินอยู่ */
  async getMyDocuments(): Promise<EmployeeDocument[]> {
    const res = await apiClient.get<ApiResponse<EmployeeDocument[]>>('/employee-documents/my');
    return res.data.data || [];
  },

  /** ฝ่ายบุคคลเพิ่มเอกสารเข้าแฟ้ม */
  async upload(employeeId: number, payload: CreateEmployeeDocumentPayload): Promise<EmployeeDocument> {
    const res = await apiClient.post<ApiResponse<EmployeeDocument>>(`/employees/${employeeId}/documents`, payload);
    return res.data.data;
  },

  /** ดาวน์โหลดไฟล์ */
  async download(id: number): Promise<Blob> {
    const res = await apiClient.get(`/employee-documents/${id}/file`, { responseType: 'blob' });
    return res.data as Blob;
  },

  /** ลบเอกสารออกจากแฟ้ม */
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/employee-documents/${id}`);
  },
};
