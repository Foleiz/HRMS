export interface OvertimeRequest {
  id: number;
  requestNo: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string;
  positionName?: string;
  workDate: string;
  startTime: string;
  endTime: string;
  overtimeHours: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedByName?: string;
  approvedAt?: string;
  rejectReason?: string;
  createdAt: string;
}

export interface CreateOvertimeRequest {
  employeeId: number;
  workDate: string;
  startTime: string;
  endTime: string;
  overtimeHours?: number;
  reason: string;
}

export interface ReviewOvertimeRequest {
  action: 'APPROVED' | 'REJECTED';
  rejectReason?: string;
}

export interface OvertimeFilterQuery {
  employeeId?: number;
  departmentId?: number;
  year?: number;
  month?: number;
  status?: string;
  search?: string;
}
