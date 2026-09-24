'use client';

import React from 'react';
import { DashboardRole } from '../DashboardHeader';

interface ManagerStatCardsProps {
  role: DashboardRole;
}

interface StatConfig {
  title: string;
  value: number | string;
  unit: string;
  bgClass: string;
  borderClass: string;
}

export const ManagerStatCards: React.FC<ManagerStatCardsProps> = ({ role }) => {
  // กำหนดข้อความและค่าตัวเลขตามแต่ละ Role ให้ตรงกับรูปภาพ 2, 3, 4, 5
  const getCardsConfig = (): StatConfig[] => {
    switch (role) {
      case 'DEPT_MGR':
        return [
          {
            title: 'จำนวนพนักงานในแผนก',
            value: 10,
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'พนักงานในแผนกที่มาวันนี้',
            value: 9,
            unit: 'คน',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'พนักงานที่ลาวันนี้',
            value: 1,
            unit: 'คน',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'เอกสารที่รออนุมัติ',
            value: 4,
            unit: 'วัน',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'เอกสารที่พนักงานยื่นวันนี้',
            value: 10,
            unit: 'เอกสาร',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'เอกสารที่อนุมัติแล้ว',
            value: 8,
            unit: 'วัน',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];

      case 'DIV_MGR':
        return [
          {
            title: 'จำนวนพนักงานในฝ่ายทั้งหมด',
            value: 150,
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'พนักงานในฝ่ายที่มาวันนี้',
            value: 148,
            unit: 'คน',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'พนักงานที่ลาวันนี้',
            value: 10,
            unit: 'คน',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'เอกสารที่รออนุมัติ',
            value: 30,
            unit: 'วัน',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'เอกสารที่พนักงานยื่นวันนี้',
            value: 10,
            unit: 'วัน',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'เอกสารที่อนุมัติแล้ว',
            value: 8,
            unit: 'วัน',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];

      case 'CEO':
        return [
          {
            title: 'จำนวนพนักงานทั้งหมด',
            value: 150,
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'พนักงานที่มาวันนี้',
            value: 148,
            unit: 'คน',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'พนักงานที่ลาวันนี้',
            value: 2,
            unit: 'คน',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'เอกสารที่รออนุมัติ',
            value: 30,
            unit: 'เอกสาร',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'เอกสารที่พนักงานยื่นวันนี้',
            value: 10,
            unit: 'วัน',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'เอกสารที่อนุมัติแล้ว',
            value: 8,
            unit: 'วัน',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];

      case 'ADMIN':
      default:
        return [
          {
            title: 'จำนวนพนักงานทั้งหมด',
            value: 150,
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'พนักงานที่มาวันนี้',
            value: 148,
            unit: 'คน',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'พนักงานที่ลาวันนี้',
            value: 2,
            unit: 'คน',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'เอกสารที่รออนุมัติ',
            value: 30,
            unit: 'วัน',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'เอกสารที่พนักงานยื่นวันนี้',
            value: 10,
            unit: 'วัน',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'เอกสารที่อนุมัติแล้ว',
            value: 8,
            unit: 'วัน',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];
    }
  };

  const cards = getCardsConfig();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`${card.bgClass} border ${card.borderClass} rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]`}
        >
          <span className="text-xs font-bold text-slate-700 leading-tight">
            {card.title}
          </span>
          <div className="flex items-baseline justify-center gap-1.5 my-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {card.value}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              {card.unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
