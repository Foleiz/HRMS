export interface DocumentTypeItem {
  id: number;
  documentCode: string;
  documentName: string;
  isExpiryRequired: boolean;
  /** แจ้งเตือนล่วงหน้า (วัน) ก่อนเอกสารหมดอายุ */
  notifyBeforeDays: number;
  /** อายุเอกสาร (เดือน) — ใช้คำนวณวันหมดอายุจากวันที่ออก */
  validityMonths?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CreateDocumentTypeRequest {
  documentCode: string;
  documentName: string;
  isExpiryRequired?: boolean;
  notifyBeforeDays?: number | null;
  validityMonths?: number | null;
  status?: string;
}

export interface UpdateDocumentTypeRequest {
  documentName: string;
  isExpiryRequired: boolean;
  notifyBeforeDays?: number | null;
  validityMonths?: number | null;
  status: string;
}

export interface NationalityItem {
  id: number;
  nationalityName: string;
}

export interface CreateNationalityRequest {
  nationalityName: string;
}

export interface UpdateNationalityRequest {
  nationalityName: string;
}

export interface ReligionItem {
  id: number;
  religionName: string;
}

export interface CreateReligionRequest {
  religionName: string;
}

export interface UpdateReligionRequest {
  religionName: string;
}

export interface MaritalStatusItem {
  id: number;
  maritalStatusName: string;
}

export interface CreateMaritalStatusRequest {
  maritalStatusName: string;
}

export interface UpdateMaritalStatusRequest {
  maritalStatusName: string;
}
