'use client';

import React from 'react';

export const ESS_BENEFIT_TABS = [
  {
    title: 'สวัสดิการของฉัน',
    href: '/ess/benefits',
    permission: 'ESS_BENEFIT_VIEW',
  },
  {
    title: 'ประวัติการเบิกจ่ายและใช้สิทธิ์สวัสดิการ',
    href: '/ess/benefits/history',
    permission: 'ESS_BENEFIT_CLAIM_VIEW',
  },
];

/**
 * แถบเมนูย่อยเดิมถูกย้ายไปแสดงเป็น Submenu ที่แถบ Sidebar ด้านซ้ายแทนแล้ว
 */
export const EssBenefitsSubNav: React.FC = () => {
  return null;
};
