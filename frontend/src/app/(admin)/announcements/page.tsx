'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { organizationService } from '@/services/organizationService';
import { employeeService } from '@/services/employeeService';
import { Division, Department, Team } from '@/types/organization';
import { Employee } from '@/types/employee';
import { GeneralNewsTab } from '@/components/announcements/GeneralNewsTab';
import { ActivitiesTab } from '@/components/announcements/ActivitiesTab';

type TabType = 'general' | 'activities';

export default function AnnouncementsPage() {
  return (
    <Suspense fallback={null}>
      <AnnouncementsPageContent />
    </Suspense>
  );
}

function AnnouncementsPageContent() {
  const searchParams = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();
  const { hasRole, hasPermission } = useAuth();

  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');

  // ตรวจสอบสิทธิ์สำหรับประกาศข่าวสารทั่วไป
  const canViewGeneral = Boolean(
    isSuper ||
    hasPermission('ANNOUNCEMENTS_GENERAL_VIEW') ||
    hasPermission('ANNOUNCEMENTS_VIEW')
  );
  const canCreateGeneral = Boolean(
    isSuper ||
    hasPermission('ANNOUNCEMENTS_GENERAL_CREATE') ||
    hasPermission('ANNOUNCEMENTS_CREATE')
  );
  const canEditGeneral = Boolean(
    isSuper ||
    hasPermission('ANNOUNCEMENTS_GENERAL_EDIT') ||
    hasPermission('ANNOUNCEMENTS_EDIT')
  );

  // ตรวจสอบสิทธิ์สำหรับประกาศกิจกรรม
  const canViewActivity = Boolean(
    isSuper ||
    hasPermission('ANNOUNCEMENTS_ACTIVITY_VIEW') ||
    hasPermission('ANNOUNCEMENTS_VIEW')
  );
  const canCreateActivity = Boolean(
    isSuper ||
    hasPermission('ANNOUNCEMENTS_ACTIVITY_CREATE') ||
    hasPermission('ANNOUNCEMENTS_CREATE')
  );
  const canEditActivity = Boolean(
    isSuper ||
    hasPermission('ANNOUNCEMENTS_ACTIVITY_EDIT') ||
    hasPermission('ANNOUNCEMENTS_EDIT')
  );

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Sync tab from URL query params (fallback ไปแท็บที่ผู้ใช้มีสิทธิ์)
  const tabParam = searchParams.get('tab') as TabType;
  let activeTab: TabType = tabParam === 'activities' ? 'activities' : 'general';

  if (activeTab === 'general' && !canViewGeneral && canViewActivity) {
    activeTab = 'activities';
  } else if (activeTab === 'activities' && !canViewActivity && canViewGeneral) {
    activeTab = 'general';
  }

  // Breadcrumb synchronization
  useEffect(() => {
    setBreadcrumb({
      section: 'จัดการประกาศ',
      page: activeTab === 'activities' ? 'ประกาศกิจกรรม' : 'ประกาศข่าวสารทั่วไป',
    });
  }, [setBreadcrumb, activeTab]);

  // Load organizational structure & employees once for audience targeting
  useEffect(() => {
    Promise.all([
      organizationService.getDivisions().catch(() => []),
      organizationService.getDepartments().catch(() => []),
      organizationService.getTeams().catch(() => []),
      employeeService.getAll().catch(() => []),
    ]).then(([divs, depts, tms, emps]) => {
      setDivisions(divs);
      setDepartments(depts);
      setTeams(tms);
      setEmployees(emps);
    });
  }, []);

  if (!canViewGeneral && !canViewActivity) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center text-slate-500">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <p className="text-xs text-slate-400 mt-1">กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การใช้งานจัดการประกาศ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Content driven by sidebar submenu */}
      {activeTab === 'general' && canViewGeneral && (
        <GeneralNewsTab
          divisions={divisions}
          departments={departments}
          teams={teams}
          employees={employees}
          canCreate={canCreateGeneral}
          canEdit={canEditGeneral}
        />
      )}

      {activeTab === 'activities' && canViewActivity && (
        <ActivitiesTab
          divisions={divisions}
          departments={departments}
          teams={teams}
          employees={employees}
          canCreate={canCreateActivity}
          canEdit={canEditActivity}
        />
      )}
    </div>
  );
}
