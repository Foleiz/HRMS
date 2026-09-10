import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  Company,
  UpdateCompanyRequest,
  Division,
  CreateDivisionRequest,
  UpdateDivisionRequest,
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  Position,
  CreatePositionRequest,
  UpdatePositionRequest,
  EmployeeLevel,
  OrganizationSummary,
} from '@/types/organization';

export const organizationService = {
  // Summary
  async getSummary(): Promise<OrganizationSummary> {
    const res = await apiClient.get<ApiResponse<OrganizationSummary>>('/organization/summary');
    return res.data.data!;
  },

  // Company
  async getCompany(): Promise<Company | null> {
    const res = await apiClient.get<ApiResponse<Company>>('/organization/company');
    return res.data.data;
  },

  async updateCompany(data: UpdateCompanyRequest): Promise<Company> {
    const res = await apiClient.put<ApiResponse<Company>>('/organization/company', data);
    return res.data.data!;
  },

  // Divisions
  async getDivisions(): Promise<Division[]> {
    const res = await apiClient.get<ApiResponse<Division[]>>('/organization/divisions');
    return res.data.data || [];
  },

  async getDivision(id: number): Promise<Division> {
    const res = await apiClient.get<ApiResponse<Division>>(`/organization/divisions/${id}`);
    return res.data.data!;
  },

  async createDivision(data: CreateDivisionRequest): Promise<Division> {
    const res = await apiClient.post<ApiResponse<Division>>('/organization/divisions', data);
    return res.data.data!;
  },

  async updateDivision(id: number, data: UpdateDivisionRequest): Promise<Division> {
    const res = await apiClient.put<ApiResponse<Division>>(`/organization/divisions/${id}`, data);
    return res.data.data!;
  },

  async deleteDivision(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<object>>(`/organization/divisions/${id}`);
  },

  // Departments
  async getDepartments(divisionId?: number): Promise<Department[]> {
    const url = divisionId ? `/organization/departments?divisionId=${divisionId}` : '/organization/departments';
    const res = await apiClient.get<ApiResponse<Department[]>>(url);
    return res.data.data || [];
  },

  async getDepartment(id: number): Promise<Department> {
    const res = await apiClient.get<ApiResponse<Department>>(`/organization/departments/${id}`);
    return res.data.data!;
  },

  async createDepartment(data: CreateDepartmentRequest): Promise<Department> {
    const res = await apiClient.post<ApiResponse<Department>>('/organization/departments', data);
    return res.data.data!;
  },

  async updateDepartment(id: number, data: UpdateDepartmentRequest): Promise<Department> {
    const res = await apiClient.put<ApiResponse<Department>>(`/organization/departments/${id}`, data);
    return res.data.data!;
  },

  async deleteDepartment(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<object>>(`/organization/departments/${id}`);
  },

  // Positions
  async getPositions(departmentId?: number): Promise<Position[]> {
    const url = departmentId ? `/organization/positions?departmentId=${departmentId}` : '/organization/positions';
    const res = await apiClient.get<ApiResponse<Position[]>>(url);
    return res.data.data || [];
  },

  async getPosition(id: number): Promise<Position> {
    const res = await apiClient.get<ApiResponse<Position>>(`/organization/positions/${id}`);
    return res.data.data!;
  },

  async createPosition(data: CreatePositionRequest): Promise<Position> {
    const res = await apiClient.post<ApiResponse<Position>>('/organization/positions', data);
    return res.data.data!;
  },

  async updatePosition(id: number, data: UpdatePositionRequest): Promise<Position> {
    const res = await apiClient.put<ApiResponse<Position>>(`/organization/positions/${id}`, data);
    return res.data.data!;
  },

  async deletePosition(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<object>>(`/organization/positions/${id}`);
  },

  // Employee Levels
  async getLevels(): Promise<EmployeeLevel[]> {
    const res = await apiClient.get<ApiResponse<EmployeeLevel[]>>('/organization/levels');
    return res.data.data || [];
  },
};
