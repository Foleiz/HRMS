import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  DocumentTypeItem,
  CreateDocumentTypeRequest,
  UpdateDocumentTypeRequest,
  NationalityItem,
  CreateNationalityRequest,
  UpdateNationalityRequest,
  ReligionItem,
  CreateReligionRequest,
  UpdateReligionRequest,
  MaritalStatusItem,
  CreateMaritalStatusRequest,
  UpdateMaritalStatusRequest,
} from '@/types/master';

export const masterDataService = {
  // Document Types
  async getDocumentTypes(status?: string): Promise<DocumentTypeItem[]> {
    const params = status ? { status } : undefined;
    const res = await apiClient.get<ApiResponse<DocumentTypeItem[]>>('/document-types', { params });
    return res.data.data;
  },

  async getDocumentTypeById(id: number): Promise<DocumentTypeItem> {
    const res = await apiClient.get<ApiResponse<DocumentTypeItem>>(`/document-types/${id}`);
    return res.data.data;
  },

  async createDocumentType(data: CreateDocumentTypeRequest): Promise<DocumentTypeItem> {
    const res = await apiClient.post<ApiResponse<DocumentTypeItem>>('/document-types', data);
    return res.data.data;
  },

  async updateDocumentType(id: number, data: UpdateDocumentTypeRequest): Promise<DocumentTypeItem> {
    const res = await apiClient.put<ApiResponse<DocumentTypeItem>>(`/document-types/${id}`, data);
    return res.data.data;
  },

  async deleteDocumentType(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/document-types/${id}`);
  },

  // Nationalities
  async getNationalities(): Promise<NationalityItem[]> {
    const res = await apiClient.get<ApiResponse<NationalityItem[]>>('/lookups/nationalities');
    return res.data.data;
  },

  async createNationality(data: CreateNationalityRequest): Promise<NationalityItem> {
    const res = await apiClient.post<ApiResponse<NationalityItem>>('/lookups/nationalities', data);
    return res.data.data;
  },

  async updateNationality(id: number, data: UpdateNationalityRequest): Promise<NationalityItem> {
    const res = await apiClient.put<ApiResponse<NationalityItem>>(`/lookups/nationalities/${id}`, data);
    return res.data.data;
  },

  async deleteNationality(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/lookups/nationalities/${id}`);
  },

  // Religions
  async getReligions(): Promise<ReligionItem[]> {
    const res = await apiClient.get<ApiResponse<ReligionItem[]>>('/lookups/religions');
    return res.data.data;
  },

  async createReligion(data: CreateReligionRequest): Promise<ReligionItem> {
    const res = await apiClient.post<ApiResponse<ReligionItem>>('/lookups/religions', data);
    return res.data.data;
  },

  async updateReligion(id: number, data: UpdateReligionRequest): Promise<ReligionItem> {
    const res = await apiClient.put<ApiResponse<ReligionItem>>(`/lookups/religions/${id}`, data);
    return res.data.data;
  },

  async deleteReligion(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/lookups/religions/${id}`);
  },

  // Marital Statuses
  async getMaritalStatuses(): Promise<MaritalStatusItem[]> {
    const res = await apiClient.get<ApiResponse<MaritalStatusItem[]>>('/lookups/marital-statuses');
    return res.data.data;
  },

  async createMaritalStatus(data: CreateMaritalStatusRequest): Promise<MaritalStatusItem> {
    const res = await apiClient.post<ApiResponse<MaritalStatusItem>>('/lookups/marital-statuses', data);
    return res.data.data;
  },

  async updateMaritalStatus(id: number, data: UpdateMaritalStatusRequest): Promise<MaritalStatusItem> {
    const res = await apiClient.put<ApiResponse<MaritalStatusItem>>(`/lookups/marital-statuses/${id}`, data);
    return res.data.data;
  },

  async deleteMaritalStatus(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/lookups/marital-statuses/${id}`);
  },
};
