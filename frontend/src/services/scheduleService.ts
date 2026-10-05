import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  EmployeeShift,
  AssignEmployeeShiftRequest,
  BatchAssignEmployeeShiftRequest,
  BatchAssignResult,
  UpdateEmployeeShiftRequest,
  MonthlyRosterResponse,
  AssignableEmployee,
  EmployeeTypeLookup,
} from '@/types/schedule';

export const employeeShiftService = {
  // Employee Shift Assignments
  async getAssignments(params?: {
    departmentId?: number;
    search?: string;
    date?: string;
  }): Promise<EmployeeShift[]> {
    const res = await apiClient.get<ApiResponse<EmployeeShift[]>>('/employeeshifts', { params });
    return res.data.data || [];
  },

  async getAssignmentsByEmployee(employeeId: number): Promise<EmployeeShift[]> {
    const res = await apiClient.get<ApiResponse<EmployeeShift[]>>(`/employeeshifts/employee/${employeeId}`);
    return res.data.data || [];
  },

  async getAssignment(id: number): Promise<EmployeeShift> {
    const res = await apiClient.get<ApiResponse<EmployeeShift>>(`/employeeshifts/${id}`);
    return res.data.data!;
  },

  async assignShift(data: AssignEmployeeShiftRequest): Promise<EmployeeShift> {
    const res = await apiClient.post<ApiResponse<EmployeeShift>>('/employeeshifts', data);
    return res.data.data!;
  },

  async batchAssignShift(data: BatchAssignEmployeeShiftRequest): Promise<BatchAssignResult> {
    const res = await apiClient.post<ApiResponse<BatchAssignResult>>('/employeeshifts/batch', data);
    return res.data.data!;
  },

  async updateAssignment(id: number, data: UpdateEmployeeShiftRequest): Promise<EmployeeShift> {
    const res = await apiClient.put<ApiResponse<EmployeeShift>>(`/employeeshifts/${id}`, data);
    return res.data.data!;
  },

  async deleteAssignment(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/employeeshifts/${id}`);
    return res.data.data || false;
  },

  async getMonthlyRoster(params: {
    year: number;
    month: number;
    departmentId?: number;
    search?: string;
  }): Promise<MonthlyRosterResponse> {
    const res = await apiClient.get<ApiResponse<MonthlyRosterResponse>>('/employeeshifts/roster', { params });
    return res.data.data!;
  },

  async getAssignableEmployees(departmentId?: number, employeeTypeId?: number): Promise<AssignableEmployee[]> {
    const params: Record<string, any> = {};
    if (departmentId) params.departmentId = departmentId;
    if (employeeTypeId) params.employeeTypeId = employeeTypeId;
    const res = await apiClient.get<ApiResponse<AssignableEmployee[]>>('/employeeshifts/employees', { params });
    return res.data.data || [];
  },

  async getEmployeeTypes(): Promise<EmployeeTypeLookup[]> {
    const res = await apiClient.get<ApiResponse<EmployeeTypeLookup[]>>('/employeeshifts/employee-types');
    return res.data.data || [];
  },
};
