/** ประเภทการปรับเปลี่ยน (ระบบจัดให้อัตโนมัติจากการเทียบ ปัจจุบัน ↔ ปลายทาง) */
export type TransferTypeCode = 'DEPARTMENT_TRANSFER' | 'PROMOTION' | 'POSITION_CHANGE' | 'DEMOTION';

export interface EmployeeTransfer {
  id: number;
  requestNo: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  avatarUrl?: string;

  /** รหัสที่เก็บไว้ (คั่นด้วยจุลภาค) */
  transferType: string;
  transferTypeDisplay: string;
  /** ประเภทแยกเป็นรายการ — ระบบจัดให้อัตโนมัติ */
  transferTypes?: TransferTypeCode[];

  fromDivisionId?: number;
  fromDivisionName: string;
  fromDepartmentId?: number;
  fromDepartmentName: string;
  fromPositionId?: number;
  fromPositionName: string;
  fromDisplay: string;
  fromManagerName?: string;

  toDivisionId?: number;
  toDivisionName: string;
  toDepartmentId: number;
  toDepartmentName: string;
  toPositionId: number;
  toPositionName: string;
  toDisplay: string;
  toManagerName?: string;

  effectiveDate: string;
  effectiveDateDisplay: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  statusDisplay: string;
  orderNo?: string;
  reason?: string;

  recordType: 'REQUEST' | 'ARCHIVE' | string;
  recordTypeDisplay: string;
  approvalInstanceId?: number;
  hasDocument: boolean;
  documentName?: string;
  documentSize?: number;

  createdAt: string;
  approvedAt?: string;
}

export interface TransferSummaryStats {
  pendingRequestsCount: number;
  transfersThisMonthCount: number;
  promotionsThisMonthCount: number;
}

export interface CreateTransferRequest {
  employeeId: number;
  /** ไม่ใช้แล้ว — backend จัดประเภทให้เอง */
  transferType?: string;
  toDivisionId?: number;
  toDepartmentId: number;
  toPositionId: number;
  toManagerId?: number;
  effectiveDate: string;
  orderNo?: string;
  reason?: string;
  autoApprove?: boolean;

  recordType?: 'REQUEST' | 'ARCHIVE' | string;
  documentName?: string;
  documentContentType?: string;
  documentBase64?: string;
  documentSize?: number;
}

