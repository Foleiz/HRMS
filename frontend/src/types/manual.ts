export type ManualRoleTag =
  | 'ALL'
  | 'EMPLOYEE'
  | 'MANAGER'
  | 'HR'
  | 'FINANCE'
  | 'EXECUTIVE'
  | 'ADMIN';

export interface ManualRoleMeta {
  id: ManualRoleTag;
  label: string;
  shortLabel: string;
  badgeClass: string;
  barClass: string;
}

export const MANUAL_ROLE_META: Record<ManualRoleTag, ManualRoleMeta> = {
  ALL: {
    id: 'ALL',
    label: 'ทุกบทบาท',
    shortLabel: 'ทุกบทบาท',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    barClass: 'bg-slate-600 dark:bg-slate-300',
  },
  EMPLOYEE: {
    id: 'EMPLOYEE',
    label: 'พนักงานทั่วไป',
    shortLabel: 'พนักงาน',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
    barClass: 'bg-sky-500',
  },
  MANAGER: {
    id: 'MANAGER',
    label: 'หัวหน้างาน',
    shortLabel: 'หัวหน้างาน',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    barClass: 'bg-indigo-500',
  },
  HR: {
    id: 'HR',
    label: 'ฝ่ายบุคคล (HR)',
    shortLabel: 'HR',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    barClass: 'bg-emerald-500',
  },
  FINANCE: {
    id: 'FINANCE',
    label: 'ฝ่ายการเงิน',
    shortLabel: 'การเงิน',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    barClass: 'bg-amber-500',
  },
  EXECUTIVE: {
    id: 'EXECUTIVE',
    label: 'ผู้บริหาร (CEO)',
    shortLabel: 'ผู้บริหาร',
    badgeClass:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
    barClass: 'bg-purple-500',
  },
  ADMIN: {
    id: 'ADMIN',
    label: 'ผู้ดูแลระบบ (Admin)',
    shortLabel: 'Admin',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    barClass: 'bg-rose-500',
  },
};

export interface ManualScreenshot {
  src: string;
  alt: string;
  caption: string;
}

export interface ManualStep {
  title: string;
  description: string;
  tips?: string[];
}

export interface ManualCallout {
  type: 'info' | 'tip' | 'warning';
  title: string;
  content: string;
}

export interface ManualFaq {
  question: string;
  answer: string;
}

export interface ManualSection {
  id: string;
  title: string;
  description?: string;
  steps?: ManualStep[];
  bullets?: string[];
  callout?: ManualCallout;
  screenshots?: ManualScreenshot[];
}

export interface ManualArticle {
  slug: string;
  categoryId: string;
  title: string;
  sidebarTitle?: string;
  summary: string;
  menuPath: string;
  roles: ManualRoleTag[];
  keywords: string[];
  actionHref?: string;
  relatedTourId?: string;
  relatedSlugs?: string[];
  heroScreenshot?: ManualScreenshot;
  sections: ManualSection[];
  faqs?: ManualFaq[];
}

export interface ManualCategory {
  id: string;
  order: number;
  title: string;
  description: string;
  iconName:
    | 'Compass'
    | 'User'
    | 'FileText'
    | 'CalendarCheck'
    | 'Clock'
    | 'CreditCard'
    | 'Users'
    | 'CheckCircle2'
    | 'BarChart3'
    | 'Settings';
  roles: ManualRoleTag[];
}
