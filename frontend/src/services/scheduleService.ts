import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  WorkSchedule,
  CreateWorkScheduleRequest,
  UpdateWorkScheduleRequest,
  EmployeeShift,
  AssignEmployeeShiftRequest,
  BatchAssignEmployeeShiftRequest,
  BatchAssignResult,
  UpdateEmployeeShiftRequest,
  MonthlyRosterResponse,
  AssignableEmployee,
} from '@/types/schedule';

export const scheduleService = {
  // Master Work Schedules
  async getWorkSchedules(status?: string): Promise<WorkSchedule[]> {
    const params = status && status !== 'ALL' ? { status } : {};
    const res = await apiClient.get<ApiResponse<WorkSchedule[]>>('/workschedules', { params });
    return res.data.data || [];
  },

  async getWorkSchedule(id: number): Promise<WorkSchedule> {
    const res = await apiClient.get<ApiResponse<WorkSchedule>>(`/workschedules/${id}`);
    return res.data.data!;
  },

  async createWorkSchedule(data: CreateWorkScheduleRequest): Promise<WorkSchedule> {
    const res = await apiClient.post<ApiResponse<WorkSchedule>>('/workschedules', data);
    return res.data.data!;
  },

  async updateWorkSchedule(id: number, data: UpdateWorkScheduleRequest): Promise<WorkSchedule> {
    const res = await apiClient.put<ApiResponse<WorkSchedule>>(`/workschedules/${id}`, data);
    return res.data.data!;
  },

  async deleteWorkSchedule(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/workschedules/${id}`);
    return res.data.data || false;
  },
};

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

  async getAssignableEmployees(departmentId?: number): Promise<AssignableEmployee[]> {
    const params = departmentId ? { departmentId } : {};
    const res = await apiClient.get<ApiResponse<AssignableEmployee[]>>('/employeeshifts/employees', { params });
    return res.data.data || [];
  },
};
