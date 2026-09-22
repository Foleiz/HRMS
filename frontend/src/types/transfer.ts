export interface EmployeeTransfer {
  id: number;
  requestNo: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  avatarUrl?: string;

  transferType: 'DEPARTMENT_TRANSFER' | 'PROMOTION' | 'TRANSFER_AND_PROMOTION' | 'PROMOTION_AND_SUPERVISOR' | string;
  transferTypeDisplay: string;

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
  transferType: string;
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

