import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5229/api';

/**
 * Axios Instance กลางสำหรับเรียกใช้งาน .NET Backend
 * มีการแนบ Bearer Token และดักจับ Error ให้อัตโนมัติ
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: แนบ JWT Token เมื่อมีการล็อกอิน
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('hrms_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: ดักจับ Error กลาง
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.errors) {
      const errs = error.response.data.errors;
      const details = Object.entries(errs)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('; ');
      errorMessage = details || error.response.data.title || 'ข้อมูลที่ส่งไม่ถูกต้อง (Validation Error)';
    } else if (error.response?.data?.title) {
      errorMessage = error.response.data.title;
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('API Error Details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: errorMessage,
    });

    // จัดการกรณี 401 Unauthorized: เคลียร์ Session และพาไปหน้า Login ทันที
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('hrms_token');
      localStorage.removeItem('hrms_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(new Error(errorMessage));
  }
);
