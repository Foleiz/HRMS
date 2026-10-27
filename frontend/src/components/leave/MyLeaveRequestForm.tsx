'use client';

import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Loader2, Paperclip, Sun, Clock3, Phone, Save, FileText } from 'lucide-react';
import { LeaveType, LeavePolicy, LeaveBalance, LeaveRequest, CreateMyLeaveRequestPayload, LeaveDaysCalculation, LeaveValidationResult } from '@/types/leave';
import { leaveService } from '@/services/leaveService';
import { LeaveDateRangePicker } from './LeaveDateRangePicker';
import { LeavePreviewModal, type LeavePreviewData } from '@/components/documents/LeavePreviewModal';
import { RichSelect, type RichSelectOption } from '@/components/ui/RichSelect';
import { RequesterSummary } from '@/components/documents/RequesterSummary';
import { Button } from '@/components/ui';

interface EmployeeProfileSummary {
  fullName: string;
  prefix?: string | null;
  positionTitle?: string | null;
  departmentName?: string | null;
}

interface MyLeaveRequestFormProps {
  leaveTypes: LeaveType[];
  leavePolicies: LeavePolicy[];
  balances: LeaveBalance[];
  requests: LeaveRequest[];
  profile: EmployeeProfileSummary;
  /** รหัสพนักงานผู้ลา ใช้ดึงรูปลายเซ็นและจำลองสายการอนุมัติในตัวอย่างเอกสาร */
  employeeId?: number | null;
  /** ถ้ามาจากหน้า "ประวัติเอกสาร" เพื่อแก้ไขแบบร่างเดิมต่อ จะถูกโหลดข้อมูลมาเติมในฟอร์มให้อัตโนมัติ */
  initialDraft?: LeaveRequest;
  /** ยื่นคำขอลาจริง — draftId ถ้ามีคือกำลังยื่นจากแบบร่างเดิม (จะอัปเดตใบเดิมแทนสร้างใหม่) */
  onSubmit: (payload: CreateMyLeaveRequestPayload, draftId?: number) => Promise<void>;
  /** บันทึกแบบร่าง — คืนค่าใบที่บันทึกกลับมา เพื่อให้ฟอร์มจำ id ไว้ใช้บันทึกซ้ำ/ยื่นจริงในภายหลัง */
  onSaveDraft: (payload: CreateMyLeaveRequestPayload, draftId?: number) => Promise<LeaveRequest>;
}

/** เมธอดที่หน้าแม่ (page) เรียกใช้งานฟอร์มนี้ได้ผ่าน ref เช่น ปุ่ม "ล้างฟอร์ม" ที่ย้ายไปไว้บน header */
export interface MyLeaveRequestFormHandle {
  reset: () => void;
}

type LeaveFormat = 'FULL_DAY' | 'HALF_DAY';

const REASON_MAX_LENGTH = 100;
const CONTACT_MAX_LENGTH = 225;

// แปลงไฟล์ที่แนบให้เป็น Base64 String (ตัด header "data:...;base64," ออก)
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ที่แนบได้'));
    reader.readAsDataURL(file);
  });


const emptyState = {
  leaveTypeId: '' as number | '',
  startDate: '',
  endDate: '',
  leaveFormat: 'FULL_DAY' as LeaveFormat,
  reason: '',
  contactDuringLeave: '',
  attachment: null as File | null,
};

