import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  DailyHeadcountSummary,
  MonthlyLatenessReport,
  PayrollTaxSummary,
  MonthlyTurnoverSummary,
} from '@/types/reports';

export const reportService = {
  /**
   * ดึงรายงานภาพรวมอัตรากำลังคนประจำวัน
   */
  async getDailyHeadcount(
    date?: string,
    divisionId?: number,
    departmentId?: number
  ): Promise<DailyHeadcountSummary> {
    const res = await apiClient.get<ApiResponse<DailyHeadcountSummary>>('/reports/headcount/daily', {
      params: { date, divisionId, departmentId },
    });
    return res.data.data;
  },

  /**
   * ส่งออกรายงานอัตรากำลังคนประจำวันเป็นไฟล์ CSV
   */
  async downloadDailyHeadcountCsv(
    date?: string,
    divisionId?: number,
    departmentId?: number
  ): Promise<void> {
    const res = await apiClient.get('/reports/headcount/daily/export', {
      params: { date, divisionId, departmentId },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daily_Headcount_${date || 'today'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * ดึงรายงานสรุปเวลาทำงานและการมาสายประจำเดือน
   */
  async getMonthlyLateness(
    year?: number,
    month?: number,
    departmentId?: number,
    search?: string
  ): Promise<MonthlyLatenessReport> {
    const res = await apiClient.get<ApiResponse<MonthlyLatenessReport>>(
      '/reports/attendance/monthly-lateness',
      {
        params: { year, month, departmentId, search },
      }
    );
    return res.data.data;
  },

  /**
   * ส่งออกรายงานสรุปเวลาและการมาสายประจำเดือนเป็นไฟล์ CSV
   */
  async downloadMonthlyLatenessCsv(
    year?: number,
    month?: number,
    departmentId?: number,
    search?: string
  ): Promise<void> {
    const res = await apiClient.get('/reports/attendance/monthly-lateness/export', {
      params: { year, month, departmentId, search },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Monthly_Lateness_${year}_${String(month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * ดึงรายงานสรุปภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และประกันสังคม (สปส. 1-10) ประจำเดือน
   */
  async getPayrollTaxSummary(
    year?: number,
    month?: number,
    departmentId?: number
  ): Promise<PayrollTaxSummary> {
    const res = await apiClient.get<ApiResponse<PayrollTaxSummary>>(
      '/reports/financial/payroll-tax',
      {
        params: { year, month, departmentId },
      }
    );
    return res.data.data;
  },

  /**
   * ส่งออกรายงานภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) เป็นไฟล์ CSV
   */
  async downloadPayrollTaxCsv(
    year?: number,
    month?: number,
    departmentId?: number
  ): Promise<void> {
    const res = await apiClient.get('/reports/financial/payroll-tax/export', {
      params: { year, month, departmentId },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PND1_Tax_Report_${year}_${String(month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * ส่งออกรายงานเงินสมทบประกันสังคม (สปส. 1-10) เป็นไฟล์ CSV
   */
  async downloadSsoCsv(
    year?: number,
    month?: number,
    departmentId?: number
  ): Promise<void> {
    const res = await apiClient.get('/reports/financial/sso/export', {
      params: { year, month, departmentId },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SSO_Report_1_10_${year}_${String(month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * ดึงรายงานอัตราการเข้า-ออกของพนักงาน (Monthly Turnover Rate)
   */
  async getMonthlyTurnover(
    year?: number,
    month?: number,
    divisionId?: number,
    departmentId?: number
  ): Promise<MonthlyTurnoverSummary> {
    const res = await apiClient.get<ApiResponse<MonthlyTurnoverSummary>>(
      '/reports/analytics/turnover',
      {
        params: { year, month, divisionId, departmentId },
      }
    );
    return res.data.data;
  },

  /**
   * ส่งออกรายงานอัตราการเข้า-ออกของพนักงานเป็นไฟล์ CSV
   */
  async downloadMonthlyTurnoverCsv(
    year?: number,
    month?: number,
    divisionId?: number,
    departmentId?: number
  ): Promise<void> {
    const res = await apiClient.get('/reports/analytics/turnover/export', {
      params: { year, month, divisionId, departmentId },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Turnover_Report_${year}_${String(month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

