// ประเภทเอกสารที่รองรับสายการอนุมัติ — ต้องตรงกับ hrms."approval_document_type_enum" ฝั่ง backend เป๊ะ ๆ
export type ApprovalDocumentType =
  | 'ATTENDANCE_ADJUSTMENT'
  | 'LEAVE_REQUEST'
  | 'RESIGNATION_REQUEST'
  | 'CERTIFICATE_REQUEST'
  | 'EMPLOYMENT_CONTRACT'
  | 'PAYROLL_PERIOD'
  | 'TRANSFER_REQUEST'
  | 'GENERAL_REQUEST';

export type ApproverType =
  | 'EMPLOYEE'
  | 'ROLE'
  | 'MANAGER'
  | 'DEPARTMENT_HEAD'
  | 'DIVISION_HEAD'
  | 'HR'
  | 'CEO';

export interface ApprovalStep {
  id: number;
  stepNo: number;
  approverType: ApproverType | string;
  approverEmployeeId?: number | null;
  approverEmployeeName?: string | null;
  approverRoleId?: number | null;
  approverRoleName?: string | null;
  isRequired: boolean;
  approverScope?: ApproverScope | string;
  fallbackAction?: FallbackAction | string;
  delegateType?: 'EMPLOYEE' | 'ROLE' | string | null;
  delegateEmployeeId?: number | null;
  delegateEmployeeName?: string | null;
  delegateRoleId?: number | null;
  delegateRoleName?: string | null;
  delegateScope?: ApproverScope | string;
  delegateMode?: DelegateMode | string;
}

export interface ApprovalStepInput {
  stepNo: number;
  approverType: ApproverType | string;
  approverEmployeeId?: number | null;
  approverRoleId?: number | null;
  isRequired: boolean;
  /** ขอบเขตของผู้อนุมัติแบบบทบาท เทียบกับผู้ยื่น */
  approverScope?: ApproverScope | string;
  /** ถ้าหาผู้อนุมัติไม่เจอ */
  fallbackAction?: FallbackAction | string;
  /** ผู้อนุมัติแทน: ไม่มี (null) / ระบุตัวบุคคล / ตามบทบาท */
  delegateType?: 'EMPLOYEE' | 'ROLE' | string | null;
  delegateEmployeeId?: number | null;
  delegateRoleId?: number | null;
  delegateScope?: ApproverScope | string;
  delegateMode?: DelegateMode | string;
}

/** เงื่อนไขอนุมัติแทน: เฉพาะเมื่อผู้อนุมัติหลักลา/หาไม่เจอ หรือ ได้ตลอด */
export type DelegateMode = 'WHEN_ABSENT' | 'ALWAYS';

export const DELEGATE_MODE_LABELS: Record<string, string> = {
  WHEN_ABSENT: 'เฉพาะเมื่อผู้อนุมัติหลักลา หรือหาผู้อนุมัติหลักไม่เจอ',
  ALWAYS: 'อนุมัติแทนได้ตลอด (คู่กับผู้อนุมัติหลัก)',
};

/** ขอบเขตผู้อนุมัติแบบบทบาท: ทั้งบริษัท / ฝ่ายเดียวกับผู้ยื่น / แผนกเดียวกับผู้ยื่น */
export type ApproverScope = 'ORG' | 'DIVISION' | 'DEPARTMENT';
/** เมื่อหาผู้อนุมัติไม่เจอ: ส่งให้ HR / ข้ามขั้น / ขยายขึ้นหนึ่งระดับ / รอ */
export type FallbackAction = 'HR' | 'SKIP' | 'ESCALATE' | 'WAIT';

export const APPROVER_SCOPE_LABELS: Record<string, string> = {
  ORG: 'ทั้งบริษัท',
  DIVISION: 'ฝ่ายเดียวกับผู้ยื่น',
  DEPARTMENT: 'แผนกเดียวกับผู้ยื่น',
};

export const FALLBACK_ACTION_LABELS: Record<string, string> = {
  HR: 'ส่งให้ฝ่ายบุคคลแทน',
  SKIP: 'ข้ามขั้นนี้',
  ESCALATE: 'ส่งต่อหัวหน้าระดับถัดไป',
  WAIT: 'รอจนกว่าจะมีผู้อนุมัติ',
};

export interface ApprovalFlow {
  id: number;
  flowCode: string;
  flowName: string;
  documentType: ApprovalDocumentType | string;
  departmentId?: number | null;
  departmentName?: string | null;
  levelId?: number | null;
  levelName?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  createdAt: string;
  steps: ApprovalStep[];
}

export interface CreateApprovalFlowPayload {
  flowCode: string;
  flowName: string;
  documentType: ApprovalDocumentType | string;
  departmentId?: number | null;
  levelId?: number | null;
  status: string;
  steps: ApprovalStepInput[];
}

export interface UpdateApprovalFlowPayload {
  flowName: string;
  documentType: ApprovalDocumentType | string;
  departmentId?: number | null;
  levelId?: number | null;
  status: string;
  steps: ApprovalStepInput[];
}

/** จำลองสายการอนุมัติ (Workflow Simulation) */
export interface WorkflowSimulationRequest {
  employeeId: number;
  documentType: string;
  effectiveDate?: string;
}

export interface SimulatedApprover {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  positionName?: string | null;
  departmentName?: string | null;
}

export interface SimulatedStep {
  stepNo: number;
  approverType: string;
  approverTypeLabel: string;
  /** ชื่อบทบาท (เมื่อ approverType = ROLE) */
  approverRoleName?: string | null;
  isRequired: boolean;
  approver?: SimulatedApprover | null;
}

export interface WorkflowSimulationResult {
  success: boolean;
  message: string;
  flowId?: number | null;
  flowCode?: string | null;
  flowName?: string | null;
  documentType: string;
  requester?: SimulatedApprover | null;
  steps: SimulatedStep[];
}

/** ป้ายชื่อภาษาไทยสำหรับแสดงผลประเภทเอกสาร */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ATTENDANCE_ADJUSTMENT: 'คำขอปรับปรุงเวลาเข้า-ออกงาน',
  LEAVE_REQUEST: 'คำขอลา',
  RESIGNATION_REQUEST: 'คำขอลาออก',
  CERTIFICATE_REQUEST: 'คำขอหนังสือรับรอง',
  EMPLOYMENT_CONTRACT: 'สัญญาจ้างงาน',
  PAYROLL_PERIOD: 'รอบเงินเดือน',
  TRANSFER_REQUEST: 'คำขอย้ายแผนก/เลื่อนตำแหน่ง',
  GENERAL_REQUEST: 'คำขอเอกสารทั่วไป',
};

/** ป้ายชื่อภาษาไทยสำหรับแสดงผลประเภทผู้อนุมัติ (Pure Thai - Rule #10) */
export const APPROVER_TYPE_LABELS: Record<string, string> = {
  EMPLOYEE: 'ระบุตัวบุคคล',
  ROLE: 'ระบุตามบทบาท',
  MANAGER: 'หัวหน้างานตรงของผู้ยื่น',
  DEPARTMENT_HEAD: 'หัวหน้าแผนกของผู้ยื่น',
  DIVISION_HEAD: 'หัวหน้าฝ่ายของผู้ยื่น',
  HR: 'ฝ่ายทรัพยากรบุคคล',
  CEO: 'ผู้บริหารสูงสุด',
};
