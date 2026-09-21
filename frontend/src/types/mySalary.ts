export interface MySalaryOverview {
  latestNetPay: number;
  latestGrossIncome: number;
  latestTotalDeductions: number;
  ytdTotalGross: number;
  ytdPeriodRange: string;
  grossSubtext: string;
  deductionSubtext: string;
  bankAccountMasked: string;
  bankName: string;
  history: MySalarySlipItem[];
  chartData: MySalaryChartData;
}

export interface MySalarySlipItem {
  payrollId: number;
  periodId: number;
  year: number;
  month: number;
  periodMonthName: string;
  totalGrossIncome: number;
  totalDeductions: number;
  netPayableSalary: number;
  paymentDate?: string | null;
  paymentDateThai: string;
  status: string;
}

export interface MySalaryChartData {
  baseSalaryAmount: number;
  overtimeAmount: number;
  allowanceAmount: number;
  bonusAmount: number;
  deductionsAmount: number;
  monthlyTrends: MonthlySalaryTrend[];
}

export interface MonthlySalaryTrend {
  monthLabel: string;
  grossIncome: number;
  deductions: number;
  netPay: number;
}

export interface MySalaryDetail {
  payrollId: number;
  periodId: number;
  periodMonthName: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  bankName: string;
  bankAccountMasked: string;
  paymentDateThai: string;
  totalGrossIncome: number;
  totalDeductions: number;
  netPayableSalary: number;
  earnings: MySalaryLineItem[];
  deductions: MySalaryLineItem[];
}

export interface MySalaryLineItem {
  itemName: string;
  itemType: 'EARNING' | 'DEDUCTION';
  amount: number;
  subDescription?: string | null;
}
