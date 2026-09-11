export interface WorkSchedule {
  id: number;
  scheduleCode: string;
  scheduleName: string;
  workStart?: string | null;
  workEnd?: string | null;
  breakMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
  workHours?: number | null;
  netWorkHours?: number | null;
}

export interface CreateWorkScheduleRequest {
  scheduleCode: string;
  scheduleName: string;
  workStart?: string | null;
  workEnd?: string | null;
  breakMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateWorkScheduleRequest {
  scheduleName: string;
  workStart?: string | null;
  workEnd?: string | null;
  breakMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface EmployeeShift {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string;
  positionName?: string;
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  isCrossDay: boolean;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string | null; // YYYY-MM-DD or null
  isActive: boolean;
}

export interface AssignEmployeeShiftRequest {
  employeeId: number;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface BatchAssignEmployeeShiftRequest {
  employeeIds?: number[];
  departmentId?: number | null;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface BatchAssignResult {
  totalRequested: number;
  successCount: number;
  failedCount: number;
  errors: string[];
}

export interface UpdateEmployeeShiftRequest {
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface RosterDayShift {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  isCrossDay: boolean;
}

export interface MonthlyRosterItem {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string;
  positionName?: string;
  days: Record<number, RosterDayShift | null>;
}

export interface MonthlyRosterResponse {
  year: number;
  month: number;
  daysInMonth: number;
  employees: MonthlyRosterItem[];
}

export interface EmployeeTypeLookup {
  id: number;
  typeCode: string;
  typeName: string;
  wageType: string;
}

export interface AssignableEmployee {
  id: number;
  employeeCode: string;
  fullName: string;
  departmentId?: number | null;
  departmentName: string;
  positionName: string;
  employeeTypeId?: number | null;
  employeeTypeCode?: string;
  employeeTypeName?: string;
}
