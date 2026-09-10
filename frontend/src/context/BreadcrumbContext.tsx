'use client';

import React, { createContext, useContext, useState } from 'react';

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
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem | null>(null);

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
