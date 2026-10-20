import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';

export type CodeType =
  | 'employee'
  | 'division'
  | 'department'
  | 'team'
  | 'position'
  | 'level'
  | 'employee-type'
  | 'leave-type'
  | 'shift'
  | 'certificate-type'
  | 'gender';

export const codeService = {
  /** รหัสถัดไปที่ระบบแนะนำ (ผู้ใช้แก้ได้) */
  async getNext(type: CodeType): Promise<string> {
    const res = await apiClient.get<ApiResponse<string>>('/codes/next', { params: { type } });
    return res.data.data || '';
  },
};
