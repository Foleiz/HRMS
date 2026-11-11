'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  CalendarClock,
  Check,
} from 'lucide-react';
import { ModalShell, Button } from '@/components/ui';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { ContractSettings } from '@/types/contract';
import { useToast } from '@/context/ToastContext';

interface ContractSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ContractSettings;
  onSave: (newSettings: ContractSettings) => void;
}

export default function ContractSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}: ContractSettingsModalProps) {
  const toast = useToast();
  const [probationDays, setProbationDays] = useState<string>(String(currentSettings.probationDays));
  const [fixedTermDays, setFixedTermDays] = useState<string>(String(currentSettings.fixedTermDays));
  const [probationAlertDays, setProbationAlertDays] = useState<string>(String(currentSettings.probationAlertDays));
  const [contractAlertDays, setContractAlertDays] = useState<string>(String(currentSettings.contractAlertDays));

  useEffect(() => {
    if (isOpen) {
      setProbationDays(String(currentSettings.probationDays));
      setFixedTermDays(String(currentSettings.fixedTermDays));
      setProbationAlertDays(String(currentSettings.probationAlertDays));
      setContractAlertDays(String(currentSettings.contractAlertDays));
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pDays = Number(probationDays);
    const fDays = Number(fixedTermDays);
    const pAlert = Number(probationAlertDays);
    const cAlert = Number(contractAlertDays);

    if (!pDays || pDays < 1 || pDays > 1825) {
      toast.warning('กรุณาระบุระยะเวลาทดลองงานระหว่าง 1 - 1,825 วัน');
      return;
    }
    if (!fDays || fDays < 1 || fDays > 3650) {
      toast.warning('กรุณาระบุระยะเวลาสัญญาจ้างเริ่มต้นระหว่าง 1 - 3,650 วัน');
      return;
    }
    if (!pAlert || pAlert < 1 || pAlert > 365) {
      toast.warning('กรุณาระบุวันแจ้งเตือนทดลองงานล่วงหน้าระหว่าง 1 - 365 วัน');
      return;
    }
    if (!cAlert || cAlert < 1 || cAlert > 365) {
      toast.warning('กรุณาระบุวันแจ้งเตือนสัญญาหมดอายุล่วงหน้าระหว่าง 1 - 365 วัน');
      return;
    }

    onSave({
      probationDays: Math.round(pDays),
      fixedTermDays: Math.round(fDays),
      probationAlertDays: Math.round(pAlert),
      contractAlertDays: Math.round(cAlert),
    });
    onClose();
  };

  return (
    <ModalShell
      className="z-50 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans"
      innerClassName="items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700/60 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <ModalHeader
          icon={Settings}
          title="ตั้งค่าเกณฑ์สัญญาจ้างงาน"
          onClose={onClose}
        />

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* 1. ระยะเวลาทดลองงานมาตรฐาน */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  ระยะเวลาทดลองงานมาตรฐาน
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  บวกเพิ่มจากวันเริ่มงานเมื่อเลือกประเภทพนักงานทดลองงาน
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={1825}
                  value={probationDays}
                  onChange={(e) => setProbationDays(e.target.value)}
                  className="w-24 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-right font-bold text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">วัน</span>
              </div>
            </div>
          </div>

          {/* 2. ระยะเวลาสัญญาจ้างเริ่มต้น (Fixed-term) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-indigo-500" />
                  ระยะเวลาสัญญาจ้างเริ่มต้น (Fixed-term)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  บวกเพิ่มจากวันเริ่มสัญญาสำหรับพนักงานสัญญาจ้าง / ต่ออายุสัญญา
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={fixedTermDays}
                  onChange={(e) => setFixedTermDays(e.target.value)}
                  className="w-24 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-right font-bold text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">วัน</span>
              </div>
            </div>
          </div>

          {/* 3-4. แจ้งเตือนล่วงหน้า */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* แจ้งเตือนใกล้ครบทดลองงาน */}
            <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/20 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  แจ้งเตือนครบทดลองงาน
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={probationAlertDays}
                    onChange={(e) => setProbationAlertDays(e.target.value)}
                    className="w-18 h-8 px-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-right font-bold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">วัน</span>
                </div>
              </div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/90">
                แจ้งเตือนเมื่อเหลือน้อยกว่าหรือเท่ากับ {Number(probationAlertDays) || 0} วัน
              </p>
            </div>

            {/* แจ้งเตือนใกล้สิ้นสุดสัญญา */}
            <div className="p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-800/50 bg-rose-50/40 dark:bg-rose-950/20 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  แจ้งเตือนใกล้หมดสัญญา
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={contractAlertDays}
                    onChange={(e) => setContractAlertDays(e.target.value)}
                    className="w-18 h-8 px-2.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-right font-bold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                  <span className="text-[11px] font-medium text-rose-800 dark:text-rose-300">วัน</span>
                </div>
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-400/90">
                แจ้งเตือนเมื่อเหลือน้อยกว่าหรือเท่ากับ {Number(contractAlertDays) || 0} วัน
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-700/60">
            <Button type="button" variant="secondary" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary" icon={<Check className="w-4 h-4" />}>
              บันทึกการตั้งค่า
            </Button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
