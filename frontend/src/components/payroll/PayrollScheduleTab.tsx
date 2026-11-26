'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarClock,
  Save,
  CheckCircle2,
  Building2,
  CreditCard,
  Loader2,
  Briefcase,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  PayrollScheduleConfig,
  PayCycleType,
  UpsertPayrollScheduleConfigPayload,
} from '@/types/payroll';
import { salaryService } from '@/services/salaryService';
import {
  generatePeriodSlotsForConfig,
  PAY_CYCLE_LABELS,
  WAGE_TYPE_LABELS,
  THAI_MONTH_NAMES,
} from '@/services/payrollScheduleService';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui';

interface PayrollScheduleTabProps {
  canEdit?: boolean;
}

const formatThaiSlash = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}`;
};

const getCycleBadgeStyle = (cycle: string, isSelected: boolean) => {
  if (isSelected) return 'bg-white/20 text-white border-white/25';
  if (cycle === 'WEEKLY') {
    return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
  }
  if (cycle === 'SEMI_MONTHLY') {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60';
  }
  return 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60';
};

export default function PayrollScheduleTab({ canEdit = true }: PayrollScheduleTabProps) {
  const toast = useToast();
  const [configs, setConfigs] = useState<PayrollScheduleConfig[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PayrollScheduleConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  const loadConfigs = async (preserveTypeId?: number | null) => {
    try {
      setIsLoading(true);
      const data = await salaryService.getPayrollScheduleConfigs();
      setConfigs(data || []);
      if (data && data.length > 0) {
        const targetId = preserveTypeId ?? selectedTypeId ?? data[0].employeeTypeId;
        const found = data.find((c) => c.employeeTypeId === targetId) ?? data[0];
        setSelectedTypeId(found.employeeTypeId);
        setDraft({ ...found });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'ไม่สามารถโหลดการตั้งค่ารอบเงินเดือนได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectType = (cfg: PayrollScheduleConfig) => {
    setSelectedTypeId(cfg.employeeTypeId);
    setDraft({ ...cfg });
    setIsSavedRecently(false);
  };

  const handleSave = async () => {
    if (!draft || !canEdit) return;
    try {
      setIsSaving(true);
      const payload: UpsertPayrollScheduleConfigPayload = {
        payCycle: draft.payCycle,
        startDayType: draft.startDayType,
        startDay: draft.startDay,
        endDayType: draft.endDayType,
        endDay: draft.endDay,
        paymentDay: draft.paymentDay,
        semiMonthlyFirstCutoffDay: draft.semiMonthlyFirstCutoffDay,
        semiMonthlyFirstPayDay: draft.semiMonthlyFirstPayDay,
        semiMonthlySecondPayDay: draft.semiMonthlySecondPayDay,
        weeklyStartDayOfWeek: draft.weeklyStartDayOfWeek,
        weeklyPayOffsetDays: draft.weeklyPayOffsetDays,
        adjustWeekend: draft.adjustWeekend,
        claimCutoffType: draft.claimCutoffType,
        claimCutoffDay: draft.claimCutoffDay,
        defaultPaymentMethod: draft.defaultPaymentMethod,
        note: draft.note ?? null,
      };
      const updated = await salaryService.upsertPayrollScheduleConfig(draft.employeeTypeId, payload);
      setConfigs((prev) => prev.map((c) => (c.employeeTypeId === updated.employeeTypeId ? updated : c)));
      setDraft({ ...updated });
      setIsSavedRecently(true);
      toast.success(`บันทึกการตั้งค่ารอบเงินเดือนสำหรับ "${updated.employeeTypeName}" เรียบร้อยแล้ว`);
      setTimeout(() => setIsSavedRecently(false), 3000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setIsSaving(false);
    }
  };

  const now = new Date();
  const previewYear = now.getFullYear();
  const previewMonth = now.getMonth() + 1;

  const previewSlots = useMemo(() => {
    if (!draft) return [];
    return generatePeriodSlotsForConfig(previewYear, previewMonth, {
      ...draft,
      employeeTypeName: undefined,
    });
  }, [draft, previewYear, previewMonth]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-12 flex items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm font-medium">กำลังโหลดการตั้งค่ารอบเงินเดือน...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-in fade-in duration-200">
      {/* Left Sidebar: Compact List of Contract / Employee Types */}
      <aside className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            ประเภทสัญญาจ้าง
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {configs.length}
          </span>
        </div>

        <div className="p-2.5 space-y-1.5">
          {configs.map((cfg) => {
            const isSelected = cfg.employeeTypeId === selectedTypeId;
            return (
              <button
                key={cfg.employeeTypeId}
                type="button"
                onClick={() => handleSelectType(cfg)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-200/80 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[13px] truncate">{cfg.employeeTypeName}</span>
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCycleBadgeStyle(
                      cfg.payCycle,
                      isSelected
                    )}`}
                  >
                    {cfg.payCycle === 'SEMI_MONTHLY'
                      ? 'รายปักษ์'
                      : PAY_CYCLE_LABELS[cfg.payCycle] || cfg.payCycle}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span
                    className={`text-[11px] ${
                      isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    ฐานค่าจ้าง: {WAGE_TYPE_LABELS[cfg.wageType] || cfg.wageType}
                  </span>
                  {cfg.isConfigured && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                        isSelected ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                        }`}
                      />
                      ตั้งค่าแล้ว
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Main Card: Unified Clean Settings Panel */}
      {draft && (
        <section className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
          {/* Card Header with Save Button */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/30 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {draft.employeeTypeName}
                  </h2>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    ฐานค่าจ้าง: {WAGE_TYPE_LABELS[draft.wageType] || draft.wageType}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  กำหนดความถี่การจ่ายและช่วงวันตัดรอบ — สัญญาที่ตั้งความถี่เดียวกันจะถูกรวมอยู่ในรอบจ่ายเดียวกันอัตโนมัติ
                </p>
              </div>
            </div>

            {canEdit && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="shrink-0 whitespace-nowrap"
                icon={
                  isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isSavedRecently ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )
                }
              >
                {isSaving ? 'กำลังบันทึก...' : isSavedRecently ? 'บันทึกเรียบร้อย' : 'บันทึกการตั้งค่า'}
              </Button>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Section 1: Pay Cycle */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                1. ความถี่รอบการจ่ายเงิน
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    {
                      value: 'MONTHLY' as PayCycleType,
                      title: 'รายเดือน',
                      desc: '1 งวดต่อเดือน (เช่น วันที่ 1 – สิ้นเดือน)',
                    },
                    {
                      value: 'SEMI_MONTHLY' as PayCycleType,
                      title: 'รายปักษ์ (15 วัน)',
                      desc: '2 งวดต่อเดือน (1–15 และ 16–สิ้นเดือน)',
                    },
                    {
                      value: 'WEEKLY' as PayCycleType,
                      title: 'รายสัปดาห์',
                      desc: '4–5 งวดต่อเดือน (ทุก 7 วัน)',
                    },
                  ]
                ).map((opt) => {
                  const active = draft.payCycle === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setDraft({ ...draft, payCycle: opt.value })}
                      className={`text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                        active
                          ? 'border-primary bg-primary/5 dark:bg-primary/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{opt.title}</span>
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            active ? 'border-primary' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Cutoff & Payment Dates */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-700 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                2. ช่วงวันตัดรอบ วันจ่ายเงิน และวิธีจ่าย
              </h3>

              {draft.payCycle === 'MONTHLY' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">วันเริ่มคำนวณ</label>
                    <div className="flex gap-2">
                      <select
                        disabled={!canEdit}
                        value={draft.startDayType}
                        onChange={(e) =>
                          setDraft({ ...draft, startDayType: e.target.value as 'FIRST_DAY' | 'CUSTOM_DAY' })
                        }
                        className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100"
                      >
                        <option value="FIRST_DAY">ทุกวันที่ 1 ของเดือน</option>
                        <option value="CUSTOM_DAY">กำหนดวันที่เอง</option>
                      </select>
                      {draft.startDayType === 'CUSTOM_DAY' && (
                        <input
                          type="number"
                          min={1}
                          max={28}
                          disabled={!canEdit}
                          value={draft.startDay}
                          onChange={(e) => setDraft({ ...draft, startDay: Number(e.target.value) || 1 })}
                          className="w-20 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-center"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">วันสิ้นสุดคำนวณ</label>
                    <div className="flex gap-2">
                      <select
                        disabled={!canEdit}
                        value={draft.endDayType}
                        onChange={(e) =>
                          setDraft({ ...draft, endDayType: e.target.value as 'LAST_DAY' | 'CUSTOM_DAY' })
                        }
                        className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100"
                      >
                        <option value="LAST_DAY">วันสุดท้ายของเดือน (28/30/31)</option>
                        <option value="CUSTOM_DAY">กำหนดวันที่เอง</option>
                      </select>
                      {draft.endDayType === 'CUSTOM_DAY' && (
                        <input
                          type="number"
                          min={1}
                          max={31}
                          disabled={!canEdit}
                          value={draft.endDay}
                          onChange={(e) => setDraft({ ...draft, endDay: Number(e.target.value) || 30 })}
                          className="w-20 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-center"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      วันจ่ายเงินเดือนของทุกเดือน (วันที่ 1–31)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      disabled={!canEdit}
                      value={draft.paymentDay}
                      onChange={(e) => setDraft({ ...draft, paymentDay: Number(e.target.value) || 29 })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      วันตัดรอบเบิกสวัสดิการ
                    </label>
                    <div className="flex gap-2">
                      <select
                        disabled={!canEdit}
                        value={draft.claimCutoffType}
                        onChange={(e) =>
                          setDraft({ ...draft, claimCutoffType: e.target.value as 'SAME_AS_PAYMENT' | 'CUSTOM_DAY' })
                        }
                        className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100"
                      >
                        <option value="CUSTOM_DAY">กำหนดวันที่เอง</option>
                        <option value="SAME_AS_PAYMENT">ตรงกับวันจ่ายเงิน</option>
                      </select>
                      {draft.claimCutoffType === 'CUSTOM_DAY' && (
                        <input
                          type="number"
                          min={1}
                          max={31}
                          disabled={!canEdit}
                          value={draft.claimCutoffDay}
                          onChange={(e) => setDraft({ ...draft, claimCutoffDay: Number(e.target.value) || 25 })}
                          className="w-20 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-center"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {draft.payCycle === 'SEMI_MONTHLY' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      วันตัดรอบงวดที่ 1 (วันที่ 10–20)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={20}
                      disabled={!canEdit}
                      value={draft.semiMonthlyFirstCutoffDay}
                      onChange={(e) =>
                        setDraft({ ...draft, semiMonthlyFirstCutoffDay: Number(e.target.value) || 15 })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    />
                    <p className="text-[11px] text-slate-400">งวด 2 เริ่มวันถัดไปจนถึงสิ้นเดือน</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      วันจ่ายงวดที่ 1 (วันที่)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={25}
                      disabled={!canEdit}
                      value={draft.semiMonthlyFirstPayDay}
                      onChange={(e) =>
                        setDraft({ ...draft, semiMonthlyFirstPayDay: Number(e.target.value) || 15 })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      วันจ่ายงวดที่ 2 (31 = สิ้นเดือน)
                    </label>
                    <input
                      type="number"
                      min={16}
                      max={31}
                      disabled={!canEdit}
                      value={draft.semiMonthlySecondPayDay}
                      onChange={(e) =>
                        setDraft({ ...draft, semiMonthlySecondPayDay: Number(e.target.value) || 31 })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                </div>
              )}

              {draft.payCycle === 'WEEKLY' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      จ่ายเงินหลังสิ้นสุดแต่ละสัปดาห์กี่วัน
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={14}
                      disabled={!canEdit}
                      value={draft.weeklyPayOffsetDays}
                      onChange={(e) =>
                        setDraft({ ...draft, weeklyPayOffsetDays: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    />
                    <p className="text-[11px] text-slate-400">
                      เช่น ใส่ 3 หมายถึงจบสัปดาห์แล้วจ่ายเงินภายในอีก 3 วัน
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Method + Weekend Rule (clean 2-column grid with no text wrap on buttons) */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    วิธีจ่ายเงินเริ่มต้น
                  </label>
                  <div className="inline-flex items-center gap-2 w-full">
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setDraft({ ...draft, defaultPaymentMethod: 'BANK_BATCH' })}
                      className={`flex-1 h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all cursor-pointer ${
                        draft.defaultPaymentMethod === 'BANK_BATCH'
                          ? 'bg-primary text-white border-primary shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>ส่งไฟล์ธนาคาร</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setDraft({ ...draft, defaultPaymentMethod: 'DIRECT_TRANSFER' })}
                      className={`flex-1 h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all cursor-pointer ${
                        draft.defaultPaymentMethod === 'DIRECT_TRANSFER'
                          ? 'bg-primary text-white border-primary shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                      <span>โอนตรง</span>
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer md:mt-5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={draft.adjustWeekend}
                    onChange={(e) => setDraft({ ...draft, adjustWeekend: e.target.checked })}
                    className="rounded border-slate-300 text-primary focus:ring-primary shrink-0"
                  />
                  <span>เลื่อนวันจ่ายเป็นวันศุกร์ก่อนหน้า หากตรงกับวันเสาร์–อาทิตย์</span>
                </label>
              </div>
            </div>

            {/* Section 3: Live Monthly Preview */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  ตัวอย่างงวดประจำเดือน {THAI_MONTH_NAMES[previewMonth - 1]} {previewYear + 543} ({previewSlots.length} งวด)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {previewSlots.map((slot) => (
                  <div
                    key={slot.sequence}
                    className="bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-700 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{slot.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {formatThaiSlash(slot.startDate)} – {formatThaiSlash(slot.endDate)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">วันจ่าย</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatThaiSlash(slot.paymentDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
