import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { LeaveCalendarResult, LeaveSummaryReport, LeaveYearEndPreview } from '@/types/leaveInsights';

export const leaveInsightsService = {
  /** ปฏิทินการลา — from/to = yyyy-MM-dd */
  async getCalendar(params: {
    from: string;
    to: string;
    departmentId?: number;
    divisionId?: number;
    includePending?: boolean;
  }): Promise<LeaveCalendarResult> {
    const res = await apiClient.get<ApiResponse<LeaveCalendarResult>>('/leave-calendar', { params });
    return res.data.data;
  },

  /** รายงานสรุปการลาประจำปี (ค.ศ.) */
  async getSummary(year: number, departmentId?: number): Promise<LeaveSummaryReport> {
    const res = await apiClient.get<ApiResponse<LeaveSummaryReport>>('/reports/leave-summary', {
      params: { year, departmentId },
    });
    return res.data.data;
  },

  async downloadSummaryCsv(year: number, departmentId?: number): Promise<void> {
    const res = await apiClient.get('/reports/leave-summary/export', {
      params: { year, departmentId },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Leave_Summary_${year + 543}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** ดูตัวอย่างการปิดยอดวันลาสิ้นปี (ปี ค.ศ.) */
  async previewYearEnd(year: number): Promise<LeaveYearEndPreview> {
    const res = await apiClient.get<ApiResponse<LeaveYearEndPreview>>(`/leave-balances/year-end/${year}/preview`);
    return res.data.data;
  },

  async closeYearEnd(year: number, note?: string): Promise<LeaveYearEndPreview> {
    const res = await apiClient.post<ApiResponse<LeaveYearEndPreview>>(`/leave-balances/year-end/${year}/close`, { note });
    return res.data.data;
  },
};
