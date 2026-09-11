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
  createdAt?: string;
  updatedAt: string;
  positionId?: number;
  positionName?: string;
  departmentName?: string;
  divisionName?: string;
  employeeType?: string;
  contact?: EmployeeContact;
  socialSecurity?: EmployeeSocialSecurity;
  addresses: EmployeeAddress[];
  bankAccounts: EmployeeBankAccount[];
  educations?: EmployeeEducation[];
  familyMembers?: FamilyMember[];
  emergencyContacts?: EmergencyContact[];
}

export interface FamilyMember {
  id?: number;
  relationshipType: string;
  prefix?: string;
  firstName: string;
  lastName?: string;
  citizenId?: string;
  citizenIdMasked?: string;
  birthDate?: string;
  maritalStatus?: string;
  educationStatus?: string;
}

export interface EmergencyContact {
  id?: number;
  relationship?: string;
  prefix?: string;
  firstName: string;
  lastName: string;
  address?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  isPrimary?: boolean;
}

export interface EmployeeEducation {
  id?: number;
  educationLevel: string;
  institution: string;
  major?: string;
  graduationYear?: number;
  gpa?: number;
}

export interface CreateEmployeePayload {
  // ข้อมูลทั่วไป
  employeeCode: string;
  prefix?: string;
  firstName: string;
  lastName: string;
  citizenId?: string;
  gender?: string;
  genderId?: number;
  nationality?: string;
  religion?: string;

  // ข้อมูลส่วนบุคคล & ที่อยู่
  birthDate?: string;
  maritalStatus?: string;
  militaryStatus?: string;
  addressType?: string;
  addressLine?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  addresses?: Array<{
    addressType: string;
    addressLine?: string;
    subDistrict?: string;
    district?: string;
    province?: string;
    postalCode?: string;
    isCurrent?: boolean;
  }>;

  // การติดต่อ & การศึกษา
  personalEmail?: string;
  organizationEmail?: string;
  personalPhone?: string;
  educationLevel?: string;
  institution?: string;
  major?: string;
  graduationYear?: number;
  gpa?: number;

  // การเงิน & ตำแหน่งงาน
  bankName?: string;
  accountNumber?: string;
  positionId?: number;
  positionName?: string;
  employeeType?: string;

  // ครอบครัว & กรณีฉุกเฉิน
  familyMembers?: FamilyMember[];
  emergencyContact?: EmergencyContact;

  // อื่นๆ (เช่น ประกันสังคม)
  socialSecurityNo?: string;
  hospitalName?: string;
}
