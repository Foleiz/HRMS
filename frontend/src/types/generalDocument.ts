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
  approvalInstanceId?: number;
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
  /** ประเภทเอกสารใน Master (ไม่ส่งเมื่อพนักงานระบุประเภทเอง) */
  documentTypeId?: number;
  issueDate: string;
  expiryDate?: string;
  purpose: string;
  notes?: string;
  fileName?: string;
  fileData?: string; // base64
}

/**
 * ประเภทคำร้องทั่วไปถึงฝ่ายบุคคล — ชื่อต้องไม่ซ้ำกับเมนูอื่น (ประเภทการลา, หนังสือรับรอง, สวัสดิการ,
 * ประเภทเอกสารในโปรไฟล์, สาเหตุการลาออก) และไม่ใช่สิ่งที่พนักงานทำเองได้ในโปรไฟล์ (แก้ข้อมูล, อัปโหลดเอกสาร)
 */
export const GENERAL_REQUEST_TYPES: readonly {
  value: string;
  label: string;
  description: string;
  attachment: 'required' | 'optional';
}[] = [
  { value: 'EMPLOYEE_CARD', label: 'ขอบัตรพนักงาน / บัตรผ่านเข้าอาคาร', description: 'ทำใหม่ หรือทดแทนบัตรหาย/ชำรุด', attachment: 'optional' },
  { value: 'WORK_EQUIPMENT', label: 'ขออุปกรณ์สำหรับทำงาน', description: 'คอมพิวเตอร์ โทรศัพท์ หรืออุปกรณ์สำนักงาน', attachment: 'optional' },
  { value: 'SHIFT_SWAP', label: 'ขอเปลี่ยนกะ / สลับวันทำงาน', description: 'ขอทำงานต่างจากตารางเดิมชั่วคราว', attachment: 'optional' },
  { value: 'OFFSITE_WORK', label: 'ขอปฏิบัติงานนอกสถานที่', description: 'ทำงานที่บ้าน หรือไปปฏิบัติงานที่อื่น', attachment: 'optional' },
  { value: 'SALARY_ADVANCE', label: 'ขอเบิกเงินเดือนล่วงหน้า', description: 'ขอรับเงินเดือนบางส่วนก่อนวันจ่าย', attachment: 'optional' },
  { value: 'BENEFICIARY_CHANGE', label: 'แจ้งเปลี่ยนผู้รับผลประโยชน์', description: 'ประกันกลุ่ม หรือกองทุนสำรองเลี้ยงชีพ', attachment: 'required' },
  { value: 'COMPLAINT', label: 'ร้องเรียน / แจ้งปัญหาในการทำงาน', description: 'ส่งถึงฝ่ายบุคคลโดยตรง', attachment: 'optional' },
];

/** (เลิกใช้ในหน้าคำร้องทั่วไป — เอกสารเหล่านี้อัปโหลดได้ที่โปรไฟล์ › เอกสาร) */
export const COMMON_DOCUMENT_TYPES = [
  'สำเนาบัตรประจำตัวประชาชน',
  'สำเนาทะเบียนบ้าน',
  'สำเนาวุฒิการศึกษา / ทรานสคริปต์',
  'ใบรับรองแพทย์ / ใบตรวจสุขภาพ',
  'สำเนาสมุดบัญชีธนาคาร (รับเงินเดือน)',
  'หนังสือรับรองการผ่านงานเดิม',
  'หนังสือยินยอมเปิดเผยข้อมูล',
  'เอกสารลดหย่อนภาษี / 50 ทวิ',
  'เอกสารทั่วไปอื่น ๆ',
] as const;
