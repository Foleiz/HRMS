import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  AttendanceImportBatch,
  AttendanceImportResult,
  AttendanceImportFilterQuery,
  PagedImportBatchResult,
  PagedImportErrorResult,
} from '@/types/attendanceImport';

export const attendanceImportService = {
  /**
   * อัปโหลดไฟล์บันทึกเวลา (.xlsx, .xls, .csv)
   */
  async uploadFile(
    file: File,
    source?: string,
    deviceName?: string,
    allowDuplicate: boolean = false,
    onProgress?: (progressPercent: number) => void
  ): Promise<ApiResponse<AttendanceImportResult>> {
    const formData = new FormData();
    formData.append('file', file);
    if (source) formData.append('source', source);
    if (deviceName) formData.append('deviceName', deviceName);
    formData.append('allowDuplicate', String(allowDuplicate));

    const res = await apiClient.post<ApiResponse<AttendanceImportResult>>(
      '/attendance/import/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      }
    );
    return res.data;
  },

  /**
   * ดึงประวัติการนำเข้าไฟล์ย้อนหลัง (Batch History)
   */
  async getBatches(filter: AttendanceImportFilterQuery = {}): Promise<PagedImportBatchResult> {
    const params: Record<string, string | number> = {};
    if (filter.source && filter.source !== 'ALL') params.source = filter.source;
    if (filter.status && filter.status !== 'ALL') params.status = filter.status;
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.search) params.search = filter.search;
    if (filter.page) params.page = filter.page;
    if (filter.pageSize) params.pageSize = filter.pageSize;

    const res = await apiClient.get<ApiResponse<PagedImportBatchResult>>('/attendance/import/batches', { params });
    return res.data.data || { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 };
  },

  /**
   * ดึงรายละเอียดของ Batch ตาม ID
   */
  async getBatchById(id: number): Promise<AttendanceImportBatch | null> {
    const res = await apiClient.get<ApiResponse<AttendanceImportBatch>>(`/attendance/import/batches/${id}`);
    return res.data.data || null;
  },

  /**
   * ดึงรายการ Error Logs ของ Batch
   */
  async getBatchErrors(id: number, page: number = 1, pageSize: number = 50): Promise<PagedImportErrorResult> {
    const res = await apiClient.get<ApiResponse<PagedImportErrorResult>>(`/attendance/import/batches/${id}/errors`, {
      params: { page, pageSize },
    });
    return res.data.data || { items: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0 };
  },

  /**
   * ดาวน์โหลดไฟล์แม่แบบตัวอย่าง (Template)
   */
  async downloadTemplate(format: string = 'xlsx'): Promise<void> {
    const res = await apiClient.get('/attendance/import/template', {
      params: { format },
      responseType: 'blob',
    });

    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_import_template.${format}`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  },
};
