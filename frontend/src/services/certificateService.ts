import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  CertificateType,
  CreateCertificateRequest,
  CertificateRequest,
  CertificateDocument,
  EmployeeSignature,
} from '@/types/certificates';

/**
 * Service สำหรับเรียก API ระบบคำขอหนังสือรับรองและลายเซ็นดิจิทัล (Certificate Service)
 */
export const certificateService = {
  /**
   * ดึงรายการประเภทหนังสือรับรองทั้งหมด
   */
  async getCertificateTypes(): Promise<CertificateType[]> {
    const res = await apiClient.get<ApiResponse<CertificateType[]>>('/certificates/types');
    return res.data.data;
  },

  /**
   * ดึงรายการคำขอหนังสือรับรองของพนักงานที่ล็อกอินอยู่ (ESS)
   */
  async getMyRequests(): Promise<CertificateRequest[]> {
    const res = await apiClient.get<ApiResponse<CertificateRequest[]>>('/certificates/my-requests');
    return res.data.data;
  },

  /**
   * ดึงรายการคำขอหนังสือรับรองทั้งหมด (สำหรับ HR / Admin)
   */
  async getAllRequests(status?: string): Promise<CertificateRequest[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await apiClient.get<ApiResponse<CertificateRequest[]>>(`/certificates/requests${params}`);
    return res.data.data;
  },

  /**
   * ยื่นคำขอหนังสือรับรองใหม่
   */
  async createRequest(payload: CreateCertificateRequest): Promise<CertificateRequest> {
    const res = await apiClient.post<ApiResponse<CertificateRequest>>('/certificates/requests', payload);
    return res.data.data;
  },

  /**
   * ยกเลิกคำขอหนังสือรับรอง
   */
  async cancelRequest(id: number, reason?: string): Promise<boolean> {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const res = await apiClient.post<ApiResponse<boolean>>(`/certificates/requests/${id}/cancel${params}`);
    return res.data.data;
  },

  /**
   * ดึงข้อมูลเอกสารหนังสือรับรองทางการเพื่อดูตัวอย่างและพิมพ์ (Preview & Print Document)
   */
  async getDocument(id: number, lang: string = 'TH'): Promise<CertificateDocument> {
    const res = await apiClient.get<ApiResponse<CertificateDocument>>(`/certificates/requests/${id}/document?lang=${lang}`);
    return res.data.data;
  },

  /**
   * ดึงรายการลายเซ็นดิจิทัลที่ใช้งานอยู่
   */
  async getSignatures(): Promise<EmployeeSignature[]> {
    const res = await apiClient.get<ApiResponse<EmployeeSignature[]>>('/certificates/signatures');
    return res.data.data;
  },

  /**
   * อัปโหลดลายเซ็นดิจิทัลใหม่
   */
  async uploadSignature(payload: { employeeId: number; base64Data: string; fileName?: string; mimeType?: string; isActive?: boolean }): Promise<EmployeeSignature> {
    const res = await apiClient.post<ApiResponse<EmployeeSignature>>('/certificates/signatures', payload);
    return res.data.data;
  },
};
