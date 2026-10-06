export interface DailyDepartmentHeadcount {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  divisionName: string;
  totalHeadcount: number;
  presentCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  absentCount: number;
  /** ลา (อนุมัติแล้ว) */
  leaveCount: number;
  /** วันหยุด / ไม่ใช่วันทำงาน */
  offCount: number;
  attendanceRate: number;
}

export interface DailyHeadcountSummary {
  date: string;
  totalEmployees: number;
  totalPresent: number;
  totalLate: number;
  totalEarlyLeave: number;
  totalAbsent: number;
  totalLeave: number;
  totalOff: number;
  /** จำนวนคนที่ต้องมาทำงาน (ทั้งหมด − ลา − วันหยุด) */
  totalExpected: number;
  overallAttendanceRate: number;
  departments: DailyDepartmentHeadcount[];
}

export interface MonthlyAttendanceLateness {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  totalWorkDays: number;
  presentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  earlyLeaveDays: number;
  totalEarlyLeaveMinutes: number;
  absentDays: number;
  attendanceRate: number;
}

export interface MonthlyLatenessReport {
  year: number;
  month: number;
  totalAuditedEmployees: number;
  totalLateOccurrences: number;
  totalLateMinutes: number;
  overallAttendanceRate: number;
  items: MonthlyAttendanceLateness[];
}

export interface PayrollTaxItem {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  citizenIdMasked: string;
  grossIncome: number;
  withholdingTax: number;
  ssoEmployee: number;
  ssoEmployer: number;
  totalDeductions: number;
  netSalary: number;
}

export interface PayrollTaxSummary {
  year: number;
  month: number;
  periodId: number | null;
  periodStatus: string;
  totalEmployees: number;
  taxableEmployeesCount: number;
  totalGrossIncome: number;
  totalWithholdingTax: number;
  totalSsoEmployee: number;
  totalSsoEmployer: number;
  totalSsoRemittance: number;
  totalNetSalary: number;
  items: PayrollTaxItem[];
}

export interface DepartmentTurnover {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  divisionName: string;
  beginningHeadcount: number;
  joinedCount: number;
  resignedCount: number;
  endingHeadcount: number;
  turnoverRate: number;
  retentionRate: number;
}

export interface TurnoverEventLog {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  eventType: 'JOINED' | 'RESIGNED' | 'TERMINATED' | string;
  eventDate: string;
  reason?: string;
}

export interface MonthlyTurnoverSummary {
  year: number;
  month: number;
  totalBeginningHeadcount: number;
  totalJoinedCount: number;
  totalResignedCount: number;
  totalEndingHeadcount: number;
  overallTurnoverRate: number;
  overallRetentionRate: number;
  departmentTurnovers: DepartmentTurnover[];
  eventLogs: TurnoverEventLog[];
}


// ===== รายงานพนักงานแยกตามแผนก =====
export interface NameCount {
  name: string;
  count: number;
}

export interface DepartmentEmployeeRow {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  employeeTypeName: string;
  levelName: string;
  gender: string;
  startDate?: string | null;
}

export interface DepartmentEmployees {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  divisionName: string;
  employeeCount: number;
  headcountPlan?: number | null;
  maleCount: number;
  femaleCount: number;
  otherGenderCount: number;
  newHiresThisYear: number;
  byEmployeeType: NameCount[];
  employees: DepartmentEmployeeRow[];
}

export interface EmployeesByDepartmentReport {
  asOfDate: string;
  totalEmployees: number;
  totalDepartments: number;
  totalHeadcountPlan?: number | null;
  maleCount: number;
  femaleCount: number;
  otherGenderCount: number;
  newHiresThisYear: number;
  byEmployeeType: NameCount[];
  byLevel: NameCount[];
  departments: DepartmentEmployees[];
}
