import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  EmploymentContract,
  ContractSummaryStats,
  CreateContractRequest,
  UpdateContractRequest,
  EmployeeCareerTimeline,
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

  // ดึงไทม์ไลน์ตำแหน่งงานและประวัติการย้ายสาขา/เลื่อนขั้น (Career & Assignment Timeline)
  async getCareerTimeline(employeeId: number): Promise<EmployeeCareerTimeline[]> {
    const res = await apiClient.get<ApiResponse<EmployeeCareerTimeline[]>>(`/employees/${employeeId}/career-timeline`);
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

  // แนบหรือเปลี่ยนไฟล์เอกสารสัญญาจ้างงาน
  async uploadDocument(id: number, fileData: string, fileName: string): Promise<EmploymentContract> {
    const res = await apiClient.post<ApiResponse<EmploymentContract>>(`/employment-contracts/${id}/document`, {
      fileData,
      fileName,
    });
    return res.data.data;
  },

  // ลบไฟล์เอกสารสัญญาจ้างงานที่แนบไว้
  async deleteDocument(id: number): Promise<EmploymentContract> {
    const res = await apiClient.delete<ApiResponse<EmploymentContract>>(`/employment-contracts/${id}/document`);
    return res.data.data;
  },

  // ดึง Blob สำหรับ Preview หรือ Download
  async getDocumentBlob(id: number, inline: boolean = false): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
    const res = await apiClient.get(`/employment-contracts/${id}/document`, {
      params: inline ? { inline: true } : undefined,
      responseType: 'blob',
    });
    const mimeType = String(res.headers['content-type'] || 'application/pdf');
    let fileName = `contract_${id}.pdf`;
    const disposition = res.headers['content-disposition'] ? String(res.headers['content-disposition']) : '';
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        fileName = decodeURIComponent(match[1].replace(/['"]/g, ''));
      }
    }
    return { blob: res.data, fileName, mimeType };
  },
};
