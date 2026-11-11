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
  const canCreate = Boolean(isSuper || hasPermission('ANNOUNCEMENTS_CREATE'));
  const canEdit = Boolean(isSuper || hasPermission('ANNOUNCEMENTS_EDIT'));

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Sync tab from URL query params (default is 'general')
  const tabParam = searchParams.get('tab') as TabType;
  const activeTab: TabType = tabParam === 'activities' ? 'activities' : 'general';

  // Breadcrumb synchronization
  useEffect(() => {
    setBreadcrumb({
      section: 'องค์กร',
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

  return (
    <div className="space-y-6 pb-16">
      {/* Content driven by sidebar submenu */}
      {activeTab === 'general' && (
        <GeneralNewsTab
          divisions={divisions}
          departments={departments}
          teams={teams}
          employees={employees}
          canCreate={canCreate}
          canEdit={canEdit}
        />
      )}

      {activeTab === 'activities' && (
        <ActivitiesTab
          divisions={divisions}
          departments={departments}
          teams={teams}
          employees={employees}
          canCreate={canCreate}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
