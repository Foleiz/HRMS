'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardRole } from '../DashboardHeader';
import { leaveService } from '@/services/leaveService';
import { contractService } from '@/services/contractService';

interface NotificationsWidgetProps {
  role: DashboardRole;
}

interface NotificationItem {
  count: number;
  label: string;
  href: string;
}

export const NotificationsWidget: React.FC<NotificationsWidgetProps> = ({ role }) => {
  const [pendingLeaveCount, setPendingLeaveCount] = useState<number>(0);
  const [probationExpiringCount, setProbationExpiringCount] = useState<number>(0);
  const [contractExpiringCount, setContractExpiringCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadNotificationCounts = async () => {
      setLoading(true);
      try {
        const [leaveStatsRes, contractStatsRes, contractsRes] = await Promise.allSettled([
          leaveService.getLeaveStats(),
          contractService.getStats(),
          contractService.getAll({ status: 'ACTIVE' }),
        ]);

        // 1. คำขอรออนุมัติ
        if (leaveStatsRes.status === 'fulfilled' && leaveStatsRes.value) {
          if (isMounted) {
            setPendingLeaveCount(leaveStatsRes.value.pendingRequestsCount ?? 0);
          }
        }

        // 2. สิ้นสุดทดลองงานใน 7 วัน
        if (contractStatsRes.status === 'fulfilled' && contractStatsRes.value) {
          if (isMounted) {
            setProbationExpiringCount(contractStatsRes.value.probationExpiring7DaysCount ?? 0);
          }
        }

        // 3. สัญญาจ้างใกล้หมดอายุใน 30 วัน
        if (contractsRes.status === 'fulfilled' && Array.isArray(contractsRes.value)) {
          const now = new Date();
          const in30Days = new Date();
          in30Days.setDate(now.getDate() + 30);

          const expiring = contractsRes.value.filter((c) => {
            if (!c.contractEndDate) return false;
            const end = new Date(c.contractEndDate);
            return end >= now && end <= in30Days;
          });

          if (isMounted) {
            setContractExpiringCount(expiring.length);
          }
        }
      } catch (err) {
        console.error('Failed to load notification stats:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadNotificationCounts();

    return () => {
      isMounted = false;
    };
  }, []);

  const getItems = (): NotificationItem[] => {
    if (role === 'DEPT_MGR') {
      return [
        { count: pendingLeaveCount, label: 'เอกสารรอให้อนุมัติ', href: '/approvals/leave-requests' },
        { count: probationExpiringCount, label: 'สิ้นสุดทดลองงานใน 7 วัน', href: '/employees/contracts' },
        { count: contractExpiringCount, label: 'สัญญาจ้างใกล้หมดอายุ', href: '/employees/contracts' },
      ];
    }
    return [
      { count: contractExpiringCount, label: 'สัญญาจ้างใกล้หมดอายุ', href: '/employees/contracts' },
      { count: probationExpiringCount, label: 'สิ้นสุดทดลองงานใน 7 วัน', href: '/employees/contracts' },
      { count: pendingLeaveCount, label: 'เอกสารรอให้อนุมัติ', href: '/approvals/leave-requests' },
    ];
  };

  const items = getItems();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header: Coral / Rose */}
      <div className="bg-[#FF8080] text-white px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wide">การแจ้งเตือน</h3>
        <span className="text-[11px] font-normal text-white/90">ข้อมูลจริงของระบบ</span>
      </div>

      {/* List of Notification Rows */}
      <div className="divide-y divide-slate-100">
        {items.map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors group"
          >
            <span className="text-lg font-black text-slate-900 w-9 text-center group-hover:text-[#0B2046] transition-colors">
              {loading ? '-' : item.count}
            </span>
            <span className="text-xs font-medium text-slate-700 ml-2 group-hover:text-slate-900 transition-colors">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
