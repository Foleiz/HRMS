export interface CommissionRecord {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string | null;
  positionName?: string | null;
  year: number;
  month: number;
  salesAmount: number;
  commissionRate: number;
  commissionAmount: number;
  specialAmount: number;
  totalCommission: number;
  calculationMode: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID' | string;
  note?: string | null;
  confirmedAt?: string | null;
  confirmedByName?: string | null;
  paidPeriodId?: number | null;
}

export interface CommissionPeriodSummary {
  year: number;
  month: number;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID' | string;
  totalEmployees: number;
  totalSales: number;
  totalCommission: number;
  confirmedAt?: string | null;
  confirmedByName?: string | null;
  records: CommissionRecord[];
}

export interface UpdateCommissionItemPayload {
  salesAmount: number;
  commissionRate: number;
  specialAmount?: number;
  note?: string;
}

export interface AddManualCommissionPayload {
  employeeId: number;
  year: number;
  month: number;
  salesAmount: number;
  commissionRate: number;
  specialAmount?: number;
  note?: string;
  accumulate?: boolean;
}

export interface ImportCommissionResult {
  batchId?: number;
  detectedType?: string;
  detectedTypeLabel?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  totalRowsInFile: number;
  totalImported: number;
  successCount: number;
  updatedCount: number;
  replacedCount: number;
  skippedCount: number;
  totalSalesAmount: number;
  totalCommissionAmount: number;
  warnings: string[];
  summary: CommissionPeriodSummary;
}

export interface CommissionPreviewItem {
  employeeId?: number | null;
  employeeCode: string;
  employeeName: string;
  departmentName?: string | null;
  dateFrom: string;
  dateTo: string;
  salesAmount: number;
  commissionRate: number;
  commissionAmount: number;
  specialAmount: number;
  totalAmount: number;
  note?: string | null;
  existingOverlappingEntries: number;
  isValid: boolean;
  errorMessage?: string | null;
}

export interface CommissionPreviewResult {
  fileName: string;
  fileHash: string;
  detectedType: 'MONTH' | 'DAY' | 'RANGE' | string;
  detectedTypeLabel: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  targetYear: number;
  targetMonth: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  employeeCount: number;
  totalSalesAmount: number;
  totalCommissionAmount: number;
  replacedEntriesCount: number;
  isLockedPeriod: boolean;
  lockReason?: string | null;
  warnings: string[];
  previewRows: CommissionPreviewItem[];
}

export interface CommissionImportBatch {
  id: number;
  fileName?: string | null;
  fileHash?: string | null;
  detectedType: string;
  detectedTypeLabel: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  totalRows: number;
  successRows: number;
  failedRows: number;
  employeeCount: number;
  replacedEntries: number;
  totalAmount: number;
  status: 'IMPORTED' | 'REVERTED' | 'FAILED' | string;
  importedByUserName?: string | null;
  importedAt: string;
  revertedAt?: string | null;
  revertedByUserName?: string | null;
}

export interface PagedCommissionBatches {
  items: CommissionImportBatch[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RevertCommissionBatchResult {
  batchId: number;
  fileName?: string | null;
  revertedEntriesCount: number;
  restoredEntriesCount: number;
  affectedEmployeesCount: number;
  message: string;
}

export interface CommissionBatchEntry {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string | null;
  positionName?: string | null;
  dateFrom: string;
  dateTo: string;
  salesAmount: number;
  commissionRate: number;
  commissionAmount: number;
  specialAmount: number;
  totalAmount: number;
  note?: string | null;
  status: string;
  createdAt: string;
  batchFileName?: string | null;
  source?: string;
}

