import { BenefitItem } from './benefit';

export interface EmployeeType {
  id: number;
  typeCode: string;
  typeName: string;
  wageType: 'MONTHLY' | 'DAILY' | 'HOURLY' | 'STIPEND' | string;
  hasSocialSecurity: boolean;
  hasLeaveEntitlement: boolean;
  hasOvertime: boolean;
  hasProvidentFund: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  activeContractsCount: number;
  benefits?: BenefitItem[];
}

export interface CreateEmployeeTypePayload {
  typeCode: string;
  typeName: string;
  wageType: string;
  hasSocialSecurity: boolean;
  hasLeaveEntitlement: boolean;
  hasOvertime: boolean;
  hasProvidentFund: boolean;
  status: string;
  benefitItemIds?: number[];
}

export interface UpdateEmployeeTypePayload {
  typeName: string;
  wageType: string;
  hasSocialSecurity: boolean;
  hasLeaveEntitlement: boolean;
  hasOvertime: boolean;
  hasProvidentFund: boolean;
  status: string;
  benefitItemIds?: number[];
}

export interface EmployeeTypeStats {
  totalTypes: number;
  monthlyWageCount: number;
  otherWageCount: number;
  activeCount: number;
}
