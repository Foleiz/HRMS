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
};
