/** สถานะวันหมดอายุของเอกสาร */
export type DocumentExpiryStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';

/** เอกสารในแฟ้มพนักงาน (hrms.employee_document) */
export interface EmployeeDocument {
  id: number;
  employeeId: number;
  documentTypeId: number;
  documentTypeCode: string;
  documentTypeName: string;
  isExpiryRequired: boolean;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSize?: number | null;
  hasFile: boolean;
  issuedDate?: string | null;
  expiryDate?: string | null;
  expiryStatus: DocumentExpiryStatus;
  daysToExpiry?: number | null;
  remarks?: string | null;
  uploadedAt: string;
  uploadedByName?: string | null;
  sourceGeneralRequestId?: number | null;
  sourceRequestNo?: string | null;
}

export interface CreateEmployeeDocumentPayload {
  documentTypeId: number;
  fileName: string;
  /** data URL ของไฟล์ */
  fileData: string;
  issuedDate?: string;
  expiryDate?: string;
  remarks?: string;
}
