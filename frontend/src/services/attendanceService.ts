import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  AttendanceDaily,
  DailyAttendanceSummary,
  ClockInRequest,
  ClockOutRequest,
  UpdateAttendanceRequest,
  DailyAttendanceFilterQuery,
  PagedAttendanceResult,
} from '@/types/attendance';

export const attendanceService = {
  /**
   * ดึงข้อมูลบันทึกเวลาประจำวันตามเงื่อนไข (วันที่, แผนก, สถานะ, ค้นหา, หน้า)
   */
  async getDailyAttendance(filter: DailyAttendanceFilterQuery = {}): Promise<PagedAttendanceResult> {
    const params: Record<string, string | number> = {};
    if (filter.date) params.date = filter.date;
    if (filter.departmentId && filter.departmentId > 0) params.departmentId = filter.departmentId;
    if (filter.status && filter.status !== 'ALL') params.status = filter.status;
    if (filter.search) params.search = filter.search;
    if (filter.page) params.page = filter.page;
    if (filter.pageSize) params.pageSize = filter.pageSize;

    const res = await apiClient.get<ApiResponse<PagedAttendanceResult>>('/attendance/daily', { params });
    return res.data.data || { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 };
  },

  /**
   * ดึงสรุปสถิติประจำวัน (ตรงเวลา, สาย, ออกก่อน, ขาดงาน)
   */
  async getDailySummary(date?: string): Promise<DailyAttendanceSummary> {
    const params = date ? { date } : {};
    const res = await apiClient.get<ApiResponse<DailyAttendanceSummary>>('/attendance/daily/summary', { params });
    return res.data.data || {
      date: date || '',
      totalEmployees: 0,
      presentCount: 0,
      lateCount: 0,
      earlyLeaveCount: 0,
      absentCount: 0,
      holidayOrOffCount: 0,
      attendanceRate: 0,
    };
  },

  /**
   * บันทึกเวลาเข้างาน (Clock In)
   */
  async clockIn(request: ClockInRequest): Promise<AttendanceDaily> {
    const res = await apiClient.post<ApiResponse<AttendanceDaily>>('/attendance/daily/clock-in', request);
    return res.data.data!;
  },

  /**
   * บันทึกเวลาออกงาน (Clock Out)
   */
  async clockOut(request: ClockOutRequest): Promise<AttendanceDaily> {
    const res = await apiClient.post<ApiResponse<AttendanceDaily>>('/attendance/daily/clock-out', request);
    return res.data.data!;
  },

  /**
   * แก้ไขข้อมูลเวลาเข้า-ออกงาน
   */
  async updateAttendance(id: number, request: UpdateAttendanceRequest): Promise<AttendanceDaily> {
    const res = await apiClient.put<ApiResponse<AttendanceDaily>>(`/attendance/daily/${id}`, request);
    return res.data.data!;
  },

  /**
   * ประมวลผลและเตรียมบันทึกเวลาประจำวันอัตโนมัติ
   */
  async recalculateDaily(date?: string): Promise<number> {
    const params = date ? { date } : {};
    const res = await apiClient.post<ApiResponse<number>>('/attendance/daily/recalculate', {}, { params });
    return res.data.data ?? 0;
  },
};
