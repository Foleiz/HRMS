'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, Loader2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { ModalShell, Button } from '@/components/ui';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { PayrollPeriod, PayrollScheduleConfig, PayCycleType } from '@/types/payroll';
import { salaryService } from '@/services/salaryService';
import {
  generatePeriodSlotsForConfig,
  GeneratedPeriodSlot,
  PAY_CYCLE_LABELS,
  THAI_MONTH_NAMES,
  calculatePeriodDatesFromSettings,
} from '@/services/payrollScheduleService';

interface CreatePayrollPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPeriods: PayrollPeriod[];
  defaultYear?: number;
  defaultMonth?: number;
  onCreated: (created: PayrollPeriod, createdCount?: number) => Promise<void> | void;
}

export default function CreatePayrollPeriodModal({
  isOpen,
  onClose,
  existingPeriods,
  defaultYear,
  defaultMonth,
  onCreated,
}: CreatePayrollPeriodModalProps) {
  const now = new Date();
  const [year, setYear] = useState<number>(defaultYear ?? now.getFullYear());
  const [month, setMonth] = useState<number>(defaultMonth ?? now.getMonth() + 1);
  const [configs, setConfigs] = useState<PayrollScheduleConfig[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);

  const [selectedCycle, setSelectedCycle] = useState<PayCycleType>('MONTHLY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setYear(defaultYear ?? now.getFullYear());
    setMonth(defaultMonth ?? now.getMonth() + 1);
    setErrorMsg(null);
    setIsLoadingConfigs(true);
    salaryService
      .getPayrollScheduleConfigs()
      .then((data) => {
        setConfigs(data || []);
      })
      .catch(() => {
        setConfigs([]);
      })
      .finally(() => setIsLoadingConfigs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultYear, defaultMonth]);

  const cycleGroups = useMemo(() => {
    const order: PayCycleType[] = ['MONTHLY', 'SEMI_MONTHLY', 'WEEKLY'];
    const map = new Map<
      PayCycleType,
      { cycle: PayCycleType; label: string; memberNames: string[]; config: PayrollScheduleConfig | null }
    >();

    for (const cfg of configs) {
      const c = (cfg.payCycle || 'MONTHLY') as PayCycleType;
      const existing = map.get(c);
      if (existing) {
        existing.memberNames.push(cfg.employeeTypeName);
      } else {
        map.set(c, {
          cycle: c,
          label: PAY_CYCLE_LABELS[c] || c,
          memberNames: [cfg.employeeTypeName],
          config: cfg,
        });
      }
    }

    if (map.size === 0) {
      map.set('MONTHLY', {
        cycle: 'MONTHLY',
        label: PAY_CYCLE_LABELS.MONTHLY,
        memberNames: [],
        config: null,
      });
    }

    return order.filter((c) => map.has(c)).map((c) => map.get(c)!);
  }, [configs]);

  useEffect(() => {
    if (cycleGroups.length > 0 && !cycleGroups.some((g) => g.cycle === selectedCycle)) {
      setSelectedCycle(cycleGroups[0].cycle);
    }
  }, [cycleGroups, selectedCycle]);

  const getSlotsForCycle = (cycle: PayCycleType): GeneratedPeriodSlot[] => {
    const grp = cycleGroups.find((g) => g.cycle === cycle);
    if (grp?.config) {
      return generatePeriodSlotsForConfig(year, month, { ...grp.config, employeeTypeName: undefined });
    }
    const fallback = calculatePeriodDatesFromSettings(year, month);
    return [
      {
        sequence: 1,
        label: 'รายเดือน',
        periodName: fallback.periodName,
        startDate: fallback.startDate,
        endDate: fallback.endDate,
        paymentDate: fallback.paymentDate,
        claimCutoffDate: fallback.claimCutoffDate,
        payCycle: 'MONTHLY',
      },
    ];
  };

  const isSlotTakenForCycle = (cycle: PayCycleType, slot: GeneratedPeriodSlot) => {
    return existingPeriods.some((p) => {
      if ((p.employeeTypeId ?? null) !== null) return false;
      if ((p.payCycle || 'MONTHLY').toUpperCase() !== cycle) return false;
      return p.startDate <= slot.endDate && p.endDate >= slot.startDate;
    });
  };

  const remainingSlots = useMemo(() => {
    const slots = getSlotsForCycle(selectedCycle);
    return slots.filter((s) => !isSlotTakenForCycle(selectedCycle, s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, selectedCycle, cycleGroups, existingPeriods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    if (remainingSlots.length === 0) {
      setErrorMsg('รอบเงินเดือนของกลุ่มนี้ถูกสร้างครบทุกงวดแล้วในเดือนนี้');
      return;
    }

    try {
      setIsSubmitting(true);
      const createdList: PayrollPeriod[] = [];
      for (const slot of remainingSlots) {
        const created = await salaryService.createPayrollPeriod({
          year,
          month,
          employeeTypeId: null,
          payCycle: selectedCycle,
          periodSequence: slot.sequence,
          startDate: slot.startDate,
          endDate: slot.endDate,
          paymentDate: slot.paymentDate || undefined,
          claimCutoffDate: slot.claimCutoffDate || undefined,
        });
        createdList.push(created);
      }

      if (createdList.length > 0) {
        await onCreated(createdList[0], createdList.length);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'ไม่สามารถสร้างรอบเงินเดือนได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const allSlotsTaken = remainingSlots.length === 0;

  return (
    <ModalShell onBackdropClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        <ModalHeader
          title={`สร้างรอบเงินเดือน — ${THAI_MONTH_NAMES[month - 1]} ${year + 543}`}
          subtitle="ระบบจัดกลุ่มประเภทสัญญาที่มีความถี่รอบจ่ายเหมือนกันให้อยู่ในรอบเดียวกันอัตโนมัติ"
          icon={Calendar}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* เลือกกลุ่มรอบการจ่าย */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              เลือกกลุ่มรอบการจ่าย
            </label>
            {isLoadingConfigs ? (
              <div className="py-3 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลดกลุ่มรอบการจ่าย...
              </div>
            ) : (
              <div className="space-y-2.5">
                {cycleGroups.map((grp) => {
                  const active = selectedCycle === grp.cycle;
                  const grpSlots = getSlotsForCycle(grp.cycle);
                  const grpRemaining = grpSlots.filter((s) => !isSlotTakenForCycle(grp.cycle, s));
                  const grpDone = grpRemaining.length === 0;
                  return (
                    <button
                      key={grp.cycle}
                      type="button"
                      onClick={() => {
                        setSelectedCycle(grp.cycle);
                        setErrorMsg(null);
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        active
                          ? 'border-primary bg-primary/5 dark:bg-primary/20'
                          : grpDone
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 opacity-75 hover:opacity-100'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          รอบ{grp.label}
                        </span>
                        {grpDone ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            สร้างครบแล้ว
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                            {grpSlots.length} งวด/เดือน
                          </span>
                        )}
                      </div>
                      {grp.memberNames.length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          รวมสัญญา: {grp.memberNames.join(', ')}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || allSlotsTaken}
              icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            >
              {isSubmitting
                ? 'กำลังสร้างรอบ...'
                : allSlotsTaken
                ? 'สร้างครบทุกงวดแล้ว'
                : remainingSlots.length > 1
                ? `สร้างรอบเงินเดือน (${remainingSlots.length} งวด)`
                : 'สร้างรอบเงินเดือน'}
            </Button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
