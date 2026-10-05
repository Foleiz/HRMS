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
  (response) => {
    // ซิงค์ Token อัตโนมัติเมื่อ Backend ออก Token ชุดใหม่ให้ (สิทธิ์ล่าสุดที่เปลี่ยนใน DB)
    const refreshedToken = response.headers?.['x-refreshed-token'];
    if (refreshedToken && typeof window !== 'undefined') {
      localStorage.setItem('hrms_token', refreshedToken);
    }
    return response;
  },
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

    if (!error.response && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
      errorMessage = 'เซิร์ฟเวอร์ใช้เวลาประมวลผลนานเกินไป (timeout) ข้อมูลอาจถูกบันทึกแล้ว กรุณารีเฟรชหน้าเพื่อตรวจสอบ';
      console.warn('API Timeout:', error.config?.url);
    } else if (!error.response) {
      errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่หรือไม่';
      console.warn('API Connection Refused / Network Error:', error.message);
    } else {
      console.warn('API Error Details:', {
        status: error.response.status,
        data: error.response.data,
        message: errorMessage,
      });
    }

    // จัดการกรณี 401 Unauthorized: เคลียร์ Session และพาไปหน้า Login ทันที
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('hrms_token');
      localStorage.removeItem('hrms_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // จัดการกรณี 403 Forbidden: เมื่อสิทธิ์ถูกถอน หรือพยายามเข้าถึงหน้าที่ไม่มีสิทธิ์
    if (error.response?.status === 403 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hrms:permission-revoked', {
          detail: {
            url: error.config?.url,
            message: errorMessage || 'สิทธิ์การใช้งานของคุณมีการเปลี่ยนแปลงโดยผู้ดูแลระบบ',
          },
        })
      );
    }

    // คืน error เดิมของ axios (ยังมี response/status ให้หน้าเว็บตรวจได้) แต่ตั้งข้อความให้เป็นข้อความที่อ่านเข้าใจได้
    // เพื่อให้ทั้ง err.message และ err.response?.data?.message ได้ข้อความจริงจาก Backend (หลายหน้าใช้แบบหลัง)
    error.message = errorMessage;
    if (error.response) {
      const data = error.response.data;
      if (data && typeof data === 'object' && !(typeof Blob !== 'undefined' && data instanceof Blob)) {
        if (!data.message) data.message = errorMessage;
      } else if (!data || typeof data === 'string') {
        error.response.data = { message: errorMessage };
      }
    }
    return Promise.reject(error);
  }
);

/**
 * แปลง Relative Avatar Path จาก Backend (เช่น /api/employees/1/avatar?v=...) ให้เป็น Full URL
 */
export const getAvatarUrl = (avatarUrl?: string | null): string | null => {
  if (!avatarUrl) return null;
  if (
    avatarUrl.startsWith('http://') ||
    avatarUrl.startsWith('https://') ||
    avatarUrl.startsWith('blob:') ||
    avatarUrl.startsWith('data:')
  ) {
    return avatarUrl;
  }
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5229/api').replace(/\/api\/?$/, '');
  return `${base}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
};

