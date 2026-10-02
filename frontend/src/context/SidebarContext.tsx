'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  /** Mobile: สถานะเปิด/ปิด sidebar drawer */
  isMobileOpen: boolean;
  /** Mobile: เปิด sidebar drawer */
  openMobileSidebar: () => void;
  /** Mobile: ปิด sidebar drawer */
  closeMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Sync initial state from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hrms_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  // ปิด mobile sidebar อัตโนมัติเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleSetCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem('hrms_sidebar_collapsed', String(collapsed));
    } catch {
      // Ignore
    }
  };

  const toggleSidebar = () => {
    handleSetCollapsed(!isCollapsed);
  };

  const collapseSidebar = () => {
    handleSetCollapsed(true);
  };

  const expandSidebar = () => {
    handleSetCollapsed(false);
  };

  const openMobileSidebar = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed: handleSetCollapsed,
        toggleSidebar,
        collapseSidebar,
        expandSidebar,
        isMobileOpen,
        openMobileSidebar,
        closeMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