// แปลงวันที่จาก ISO string (ทั้ง UTC และเวลาท้องถิ่น) ให้เป็น 'YYYY-MM-DD' ตามเวลาไทย (UTC+7) เหมือน ToThaiDate ของฝั่ง Backend
const toThaiDateStr = (raw?: string | null): string => {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && !/[Zz]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    return raw.slice(0, 10);
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw.slice(0, 10);
  const thaiTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const y = thaiTime.getUTCFullYear();
  const m = String(thaiTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(thaiTime.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// แปลง LeaveRequest (แบบร่างที่เคยบันทึกไว้) ให้เป็นค่าตั้งต้นของฟอร์ม สำหรับกรณีกลับมาแก้ไขต่อ
const draftToFormState = (draft: LeaveRequest) => {
  const startDate = toThaiDateStr(draft.startDate ?? draft.startDatetime);
  const endDate = toThaiDateStr(draft.endDate ?? draft.endDatetime) || startDate;
  return {
    leaveTypeId: draft.leaveTypeId ?? ('' as number | ''),
    startDate,
    endDate,
    leaveFormat: (draft.leaveDays === 0.5 ? 'HALF_DAY' : 'FULL_DAY') as LeaveFormat,
    reason: draft.reason ?? '',
    contactDuringLeave: draft.contactDuringLeave ?? '',
    attachment: null as File | null,
  };
};

/**
 * [ESS] ฟอร์มยื่นคำขอลาแบบเต็มหน้าจอ (ปรับตามดีไซน์อ้างอิงจาก Figma)
 * ฟอร์มกระชับ: แถบ "ยื่นในนาม" บรรทัดเดียว, ประเภทการลา (dropdown แสดงวันคงเหลือ), วันที่/รูปแบบ, เหตุผล, ช่องไม่บังคับท้ายฟอร์ม
 */
export const MyLeaveRequestForm = React.forwardRef<MyLeaveRequestFormHandle, MyLeaveRequestFormProps>(({
  leaveTypes,
  leavePolicies,
  balances,
  requests,
  profile,
  employeeId,
  initialDraft,
  onSubmit,
  onSaveDraft,
}, ref) => {
  const [form, setForm] = useState(() => (initialDraft ? draftToFormState(initialDraft) : emptyState));
  const [draftId, setDraftId] = useState<number | undefined>(initialDraft?.id);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ล้างแถบข้อผิดพลาดเมื่อผู้ใช้แก้ไขฟอร์ม (เดิมค้างอยู่จนกว่าจะกดส่งอีกครั้ง)
  useEffect(() => {
    setError(null);
  }, [form]);
  const [showPreview, setShowPreview] = useState(false);

  const { leaveTypeId, startDate, endDate, leaveFormat, reason, contactDuringLeave, attachment } = form;

  // รวบรวมวันที่ที่มีการยื่นลาไปแล้ว (สถานะ PENDING หรือ APPROVED และไม่ใช่ใบแบบร่างที่กำลังแก้ไข)
  // เพื่อบล็อคไม่ให้เลือกวันซ้ำในปฏิทิน
  const bookedDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const r of requests) {
      if (r.id === draftId) continue;
      if (r.status !== 'PENDING' && r.status !== 'APPROVED') continue;
      const sStr = toThaiDateStr(r.startDate ?? r.startDatetime);
      const eStr = toThaiDateStr(r.endDate ?? r.endDatetime) || sStr;
      if (!sStr) continue;
      const [sy, sm, sd] = sStr.split('-').map(Number);
      const [ey, em, ed] = (eStr >= sStr ? eStr : sStr).split('-').map(Number);
      if (!sy || !sm || !sd || !ey || !em || !ed) continue;
      const cur = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      let guard = 0;
      while (cur <= end && guard < 366) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        dateSet.add(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
        guard++;
      }
    }
    return Array.from(dateSet);
  }, [requests, draftId]);

  // สลับรูปแบบการลา: "เต็มวัน" ใช้ตัวเลือกช่วงวันที่ (Date range), "ครึ่งวัน" ใช้เลือกวันเดียว (Date picker)
  const setLeaveFormat = (next: LeaveFormat) => {
    setForm((f) => {
      if (next === 'HALF_DAY') {
        // บังคับให้เหลือวันเดียว (ใช้วันที่เริ่มต้นเป็นวันลาครึ่งวัน)
        return { ...f, leaveFormat: next, endDate: f.startDate };
      }
      return { ...f, leaveFormat: next };
    });
  };

  // จำนวนวันลาคำนวณจาก server: นับเฉพาะวันทำงานตามเมนู "วันทำงานประจำสัปดาห์" และไม่นับวันหยุดบริษัท
  // (ค่าเดียวกับที่ระบบใช้ตรวจโควตาและตัดยอดจริง)
  const calcKey = startDate && endDate && endDate >= startDate ? `${startDate}|${endDate}|${leaveFormat}` : '';
  const [dayCalc, setDayCalc] = useState<{ key: string; data: LeaveDaysCalculation | null } | null>(null);

  useEffect(() => {
    if (!calcKey) return;
    let active = true;
    leaveService
      .calculateLeaveDays(startDate, endDate, leaveFormat === 'HALF_DAY')
      .then((data) => active && setDayCalc({ key: calcKey, data }))
      .catch(() => active && setDayCalc({ key: calcKey, data: null }));
    return () => {
      active = false;
    };
  }, [calcKey, startDate, endDate, leaveFormat]);

  const currentCalc = calcKey && dayCalc?.key === calcKey ? dayCalc : null;
  const isCalculatingDays = !!calcKey && !currentCalc;

  const leaveDays = useMemo(() => {
    if (!calcKey) return 0;
    if (currentCalc?.data) return currentCalc.data.leaveDays;
    // สำรองกรณีเรียก server ไม่ได้: นับจันทร์–ศุกร์ (server จะคำนวณซ้ำตอนยื่นจริงเสมอ)
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    let count = 0;
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    }
    if (leaveFormat === 'HALF_DAY') return count > 0 ? 0.5 : 0;
    return count;
  }, [calcKey, currentCalc, startDate, endDate, leaveFormat]);

  const excludedDays = currentCalc?.data ? currentCalc.data.nonWorkingDays + currentCalc.data.holidays.length : 0;

  const leaveHours = leaveDays * 8;

  // ข้อมูลสำหรับตัวอย่างเอกสารใบลา (ใช้ค่าที่กรอกในฟอร์ม ณ ตอนนี้)
  const previewData = useMemo<LeavePreviewData>(() => {
    const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);
    // การลาครั้งสุดท้ายที่ได้รับอนุมัติแล้ว (ไม่นับใบที่กำลังกรอก)
    const lastApproved = requests
      .filter((r) => r.status === 'APPROVED' && r.id !== draftId)
      .sort((a, b) => (b.startDatetime || '').localeCompare(a.startDatetime || ''))[0];
    return {
      employeeId,
      employeeName: profile.fullName,
      employeePrefix: profile.prefix || null,
      positionTitle: profile.positionTitle,
      leaveTypeCode: selectedType?.leaveCode,
      leaveTypeName: selectedType?.leaveName,
      leaveFormCategory: selectedType?.formCategory,
      reason,
      startDate,
      endDate: endDate || startDate,
      leaveDays,
      isHalfDay: leaveFormat === 'HALF_DAY',
      contactDuringLeave,
      lastLeave: lastApproved
        ? {
            leaveTypeCode: lastApproved.leaveTypeCode,
            leaveTypeName: lastApproved.leaveTypeName,
            startDate: lastApproved.startDatetime || lastApproved.startDate,
            endDate: lastApproved.endDatetime || lastApproved.endDate,
            leaveDays: lastApproved.leaveDays ?? lastApproved.totalDays,
          }
        : null,
    };
  }, [leaveTypes, leaveTypeId, requests, draftId, employeeId, profile.fullName, profile.prefix, profile.positionTitle, reason, startDate, endDate, leaveDays, leaveFormat, contactDuringLeave]);

  const applicablePolicy = useMemo(() => {
    if (!leaveTypeId) return null;
    return leavePolicies.find((p) => p.leaveTypeId === leaveTypeId) || null;
  }, [leaveTypeId, leavePolicies]);

  // ตรวจกฎการลาล่วงหน้ากับ server (ผลเดียวกับตอนยื่นจริง): ลาซ้อน, สิทธิ์ตามกลุ่มพนักงาน, ทดลองงาน,
  // อายุงาน, ยื่นล่วงหน้า/ย้อนหลัง, จำนวนครั้ง, เอกสารแนบ
  const validationKey =
    leaveTypeId && calcKey ? `${leaveTypeId}|${calcKey}|${attachment ? 1 : 0}|${draftId ?? ''}` : '';
  const [validation, setValidation] = useState<{ key: string; data: LeaveValidationResult | null } | null>(null);

  useEffect(() => {
    if (!validationKey || !leaveTypeId) return;
    let active = true;
    const timer = setTimeout(() => {
      leaveService
        .validateMyLeaveRequest({
          leaveTypeId: Number(leaveTypeId),
          startDatetime: new Date(`${startDate}T00:00:00`).toISOString(),
          endDatetime: new Date(`${endDate}T23:59:59`).toISOString(),
          leaveDays: leaveFormat === 'HALF_DAY' ? 0.5 : 1,
          hasAttachment: !!attachment,
          draftId,
        })
        .then((data) => active && setValidation({ key: validationKey, data }))
        .catch(() => active && setValidation({ key: validationKey, data: null }));
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [validationKey, leaveTypeId, startDate, endDate, leaveFormat, attachment, draftId]);

  const currentValidation = validationKey && validation?.key === validationKey ? validation.data : null;
  const validationErrors = currentValidation?.errors ?? [];

  const isDocumentRecommended = currentValidation
    ? currentValidation.requiresDocument
    : !!applicablePolicy?.isDocumentRequired &&
      (applicablePolicy.documentRequiredAfterDays == null || leaveDays >= applicablePolicy.documentRequiredAfterDays);

  const selectedBalance = useMemo(
    () => (leaveTypeId ? balances.find((b) => b.leaveTypeId === leaveTypeId) : undefined),
    [leaveTypeId, balances]
  );

  const hasSelectedType = leaveTypeId !== '';
  const usedDaysSoFar = selectedBalance?.usedDays ?? 0;

  const leaveCountThisYear = useMemo(() => {
    if (!leaveTypeId) return 0;
    return requests.filter((r) => r.leaveTypeId === leaveTypeId && r.status !== 'CANCELLED' && r.status !== 'REJECTED').length;
  }, [leaveTypeId, requests]);

  // วันลาที่ "รออนุมัติ" ของใบอื่นในปีเดียวกัน ถูกกันโควตาไว้แล้ว (ระบบตรวจแบบเดียวกันตอนยื่น)
  const pendingDays = useMemo(() => {
    if (!leaveTypeId) return 0;
    const year = startDate ? startDate.slice(0, 4) : String(new Date().getFullYear());
    return requests
      .filter(
        (r) =>
          r.leaveTypeId === leaveTypeId &&
          r.status === 'PENDING' &&
          r.id !== draftId &&
          String(new Date(r.startDatetime).getFullYear()) === year
      )
      .reduce((sum, r) => sum + (r.leaveDays || 0), 0);
  }, [leaveTypeId, requests, draftId, startDate]);

  const availableDays = selectedBalance ? Math.max(0, selectedBalance.netRemainingLeaveDays - pendingDays) : null;
  const withinQuota = availableDays == null ? true : leaveDays <= availableDays;

  const resetForm = () => {
    setForm(emptyState);
    setDraftId(undefined);
    setError(null);
  };

  useImperativeHandle(ref, () => ({
    reset: resetForm,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // แจ้งทุกช่องที่ยังไม่ได้กรอกพร้อมกัน (เดิมแจ้งทีละข้อ)
    const missing: string[] = [];
    if (!leaveTypeId) missing.push('ประสงค์ขอลา');
    if (!startDate || !endDate) missing.push('ช่วงวันที่ลา');
    if (missing.length > 0) {
      setError(`กรุณาระบุ${missing.join(' และ ')}`);
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น');
      return;
    }

    setLoading(true);
    try {
      let attachmentData: string | undefined;
      let attachmentFileName: string | undefined;
      if (attachment) {
        attachmentData = await fileToBase64(attachment);
        attachmentFileName = attachment.name;
      }

      await onSubmit(
        {
          leaveTypeId: Number(leaveTypeId),
          startDatetime: new Date(`${startDate}T00:00:00`).toISOString(),
          endDatetime: new Date(`${endDate}T23:59:59`).toISOString(),
          leaveHours,
          leaveDays,
          reason: reason.trim() || undefined,
          contactDuringLeave: contactDuringLeave.trim() || undefined,
          attachmentData,
          attachmentFileName,
        },
        draftId
      );
      resetForm();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการยื่นคำขอลา');
    } finally {
      setLoading(false);
    }
  };

  // บันทึกแบบร่าง — ต้องเลือกประเภทการลาและวันที่ลาก่อน แต่ไม่บังคับเหตุผล/ช่องติดต่อ และไม่ตรวจสอบโควตา
  const handleSaveDraft = async () => {
    setError(null);

    if (!leaveTypeId) {
      setError('กรุณาเลือกประเภทการลาก่อนบันทึกแบบร่าง');
      return;
    }
    if (!startDate || !endDate) {
      setError('กรุณาระบุวันที่ลาก่อนบันทึกแบบร่าง');
      return;
    }

    setSavingDraft(true);
    try {
      let attachmentData: string | undefined;
      let attachmentFileName: string | undefined;
      if (attachment) {
        attachmentData = await fileToBase64(attachment);
        attachmentFileName = attachment.name;
      }

      const saved = await onSaveDraft(
        {
          leaveTypeId: Number(leaveTypeId),
          startDatetime: new Date(`${startDate}T00:00:00`).toISOString(),
          endDatetime: new Date(`${endDate}T23:59:59`).toISOString(),
          leaveHours,
          leaveDays,
          reason: reason.trim() || undefined,
          contactDuringLeave: contactDuringLeave.trim() || undefined,
          attachmentData,
          attachmentFileName,
        },
        draftId
      );
      setDraftId(saved.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกแบบร่าง');
    } finally {
      setSavingDraft(false);
    }
  };

  // ตัวเลือกประเภทการลา: วันคงเหลือชิดขวา + เงื่อนไขสั้นๆ, สิทธิ์หมดแล้วไปกลุ่มล่าง (เลือกไม่ได้)
  const typeOptions = useMemo<RichSelectOption<number>[]>(() => {
    const year = startDate ? startDate.slice(0, 4) : String(new Date().getFullYear());
    return leaveTypes.map((t) => {
      const bal = balances.find((b) => b.leaveTypeId === t.id);
      const policy = leavePolicies.find((p) => p.leaveTypeId === t.id);
      const pending = requests
        .filter(
          (r) =>
            r.leaveTypeId === t.id &&
            r.status === 'PENDING' &&
            r.id !== draftId &&
            String(new Date(r.startDatetime).getFullYear()) === year
        )
        .reduce((sum, r) => sum + (r.leaveDays || 0), 0);
      const left = bal ? Math.max(0, bal.netRemainingLeaveDays - pending) : null;
      const quota = bal ? bal.annualQuotaDays + (bal.activeCarriedForwardDays || 0) + (bal.adjustedDays || 0) : policy?.entitlementDays;

      const notes: string[] = [];
      if (policy?.advanceRequestDays) notes.push(`ยื่นล่วงหน้า ${policy.advanceRequestDays} วัน`);
      if (policy?.isDocumentRequired) {
        notes.push(policy.documentRequiredAfterDays ? `เกิน ${policy.documentRequiredAfterDays} วันต้องแนบเอกสาร` : 'ต้องแนบเอกสาร');
      }

      // สิทธิ์ 0 วันตั้งแต่ต้น = ไม่มีสิทธิ์ (ต่างจาก "ใช้ครบแล้ว")
      const noEntitlement = !!bal && !quota;
      const exhausted = left !== null && left <= 0;
      const low = left !== null && quota ? left <= Math.max(1, quota * 0.2) : false;
      return {
        value: t.id,
        label: t.leaveName,
        description: notes.join(' · ') || undefined,
        meta: left !== null && !noEntitlement ? `เหลือ ${left}${quota ? `/${quota}` : ''} วัน` : undefined,
        metaTone: exhausted ? 'bad' : low ? 'warn' : 'good',
        disabled: exhausted,
        disabledReason: noEntitlement
          ? 'ไม่มีสิทธิ์การลาประเภทนี้'
          : exhausted
            ? `ใช้ครบแล้ว${pending > 0 ? ` (รออนุมัติ ${pending} วัน)` : ''}`
            : undefined,
      } as RichSelectOption<number>;
    });
  }, [leaveTypes, balances, leavePolicies, requests, draftId, startDate]);

  const daysSummary = (() => {
    if (!calcKey) return null;
    if (isCalculatingDays) return { text: 'กำลังคำนวณจำนวนวัน...', tone: 'text-slate-500 dark:text-slate-400' };
    if (leaveDays <= 0) return { text: 'ช่วงที่เลือกเป็นวันหยุดทั้งหมด', tone: 'text-amber-700 dark:text-amber-400' };
    let text = `รวม ${leaveDays} วันทำการ`;
    if (excludedDays > 0) text += ` (ไม่นับวันหยุด ${excludedDays} วัน)`;
    if (availableDays != null) {
      text += withinQuota ? ` · เหลือหลังลา ${availableDays - leaveDays} วัน` : ` — สิทธิ์เหลือ ${availableDays} วัน ไม่พอ`;
    }
    return { text, tone: withinQuota ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400' };
  })();

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:focus:border-blue-500 outline-none';
  const labelCls = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <RequesterSummary fullName={profile.fullName} positionTitle={profile.positionTitle} departmentName={profile.departmentName} />

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-5 sm:p-7 space-y-6">
        {/* 1 ประเภทการลา — ขึ้นก่อน เพราะเป็นตัวกำหนดโควตาและเงื่อนไข */}
        <div className="max-w-md">
          <label htmlFor="leave-type" className={labelCls}>
            ประเภทการลา <span className="text-rose-600">*</span>
          </label>
          <RichSelect<number>
            id="leave-type"
            value={leaveTypeId}
            onChange={(v) => setForm((f) => ({ ...f, leaveTypeId: v }))}
            options={typeOptions}
            placeholder="เลือกประเภทการลา"
            enabledGroupLabel="ใช้ได้"
            disabledGroupLabel="ใช้ไม่ได้"
            emptyText='ไม่พบประเภทการลาที่เปิดใช้งาน (เพิ่มได้ที่หน้า "ประเภทการลา")'
            aria-describedby="leave-type-help"
          />
          <p id="leave-type-help" className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {!hasSelectedType
              ? 'เลือกแล้วจะเห็นวันคงเหลือและเงื่อนไขของประเภทนั้น'
              : [
                  selectedBalance
                    ? `ใช้ไป ${usedDaysSoFar} วัน · ลาไปแล้ว ${leaveCountThisYear} ครั้งปีนี้${pendingDays > 0 ? ` · รออนุมัติ ${pendingDays} วัน` : ''}`
                    : null,
                  currentValidation?.policySummary || null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'ไม่มีข้อจำกัดจำนวนวัน'}
          </p>
        </div>

        {/* 2 วันที่ลา + รูปแบบ — จำนวนวันเป็นข้อความผลลัพธ์ ไม่ใช่ช่องกรอก */}
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          <div className="shrink-0">
            <span className={labelCls}>
              วันที่ลา <span className="text-rose-600">*</span>
            </span>
            <LeaveDateRangePicker
              key={leaveFormat}
              mode={leaveFormat === 'FULL_DAY' ? 'range' : 'single'}
              startDate={startDate}
              endDate={endDate}
              disabledDates={bookedDates}
              onChange={(newStart, newEnd) => setForm((f) => ({ ...f, startDate: newStart, endDate: newEnd }))}
            />
            {daysSummary ? (
              <p className={`mt-2 text-sm font-semibold ${daysSummary.tone}`} aria-live="polite">{daysSummary.text}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">นับเฉพาะวันทำงาน ไม่นับวันหยุดบริษัท</p>
            )}
            {!isCalculatingDays && currentCalc?.data && currentCalc.data.holidays.length > 0 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                วันหยุดในช่วงนี้: {currentCalc.data.holidays.map((h) => h.name).join(', ')}
              </p>
            )}
          </div>

          <fieldset className="shrink-0">
            <legend className={labelCls}>รูปแบบ</legend>
            <div role="radiogroup" aria-label="รูปแบบการลา" className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900">
              {([
                ['FULL_DAY', 'เต็มวัน', Sun],
                ['HALF_DAY', 'ครึ่งวัน', Clock3],
              ] as const).map(([val, text, Icon]) => (
                <button
                  key={val}
                  type="button"
                  role="radio"
                  aria-checked={leaveFormat === val}
                  onClick={() => setLeaveFormat(val)}
                  className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm transition-all cursor-pointer ${
                    leaveFormat === val
                      ? 'bg-white dark:bg-slate-700 text-[#0B2046] dark:text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 font-medium'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {text}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* 3 เหตุผล */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="leave-reason" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              เหตุผล <span className="font-normal text-slate-500 dark:text-slate-400">(ไม่บังคับ)</span>
            </label>
            <span className="text-xs text-slate-400">{reason.length}/{REASON_MAX_LENGTH}</span>
          </div>
          <textarea
            id="leave-reason"
            value={reason}
            maxLength={REASON_MAX_LENGTH}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            rows={3}
            placeholder="เช่น พาครอบครัวไปต่างจังหวัด"
            className={`${inputCls} resize-none whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}
          />
        </div>

        {/* 4 ไม่บังคับ — ไว้ท้ายฟอร์ม (ไฟล์แนบกลายเป็นบังคับเมื่อเงื่อนไขกำหนด) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="leave-contact" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" /> ติดต่อระหว่างลา{' '}
                <span className="font-normal text-slate-500 dark:text-slate-400">(ไม่บังคับ)</span>
              </label>
              <span className="text-xs text-slate-400">{contactDuringLeave.length}/{CONTACT_MAX_LENGTH}</span>
            </div>
            <input
              id="leave-contact"
              value={contactDuringLeave}
              maxLength={CONTACT_MAX_LENGTH}
              onChange={(e) => setForm((f) => ({ ...f, contactDuringLeave: e.target.value }))}
              placeholder="เบอร์โทร / สถานที่"
              className={inputCls}
            />
          </div>
          <div>
            <span className={`${labelCls} flex items-center gap-1`}>
              ไฟล์แนบ{' '}
              {isDocumentRecommended ? (
                <span className="text-rose-600">*</span>
              ) : (
                <span className="font-normal text-slate-500 dark:text-slate-400">(ไม่บังคับ)</span>
              )}
            </span>
            <label
              className={`flex items-center gap-2 w-full h-11 px-3.5 rounded-xl border border-dashed text-sm cursor-pointer transition-colors ${
                isDocumentRecommended && !attachment
                  ? 'border-amber-400 bg-amber-50/60 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Paperclip className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{attachment ? attachment.name : 'แนบไฟล์ (PDF, JPG, PNG)'}</span>
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setForm((f) => ({ ...f, attachment: e.target.files?.[0] || null }))}
              />
            </label>
            {isDocumentRecommended && (
              <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">การลาประเภทนี้ต้องแนบเอกสารประกอบ (เช่น ใบรับรองแพทย์)</p>
            )}
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1.5">ยังยื่นคำขอนี้ไม่ได้</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs text-red-700 dark:text-red-400">
              {validationErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* แถบปุ่มติดขอบล่าง — ปุ่มหลักอยู่ที่เดิมเสมอ */}
      <div className="sticky bottom-0 z-20 -mx-1 px-1">
        <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
          <Button
            variant="secondary"
            onClick={() => setShowPreview(true)}
            disabled={loading || savingDraft}
            icon={<FileText className="w-3.5 h-3.5" />}
          >
            ดูตัวอย่างใบลา
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={loading || savingDraft}
            loading={savingDraft}
            icon={savingDraft ? undefined : <Save className="w-3.5 h-3.5" />}
          >
            บันทึกแบบร่าง
          </Button>
          <Button type="submit" loading={loading} disabled={loading || savingDraft || validationErrors.length > 0}>
            ยื่นคำขอลา
          </Button>
        </div>
      </div>

      <LeavePreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} data={showPreview ? previewData : null} />
    </form>
  );
});

MyLeaveRequestForm.displayName = 'MyLeaveRequestForm';
