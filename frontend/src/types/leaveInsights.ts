/** ปฏิทินการลา / รายงานการลา / ปิดยอดวันลาสิ้นปี */

export type LeaveCalendarScope = 'ORG' | 'DIVISION' | 'DEPARTMENT';

export interface LeaveCalendarItem {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentId?: number | null;
  departmentName?: string | null;
  leaveTypeId: number;
  leaveTypeName: string;
  formCategory?: string | null;
  /** yyyy-MM-dd (เวลาไทย) */
  startDate: string;
  endDate: string;
  leaveDays: number;
  status: 'APPROVED' | 'PENDING' | string;
}

export interface LeaveCalendarResult {
  scope: LeaveCalendarScope;
  items: LeaveCalendarItem[];
}

export interface LeaveReportRow {
  key: string;
  label: string;
  days: number;
  requests: number;
  employees: number;
}

export interface LeaveReportCell {
  departmentName: string;
  leaveTypeName: string;
  days: number;
}

export interface LeaveReportTopEmployee {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string | null;
  days: number;
  requests: number;
}

export interface LeaveSummaryReport {
  year: number;
  totalDays: number;
  totalRequests: number;
  employeesOnLeave: number;
  pendingRequests: number;
  byType: LeaveReportRow[];
  byDepartment: LeaveReportRow[];
  byMonth: LeaveReportRow[];
  departmentByType: LeaveReportCell[];
  topEmployees: LeaveReportTopEmployee[];
}

export interface LeaveYearEndRow {
  balanceId: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  leaveTypeId: number;
  leaveTypeName: string;
  remainingDays: number;
  carryForwardAllowed: boolean;
  carryForwardMaxDays?: number | null;
  carryDays: number;
  forfeitDays: number;
  carryForwardExpiry?: string | null;
}

export interface LeaveYearEndPreview {
  year: number;
  isClosed: boolean;
  closedAt?: string | null;
  closedByName?: string | null;
  canClose: boolean;
  blockReason?: string | null;
  pendingRequests: number;
  balanceCount: number;
  totalRemainingDays: number;
  totalCarriedDays: number;
  totalForfeitedDays: number;
  rows: LeaveYearEndRow[];
}
