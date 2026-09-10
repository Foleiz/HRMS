'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { LoginRequest, UserProfile } from '@/types/auth';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  getDataScope: (permission: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

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
  }, []);

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
    if (user.roles.includes('ADMIN')) return true;
    return user.roles.includes(role);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.roles.includes('ADMIN')) return true;
    return user.permissions.includes(permission);
  };

  const getDataScope = (permission: string) => {
    if (!user) return 'SELF';
    if (user.roles.includes('ADMIN')) return 'ORGANIZATION';
    const scope = user.dataScopes.find((s) => s.permissionCode === permission);
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
