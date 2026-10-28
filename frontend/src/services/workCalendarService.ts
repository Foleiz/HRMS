import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  WorkWeekDay,
  UpdateWorkWeekRequest,
  Holiday,
  CreateHolidayRequest,
  UpdateHolidayRequest,
} from '@/types/workCalendar';

const holidaysCache = new Map<string, { data: Holiday[]; expiresAt: number }>();
const holidaysInFlight = new Map<string, Promise<Holiday[]>>();
const HOLIDAYS_CACHE_TTL_MS = 60_000;

function clearHolidaysCache() {
  holidaysCache.clear();
  holidaysInFlight.clear();
}

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
    const cacheKey = `${year || 'all'}_${companyId || 'default'}`;
    const now = Date.now();
    const cached = holidaysCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const existingPromise = holidaysInFlight.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    const params: Record<string, any> = {};
    if (year) params.year = year;
    if (companyId) params.companyId = companyId;

    const promise = apiClient
      .get<ApiResponse<Holiday[]>>('/workcalendar/holidays', { params })
      .then((res) => {
        const data = res.data.data || [];
        holidaysCache.set(cacheKey, { data, expiresAt: Date.now() + HOLIDAYS_CACHE_TTL_MS });
        return data;
      })
      .finally(() => {
        holidaysInFlight.delete(cacheKey);
      });

    holidaysInFlight.set(cacheKey, promise);
    return promise;
  },

  async getHoliday(id: number): Promise<Holiday> {
    const res = await apiClient.get<ApiResponse<Holiday>>(`/workcalendar/holidays/${id}`);
    return res.data.data!;
  },

  async createHoliday(data: CreateHolidayRequest): Promise<Holiday> {
    const res = await apiClient.post<ApiResponse<Holiday>>('/workcalendar/holidays', data);
    clearHolidaysCache();
    return res.data.data!;
  },

  async updateHoliday(id: number, data: UpdateHolidayRequest): Promise<Holiday> {
    const res = await apiClient.put<ApiResponse<Holiday>>(`/workcalendar/holidays/${id}`, data);
    clearHolidaysCache();
    return res.data.data!;
  },

  async deleteHoliday(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/workcalendar/holidays/${id}`);
    clearHolidaysCache();
    return res.data.data || false;
  },
};
