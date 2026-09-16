export interface SalaryStructure {
  id: number;
  positionId?: number | null;
  positionName?: string | null;
  employeeLevelId?: number | null;
  levelName?: string | null;
  minSalary: number;
  maxSalary: number;
  defaultSalary?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  approvalLimit?: number | null;
  positionAllowance?: number | null;
  status?: string;
}

export interface CreateSalaryStructurePayload {
  positionId?: number | null;
  employeeLevelId?: number | null;
  minSalary: number;
  maxSalary: number;
  defaultSalary?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  approvalLimit?: number | null;
  positionAllowance?: number | null;
  status?: string;
}

export interface UpdateSalaryStructurePayload {
  positionId?: number | null;
  employeeLevelId?: number | null;
  minSalary: number;
  maxSalary: number;
  defaultSalary?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  approvalLimit?: number | null;
  positionAllowance?: number | null;
  status?: string;
}

export interface TaxBracket {
  id: number;
  bracketName: string;
  incomeFrom: number;
  incomeTo?: number | null;
  taxRate: number;
  baseTaxAmount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: string;
}

export interface UpdateTaxBracketPayload {
  bracketName: string;
  incomeFrom: number;
  incomeTo?: number | null;
  taxRate: number;
  baseTaxAmount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: string;
}

export interface SocialSecurityRate {
  id: number;
  rateName: string;
  employeeContributionPercent: number;
  employerContributionPercent: number;
  minWageBaseAmount: number;
  maxWageBaseAmount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: string;
}

export interface UpdateSocialSecurityRatePayload {
  rateName: string;
  employeeContributionPercent: number;
  employerContributionPercent: number;
  minWageBaseAmount: number;
  maxWageBaseAmount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: string;
}

export interface EmployeeSalaryOverview {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string | null;
  positionName?: string | null;
  levelName?: string | null;
  currentSalary?: number | null;
  currentEffectiveFrom?: string | null;
  salaryStructureMin?: number | null;
  salaryStructureMax?: number | null;
  salaryRecordCount: number;
}

export interface EmployeeSalary {
  id: number;
  employeeId: number;
  employeeCode?: string | null;
  employeeName?: string | null;
  departmentName?: string | null;
  positionName?: string | null;
  baseSalary: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason?: string | null;
  approvedByEmployeeId?: number | null;
  approvedByName?: string | null;
  createdAt: string;
}

export interface AdjustEmployeeSalaryPayload {
  baseSalary: number;
  effectiveFrom: string;
  reason?: string | null;
  approvedByEmployeeId?: number | null;
}

export interface RecentPayrollPeriod {
  periodName: string;
  totalAmount: number;
  status: string;
  statusText: string;
}

export interface PayrollOverview {
  currentMonthTotal: number;
  currentMonthPeriod: string;
  calculatedEmployeesCount: number;
  totalEmployeesCount: number;
  calculatedPercentage: number;
  pendingApprovalCount: number;
  nextClosingDate: string;
  remainingDays: number;
  recentPeriods: RecentPayrollPeriod[];
}

export interface PayrollItem {
  id: number;
  itemCode: string;
  itemName: string;
  description?: string | null;
  itemType: 'EARNING' | 'DEDUCTION';
  calculationType: 'FIXED' | 'FORMULA' | 'MANUAL';
  formulaTemplate?: string | null;
  formulaValue?: string | null;
  isTaxable: boolean;
  isSocialSecurityCalculated: boolean;
  status: string;
}

export interface PayrollPeriod {
  id: number;
  year: number;
  month: number;
  periodName: string;
  startDate: string;
  endDate: string;
  paymentDate?: string | null;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'CLOSED' | string;
  statusText: string;
  employeeCount: number;
  totalNetSalary: number;
  // Payment Workflow
  paymentMethod?: 'BANK_BATCH' | 'DIRECT_TRANSFER' | null;
  paymentMethodText?: string | null;
  paymentConfirmedAt?: string | null;
  paymentConfirmedBy?: number | null;
  bankFileGeneratedAt?: string | null;
  totalTransferredCount: number;
  paymentNote?: string | null;
  canConfirmPayment: boolean;
}

export interface PayrollRecord {
  id: number;
  periodId: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  totalGrossIncome?: number | null;
  totalDeductionAmount?: number | null;
  netPayableSalary?: number | null;
  status: 'CALCULATED' | 'REVIEW' | 'DRAFT' | string;
  statusText: string;
  // Individual Payment Tracking
  paymentStatus: 'PENDING' | 'TRANSFERRED' | 'FAILED' | string;
  paymentStatusText: string;
  transferredAt?: string | null;
  transferReference?: string | null;
  hasSlip: boolean;
  slipFileName?: string | null;
  slipUploadedAt?: string | null;
}

export interface PayrollDetailItem {
  id: number;
  payrollId: number;
  payrollItemId: number;
  itemCode: string;
  itemName: string;
  itemType: 'EARNING' | 'DEDUCTION';
  quantity?: number | null;
  rate?: number | null;
  amount: number;
  subtext?: string | null;
}export interface BankTransferItem {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  netPayableSalary: number;
}

export interface BankTransferSummary {
  periodId: number;
  periodName: string;
  totalAmount: number;
  totalRecords: number;
  items: BankTransferItem[];
}

export interface TaxSsoItem {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  citizenId?: string | null;
  totalGrossIncome?: number;
  grossIncome?: number;
  withholdingTax?: number;
  pnd1Tax?: number;
  ssoEmployeeContribution?: number;
  ssoEmployee?: number;
  ssoEmployerContribution?: number;
  ssoEmployer?: number;
}

export interface TaxSsoSummary {
  periodId: number;
  periodName: string;
  totalGrossIncome?: number;
  totalWithholdingTax?: number;
  totalPnd1Tax?: number;
  totalSsoEmployee?: number;
  totalSsoEmployer?: number;
  totalSsoCombined?: number;
  employeeCount?: number;
  items: TaxSsoItem[];
}

export interface EmployeeBonus {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string | null;
  positionName?: string | null;
  baseSalary: number;
  performanceScore?: number | null;
  multiplier: number;
  bonusAmount: number;
}

// ===== PAYMENT WORKFLOW TYPES =====

export interface PayrollTransferItem {
  payrollId: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  // Bank Account
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  // Salary
  netPayableSalary: number;
  // Payment Status
  paymentStatus: 'PENDING' | 'TRANSFERRED' | 'FAILED' | string;
  paymentStatusText: string;
  transferredAt?: string | null;
  transferReference?: string | null;
  // Slip
  hasSlip: boolean;
  slipFileName?: string | null;
  slipUploadedAt?: string | null;
}

export interface PayrollTransferList {
  periodId: number;
  periodName: string;
  paymentMethod?: 'BANK_BATCH' | 'DIRECT_TRANSFER' | null;
  status: string;
  totalEmployees: number;
  transferredCount: number;
  pendingCount: number;
  totalNetSalary: number;
  canConfirmPayment: boolean;
  items: PayrollTransferItem[];
}

export interface SetPaymentMethodPayload {
  paymentMethod: 'BANK_BATCH' | 'DIRECT_TRANSFER';
}

export interface MarkTransferredPayload {
  transferReference?: string | null;
  slipFileName: string;
  slipContentType: string;
  slipBase64: string;
}

export interface ConfirmPaymentPayload {
  note?: string | null;
}
