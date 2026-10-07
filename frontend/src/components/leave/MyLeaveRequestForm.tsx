'use client';

import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Loader2, Paperclip, Sun, Clock3, Phone, Save, FileText } from 'lucide-react';
import { LeaveType, LeavePolicy, LeaveBalance, LeaveRequest, CreateMyLeaveRequestPayload, LeaveDaysCalculation, LeaveValidationResult } from '@/types/leave';
import { leaveService } from '@/services/leaveService';
import { LeaveDateRangePicker } from './LeaveDateRangePicker';
import { LeavePreviewModal, type LeavePreviewData } from '@/components/documents/LeavePreviewModal';
import { CustomSelect } from '@/components/ui/CustomSelect';

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

const formatThaiDate = (d: Date) => d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });

const emptyState = {
  leaveTypeId: '' as number | '',
  startDate: '',
  endDate: '',
  leaveFormat: 'FULL_DAY' as LeaveFormat,
  reason: '',
  contactDuringLeave: '',
  attachment: null as File | null,
};

// แปลง LeaveRequest (แบบร่างที่เคยบันทึกไว้) ให้เป็นค่าตั้งต้นของฟอร์ม สำหรับกรณีกลับมาแก้ไขต่อ
const draftToFormState = (draft: LeaveRequest) => {
  const startDate = draft.startDatetime ? draft.startDatetime.slice(0, 10) : '';
  const endDate = draft.endDatetime ? draft.endDatetime.slice(0, 10) : '';
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
 * แสดงข้อมูลพนักงาน, ประสงค์ขอลา, สถิติโควตาแบบ Real-time และช่องติดต่อระหว่างลา
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
  const projectedTotalDays = usedDaysSoFar + leaveDays;
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

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}

      {/* คอลัมน์ซ้าย/ขวาแยกการ์ด กว้างเท่ากัน และสูงเท่ากัน (grid ยืดทั้งสองฝั่งให้เท่าฝั่งที่สูงกว่า) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* ─── Left column ─────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">ข้อมูลทั่วไป</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">วันที่ยื่น</label>
                <input
                  type="text"
                  readOnly
                  value={formatThaiDate(new Date())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-sm text-gray-600 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">ข้อมูลพนักงาน</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  readOnly
                  value={profile.fullName}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-sm text-gray-600 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">ตำแหน่ง</label>
                <input
                  type="text"
                  readOnly
                  value={profile.positionTitle || '-'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-sm text-gray-600 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">แผนก/สังกัด</label>
                <input
                  type="text"
                  readOnly
                  value={profile.departmentName || '-'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-sm text-gray-600 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm p-6 flex-1 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">ประสงค์ขอลา *</label>
              <CustomSelect
                value={leaveTypeId}
                onChange={(e) => setForm((f) => ({ ...f, leaveTypeId: e.target.value ? Number(e.target.value) : '' }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              >
                <option value="">-- เลือกประเภทการลา --</option>
                {leaveTypes.map((t) => {
                  // ดึงจำนวนสิทธิ์ต่อปีจากยอดวันลาคงเหลือของพนักงานคนนี้ก่อน (ถูกต้องตรงตัวที่สุด)
                  // ถ้ายังไม่มีข้อมูลยอดวันลาของปีนี้ ค่อย fallback ไปที่เกณฑ์สิทธิ์การลา (policy) ทั่วไปของประเภทนั้น
                  const balanceForType = balances.find((b) => b.leaveTypeId === t.id);
                  const policy = leavePolicies.find((p) => p.leaveTypeId === t.id);
                  const quotaDays = balanceForType?.annualQuotaDays ?? policy?.entitlementDays;
                  return (
                    <option key={t.id} value={t.id}>
                      {t.leaveName}
                    </option>
                  );
                })}
              </CustomSelect>
              {leaveTypes.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400 mt-1.5">ไม่พบประเภทการลาที่เปิดใช้งาน (กรุณาเพิ่มในหน้า "ประเภทการลา")</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">เหตุผล</label>
                <span className="text-2xs text-gray-300">{reason.length}/{REASON_MAX_LENGTH}</span>
              </div>
              <textarea
                value={reason}
                maxLength={REASON_MAX_LENGTH}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
                placeholder="ระบุเหตุผลการลา (ถ้ามี)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-x-hidden"
              />
            </div>
          </div>
        </div>

        {/* ─── Right column ─────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm p-6 h-full flex flex-col gap-5">
          {/* flex-wrap แทน grid 50/50 เพราะกล่องปฏิทินมีความกว้างคงที่ (320px) เพื่อให้พอดีกับป็อปอัพปฏิทิน
              ถ้าใช้ grid แบ่งครึ่งจะทำให้ล้นทับตัวเลือก "รูปแบบการลา" เมื่อพื้นที่ไม่พอ — flex-wrap จะดันตัวเลือกไปขึ้นบรรทัดใหม่แทนการซ้อนทับ */}
          <div className="flex flex-wrap items-start gap-3">
            <div className="shrink-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">วันที่ลา *</label>
              {leaveFormat === 'FULL_DAY' ? (
                <LeaveDateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(newStart, newEnd) => setForm((f) => ({ ...f, startDate: newStart, endDate: newEnd }))}
                />
              ) : (
                <LeaveDateRangePicker
                  mode="single"
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(newStart, newEnd) => setForm((f) => ({ ...f, startDate: newStart, endDate: newEnd }))}
                />
              )}
            </div>

            <div className="shrink-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">รูปแบบการลา</label>
              <div className="inline-flex rounded-xl border border-gray-200 dark:border-slate-700 p-1 bg-gray-50 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setLeaveFormat('FULL_DAY')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    leaveFormat === 'FULL_DAY' ? 'bg-[#0B2046] text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> เต็มวัน
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFormat('HALF_DAY')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    leaveFormat === 'HALF_DAY' ? 'bg-[#0B2046] text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  <Clock3 className="w-3.5 h-3.5" /> ครึ่งวัน
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">มีกำหนด (วัน)</label>
            <div className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-sm text-gray-600 dark:text-slate-400">
              {isCalculatingDays
                ? 'กำลังคำนวณ...'
                : leaveDays > 0
                  ? `${leaveDays} วัน${excludedDays > 0 ? ` (ไม่นับวันหยุด ${excludedDays} วัน)` : ''}`
                  : calcKey
                    ? 'ช่วงที่เลือกเป็นวันหยุดทั้งหมด'
                    : 'คำนวณอัตโนมัติ'}
            </div>
            {!isCalculatingDays && currentCalc?.data && currentCalc.data.holidays.length > 0 && (
              <p className="mt-1 text-2xs text-gray-400 dark:text-slate-500 dark:text-slate-400">
                วันหยุดบริษัทในช่วงนี้: {currentCalc.data.holidays.map((h) => h.name).join(', ')}
              </p>
            )}
            <p className="mt-1 text-2xs text-gray-400 dark:text-slate-500 dark:text-slate-400">นับเฉพาะวันทำงานตามวันทำงานประจำสัปดาห์ และไม่นับวันหยุดบริษัท</p>
          </div>

          {/* แสดงตลอด — ยังไม่เลือกประเภทจะแสดงเป็น "-" แทนตัวเลข */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-xs font-semibold text-blue-700 mb-3">
              สถิติโควตาแบบ Real-time
              {hasSelectedType ? ` (${leaveTypes.find((t) => t.id === leaveTypeId)?.leaveName})` : ''}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-slate-900 rounded-lg py-2.5 border border-blue-100/70">
                <div className="text-[11px] text-gray-400 dark:text-slate-500 dark:text-slate-400">ลามาแล้ว</div>
                <div className="text-sm font-bold text-gray-800 dark:text-slate-200">{hasSelectedType ? `${usedDaysSoFar} วัน` : '-'}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg py-2.5 border border-blue-100/70">
                <div className="text-[11px] text-gray-400 dark:text-slate-500 dark:text-slate-400">ลาครั้ง</div>
                <div className="text-sm font-bold text-gray-800 dark:text-slate-200">{hasSelectedType ? `${leaveCountThisYear} ครั้ง` : '-'}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg py-2.5 border border-blue-100/70">
                <div className="text-[11px] text-gray-400 dark:text-slate-500 dark:text-slate-400">รวมเป็น</div>
                <div
                  className={`text-sm font-bold ${
                    !hasSelectedType ? 'text-gray-800 dark:text-slate-200' : withinQuota ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {hasSelectedType ? `${projectedTotalDays} วัน` : '-'}
                </div>
              </div>
            </div>
            {availableDays != null && (
              <p className={`mt-3 text-xs ${withinQuota ? 'text-blue-700' : 'text-red-600 font-medium'}`}>
                ใช้ได้อีก {availableDays} วัน
                {pendingDays > 0 ? ` (หักที่รออนุมัติอยู่ ${pendingDays} วัน)` : ''}
                {!withinQuota ? ' — วันลาคงเหลือไม่เพียงพอ' : ''}
              </p>
            )}
            {!hasSelectedType && (
              <p className="mt-3 text-xs text-blue-700/80">เลือกประเภทการลาเพื่อดูยอดวันลาของคุณ</p>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 dark:text-slate-400" /> ระหว่างลาจะติดต่อข้าพเจ้าได้ที่
              </label>
              <span className="text-2xs text-gray-300">{contactDuringLeave.length}/{CONTACT_MAX_LENGTH}</span>
            </div>
            <textarea
              value={contactDuringLeave}
              maxLength={CONTACT_MAX_LENGTH}
              onChange={(e) => setForm((f) => ({ ...f, contactDuringLeave: e.target.value }))}
              rows={2}
              placeholder="สถานที่/เบอร์ติดต่อระหว่างลา"
              className="w-full flex-1 min-h-[72px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-x-hidden"
            />
          </div>

          {isDocumentRecommended && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">ต้องแนบเอกสารประกอบ</p>
              <p className="text-xs text-amber-700 mb-3">
                ตามเงื่อนไขของการลาประเภทนี้ ต้องแนบเอกสารประกอบ (เช่น ใบรับรองแพทย์) ก่อนยื่นคำขอ
              </p>
              <label className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-xl border border-dashed border-amber-300 bg-white dark:bg-slate-900 text-sm text-gray-500 dark:text-slate-400 cursor-pointer hover:bg-amber-50/50 transition-colors">
                <Paperclip className="w-4 h-4 shrink-0" />
                <span className="truncate">{attachment ? attachment.name : 'เลือกไฟล์...'}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setForm((f) => ({ ...f, attachment: e.target.files?.[0] || null }))}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ─── ผลตรวจเงื่อนไขการลา ─────────────────────── */}
      {currentValidation?.policySummary && (
        <p className="mt-6 text-xs text-gray-500 dark:text-slate-400">
          <span className="font-medium text-gray-600 dark:text-slate-400">เงื่อนไขของการลาประเภทนี้:</span> {currentValidation.policySummary}
        </p>
      )}
      {validationErrors.length > 0 && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 mb-1.5">ยังยื่นคำขอนี้ไม่ได้</p>
          <ul className="list-disc pl-5 space-y-0.5 text-xs text-red-700">
            {validationErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Actions ─────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          disabled={loading || savingDraft}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          ดูตัวอย่างเอกสาร
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={loading || savingDraft}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
        >
          {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          บันทึกแบบร่าง
        </button>
        <button
          type="submit"
          disabled={loading || savingDraft || validationErrors.length > 0}
          className="px-6 py-2.5 text-sm font-medium text-white bg-[#0B2046] hover:bg-[#0B2046]/90 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          ยื่นคำขอลา
        </button>
      </div>

      <LeavePreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} data={showPreview ? previewData : null} />
    </form>
  );
});

MyLeaveRequestForm.displayName = 'MyLeaveRequestForm';
