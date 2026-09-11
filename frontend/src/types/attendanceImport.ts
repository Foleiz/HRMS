export interface AttendanceImportBatch {
  id: number;
  fileName: string | null;
  fileHash: string | null;
  source: string | null;
  deviceName: string | null;
  unitName: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  importedByUserId: number | null;
  importedByUserName: string | null;
  importedAt: string;
  totalRecords: number;
  successRecords: number;
  failedRecords: number;
  status: 'IMPORTED' | 'PARTIAL' | 'FAILED' | string;
}

export interface AttendanceImportError {
  id: number;
  importBatchId: number;
  rowNumber: number;
  rawRowData: string;
  errorMessage: string;
  errorCode: string | null;
  employeeCode: string | null;
  employeeName: string | null;
  departmentName: string | null;
  rawPunchTimestamp: string | null;
  devicePunchState: string | null;
  createdAt: string;
}

export interface AttendanceImportResult {
  batchId: number;
  fileName: string | null;
  fileHash: string | null;
  source: string | null;
  totalRecords: number;
  successRecords: number;
  failedRecords: number;
  status: string;
  dateFrom: string | null;
  dateTo: string | null;
  isDuplicate: boolean;
  errors: AttendanceImportError[];
}

export interface AttendanceImportFilterQuery {
  source?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedImportBatchResult {
  items: AttendanceImportBatch[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PagedImportErrorResult {
  items: AttendanceImportError[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
