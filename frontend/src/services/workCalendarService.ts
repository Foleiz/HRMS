import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  WorkWeekDay,
  UpdateWorkWeekRequest,
  Holiday,
  CreateHolidayRequest,
  UpdateHolidayRequest,
} from '@/types/workCalendar';

export const workCalendarService = {
  // Work Week
  async getWorkWeek(companyId?: number): Promise<WorkWeekDay[]> {
    const params = companyId ? { companyId } : {};
    const res = await apiClient.get<ApiResponse<WorkWeekDay[]>>('/workcalendar/work-week', { params });
    return res.data.data || [];
  },

  async updateWorkWeek(data: UpdateWorkWeekRequest, companyId?: number): Promise<WorkWeekDay[]> {
    const params = companyId ? { companyId } : {};
    const res = await apiClient.put<ApiResponse<WorkWeekDay[]>>('/workcalendar/work-week', data, { params });
    return res.data.data || [];
  },

  // Holidays
  async getHolidays(year?: number, companyId?: number): Promise<Holiday[]> {
    const params: Record<string, any> = {};
    if (year) params.year = year;
    if (companyId) params.companyId = companyId;

    const res = await apiClient.get<ApiResponse<Holiday[]>>('/workcalendar/holidays', { params });
    return res.data.data || [];
  },

  async getHoliday(id: number): Promise<Holiday> {
    const res = await apiClient.get<ApiResponse<Holiday>>(`/workcalendar/holidays/${id}`);
    return res.data.data!;
  },

  async createHoliday(data: CreateHolidayRequest): Promise<Holiday> {
    const res = await apiClient.post<ApiResponse<Holiday>>('/workcalendar/holidays', data);
    return res.data.data!;
  },

  async updateHoliday(id: number, data: UpdateHolidayRequest): Promise<Holiday> {
    const res = await apiClient.put<ApiResponse<Holiday>>(`/workcalendar/holidays/${id}`, data);
    return res.data.data!;
  },

  async deleteHoliday(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/workcalendar/holidays/${id}`);
    return res.data.data || false;
  },
};
