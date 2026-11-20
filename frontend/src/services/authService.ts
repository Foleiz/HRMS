import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { LoginRequest, LoginResponse, UserProfile } from '@/types/auth';

/**
 * Service สำหรับเรียกใช้งาน Authentication API
 */
export const authService = {
  /**
   * เข้าสู่ระบบด้วย username & password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials, {
      timeout: 20000,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
    return response.data.data;
  },

  /**
   * ดึงข้อมูลโปรไฟล์และสิทธิ์ของผู้ใช้งานปัจจุบัน
   */
  async getMe(): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
    }
    return response.data.data;
  },

  /**
   * เปลี่ยนรหัสผ่านสำหรับผู้ใช้งานปัจจุบัน
   */
  async changePassword(payload: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<boolean>>('/auth/change-password', payload);
    if (!response.data.success) {
      throw new Error(response.data.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    }
    return response.data.data ?? true;
  },

  /**
   * ส่งคำขอรีเซ็ตรหัสผ่านไปยังอีเมล (Self-Service Forgot Password)
   */
  async forgotPassword(emailOrUsername: string): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<boolean>>('/auth/forgot-password', { emailOrUsername });
    if (!response.data.success) {
      throw new Error(response.data.message || 'ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้');
    }
    return response.data.data ?? true;
  },

  /**
   * ตรวจสอบความถูกต้องของ Token ก่อนแสดงฟอร์มตั้งรหัสผ่านใหม่
   */
  async validateResetToken(token: string): Promise<{ isValid: boolean; username?: string; maskedEmail?: string; errorMessage?: string }> {
    const response = await apiClient.get<ApiResponse<{ isValid: boolean; username?: string; maskedEmail?: string; errorMessage?: string }>>(
      `/auth/validate-reset-token?token=${encodeURIComponent(token)}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'โทเค็นไม่ถูกต้องหรือหมดอายุแล้ว');
    }
    return response.data.data;
  },

  /**
   * ตั้งรหัสผ่านใหม่ด้วย Token
   */
  async resetPassword(payload: { token: string; newPassword: string; confirmPassword: string }): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<boolean>>('/auth/reset-password', payload);
    if (!response.data.success) {
      throw new Error(response.data.message || 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ');
    }
    return response.data.data ?? true;
  },
};
