export interface EmployeeContact {
  personalPhone?: string;
  personalEmail?: string;
  organizationEmail?: string;
}

export interface EmployeeSocialSecurity {
  socialSecurityNoMasked?: string;
  hospitalName?: string;
  hospitalCode?: string;
}

export interface EmployeeAddress {
  id: number;
  addressType: string;
  addressLine?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  isCurrent: boolean;
}

export interface EmployeeBankAccount {
  id: number;
  bankId: number;
  bankCode?: string;
  bankName?: string;
  accountNumber: string;
  accountType?: string;
  accountName?: string;
  isPrimary: boolean;
  status: string;
}

export interface Employee {
  id: number;
  employeeCode: string;
  prefix?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  citizenIdMasked?: string;
  birthDate?: string;
  gender?: string;
  genderId?: number;
  nationality?: string;
  nationalityId?: number;
  religion?: string;
  religionId?: number;
  maritalStatus?: string;
  maritalStatusId?: number;
  militaryStatus?: string;
  isTopLevel: boolean;
  spouseHasIncome: boolean;
  numberOfChildren: number;
  parentDeductionCount: number;
  disabilityDeductionCount: number;
  createdAt: string;
  updatedAt: string;
  contact?: EmployeeContact;
  socialSecurity?: EmployeeSocialSecurity;
  addresses: EmployeeAddress[];
  bankAccounts: EmployeeBankAccount[];
}

export interface CreateEmployeePayload {
  employeeCode: string;
  prefix?: string;
  firstName: string;
  lastName: string;
  citizenId?: string;
  birthDate?: string;
  gender?: string;
  personalPhone?: string;
  personalEmail?: string;
  organizationEmail?: string;
  socialSecurityNo?: string;
  hospitalName?: string;
}
