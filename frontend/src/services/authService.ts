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
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
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
   * รีเซ็ตรหัสผ่านบัญชีทดสอบในระบบเป็นค่าเริ่มต้น (Development Utility)
   */
  async seedPasswords(password = 'Admin@123456'): Promise<void> {
    await apiClient.post(`/auth/seed-passwords?password=${encodeURIComponent(password)}`);
  },
};
