'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** คีย์ใน localStorage — ต้องตรงกับสคริปต์กันจอกะพริบใน app/layout.tsx */
export const THEME_STORAGE_KEY = 'hrms_theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

/**
 * โหมดสว่าง/มืดของทั้งระบบ — ค่าเริ่มต้นเป็นโหมดสว่างเสมอ (ไม่ตาม OS) และจำค่าที่ผู้ใช้เลือกไว้ในเบราว์เซอร์
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  // อ่านค่าที่สคริปต์ใน <head> ตั้งไว้แล้ว (ป้องกัน hydration mismatch)
  useEffect(() => {
    setThemeState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      // เบราว์เซอร์ไม่ให้ใช้ storage — ใช้ได้แค่รอบนี้
    }
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
