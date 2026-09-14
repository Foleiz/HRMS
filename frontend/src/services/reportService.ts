import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { DailyHeadcountSummary, MonthlyLatenessReport } from '@/types/reports';

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
};
