'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/authService';
import { LoginRequest, UserProfile } from '@/types/auth';
import { isPathAccessible } from '@/lib/routePermissions';
import { hrmsSwal } from '@/lib/sweetalert';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  getDataScope: (permission: string) => string;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const isAlertingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);

  /**
   * ตรวจสอบว่าหน้าที่เปิดอยู่ยังคงมีสิทธิ์เข้าถึงหรือไม่
   * หากไม่มีสิทธิ์ จะแจ้งเตือนผู้ใช้งานและนำทางกลับไปยังหน้าหลัก
   */
  const checkRoutePermission = useCallback((freshUser: UserProfile | null, isRevoked: boolean = false) => {
    if (typeof window === 'undefined' || !freshUser) return;
    const currentPath = window.location.pathname;
    if (currentPath === '/login' || currentPath === '/') return;

    const access = isPathAccessible(currentPath, freshUser);
    if (!access.allowed && !isAlertingRef.current) {
      isAlertingRef.current = true;
      const pageTitle = access.rule?.title || currentPath;
      hrmsSwal.fire({
        icon: 'warning',
        title: isRevoked ? 'สิทธิ์การเข้าถึงถูกเปลี่ยนแปลง' : 'ไม่มีสิทธิ์เข้าถึงหน้านี้',
        text: isRevoked
          ? `ผู้ดูแลระบบได้ปรับปรุงสิทธิ์การใช้งานของคุณ ทำให้ไม่สามารถเข้าถึงหน้า "${pageTitle}" ได้อีกต่อไป ระบบกำลังนำคุณกลับสู่หน้าหลัก`
          : `คุณไม่มีสิทธิ์เข้าถึงหน้า "${pageTitle}" ระบบกำลังนำคุณกลับสู่หน้าหลัก`,
        confirmButtonText: 'ตกลง',
      }).then(() => {
        isAlertingRef.current = false;
        // หากผู้ใช้นำทางไปหน้าอื่นที่มีสิทธิ์แล้ว (เช่น คลิก sidebar) ไม่ต้อง redirect กลับหน้าหลัก
        const latestPath = window.location.pathname;
        const latestAccess = isPathAccessible(latestPath, freshUser);
        if (!latestAccess.allowed) {
          router.push('/');
        }
      });
    }
  }, [router]);

  /**
   * ดึงโปรไฟล์และสิทธิ์สดใหม่จากเซิร์ฟเวอร์ พร้อมอัปเดต Token และ State
   */
  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('hrms_token') : null;
    if (!savedToken) return null;

    try {
      lastSyncTimeRef.current = Date.now();
      const freshProfile = await authService.getMe();
      setUser(freshProfile);
      localStorage.setItem('hrms_user', JSON.stringify(freshProfile));
      return freshProfile;
    } catch {
      return null;
    }
  }, []);

  // Initial Auth Check
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('hrms_token');
        const savedUser = localStorage.getItem('hrms_user');

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          // ดึงโปรไฟล์ล่าสุดจากเซิร์ฟเวอร์เพื่ออัปเดตสิทธิ์
          try {
            const freshProfile = await authService.getMe();
            setUser(freshProfile);
            localStorage.setItem('hrms_user', JSON.stringify(freshProfile));
            checkRoutePermission(freshProfile, false);
          } catch {
            // หากดึงไม่สำเร็จหรือ token หมดอายุจะถูกเคลียร์ใน interceptor
          }
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [checkRoutePermission]);

  // 1. Sync เมื่อผู้ใช้สลับหน้าจอ/แท็บกลับมา (Window Focus & Visibility Change)
  useEffect(() => {
    const handleFocus = () => {
      // Throttle: อย่างน้อย 15 วินาทีต่อครั้งเพื่อไม่ให้ยิง Server ถี่เกินไป
      if (Date.now() - lastSyncTimeRef.current > 15000) {
        refreshProfile();
      }
    };

    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshProfile]);

  // 2. ดักจับ Event เมื่อ API คืนค่า 403 Forbidden (สิทธิ์ถูกถอนกลางคัน)
  useEffect(() => {
    const handleForbidden = async () => {
      const fresh = await refreshProfile();
      if (fresh) {
        checkRoutePermission(fresh, true);
      }
    };

    window.addEventListener('hrms:permission-revoked', handleForbidden);
    return () => {
      window.removeEventListener('hrms:permission-revoked', handleForbidden);
    };
  }, [refreshProfile, checkRoutePermission]);

  // 3. Heartbeat ตรวจสอบสิทธิ์เป็นระยะในเบื้องหลังทุกๆ 60 วินาที
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && localStorage.getItem('hrms_token')) {
        refreshProfile();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshProfile]);

  // 4. ตรวจสอบสิทธิ์การเข้าถึง Route ทุกครั้งที่มีการเปลี่ยนหน้า
  useEffect(() => {
    // หากมีการเปลี่ยนหน้า และมี Dialog สิทธิ์ค้างอยู่ ให้ปิด Dialog ทันที เพื่อไม่ให้ค้างข้ามหน้า
    if (hrmsSwal.isVisible()) {
      isAlertingRef.current = false;
      hrmsSwal.close();
    }

    if (!isLoading && user && pathname) {
      checkRoutePermission(user, false);
    }
  }, [pathname, user, isLoading, checkRoutePermission]);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('hrms_token', response.token);
      localStorage.setItem('hrms_user', JSON.stringify(response.user));
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('hrms_token');
    localStorage.removeItem('hrms_user');
    router.push('/login');
  };

  const hasRole = (role: string) => {
    if (!user) return false;
    return user.roles?.some((r) => r.toUpperCase() === role.toUpperCase()) ?? false;
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    return user.permissions?.includes(permission) ?? false;
  };

  const getDataScope = (permission: string) => {
    if (!user) return 'SELF';
    if (user.roles?.includes('ADMIN') || user.roles?.includes('SYSTEM_SUPER')) return 'ORGANIZATION';
    const scope = user.dataScopes?.find((s) => s.permissionCode === permission);
    return scope ? scope.dataVisibilityScope : 'SELF';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission,
        getDataScope,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
