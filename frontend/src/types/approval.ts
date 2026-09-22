// ประเภทเอกสารที่รองรับสายการอนุมัติ — ต้องตรงกับ hrms."approval_document_type_enum" ฝั่ง backend เป๊ะ ๆ
export type ApprovalDocumentType =
  | 'ATTENDANCE_ADJUSTMENT'
  | 'LEAVE_REQUEST'
  | 'RESIGNATION_REQUEST'
  | 'CERTIFICATE_REQUEST'
  | 'EMPLOYMENT_CONTRACT'
  | 'PAYROLL_PERIOD';

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
}

export interface ApprovalStepInput {
  stepNo: number;
  approverType: ApproverType | string;
  approverEmployeeId?: number | null;
  approverRoleId?: number | null;
  isRequired: boolean;
}

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
};

/** ป้ายชื่อภาษาไทยสำหรับแสดงผลประเภทผู้อนุมัติ (Pure Thai - Rule #10) */
export const APPROVER_TYPE_LABELS: Record<string, string> = {
  EMPLOYEE: 'ระบุตัวบุคคล',
  ROLE: 'ระบุตามบทบาท',
  MANAGER: 'หัวหน้างานตรง',
  DEPARTMENT_HEAD: 'หัวหน้าแผนก',
  DIVISION_HEAD: 'หัวหน้าฝ่าย',
  HR: 'ฝ่ายทรัพยากรบุคคล',
  CEO: 'ผู้บริหารสูงสุด',
};
