import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  AttendanceAdjustment,
  CreateAttendanceAdjustmentRequest,
  ReviewAttendanceAdjustmentRequest,
  AdjustmentFilter,
  PagedAdjustmentResult,
} from '@/types/attendanceAdjustment';

export const attendanceAdjustmentService = {
  /**
   * ดึงรายการคำขอปรับปรุงเวลา พร้อมแบ่งหน้าและตัวกรอง
   */
  async getAdjustments(filter?: AdjustmentFilter): Promise<PagedAdjustmentResult> {
    const res = await apiClient.get<ApiResponse<PagedAdjustmentResult>>('/attendance/adjustments', {
      params: filter,
    });
    return res.data.data;
  },

  /**
   * ดึงจำนวนคำขอที่กำลังรอพิจารณา (Status = PENDING)
   */
  async getPendingCount(): Promise<number> {
    const res = await apiClient.get<ApiResponse<number>>('/attendance/adjustments/pending-count');
    return res.data.data;
  },

  /**
   * ดึงข้อมูลคำขอปรับปรุงเวลาตาม ID
   */
  async getAdjustmentById(id: number): Promise<AttendanceAdjustment> {
    const res = await apiClient.get<ApiResponse<AttendanceAdjustment>>(`/attendance/adjustments/${id}`);
    return res.data.data;
  },

  /**
   * ยื่นคำขอปรับปรุงเวลาเข้า-ออกงานใหม่
   */
  async createAdjustment(request: CreateAttendanceAdjustmentRequest): Promise<AttendanceAdjustment> {
    const res = await apiClient.post<ApiResponse<AttendanceAdjustment>>('/attendance/adjustments', request);
    return res.data.data;
  },

  /**
   * พิจารณาอนุมัติหรือปฏิเสธคำขอ (Status: APPROVED | REJECTED)
   */
  async reviewAdjustment(id: number, request: ReviewAttendanceAdjustmentRequest): Promise<AttendanceAdjustment> {
    const res = await apiClient.post<ApiResponse<AttendanceAdjustment>>(`/attendance/adjustments/${id}/review`, request);
    return res.data.data;
  },

  /**
   * ขอยกเลิกคำขอของตนเอง (Status: CANCELLED)
   */
  async cancelAdjustment(id: number): Promise<AttendanceAdjustment> {
    const res = await apiClient.post<ApiResponse<AttendanceAdjustment>>(`/attendance/adjustments/${id}/cancel`);
    return res.data.data;
  },
};
