import {
  GeneralDocumentRequest,
  CreateGeneralDocumentPayload,
} from '@/types/generalDocument';

const STORAGE_KEY = 'hrms_general_doc_requests';

export const generalDocumentService = {
  /**
   * ดึงรายการคำร้องเอกสารทั่วไปของพนักงาน
   */
  async getMyRequests(): Promise<GeneralDocumentRequest[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw) as GeneralDocumentRequest[];
      return list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    } catch {
      return [];
    }
  },

  /**
   * ยื่นคำร้องเอกสารทั่วไปใหม่
   */
  async createRequest(
    payload: CreateGeneralDocumentPayload,
    employeeInfo: { id: number; name: string; code: string; dept: string; pos: string }
  ): Promise<GeneralDocumentRequest> {
    const requests = await this.getMyRequests();
    const runningNo = String(requests.length + 1).padStart(4, '0');
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const requestNo = `DOC-${datePrefix}-${runningNo}`;

    const newDoc: GeneralDocumentRequest = {
      id: `GEN-${Date.now()}`,
      requestNo,
      employeeId: employeeInfo.id,
      employeeName: employeeInfo.name,
      employeeCode: employeeInfo.code,
      departmentName: employeeInfo.dept,
      positionName: employeeInfo.pos,
      documentType: payload.documentType,
      issueDate: payload.issueDate,
      expiryDate: payload.expiryDate,
      purpose: payload.purpose,
      notes: payload.notes,
      fileName: payload.fileName,
      fileUrl: payload.fileData,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      canCancel: true,
    };

    requests.unshift(newDoc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    return newDoc;
  },

  /**
   * ขอยกเลิกคำร้องเอกสารทั่วไป
   */
  async cancelRequest(id: string): Promise<boolean> {
    const requests = await this.getMyRequests();
    const idx = requests.findIndex((r) => r.id === id);
    if (idx !== -1) {
      requests[idx].status = 'CANCELLED';
      requests[idx].canCancel = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
      return true;
    }
    return false;
  },
};
