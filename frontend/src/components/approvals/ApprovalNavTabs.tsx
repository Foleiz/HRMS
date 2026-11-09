'use client';

import React from 'react';

export const APPROVAL_TABS = [
  { title: 'เอกสารรอดำเนินการ', href: '/approvals/leave-requests' },
  { title: 'ประวัติเอกสาร', href: '/approvals/history' },
];

interface ApprovalNavTabsProps {
  currentSubTitle?: string;
}

/**
 * แถบเมนูย่อยเดิมถูกย้ายไปแสดงเป็น Submenu ที่แถบ Sidebar ด้านซ้ายแทนแล้ว
 */
export const ApprovalNavTabs: React.FC<ApprovalNavTabsProps> = () => {
  return null;
};
