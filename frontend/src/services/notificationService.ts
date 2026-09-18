import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { NotificationItem, NotificationSummary } from '@/types/notification';

export const notificationService = {
  async getSummary(): Promise<NotificationSummary> {
    const res = await apiClient.get<ApiResponse<NotificationSummary>>('/notifications/summary');
    return res.data.data;
  },

  async getNotifications(params?: {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationItem[]> {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.pageSize) q.append('pageSize', String(params.pageSize));
    if (params?.unreadOnly !== undefined) q.append('unreadOnly', String(params.unreadOnly));

    const res = await apiClient.get<ApiResponse<NotificationItem[]>>(`/notifications?${q.toString()}`);
    return res.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<ApiResponse<number>>('/notifications/unread-count');
    return res.data.data;
  },

  async markAsRead(id: number): Promise<boolean> {
    const res = await apiClient.put<ApiResponse<boolean>>(`/notifications/${id}/read`);
    return res.data.data;
  },

  async markAllAsRead(): Promise<number> {
    const res = await apiClient.put<ApiResponse<number>>('/notifications/read-all');
    return res.data.data;
  },
};
