import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  GeneralDocumentRequest,
  CreateGeneralDocumentPayload,
} from '@/types/generalDocument';

// ข้อมูลจาก API ใช้ id เป็นตัวเลข — หน้าเว็บเดิมใช้ id เป็นข้อความ จึงแปลงให้ตรงกัน
type ApiGeneralRequest = Omit<GeneralDocumentRequest, 'id'> & { id: number };
const toModel = (r: ApiGeneralRequest): GeneralDocumentRequest => ({ ...r, id: String(r.id) });

/** คำขออื่นๆ (General Requests) — ผ่านสายการอนุมัติประเภท GENERAL_REQUEST */
export const generalDocumentService = {
  /** คำขอของพนักงานที่ล็อกอินอยู่ */
  async getMyRequests(): Promise<GeneralDocumentRequest[]> {
    const res = await apiClient.get<ApiResponse<ApiGeneralRequest[]>>('/general-requests/my');
    return (res.data.data || []).map(toModel);
  },

  /** ยื่นคำขอใหม่ (ข้อมูลพนักงานดึงจากผู้ใช้ที่ล็อกอินฝั่ง backend) */
  async createRequest(payload: CreateGeneralDocumentPayload): Promise<GeneralDocumentRequest> {
    const res = await apiClient.post<ApiResponse<ApiGeneralRequest>>('/general-requests', payload);
    return toModel(res.data.data);
  },

  /** ยกเลิกคำขอ (เฉพาะที่ยังรออนุมัติ) */
  async cancelRequest(id: string): Promise<boolean> {
    const res = await apiClient.post<ApiResponse<boolean>>(`/general-requests/${id}/cancel`);
    return !!res.data.data;
  },

  /** คำขอสำหรับผู้อนุมัติ / ฝ่ายบุคคล */
  async getAllRequests(status?: string): Promise<GeneralDocumentRequest[]> {
    const res = await apiClient.get<ApiResponse<ApiGeneralRequest[]>>('/general-requests', {
      params: status ? { status } : undefined,
    });
    return (res.data.data || []).map(toModel);
  },

  /** อนุมัติคำขอ (ตามขั้นตอนในสายการอนุมัติ) */
  async approveRequest(id: string, comment?: string): Promise<boolean> {
    await apiClient.put(`/general-requests/${id}/approve`, { comment });
    return true;
  },

  /** ไม่อนุมัติคำขอ */
  async rejectRequest(id: string, reason: string): Promise<boolean> {
    await apiClient.put(`/general-requests/${id}/reject`, { reason });
    return true;
  },

  /** ดาวน์โหลดไฟล์แนบของคำขอ */
  async downloadAttachment(id: string): Promise<Blob> {
    const res = await apiClient.get(`/general-requests/${id}/attachment`, { responseType: 'blob' });
    return res.data as Blob;
  },
};
