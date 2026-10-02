import { BenefitItem } from './benefit';

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
  /** จำนวนแถวลงเวลาจากไฟล์ที่นำเข้าไว้แล้ว ที่ระบบจับคู่ให้อัตโนมัติหลังบันทึก (มีเฉพาะผลของการสร้าง/แก้ไข) */
  attendanceRowsLinked?: number | null;
  biometricId?: string | null;
  /** สถานะการจ้างงาน: ACTIVE | INACTIVE */
  employmentStatus: string;
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
  avatarUpdatedAt?: string | null;
  avatarUrl?: string | null;
  hasSignature?: boolean;
  signatureUrl?: string | null;
  positionId?: number;
  positionCode?: string;
  positionName?: string;
  departmentId?: number;
  departmentCode?: string;
  departmentName?: string;
  divisionId?: number;
  divisionCode?: string;
  divisionName?: string;
  employeeTypeId?: number;
  employeeType?: string;
  /** หัวหน้างานโดยตรง */
  managerEmployeeId?: number | null;
  managerName?: string | null;
  managerEmployeeCode?: string | null;
  contact?: EmployeeContact;
  socialSecurity?: EmployeeSocialSecurity;
  addresses: EmployeeAddress[];
  bankAccounts: EmployeeBankAccount[];
  educations?: EmployeeEducation[];
  workExperiences?: EmployeeWorkExperience[];
  familyMembers?: FamilyMember[];
  emergencyContacts?: EmergencyContact[];
  userAccount?: EmployeeUserAccount | null;
  benefits?: BenefitItem[];
}

export interface EmployeeUserAccount {
  id: number;
  username: string;
  status: string;
  lastLoginAt?: string | null;
  roles: string[];
  roleNames: string[];
  accessScope?: string | null;
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

/** ประวัติการทำงาน (ก่อนเข้าบริษัท) */
export interface EmployeeWorkExperience {
  id?: number;
  companyName: string;
  positionName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  lastSalary?: number | null;
  leavingReason?: string | null;
  jobDescription?: string | null;
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
  employeeCode: string;  // required in UI (auto-filled), optional to backend
  biometricId?: string;
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
  /** หัวหน้างานโดยตรง (null = ไม่มี) — ตอนแก้ไขต้องส่ง setManager: true ด้วย */
  managerEmployeeId?: number | null;
  setManager?: boolean;

  // ครอบครัว & กรณีฉุกเฉิน
  spouseHasIncome?: boolean;
  numberOfChildren?: number;
  parentDeductionCount?: number;
  disabilityDeductionCount?: number;
  familyMembers?: FamilyMember[];
  emergencyContact?: EmergencyContact;

  // อื่นๆ (เช่น ประกันสังคม)
  socialSecurityNo?: string;
  hospitalName?: string;
  hospitalCode?: string;

  /** ประวัติการศึกษา/การทำงานทั้งชุด — ส่งมา = แทนที่ของเดิมทั้งหมด */
  educations?: EmployeeEducation[];
  workExperiences?: EmployeeWorkExperience[];
}
