'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import OrgChartView from '@/components/organization/OrgChartView';

/** แผนผังองค์กร — พนักงานทุกคนดูได้ */
export default function OrgChartPage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { hasPermission, hasRole } = useAuth();
  const canEditStructure = hasPermission('ORG_STRUCT_VIEW') || hasPermission('ORG_VIEW') || hasRole('ADMIN');

  useEffect(() => {
    setBreadcrumb({ section: 'ภาพรวม', page: 'แผนผังองค์กร' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  return (
    <div className="pb-12">
      <OrgChartView onEditStructure={canEditStructure ? () => router.push('/organization?tab=divisions') : undefined} />
    </div>
  );
}
