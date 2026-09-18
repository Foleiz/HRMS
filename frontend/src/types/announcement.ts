export type AnnouncementCategory = 'GENERAL' | 'POLICY' | 'ACTIVITY' | 'WELFARE' | 'URGENT';
export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type TargetType = 'ALL' | 'DEPARTMENT' | 'DIVISION' | 'EMPLOYEE_LEVEL';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AnnouncementTarget {
  id: number;
  targetType: TargetType;
  targetEntityId?: number | null;
  targetEntityName?: string | null;
}

export interface AnnouncementTargetInput {
  targetType: TargetType;
  targetEntityId?: number | null;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  publishedAt?: string | null;
  expireAt?: string | null;
  createdByEmployeeId?: number | null;
  createdByEmployeeName?: string | null;
  status: AnnouncementStatus;
  isPinned: boolean;
  bannerImageUrl?: string | null;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  createdAt: string;
  updatedAt?: string | null;
  targets: AnnouncementTarget[];
  readCount: number;
  totalTargetCount: number;
  isReadByCurrentUser?: boolean;
  readAtByCurrentUser?: string | null;
}

export interface CreateAnnouncementPayload {
  title: string;
  content: string;
  publishedAt?: string | null;
  expireAt?: string | null;
  isPinned?: boolean;
  bannerImageUrl?: string | null;
  category?: AnnouncementCategory;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;
  targets?: AnnouncementTargetInput[];
}

export interface UpdateAnnouncementPayload {
  title: string;
  content: string;
  publishedAt?: string | null;
  expireAt?: string | null;
  isPinned?: boolean;
  bannerImageUrl?: string | null;
  category?: AnnouncementCategory;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;
  targets?: AnnouncementTargetInput[];
}

export interface ReadReceipt {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string | null;
  readAt: string;
}

export interface AnnouncementReadStats {
  announcementId: number;
  title: string;
  totalTargetEmployees: number;
  readCount: number;
  readPercentage: number;
  receipts: ReadReceipt[];
}

export interface AnnouncementFilterParams {
  search?: string;
  status?: string;
  category?: string;
  priority?: string;
  isPinned?: boolean;
  page?: number;
  pageSize?: number;
}
