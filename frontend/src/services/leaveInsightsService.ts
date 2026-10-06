import { apiClient } from '@/lib/api-client';
import { downloadReportFile, ExportFormat } from '@/services/reportService';
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

  downloadSummaryCsv(year: number, departmentId?: number, format: ExportFormat = 'csv'): Promise<void> {
    return downloadReportFile('/reports/leave-summary/export', { year, departmentId }, `Leave_Summary_${year + 543}`, format);
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
