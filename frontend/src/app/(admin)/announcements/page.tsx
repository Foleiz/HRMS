'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Megaphone, Sparkles } from 'lucide-react';
import { TabBar, type TabBarItem } from '@/components/ui/TabBar';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { organizationService } from '@/services/organizationService';
import { Department } from '@/types/organization';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();
  const { hasRole, hasPermission } = useAuth();

  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canCreate = Boolean(isSuper || hasPermission('ANNOUNCEMENTS_CREATE'));
  const canEdit = Boolean(isSuper || hasPermission('ANNOUNCEMENTS_EDIT'));

  const [departments, setDepartments] = useState<Department[]>([]);

  // Sync tab from URL query params
  const tabParam = searchParams.get('tab') as TabType;
  const activeTab: TabType = tabParam === 'activities' ? 'activities' : 'general';

  // Breadcrumb synchronization
  useEffect(() => {
    setBreadcrumb({
      section: 'องค์กร',
      page: activeTab === 'activities' ? 'ประกาศกิจกรรม' : 'ประกาศข่าวสารทั่วไป',
    });
  }, [setBreadcrumb, activeTab]);

  // Load departments once for both tabs
  useEffect(() => {
    organizationService.getDepartments().then(setDepartments).catch(console.error);
  }, []);

  const handleTabChange = (key: TabType) => {
    router.push(`/announcements?tab=${key}`);
  };

  const tabItems: TabBarItem<TabType>[] = [
    {
      key: 'general',
      label: 'ประกาศข่าวสารทั่วไป',
      icon: <Megaphone className="w-4 h-4" />,
    },
    {
      key: 'activities',
      label: 'ประกาศกิจกรรม',
      icon: <Sparkles className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* In-page TabBar Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <TabBar
          items={tabItems}
          activeKey={activeTab}
          onChange={handleTabChange}
          memoryKey="announcements-tab"
        />
      </div>

      {/* Tab Panels */}
      {activeTab === 'general' && (
        <GeneralNewsTab
          departments={departments}
          canCreate={canCreate}
          canEdit={canEdit}
        />
      )}

      {activeTab === 'activities' && (
        <ActivitiesTab
          departments={departments}
          canCreate={canCreate}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
