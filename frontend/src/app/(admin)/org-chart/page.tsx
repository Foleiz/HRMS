'use client';

import React, { useEffect } from 'react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import OrgChartView from '@/components/organization/OrgChartView';

/** แผนผังองค์กร — พนักงานทุกคนดูได้ */
export default function OrgChartPage() {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb({ section: 'ภาพรวม', page: 'แผนผังองค์กร' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  return (
    <div className="h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] flex flex-col min-h-[500px]">
      <OrgChartView fullHeight />
    </div>
  );
}
