import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  DailyHeadcountSummary,
  MonthlyLatenessReport,
  PayrollTaxSummary,
  MonthlyTurnoverSummary,
  EmployeesByDepartmentReport,
} from '@/types/reports';

/** รูปแบบไฟล์ส่งออก (PDF ทำฝั่งหน้าเว็บด้วยการพิมพ์ — ดู lib/printReport.ts) */
export type ExportFormat = 'csv' | 'xlsx';

const MIME: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8;',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** ดาวน์โหลดไฟล์รายงานจาก API แล้วบันทึกลงเครื่อง */
export async function downloadReportFile(
  url: string,
  params: Record<string, unknown>,
  baseName: string,
  format: ExportFormat = 'csv'
): Promise<void> {
  const res = await apiClient.get(url, { params: { ...params, format }, responseType: 'blob' });
  const blob = new Blob([res.data], { type: MIME[format] });
  const href = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.setAttribute('download', `${baseName}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(href);
}

const pad = (m?: number) => String(m ?? '').padStart(2, '0');

export const reportService = {
  /** รายงานพนักงานแยกตามแผนก */
  async getEmployeesByDepartment(divisionId?: number, departmentId?: number): Promise<EmployeesByDepartmentReport> {
    const res = await apiClient.get<ApiResponse<EmployeesByDepartmentReport>>('/reports/employees/by-department', {
      params: { divisionId, departmentId },
    });
    return res.data.data;
  },

  downloadEmployeesByDepartment(divisionId?: number, departmentId?: number, format: ExportFormat = 'csv') {
    const d = new Date();
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    return downloadReportFile('/reports/employees/by-department/export', { divisionId, departmentId }, `Employees_By_Department_${stamp}`, format);
  },

  /** รายงานกำลังคนรายวัน */
  async getDailyHeadcount(date?: string, divisionId?: number, departmentId?: number): Promise<DailyHeadcountSummary> {
    const res = await apiClient.get<ApiResponse<DailyHeadcountSummary>>('/reports/headcount/daily', {
      params: { date, divisionId, departmentId },
    });
    return res.data.data;
  },

  downloadDailyHeadcountCsv(date?: string, divisionId?: number, departmentId?: number, format: ExportFormat = 'csv') {
    return downloadReportFile('/reports/headcount/daily/export', { date, divisionId, departmentId }, `Daily_Headcount_${date || 'today'}`, format);
  },

  /** รายงานการเข้าออกงานรายเดือน (มาสาย/ออกก่อน/ขาด) */
  async getMonthlyLateness(year?: number, month?: number, departmentId?: number, search?: string): Promise<MonthlyLatenessReport> {
    const res = await apiClient.get<ApiResponse<MonthlyLatenessReport>>('/reports/attendance/monthly-lateness', {
      params: { year, month, departmentId, search },
    });
    return res.data.data;
  },

  downloadMonthlyLatenessCsv(year?: number, month?: number, departmentId?: number, search?: string, format: ExportFormat = 'csv') {
    return downloadReportFile(
      '/reports/attendance/monthly-lateness/export',
      { year, month, departmentId, search },
      `Monthly_Attendance_${year}_${pad(month)}`,
      format
    );
  },

  /** ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และประกันสังคม (สปส. 1-10) */
  async getPayrollTaxSummary(year?: number, month?: number, departmentId?: number): Promise<PayrollTaxSummary> {
    const res = await apiClient.get<ApiResponse<PayrollTaxSummary>>('/reports/financial/payroll-tax', {
      params: { year, month, departmentId },
    });
    return res.data.data;
  },

  downloadPayrollTaxCsv(year?: number, month?: number, departmentId?: number, format: ExportFormat = 'csv') {
    return downloadReportFile('/reports/financial/payroll-tax/export', { year, month, departmentId }, `PND1_Tax_Report_${year}_${pad(month)}`, format);
  },

  downloadSsoCsv(year?: number, month?: number, departmentId?: number, format: ExportFormat = 'csv') {
    return downloadReportFile('/reports/financial/sso/export', { year, month, departmentId }, `SSO_Report_1_10_${year}_${pad(month)}`, format);
  },

  /** อัตราการลาออก */
  async getMonthlyTurnover(year?: number, month?: number, divisionId?: number, departmentId?: number): Promise<MonthlyTurnoverSummary> {
    const res = await apiClient.get<ApiResponse<MonthlyTurnoverSummary>>('/reports/analytics/turnover', {
      params: { year, month, divisionId, departmentId },
    });
    return res.data.data;
  },

  downloadMonthlyTurnoverCsv(year?: number, month?: number, divisionId?: number, departmentId?: number, format: ExportFormat = 'csv') {
    return downloadReportFile(
      '/reports/analytics/turnover/export',
      { year, month, divisionId, departmentId },
      `Turnover_Report_${year}_${pad(month)}`,
      format
    );
  },
};
