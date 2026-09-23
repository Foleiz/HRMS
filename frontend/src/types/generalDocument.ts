export interface GeneralDocumentRequest {
  id: string;
  requestNo: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  positionName: string;
  documentType: string;
  issueDate: string; // 'YYYY-MM-DD'
  expiryDate?: string; // 'YYYY-MM-DD'
  purpose: string;
  notes?: string;
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  submittedAt: string;
  canCancel: boolean;
}

export interface CreateGeneralDocumentPayload {
  documentType: string;
  issueDate: string;
  expiryDate?: string;
  purpose: string;
  notes?: string;
  fileName?: string;
  fileData?: string; // base64
}

export const COMMON_DOCUMENT_TYPES = [
  'สำเนาบัตรประจำตัวประชาชน',
  'สำเนาทะเบียนบ้าน',
  'สำเนาวุฒิการศึกษา / ทรานสคริปต์',
  'ใบรับรองแพทย์ / ใบตรวจสุขภาพ',
  'สำเนาสมุดบัญชีธนาคาร (รับเงินเดือน)',
  'หนังสือรับรองการผ่านงานเดิม',
  'หนังสือยินยอมเปิดเผยข้อมูล (PDPA Consent)',
  'เอกสารลดหย่อนภาษี / 50 ทวิ',
  'เอกสารทั่วไปอื่น ๆ',
] as const;
