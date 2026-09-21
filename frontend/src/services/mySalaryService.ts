import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { MySalaryOverview, MySalaryDetail } from '@/types/mySalary';

export const mySalaryService = {
  /**
   * ดึงภาพรวมเงินเดือนและการ์ดสถิติ 4 ใบ พร้อมประวัติสลิปของพนักงาน (ESS)
   */
  getOverview: async (year?: number): Promise<MySalaryOverview> => {
    const params = year ? { year } : undefined;
    const response = await apiClient.get<ApiResponse<MySalaryOverview>>('/api/my-salary/overview', { params });
    return response.data.data;
  },

  /**
   * ดึงรายละเอียดแจกแจงรายได้-รายหักของสลิปเงินเดือนงวดที่เลือก
   */
  getDetail: async (payrollId: number): Promise<MySalaryDetail> => {
    const response = await apiClient.get<ApiResponse<MySalaryDetail>>(`/api/my-salary/slips/${payrollId}`);
    return response.data.data;
  },
};
