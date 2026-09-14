import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { AttendanceDaily, MyAttendanceMonthlySummary } from '@/types/attendance';
import {
  AttendanceAdjustment,
  CreateAttendanceAdjustmentRequest,
  PagedAdjustmentResult,
} from '@/types/attendanceAdjustment';

export const essAttendanceService = {
  /**
   * [ESS] ดึงบันทึกเวลาและกะการทำงานวันนี้ของตนเอง
   */
  async getMyToday(): Promise<AttendanceDaily | null> {
    const res = await apiClient.get<ApiResponse<AttendanceDaily | null>>('/attendance/daily/my/today');
    return res.data.data;
  },

  /**
   * [ESS] บันทึกเวลาเข้างานของตนเอง
   */
  async myClockIn(): Promise<AttendanceDaily> {
    const res = await apiClient.post<ApiResponse<AttendanceDaily>>('/attendance/daily/my/clock-in');
    return res.data.data;
  },

  /**
   * [ESS] บันทึกเวลาออกงานของตนเอง
   */
  async myClockOut(): Promise<AttendanceDaily> {
    const res = await apiClient.post<ApiResponse<AttendanceDaily>>('/attendance/daily/my/clock-out');
    return res.data.data;
  },

  /**
   * [ESS] ดึงประวัติการลงเวลารายเดือนของตนเอง
   */
  async getMyHistory(year?: number, month?: number): Promise<AttendanceDaily[]> {
    const res = await apiClient.get<ApiResponse<AttendanceDaily[]>>('/attendance/daily/my/history', {
      params: { year, month },
    });
    return res.data.data;
  },

  /**
   * [ESS] ดึงสรุปสถิติเวลาส่วนบุคคลประจำเดือน
   */
  async getMySummary(year?: number, month?: number): Promise<MyAttendanceMonthlySummary> {
    const res = await apiClient.get<ApiResponse<MyAttendanceMonthlySummary>>('/attendance/daily/my/summary', {
      params: { year, month },
    });
    return res.data.data;
  },

  /**
   * [ESS] ดึงรายการคำขอปรับปรุงเวลาของตนเอง
   */
  async getMyAdjustments(page = 1, pageSize = 50): Promise<PagedAdjustmentResult> {
    const res = await apiClient.get<ApiResponse<PagedAdjustmentResult>>('/attendance/adjustments/my', {
      params: { page, pageSize },
    });
    return res.data.data;
  },

  /**
   * [ESS] ยื่นคำขอปรับปรุงเวลาใหม่
   */
  async submitAdjustment(data: CreateAttendanceAdjustmentRequest): Promise<AttendanceAdjustment> {
    const res = await apiClient.post<ApiResponse<AttendanceAdjustment>>('/attendance/adjustments', data);
    return res.data.data;
  },

  /**
   * [ESS] ขอยกเลิกคำขอปรับปรุงเวลาของตนเอง (เฉพาะที่สถานะ PENDING)
   */
  async cancelAdjustment(id: number): Promise<AttendanceAdjustment> {
    const res = await apiClient.post<ApiResponse<AttendanceAdjustment>>(`/attendance/adjustments/${id}/cancel`);
    return res.data.data;
  },
};
