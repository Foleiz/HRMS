import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { MySalaryOverview, MySalaryDetail } from '@/types/mySalary';

export interface SalaryPinStatus {
  hasPin: boolean;
}

export const mySalaryService = {
  /**
   * ดึงภาพรวมเงินเดือนและการ์ดสถิติ พร้อมประวัติสลิปของพนักงาน (ESS)
   */
  getOverview: async (year?: number): Promise<MySalaryOverview> => {
    const params = year ? { year } : undefined;
    const response = await apiClient.get<ApiResponse<MySalaryOverview>>('/my-salary/overview', { params });
    return response.data.data;
  },

  /**
   * ดึงรายละเอียดแจกแจงรายได้-รายหักของสลิปเงินเดือนงวดที่เลือก
   */
  getDetail: async (payrollId: number): Promise<MySalaryDetail> => {
    const response = await apiClient.get<ApiResponse<MySalaryDetail>>(`/my-salary/slips/${payrollId}`);
    return response.data.data;
  },

  /**
   * ดาวน์โหลดสลิปเงินเดือน E-Payslip PDF (พร้อมเข้ารหัสผ่าน)
   */
  downloadSlipPdf: async (payrollId: number, defaultFileName?: string): Promise<void> => {
    const response = await apiClient.get(`/my-salary/slips/${payrollId}/download`, {
      responseType: 'blob',
    });

    let fileName = defaultFileName || `Payslip_${payrollId}.pdf`;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        fileName = match[1].replace(/['"]/g, '');
      }
    }

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * ตรวจสอบว่าผู้ใช้งานปัจจุบันได้ตั้งรหัส PIN 6 หลักแล้วหรือไม่
   */
  getPinStatus: async (): Promise<SalaryPinStatus> => {
    const response = await apiClient.get<ApiResponse<SalaryPinStatus>>('/my-salary/pin/status');
    return response.data.data;
  },

  /**
   * ตั้งรหัส PIN 6 หลักครั้งแรก
   */
  setupPin: async (pin: string, confirmPin: string): Promise<void> => {
    await apiClient.post('/my-salary/pin/setup', { pin, confirmPin });
  },

  /**
   * ตรวจสอบรหัส PIN 6 หลักเพื่อปลดล็อกเข้าดูข้อมูลเงินเดือน
   */
  verifyPin: async (pin: string): Promise<boolean> => {
    const response = await apiClient.post<ApiResponse<{ verified: boolean }>>('/my-salary/pin/verify', { pin });
    return response.data.data?.verified ?? true;
  },

  /**
   * รีเซ็ตหรือเปลี่ยนรหัส PIN 6 หลัก (ยืนยันด้วย PIN เดิม หรือ รหัสผ่านบัญชี)
   */
  resetPin: async (
    param1: string | { currentPin?: string; currentPassword?: string; newPin: string; confirmPin: string },
    newPin?: string,
    confirmPin?: string
  ): Promise<void> => {
    if (typeof param1 === 'object') {
      await apiClient.post('/my-salary/pin/reset', param1);
    } else {
      await apiClient.post('/my-salary/pin/reset', { currentPassword: param1, newPin, confirmPin });
    }
  },
};
