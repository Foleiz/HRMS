export interface CertificateType {
  id: number;
  certificateCode: string;
  certificateName: string;
}

export interface CreateCertificateRequest {
  certificateTypeId: number;
  purpose: string;
  language: string;
  notes?: string;
}

export interface CertificateRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  certificateTypeId: number;
  certificateCode: string;
  certificateName: string;
  purpose?: string;
  status: string;
  requestedAt: string;
  issuedAt?: string;
  approvalInstanceId?: number;
  canCancel: boolean;
  canDownload: boolean;
}

export interface CertificateDocument {
  requestId: number;
  documentNumber: string;
  issueDate: string;
  language: string;
  certificateCode: string;
  certificateTitle: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogoBase64?: string;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  citizenIdMasked?: string;
  positionName: string;
  departmentName: string;
  startDate: string;
  serviceDurationText: string;
  baseSalary?: number;
  salaryText?: string;
  purpose: string;
  certificationBodyTh: string;
  certificationBodyEn: string;
  signatoryName: string;
  signatoryPosition: string;
  signatureBase64?: string;
}

export interface EmployeeSignature {
  id: number;
  employeeId: number;
  employeeName: string;
  fileName?: string;
  isActive: boolean;
  uploadedAt: string;
  signatureBase64?: string;
}
