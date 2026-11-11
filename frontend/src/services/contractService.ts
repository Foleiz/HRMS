import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  EmploymentContract,
  ContractSummaryStats,
  CreateContractRequest,
  RenewContractRequest,
  UpdateContractRequest,
  EmployeeCareerTimeline,
  ContractSettings,
} from '@/types/contract';

const CONTRACT_SETTINGS_STORAGE_KEY = 'hrms_contract_settings_v1';

export const DEFAULT_CONTRACT_SETTINGS: ContractSettings = {
  probationDays: 119,
  fixedTermDays: 365,
  probationAlertDays: 30,
  contractAlertDays: 30,
};

/**
 * Service สำหรับเรียก API จัดการสัญญาจ้างงานและวงจรชีวิตพนักงาน
 */
export const contractService = {
  // ดึงค่าตั้งค่าเกณฑ์สัญญาจ้างงาน (จาก localStorage หรือค่าเริ่มต้น)
  getSettings(): ContractSettings {
    if (typeof window === 'undefined') return { ...DEFAULT_CONTRACT_SETTINGS };
    try {
      const raw = window.localStorage.getItem(CONTRACT_SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONTRACT_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<ContractSettings>;
      return {
        probationDays:
          typeof parsed.probationDays === 'number' && parsed.probationDays >= 1 && parsed.probationDays <= 1825
            ? Math.round(parsed.probationDays)
            : DEFAULT_CONTRACT_SETTINGS.probationDays,
        fixedTermDays:
          typeof parsed.fixedTermDays === 'number' && parsed.fixedTermDays >= 1 && parsed.fixedTermDays <= 3650
            ? Math.round(parsed.fixedTermDays)
            : DEFAULT_CONTRACT_SETTINGS.fixedTermDays,
        probationAlertDays:
          typeof parsed.probationAlertDays === 'number' && parsed.probationAlertDays >= 1 && parsed.probationAlertDays <= 365
            ? Math.round(parsed.probationAlertDays)
            : DEFAULT_CONTRACT_SETTINGS.probationAlertDays,
        contractAlertDays:
          typeof parsed.contractAlertDays === 'number' && parsed.contractAlertDays >= 1 && parsed.contractAlertDays <= 365
            ? Math.round(parsed.contractAlertDays)
            : DEFAULT_CONTRACT_SETTINGS.contractAlertDays,
      };
    } catch {
      return { ...DEFAULT_CONTRACT_SETTINGS };
    }
  },

  // บันทึกค่าตั้งค่าเกณฑ์สัญญาจ้างงาน
  saveSettings(settings: ContractSettings): ContractSettings {
    const sanitized: ContractSettings = {
      probationDays: Math.max(
        1,
        Math.min(1825, Math.round(Number(settings.probationDays) || DEFAULT_CONTRACT_SETTINGS.probationDays)),
      ),
      fixedTermDays: Math.max(
        1,
        Math.min(3650, Math.round(Number(settings.fixedTermDays) || DEFAULT_CONTRACT_SETTINGS.fixedTermDays)),
      ),
      probationAlertDays: Math.max(
        1,
        Math.min(365, Math.round(Number(settings.probationAlertDays) || DEFAULT_CONTRACT_SETTINGS.probationAlertDays)),
      ),
      contractAlertDays: Math.max(
        1,
        Math.min(365, Math.round(Number(settings.contractAlertDays) || DEFAULT_CONTRACT_SETTINGS.contractAlertDays)),
      ),
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CONTRACT_SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  },

  // ดึงรายการสัญญาจ้างงานทั้งหมด พร้อมตัวกรอง
  async getAll(params?: { search?: string; contractType?: string; status?: string }): Promise<EmploymentContract[]> {
    const res = await apiClient.get<ApiResponse<EmploymentContract[]>>('/employment-contracts', { params });
    return res.data.data;
  },

  // ดึงข้อมูลสถิติสรุป KPI (ทดลองงาน, ประจำ, ใกล้ครบกำหนดตามเกณฑ์วันแจ้งเตือน)
  async getStats(params?: { probationAlertDays?: number; contractAlertDays?: number }): Promise<ContractSummaryStats> {
    const res = await apiClient.get<ApiResponse<ContractSummaryStats>>('/employment-contracts/stats', { params });
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

  // ต่ออายุสัญญาจ้างงาน
  async renew(id: number, data: RenewContractRequest): Promise<EmploymentContract> {
    const res = await apiClient.post<ApiResponse<EmploymentContract>>(`/employment-contracts/${id}/renew`, data);
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

  // แนบไฟล์เอกสารสัญญาจ้างงานเพิ่ม (แนบได้หลายไฟล์)
  async uploadDocument(id: number, fileData: string, fileName: string): Promise<EmploymentContract> {
    const res = await apiClient.post<ApiResponse<EmploymentContract>>(`/employment-contracts/${id}/document`, {
      fileData,
      fileName,
    });
    return res.data.data;
  },

  // ลบไฟล์แนบรายไฟล์
  async deleteDocumentById(id: number, documentId: number): Promise<EmploymentContract> {
    const res = await apiClient.delete<ApiResponse<EmploymentContract>>(`/employment-contracts/${id}/documents/${documentId}`);
    return res.data.data;
  },

  // ดึง Blob ของไฟล์แนบรายไฟล์ (Preview / Download)
  async getDocumentFileBlob(id: number, documentId: number, inline: boolean = false): Promise<{ blob: Blob; mimeType: string }> {
    const res = await apiClient.get(`/employment-contracts/${id}/documents/${documentId}`, {
      params: inline ? { inline: true } : undefined,
      responseType: 'blob',
    });
    return { blob: res.data, mimeType: String(res.headers['content-type'] || 'application/octet-stream') };
  },

  // ลบไฟล์เอกสารสัญญาจ้างงานที่แนบไว้ทั้งหมด
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
