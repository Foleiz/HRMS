import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  CertificateType,
  CreateCertificateRequest,
  CertificateRequest,
  CertificateDocument,
  EmployeeSignature,
} from '@/types/certificates';

let myCertRequestsCache: { data: CertificateRequest[]; expiresAt: number } | null = null;
let myCertRequestsInFlight: Promise<CertificateRequest[]> | null = null;
const CERT_CACHE_TTL_MS = 15_000;

function clearMyCertCache() {
  myCertRequestsCache = null;
  myCertRequestsInFlight = null;
}

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
    const now = Date.now();
    if (myCertRequestsCache && myCertRequestsCache.expiresAt > now) {
      return myCertRequestsCache.data;
    }
    if (myCertRequestsInFlight) {
      return myCertRequestsInFlight;
    }

    myCertRequestsInFlight = apiClient
      .get<ApiResponse<CertificateRequest[]>>('/certificates/my-requests')
      .then((res) => {
        const data = res.data.data || [];
        myCertRequestsCache = { data, expiresAt: Date.now() + CERT_CACHE_TTL_MS };
        return data;
      })
      .finally(() => {
        myCertRequestsInFlight = null;
      });

    return myCertRequestsInFlight;
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
    clearMyCertCache();
    return res.data.data;
  },

  /**
   * ยกเลิกคำขอหนังสือรับรอง
   */
  async cancelRequest(id: number, reason?: string): Promise<boolean> {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const res = await apiClient.post<ApiResponse<boolean>>(`/certificates/requests/${id}/cancel${params}`);
    clearMyCertCache();
    return res.data.data;
  },

  /**
   * อนุมัติคำขอหนังสือรับรอง (สำหรับผู้อนุมัติ / ฝ่ายบุคคล)
   */
  async approveRequest(id: number, comment?: string): Promise<CertificateRequest> {
    const res = await apiClient.put<ApiResponse<CertificateRequest>>(`/certificates/requests/${id}/approve`, {
      comment,
    });
    clearMyCertCache();
    return res.data.data;
  },

  /**
   * ปฏิเสธคำขอหนังสือรับรอง (สำหรับผู้อนุมัติ / ฝ่ายบุคคล)
   */
  async rejectRequest(id: number, reason: string): Promise<CertificateRequest> {
    const res = await apiClient.put<ApiResponse<CertificateRequest>>(`/certificates/requests/${id}/reject`, {
      reason,
    });
    clearMyCertCache();
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
   * ตัวอย่างหนังสือรับรองของผู้ใช้ปัจจุบันก่อนยื่นคำขอ (ข้อมูลจริง ไม่บันทึกลงระบบ)
   */
  async previewDocument(certificateTypeId: number, purpose: string, lang: string = 'TH'): Promise<CertificateDocument> {
    const res = await apiClient.get<ApiResponse<CertificateDocument>>('/certificates/preview', {
      params: { certificateTypeId, purpose, lang },
    });
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
