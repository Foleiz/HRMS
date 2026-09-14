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
}

export interface UpdateEmployeeTypePayload {
  typeName: string;
  wageType: string;
  hasSocialSecurity: boolean;
  hasLeaveEntitlement: boolean;
  hasOvertime: boolean;
  hasProvidentFund: boolean;
  status: string;
}

export interface EmployeeTypeStats {
  totalTypes: number;
  monthlyWageCount: number;
  otherWageCount: number;
  activeCount: number;
}
