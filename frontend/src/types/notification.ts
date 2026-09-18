export type NotificationType =
  | 'LEAVE_REQUEST'
  | 'APPROVAL'
  | 'ANNOUNCEMENT'
  | 'PAYROLL'
  | 'ATTENDANCE'
  | 'TIME_ADJUSTMENT'
  | 'GENERAL';

export interface NotificationItem {
  id: number;
  userId: number;
  notificationType: string;
  title: string;
  message?: string | null;
  referenceType?: string | null;
  referenceId?: number | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
  targetUrl: string;
  timeAgo: string;
}

export interface NotificationSummary {
  unreadCount: number;
  recentNotifications: NotificationItem[];
}
