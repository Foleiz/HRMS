export type BenefitCategory =
  | 'STATUTORY'
  | 'HEALTH'
  | 'ALLOWANCE'
  | 'WELLNESS'
  | 'FINANCIAL'
  | 'OTHER';

export interface BenefitItem {
  id: number;
  benefitCode: string;
  benefitName: string;
  category: BenefitCategory | string;
  description?: string | null;
  isStatutory: boolean;
  status: 'ACTIVE' | 'INACTIVE' | string;
  coverageAmount?: number;
  frequency?: 'DAILY' | 'MONTHLY' | 'YEARLY' | 'PER_OCCURRENCE' | string;
  assignedTypesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBenefitPayload {
  benefitCode: string;
  benefitName: string;
  category: string;
  description?: string;
  isStatutory?: boolean;
  status?: string;
}

export interface UpdateBenefitPayload {
  benefitName: string;
  category: string;
  description?: string;
  isStatutory?: boolean;
  status?: string;
}

export interface BenefitUsageItem {
  benefitItemId: number;
  benefitCode: string;
  benefitName: string;
  category: string;
  description?: string | null;
  quotaAmount: number;
  frequency: 'DAILY' | 'MONTHLY' | 'YEARLY' | 'PER_OCCURRENCE' | string;
  usedAmount: number;
  remainingAmount: number;
  usagePercentage: number;
  isMaxedOut: boolean;
  statusText: string;
  claimCount: number;
  lastClaimDate?: string | null;
}

export interface EmployeeBenefitUsageSummary {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  employeeType?: string | null;
  year: number;
  totalQuotaAmount: number;
  totalUsedAmount: number;
  totalRemainingAmount: number;
  overallUsagePercent: number;
  totalBenefitsCount: number;
  maxedOutBenefitsCount: number;
  benefits: BenefitUsageItem[];
}

export interface BenefitClaim {
  id: number;
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  benefitItemId: number;
  benefitCode: string;
  benefitName: string;
  category: string;
  claimYear: number;
  claimDate: string;
  amount: number;
  receiptNumber?: string | null;
  serviceProvider?: string | null;
  remarks?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  approvedByName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}

export interface CreateBenefitClaimPayload {
  employeeId: number;
  benefitItemId: number;
  claimYear?: number;
  claimDate?: string;
  amount: number;
  receiptNumber?: string;
  serviceProvider?: string;
  remarks?: string;
}

