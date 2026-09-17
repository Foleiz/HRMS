'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export interface BreadcrumbItem {
  section: string;
  page: string;
}

interface BreadcrumbContextType {
  breadcrumb: BreadcrumbItem | null;
  setBreadcrumb: (item: BreadcrumbItem | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentPathname = usePathname();
  const [breadcrumbState, setBreadcrumbState] = useState<{
    pathname: string;
    item: BreadcrumbItem | null;
  }>({
    pathname: '',
    item: null,
  });

  const setBreadcrumb = React.useCallback(
    (item: BreadcrumbItem | null) => {
      setBreadcrumbState({
        pathname: currentPathname,
        item,
      });
    },
    [currentPathname]
  );

  // Only valid if set on current pathname
  const breadcrumb = breadcrumbState.pathname === currentPathname ? breadcrumbState.item : null;

  return (
    <BreadcrumbContext.Provider value={{ breadcrumb, setBreadcrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
};
