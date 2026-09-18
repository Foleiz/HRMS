import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  Announcement,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
  AnnouncementReadStats,
  AnnouncementFilterParams,
  PagedResult
} from '@/types/announcement';

export const announcementService = {
  async getAnnouncements(filter?: AnnouncementFilterParams): Promise<PagedResult<Announcement>> {
    const params = new URLSearchParams();
    if (filter?.search) params.append('search', filter.search);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.category) params.append('category', filter.category);
    if (filter?.priority) params.append('priority', filter.priority);
    if (filter?.isPinned !== undefined) params.append('isPinned', String(filter.isPinned));
    if (filter?.page) params.append('page', String(filter.page));
    if (filter?.pageSize) params.append('pageSize', String(filter.pageSize));

    const res = await apiClient.get<ApiResponse<PagedResult<Announcement>>>(`/announcements?${params.toString()}`);
    return res.data.data;
  },

  async getMyFeed(): Promise<Announcement[]> {
    const res = await apiClient.get<ApiResponse<Announcement[]>>('/announcements/my-feed');
    return res.data.data;
  },

  async getAnnouncementById(id: number): Promise<Announcement> {
    const res = await apiClient.get<ApiResponse<Announcement>>(`/announcements/${id}`);
    return res.data.data;
  },

  async createAnnouncement(payload: CreateAnnouncementPayload): Promise<Announcement> {
    const res = await apiClient.post<ApiResponse<Announcement>>('/announcements', payload);
    return res.data.data;
  },

  async updateAnnouncement(id: number, payload: UpdateAnnouncementPayload): Promise<Announcement> {
    const res = await apiClient.put<ApiResponse<Announcement>>(`/announcements/${id}`, payload);
    return res.data.data;
  },

  async deleteAnnouncement(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/announcements/${id}`);
    return res.data.data;
  },

  async togglePin(id: number): Promise<boolean> {
    const res = await apiClient.put<ApiResponse<boolean>>(`/announcements/${id}/pin`);
    return res.data.data;
  },

  async setPublishStatus(id: number, publish: boolean): Promise<boolean> {
    const res = await apiClient.put<ApiResponse<boolean>>(`/announcements/${id}/publish?publish=${publish}`);
    return res.data.data;
  },

  async markAsRead(id: number): Promise<boolean> {
    const res = await apiClient.post<ApiResponse<boolean>>(`/announcements/${id}/read`);
    return res.data.data;
  },

  async getReadStats(id: number): Promise<AnnouncementReadStats> {
    const res = await apiClient.get<ApiResponse<AnnouncementReadStats>>(`/announcements/${id}/read-stats`);
    return res.data.data;
  }
};
