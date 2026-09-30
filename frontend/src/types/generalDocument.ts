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
  approvedByName?: string;
  approvedAt?: string;
  rejectReason?: string;
  isMyTurnToApprove?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  hasAlreadyApproved?: boolean;
  /** ขั้นตอนปัจจุบัน / จำนวนขั้นทั้งหมดในสายการอนุมัติ */
  currentStepNo?: number | null;
  totalSteps?: number;
  currentApproverDisplay?: string | null;
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
  'ขอแก้ไขข้อมูลส่วนตัว (ที่อยู่ / เบอร์โทร / ชื่อ-สกุล / สถานภาพ)',
  'ขอเปลี่ยนบัญชีรับเงินเดือน',
  'ขอทำบัตรพนักงาน (ใหม่ / แทนบัตรหาย / ชำรุด)',
  'ขอสำเนาเอกสาร (สลิปเงินเดือน / 50 ทวิ / สัญญาจ้าง)',
  'ขออุปกรณ์การทำงาน / เบิกสวัสดิการ',
  'ส่งเอกสารให้ฝ่ายบุคคล (สำเนาบัตร / ทะเบียนบ้าน / วุฒิการศึกษา)',
  'ส่งใบรับรองแพทย์ / ผลตรวจสุขภาพ',
  'ส่งเอกสารลดหย่อนภาษี / 50 ทวิ จากที่ทำงานเดิม',
  'คำขออื่น ๆ',
] as const;
