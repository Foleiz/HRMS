'use client';

import React, { useEffect, useState } from 'react';
import { Hash, Briefcase, Network, UserCheck, BadgeCheck, Mail, Phone, CalendarDays } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { employeeService } from '@/services/employeeService';
import { getAvatarUrl } from '@/lib/api-client';
import type { Employee } from '@/types/employee';

/** ข้อมูลที่แสดงตามประเภทเอกสาร — เลือกเฉพาะเรื่องที่เกี่ยวกับเอกสารนั้น */
export type RequesterSummaryVariant = 'leave' | 'resignation' | 'certificate' | 'general';

interface RequesterSummaryProps {
  /** ประเภทเอกสาร (เลือกข้อมูลที่แสดง) */
  variant?: RequesterSummaryVariant;
  /** ค่าสำรองระหว่างโหลดข้อมูลพนักงาน */
  fullName: string;
  positionTitle?: string | null;
  departmentName?: string | null;
  /** วันที่ยื่น — ไม่ส่ง = วันนี้ */
  date?: Date;
  /** ปุ่มชิดขวาบรรทัดเดียวกัน เช่น "ล้างฟอร์ม" */
  action?: React.ReactNode;
}

const thaiDate = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

/** โหลดข้อมูลพนักงานของผู้ใช้ครั้งเดียวต่อการเปิดหน้า (ใช้ซ้ำทุกฟอร์ม) */
const profileCache = new Map<number, Promise<Employee | null>>();
const loadEmployee = (id: number) => {
  let p = profileCache.get(id);
  if (!p) {
    p = employeeService.getById(id).catch(() => {
      profileCache.delete(id);
      return null;
    });
    profileCache.set(id, p);
  }
  return p;
};

type MetaItem = { key: string; icon: React.ReactNode; text: string; title: string };

/**
 * แถบ "ผู้ยื่น" ของฟอร์มยื่นเอกสาร — รูปโปรไฟล์ ชื่อ และข้อมูลสำคัญคั่นด้วยจุด
 * ข้อมูลที่ระบบรู้อยู่แล้วไม่ทำเป็นช่องกรอก — รายละเอียดเต็มอยู่ในตัวอย่างเอกสาร
 */
export function RequesterSummary({ variant = 'general', fullName, positionTitle, departmentName, date, action }: RequesterSummaryProps) {
  const { user } = useAuth();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (!user?.employeeId) return;
    let alive = true;
    loadEmployee(user.employeeId).then((e) => alive && setEmp(e));
    return () => {
      alive = false;
    };
  }, [user?.employeeId]);

  const name = emp?.fullName || fullName || '-';
  const position = emp?.positionName || positionTitle || '';
  const department = emp?.departmentName || departmentName || '';
  const avatar = !avatarFailed && emp?.avatarUrl ? getAvatarUrl(emp.avatarUrl) : null;
  const initial = name.replace(/^(นาย|นางสาว|นาง|Mr\.?|Mrs\.?|Ms\.?)\s*/i, '').trim().charAt(0) || '?';
  const iconCls = 'w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500';

  const all: Record<string, MetaItem | null> = {
    code: emp?.employeeCode ? { key: 'code', icon: <Hash className={iconCls} />, text: emp.employeeCode, title: 'รหัสพนักงาน' } : null,
    position: position ? { key: 'position', icon: <Briefcase className={iconCls} />, text: position, title: 'ตำแหน่ง' } : null,
    department: department ? { key: 'department', icon: <Network className={iconCls} />, text: department, title: 'แผนก' } : null,
    type: emp?.employeeType ? { key: 'type', icon: <BadgeCheck className={iconCls} />, text: emp.employeeType, title: 'ประเภทพนักงาน' } : null,
    lead: { key: 'lead', icon: <UserCheck className={iconCls} />, text: emp?.managerName ? `หัวหน้าทีม ${emp.managerName}` : 'ไม่มีหัวหน้าทีม (ส่งฝ่ายบุคคล)', title: 'ผู้อนุมัติขั้นแรก' },
    email: emp?.contact?.organizationEmail || emp?.contact?.personalEmail
      ? { key: 'email', icon: <Mail className={iconCls} />, text: (emp?.contact?.organizationEmail || emp?.contact?.personalEmail)!, title: 'อีเมล' }
      : null,
    phone: emp?.contact?.personalPhone ? { key: 'phone', icon: <Phone className={iconCls} />, text: emp.contact.personalPhone, title: 'เบอร์โทร' } : null,
    date: { key: 'date', icon: <CalendarDays className={iconCls} />, text: `วันที่ยื่น ${thaiDate(date ?? new Date())}`, title: 'วันที่ยื่น' },
  };
  const FIELDS: Record<RequesterSummaryVariant, string[]> = {
    // ใบลา: ใครเป็นผู้อนุมัติ สำคัญที่สุด
    leave: ['code', 'position', 'department', 'lead', 'date'],
    // ใบลาออก / หนังสือรับรอง: สถานะการจ้างเกี่ยวกับเนื้อหาเอกสาร
    resignation: ['code', 'position', 'department', 'type', 'date'],
    certificate: ['code', 'position', 'department', 'type', 'date'],
    // คำร้องทั่วไป: ช่องทางติดต่อกลับ
    general: ['code', 'position', 'department', 'email', 'phone', 'date'],
  };
  const meta = FIELDS[variant].map((k) => all[k]).filter((m): m is MetaItem => !!m);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="relative shrink-0">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              onError={() => setAvatarFailed(true)}
              className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <span
              aria-hidden="true"
              className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 text-primary dark:text-slate-100 text-base font-bold inline-flex items-center justify-center uppercase"
            >
              {initial}
            </span>
          )}
          <span
            title="ทำงานอยู่"
            className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
          />
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{name}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">(ผู้ยื่น)</span>
          </div>
          <ul className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
            {meta.map((m, i) => (
              <li key={m.key} className="inline-flex items-center gap-1.5" title={m.title}>
                {i > 0 && <span aria-hidden="true" className="text-slate-300 dark:text-slate-600 mr-0.5">•</span>}
                {m.icon}
                <span>{m.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default RequesterSummary;
