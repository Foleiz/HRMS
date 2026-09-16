import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  SalaryStructure,
  CreateSalaryStructurePayload,
  UpdateSalaryStructurePayload,
  TaxBracket,
  UpdateTaxBracketPayload,
  SocialSecurityRate,
  UpdateSocialSecurityRatePayload,
  EmployeeSalaryOverview,
  EmployeeSalary,
  AdjustEmployeeSalaryPayload,
  PayrollOverview,
  PayrollItem,
  PayrollPeriod,
  PayrollRecord,
  PayrollDetailItem,
} from '@/types/payroll';

export const salaryService = {
  // === 1. โครงสร้างกรอบเงินเดือน (Salary Structures) ===
  async getStructures(positionId?: number, levelId?: number): Promise<SalaryStructure[]> {
    const params: Record<string, any> = {};
    if (positionId) params.positionId = positionId;
    if (levelId) params.levelId = levelId;

    const res = await apiClient.get<ApiResponse<SalaryStructure[]>>('/salary/structures', { params });
    return res.data.data;
  },

  async getStructureById(id: number): Promise<SalaryStructure> {
    const res = await apiClient.get<ApiResponse<SalaryStructure>>(`/salary/structures/${id}`);
    return res.data.data;
  },

  async createStructure(payload: CreateSalaryStructurePayload): Promise<SalaryStructure> {
    const res = await apiClient.post<ApiResponse<SalaryStructure>>('/salary/structures', payload);
    return res.data.data;
  },

  async updateStructure(id: number, payload: UpdateSalaryStructurePayload): Promise<SalaryStructure> {
    const res = await apiClient.put<ApiResponse<SalaryStructure>>(`/salary/structures/${id}`, payload);
    return res.data.data;
  },

  async deleteStructure(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<object>>(`/salary/structures/${id}`);
  },

  // === 2. อัตราภาษีเงินได้บุคคลธรรมดา (Tax Brackets) ===
  async getTaxBrackets(): Promise<TaxBracket[]> {
    const res = await apiClient.get<ApiResponse<TaxBracket[]>>('/salary/tax-brackets');
    return res.data.data;
  },

  async updateTaxBracket(id: number, payload: UpdateTaxBracketPayload): Promise<TaxBracket> {
    const res = await apiClient.put<ApiResponse<TaxBracket>>(`/salary/tax-brackets/${id}`, payload);
    return res.data.data;
  },

  // === 3. อัตราเงินสมทบกองทุนประกันสังคม (Social Security Rates) ===
  async getSocialSecurityRates(): Promise<SocialSecurityRate[]> {
    const res = await apiClient.get<ApiResponse<SocialSecurityRate[]>>('/salary/social-security');
    return res.data.data;
  },

  async updateSocialSecurityRate(id: number, payload: UpdateSocialSecurityRatePayload): Promise<SocialSecurityRate> {
    const res = await apiClient.put<ApiResponse<SocialSecurityRate>>(`/salary/social-security/${id}`, payload);
    return res.data.data;
  },

  // === 4. ข้อมูลและประวัติเงินเดือนพนักงาน (Employee Salaries) ===
  async getEmployeesOverview(search?: string, departmentId?: number): Promise<EmployeeSalaryOverview[]> {
    const params: Record<string, any> = {};
    if (search) params.search = search;
    if (departmentId) params.departmentId = departmentId;

    const res = await apiClient.get<ApiResponse<EmployeeSalaryOverview[]>>('/salary/employees/overview', { params });
    return res.data.data;
  },

  async getEmployeeSalaryHistory(employeeId: number): Promise<EmployeeSalary[]> {
    const res = await apiClient.get<ApiResponse<EmployeeSalary[]>>(`/salary/employees/${employeeId}/history`);
    return res.data.data;
  },

  async adjustEmployeeSalary(employeeId: number, payload: AdjustEmployeeSalaryPayload): Promise<EmployeeSalary> {
    const res = await apiClient.post<ApiResponse<EmployeeSalary>>(`/salary/employees/${employeeId}/adjust`, payload);
    return res.data.data;
  },

  // === 5. ภาพรวมแดชบอร์ด & รายการรายได้/รายหัก ===
  async getOverview(): Promise<PayrollOverview> {
    const res = await apiClient.get<ApiResponse<PayrollOverview>>('/salary/overview');
    return res.data.data;
  },

  async getPayrollItems(itemType?: string): Promise<PayrollItem[]> {
    const params: Record<string, any> = {};
    if (itemType) params.itemType = itemType;

    const res = await apiClient.get<ApiResponse<PayrollItem[]>>('/salary/items', { params });
    return res.data.data;
  },

  async createPayrollItem(payload: Partial<PayrollItem>): Promise<PayrollItem> {
    const res = await apiClient.post<ApiResponse<PayrollItem>>('/salary/items', payload);
    return res.data.data;
  },

  async updatePayrollItem(id: number, payload: Partial<PayrollItem>): Promise<PayrollItem> {
    const res = await apiClient.put<ApiResponse<PayrollItem>>(`/salary/items/${id}`, payload);
    return res.data.data;
  },

  async deletePayrollItem(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<object>>(`/salary/items/${id}`);
  },

  // === 6. ประมวลผลเงินเดือน (Payroll Processing - Tab 4) ===
  async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    const res = await apiClient.get<ApiResponse<PayrollPeriod[]>>('/salary/periods');
    return res.data.data;
  },

  async getPayrollPeriodById(id: number): Promise<PayrollPeriod> {
    const res = await apiClient.get<ApiResponse<PayrollPeriod>>(`/salary/periods/${id}`);
    return res.data.data;
  },

  async getPayrollsByPeriod(periodId: number): Promise<PayrollRecord[]> {
    const res = await apiClient.get<ApiResponse<PayrollRecord[]>>(`/salary/periods/${periodId}/payrolls`);
    return res.data.data;
  },

  async getPayrollDetails(payrollId: number): Promise<PayrollDetailItem[]> {
    const res = await apiClient.get<ApiResponse<PayrollDetailItem[]>>(`/salary/payrolls/${payrollId}/details`);
    return res.data.data;
  },

  async updatePayrollPeriodStatus(periodId: number, status: string): Promise<PayrollPeriod> {
    const res = await apiClient.put<ApiResponse<PayrollPeriod>>(`/salary/periods/${periodId}/status`, { status });
    return res.data.data;
  },

  async calculatePayrollPeriod(periodId: number): Promise<PayrollRecord[]> {
    const res = await apiClient.post<ApiResponse<PayrollRecord[]>>(`/salary/periods/${periodId}/calculate`);
    return res.data.data;
  },

  async createPayrollPeriod(payload: { year: number; month: number; periodName?: string; startDate: string; endDate: string; paymentDate?: string }): Promise<PayrollPeriod> {
    const res = await apiClient.post<ApiResponse<PayrollPeriod>>('/salary/periods', payload);
    return res.data.data;
  },

  // Bank Transfer, Tax/SSO Summary, Bonus
  async getBankTransferSummary(periodId: number, bankCode?: string): Promise<any> {
    const res = await apiClient.get<ApiResponse<any>>(`/salary/periods/${periodId}/bank-transfer`, {
      params: { bankCode },
    });
    return res.data.data;
  },

  async exportBankTransferFile(periodId: number, bankCode: string = '004'): Promise<Blob> {
    const res = await apiClient.get(`/salary/periods/${periodId}/bank-transfer-file`, {
      params: { bankCode },
      responseType: 'blob',
    });
    return res.data;
  },

  async getTaxSsoSummary(periodId: number): Promise<any> {
    const res = await apiClient.get<ApiResponse<any>>(`/salary/periods/${periodId}/tax-sso-summary`);
    return res.data.data;
  },

  async getEmployeeBonuses(year?: number): Promise<any[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/salary/bonuses', {
      params: { year },
    });
    return res.data.data;
  },

  async calculateEmployeeBonuses(payload: { year: number; defaultMultiplier: number }): Promise<any[]> {
    const res = await apiClient.post<ApiResponse<any[]>>('/salary/bonuses/calculate', payload);
    return res.data.data;
  },
};

