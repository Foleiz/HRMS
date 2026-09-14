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
