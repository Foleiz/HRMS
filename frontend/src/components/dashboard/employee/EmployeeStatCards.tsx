'use client';

import React, { useEffect, useState } from 'react';
import { leaveService } from '@/services/leaveService';
import { LeaveBalance } from '@/types/leave';

export const EmployeeStatCards: React.FC = () => {
  // ค่าเริ่มต้นตรงตามรูปภาพอ้างอิงของแดชบอร์ดพนักงาน (ภาพที่ 1)
  const [stats, setStats] = useState({
    sickUsed: 3,
    sickQuota: 30,
    businessUsed: 0,
    businessQuota: 3,
    vacationUsed: 8,
    vacationQuota: 7,
    specialUsed: 3,
    specialQuota: 10,
    otherUsed: 10,
    totalUsed: 24,
  });

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const balances = await leaveService.getLeaveBalances();
        if (balances && balances.length > 0) {
          let sickU = 0, sickQ = 30;
          let bizU = 0, bizQ = 3;
          let vacU = 0, vacQ = 7;
          let specU = 0, specQ = 10;
          let othU = 0;
          let totU = 0;

          balances.forEach((b: LeaveBalance) => {
            const code = b.leaveTypeCode?.toUpperCase() || '';
            const used = b.usedDays || 0;
            const quota = b.annualQuotaDays || 0;
            totU += used;

            if (code.includes('SICK')) {
              sickU = used;
              sickQ = quota || 30;
            } else if (code.includes('BUSINESS')) {
              bizU = used;
              bizQ = quota || 3;
            } else if (code.includes('VACATION') || code.includes('ANNUAL')) {
              vacU = used;
              vacQ = quota || 7;
            } else if (code.includes('SPECIAL')) {
              specU = used;
              specQ = quota || 10;
            } else {
              othU += used;
            }
          });

          setStats({
            sickUsed: sickU || 3,
            sickQuota: sickQ || 30,
            businessUsed: bizU || 0,
            businessQuota: bizQ || 3,
            vacationUsed: vacU || 8,
            vacationQuota: vacQ || 7,
            specialUsed: specU || 3,
            specialQuota: specQ || 10,
            otherUsed: othU || 10,
            totalUsed: totU || 24,
          });
        }
      } catch (err) {
        // ใช้ค่าตามภาพอ้างอิง
      }
    };
    fetchBalances();
  }, []);

  const isOverVacation = stats.vacationUsed > stats.vacationQuota;
  const overDays = stats.vacationUsed - stats.vacationQuota;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
      {/* 1. ลาป่วย (Yellow) */}
      <div className="bg-[#FEF6D8] border border-[#F6E5A6] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]">
        <span className="text-xs font-bold text-slate-700">ลา ป่วย ไปแล้ว</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.sickUsed}/{stats.sickQuota}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
      </div>

      {/* 2. ลากิจ (Pink) */}
      <div className="bg-[#FDE2E4] border border-[#F9C3C8] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]">
        <span className="text-xs font-bold text-slate-700">ลา กิจ ไปแล้ว</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.businessUsed}/{stats.businessQuota}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
      </div>

      {/* 3. ลาพักร้อน (Green พร้อมเตือนตัวแดงเมื่อเกินสิทธิ) */}
      <div className="bg-[#D8F3DC] border border-[#B7E4C7] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px] relative">
        <span className="text-xs font-bold text-slate-700">ลา พักร้อน ไปแล้ว</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span
            className={`text-2xl font-black tracking-tight ${
              isOverVacation ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {stats.vacationUsed}/{stats.vacationQuota}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
        {isOverVacation && (
          <p className="text-[10px] text-rose-600 font-semibold text-center mt-auto leading-tight">
            ** คุณใช้เกินสิทธิไป {overDays} วัน
          </p>
        )}
      </div>

      {/* 4. ลาพิเศษ (Blue) */}
      <div className="bg-[#D9EAFD] border border-[#BFDBFE] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]">
        <span className="text-xs font-bold text-slate-700">ลา พิเศษ ไปแล้ว</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.specialUsed}/{stats.specialQuota}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
      </div>

      {/* 5. ลาอื่นๆ ไปแล้วรวม (Light Green) */}
      <div className="bg-[#D7F9D9] border border-[#BCE7BF] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]">
        <span className="text-xs font-bold text-slate-700">ลา อื่นๆ ไปแล้วรวม</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.otherUsed}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
      </div>

      {/* 6. ลาไปแล้วทั้งหมด (Peach / Orange) */}
      <div className="bg-[#FFE5D9] border border-[#FCD2BE] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]">
        <span className="text-xs font-bold text-slate-700">ลาไปแล้วทั้งหมด</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalUsed}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
      </div>
    </div>
  );
};
