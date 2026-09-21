import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { MySalaryOverview, MySalaryDetail } from '@/types/mySalary';

export const mySalaryService = {
  /**
   * ดึงภาพรวมเงินเดือนและการ์ดสถิติ 4 ใบ พร้อมประวัติสลิปของพนักงาน (ESS)
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
};
