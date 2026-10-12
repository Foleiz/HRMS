'use client';

import React, { useEffect } from 'react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import OrgChartView from '@/components/organization/OrgChartView';

/** แผนผังองค์กร — เข้าถึงได้ตามสิทธิ์ ORG_CHART_VIEW */
export default function OrgChartPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const { hasPermission, hasRole } = useAuth();

  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canView = hasPermission('ORG_CHART_VIEW') || hasPermission('ORG_STRUCT_VIEW') || hasPermission('ORG_VIEW') || isSuper;

  useEffect(() => {
    setBreadcrumb({ section: 'ภาพรวม', page: 'แผนผังองค์กร' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  if (!canView) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์เข้าถึงแผนผังองค์กร"
        message="คุณไม่มีสิทธิ์ในการเข้าถึงหรือดูข้อมูลแผนผังองค์กร กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ ORG_CHART_VIEW"
      />
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] flex flex-col min-h-[500px]">
      <OrgChartView fullHeight />
    </div>
  );
}
