'use client';

import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, FileCheck2 } from 'lucide-react';
import {
  LeaveType,
  LeavePolicy,
  LeaveFormCategory,
  LeaveProrationMethod,
  CreateLeavePolicyPayload,
  UpdateLeavePolicyPayload,
} from '@/types/leave';
import { employeeTypeService } from '@/services/employeeTypeService';
import { inferFormCategory } from './LeaveTypeModal';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Button, ToggleSwitch } from '@/components/ui';

interface EmployeeLevelOption {
  id: number;
  levelName: string;
}

interface LeavePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  policyToEdit?: LeavePolicy | null;
  leaveTypes: LeaveType[];
  employeeLevels: EmployeeLevelOption[];
  onSubmitCreate: (data: CreateLeavePolicyPayload) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateLeavePolicyPayload) => Promise<void>;
}

type NumInput = number | '';

interface PolicyForm {
  entitlementDays: NumInput;
  prorationMethod: LeaveProrationMethod;
  minimumServiceDays: NumInput;
  advanceRequestDays: NumInput;
  maxLifetimeOccurrences: NumInput;
  isDocumentRequired: boolean;
  documentRequiredAfterDays: NumInput;
  documentGraceDays: NumInput;
  isCarryForwardAllowed: boolean;
  carryForwardMaxDays: NumInput;
  carryForwardExpiryMonths: NumInput;
}

/** ค่าแนะนำตามหมวดการลา (อ้างอิงแนวปฏิบัติทั่วไปตามกฎหมายแรงงาน — ปรับได้ทุกช่อง) */
const TEMPLATES: Record<LeaveFormCategory, PolicyForm> = {
  SICK: {
    entitlementDays: 30, prorationMethod: 'FULL', minimumServiceDays: 0,
    advanceRequestDays: 0,
    maxLifetimeOccurrences: '',
    isDocumentRequired: true, documentRequiredAfterDays: 3, documentGraceDays: 7,
    isCarryForwardAllowed: false, carryForwardMaxDays: '', carryForwardExpiryMonths: '',
  },
  PERSONAL: {
    entitlementDays: 3, prorationMethod: 'FULL', minimumServiceDays: 0,
    advanceRequestDays: 1,
    maxLifetimeOccurrences: '',
    isDocumentRequired: false, documentRequiredAfterDays: '', documentGraceDays: '',
    isCarryForwardAllowed: false, carryForwardMaxDays: '', carryForwardExpiryMonths: '',
  },
  VACATION: {
    entitlementDays: 6, prorationMethod: 'PRORATA_MONTHLY', minimumServiceDays: 365,
    advanceRequestDays: 7,
    maxLifetimeOccurrences: '',
    isDocumentRequired: false, documentRequiredAfterDays: '', documentGraceDays: '',
    isCarryForwardAllowed: true, carryForwardMaxDays: 6, carryForwardExpiryMonths: 3,
  },
  SPECIAL: {
    entitlementDays: 0, prorationMethod: 'FULL', minimumServiceDays: 0,
    advanceRequestDays: 7,
    maxLifetimeOccurrences: '',
    isDocumentRequired: true, documentRequiredAfterDays: '', documentGraceDays: 7,
    isCarryForwardAllowed: false, carryForwardMaxDays: '', carryForwardExpiryMonths: '',
  },
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toNum = (v: NumInput): number | null => (v === '' ? null : Number(v));
const fromNum = (v?: number | null): NumInput => (v === null || v === undefined ? '' : v);

const policyToForm = (p: LeavePolicy): PolicyForm => ({
  entitlementDays: p.entitlementDays,
  prorationMethod: (p.prorationMethod as LeaveProrationMethod) || 'FULL',
  minimumServiceDays: p.minimumServiceDays,
  advanceRequestDays: p.advanceRequestDays,
  maxLifetimeOccurrences: fromNum(p.maxLifetimeOccurrences),
  isDocumentRequired: p.isDocumentRequired,
  documentRequiredAfterDays: p.documentRequiredAfterDays ? p.documentRequiredAfterDays : '',
  documentGraceDays: p.documentGraceDays ? p.documentGraceDays : '',
  isCarryForwardAllowed: p.isCarryForwardAllowed,
  carryForwardMaxDays: fromNum(p.carryForwardMaxDays ?? (p.isCarryForwardAllowed ? p.carryForwardMaxMonths : null)),
  carryForwardExpiryMonths: fromNum(p.carryForwardExpiryMonths),
});

// ───────────────────────── UI helpers ─────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <ToggleSwitch checked={checked} onChange={onChange} />
);

const Section: React.FC<{ no: number; title: string; children: React.ReactNode }> = ({ no, title, children }) => (
  <section className="rounded-2xl border border-gray-100 dark:border-slate-700/60 bg-gray-50/60 p-4 space-y-3.5">
    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
      <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] flex items-center justify-center font-bold">{no}</span>
      {title}
    </h4>
    {children}
  </section>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
      {label.endsWith(' *') ? (
        <>
          {label.slice(0, -2)} <span className="text-rose-500">*</span>
        </>
      ) : (
        label
      )}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
);

const NumberBox: React.FC<{
  value: NumInput;
  onChange: (v: NumInput) => void;
  unit: string;
  placeholder?: string;
  step?: string;
  disabled?: boolean;
}> = ({ value, onChange, unit, placeholder, step = '1', disabled }) => (
  <div className={`flex items-center rounded-xl border bg-white dark:bg-slate-800 ${disabled ? 'border-gray-100 dark:border-slate-700/60 opacity-50' : 'border-gray-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500'}`}>
    <input
      type="number"
      min="0"
      step={step}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className="w-full min-w-0 px-3 py-2 bg-transparent text-sm outline-none rounded-xl"
    />
    <span className="px-3 text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400 whitespace-nowrap">{unit}</span>
  </div>
);

const selectCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none';

/**
 * ฟอร์ม "สิทธิ์การลา" — ใครได้ลาประเภทนี้เท่าไหร่ และมีเงื่อนไขอะไร (ตัวเลขทั้งหมดอยู่ที่นี่ที่เดียว)
 * ทุกเงื่อนไขในฟอร์มนี้ระบบบังคับใช้จริงตอนพนักงานยื่นลา
 */
export const LeavePolicyModal: React.FC<LeavePolicyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  policyToEdit,
  leaveTypes,
  employeeLevels,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEditing = !!policyToEdit;

  const [leaveTypeId, setLeaveTypeId] = useState<number>(0);
  const [employeeTypeId, setEmployeeTypeId] = useState<number | ''>('');
  const [employeeLevelId, setEmployeeLevelId] = useState<number | ''>('');
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [form, setForm] = useState<PolicyForm>(TEMPLATES.SPECIAL);
  const [employeeTypes, setEmployeeTypes] = useState<{ id: number; typeName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PolicyForm>(key: K, value: PolicyForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const categoryOf = (typeId: number): LeaveFormCategory => {
    const t = leaveTypes.find((x) => x.id === typeId);
    return (t?.formCategory as LeaveFormCategory) || inferFormCategory(t?.leaveCode, t?.leaveName);
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    employeeTypeService
      .getAll({ status: 'ACTIVE' })
      .then((list) => active && setEmployeeTypes(list.map((t) => ({ id: t.id, typeName: t.typeName }))))
      .catch(() => active && setEmployeeTypes([])); // ไม่มีสิทธิ์ดูประเภทพนักงาน → ใช้ "ทุกประเภท"
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (policyToEdit) {
      setLeaveTypeId(policyToEdit.leaveTypeId);
      setEmployeeTypeId(policyToEdit.employeeTypeId ?? '');
      setEmployeeLevelId(policyToEdit.employeeLevelId ?? '');
      setEffectiveFrom(policyToEdit.effectiveFrom?.slice(0, 10) || todayIso());
      setForm(policyToForm(policyToEdit));
    } else {
      const firstId = leaveTypes.find((t) => t.status === 'ACTIVE')?.id ?? leaveTypes[0]?.id ?? 0;
      setLeaveTypeId(firstId);
      setEmployeeTypeId('');
      setEmployeeLevelId('');
      setEffectiveFrom(todayIso());
      setForm(TEMPLATES[categoryOf(firstId)]);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyToEdit, isOpen]);

  if (!isOpen) return null;

  const handleLeaveTypeChange = (id: number) => {
    setLeaveTypeId(id);
    if (!isEditing) setForm(TEMPLATES[categoryOf(id)]); // สร้างใหม่: ใช้ค่าแนะนำของหมวดนั้น
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId) return setError('กรุณาเลือกประเภทการลา');
    if (form.entitlementDays === '' || Number(form.entitlementDays) < 0) return setError('กรุณาระบุจำนวนวันลาที่ได้รับต่อปี');
    if (!effectiveFrom) return setError('กรุณาระบุวันที่เริ่มมีผล');

    setLoading(true);
    setError(null);
    try {
      const payload = {
        employeeTypeId: employeeTypeId === '' ? null : Number(employeeTypeId),
        employeeLevelId: employeeLevelId === '' ? null : Number(employeeLevelId),
        entitlementDays: Number(form.entitlementDays),
        prorationMethod: form.prorationMethod,
        minimumServiceDays: toNum(form.minimumServiceDays) ?? 0,
        isAllowedDuringProbation: true,
        advanceRequestDays: toNum(form.advanceRequestDays) ?? 0,
        // ยื่นย้อนหลังได้เสมอ — กันด้วยการลาซ้อนวันและงวดเงินเดือนที่ปิดรอบแล้วแทน
        maxBackdateDays: null,
        maxDaysPerOccurrence: null,
        maxOccurrencesPerYear: null,
        maxLifetimeOccurrences: toNum(form.maxLifetimeOccurrences),
        isDocumentRequired: form.isDocumentRequired,
        documentRequiredAfterDays: form.isDocumentRequired ? toNum(form.documentRequiredAfterDays) : null,
        documentGraceDays: form.isDocumentRequired && Number(form.documentGraceDays) > 0 ? toNum(form.documentGraceDays) : null,
        isCarryForwardAllowed: form.isCarryForwardAllowed,
        carryForwardMaxDays: form.isCarryForwardAllowed ? toNum(form.carryForwardMaxDays) : null,
        carryForwardExpiryMonths: form.isCarryForwardAllowed ? toNum(form.carryForwardExpiryMonths) : null,
        carryForwardMaxMonths: null,
        effectiveFrom,
        effectiveTo: policyToEdit?.effectiveTo ?? null,
      };
      if (isEditing && policyToEdit) await onSubmitUpdate(policyToEdit.id, payload);
      else await onSubmitCreate({ leaveTypeId, ...payload });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e2?.response?.data?.message || e2?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell className="z-50 bg-black/45 backdrop-blur-sm" innerClassName="items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-100 dark:border-slate-700/60">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200">{isEditing ? 'แก้ไขสิทธิ์การลา' : 'เพิ่มสิทธิ์การลา'}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:text-gray-600 dark:text-slate-400 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl whitespace-pre-line dark:bg-red-900/20 dark:text-red-400">{error}</div>}

          {/* 1. ใช้กับใคร */}
          <Section no={1} title="ใช้กับใคร">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="ประเภทการลา *">
                <CustomSelect
                  value={leaveTypeId}
                  disabled={isEditing}
                  onChange={(e) => handleLeaveTypeChange(Number(e.target.value))}
                  className={`${selectCls} ${isEditing ? 'bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400' : ''}`}
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.leaveName}
                      {t.status !== 'ACTIVE' ? ' (ปิดใช้งาน)' : ''}
                    </option>
                  ))}
                </CustomSelect>
              </Field>
              <Field label="เริ่มมีผลตั้งแต่วันที่ *">
                <ThaiDatePicker
                  value={effectiveFrom}
                  onChange={setEffectiveFrom}
                  placeholder="เลือกวันที่มีผล"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </Field>
              <Field label="ประเภทพนักงาน">
                <CustomSelect value={employeeTypeId} onChange={(e) => setEmployeeTypeId(e.target.value === '' ? '' : Number(e.target.value))} className={selectCls}>
                  <option value="">ทุกประเภท</option>
                  {employeeTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.typeName}</option>
                  ))}
                </CustomSelect>
              </Field>
              <Field label="ระดับพนักงาน">
                <CustomSelect value={employeeLevelId} onChange={(e) => setEmployeeLevelId(e.target.value === '' ? '' : Number(e.target.value))} className={selectCls}>
                  <option value="">ทุกระดับ</option>
                  {employeeLevels.map((l) => (
                    <option key={l.id} value={l.id}>{l.levelName}</option>
                  ))}
                </CustomSelect>
              </Field>
            </div>
          </Section>

          {/* 2. สิทธิ์ */}
          <Section no={2} title="สิทธิ์ที่ได้รับ">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="จำนวนวันลาต่อปี *">
                <NumberBox value={form.entitlementDays} onChange={(v) => set('entitlementDays', v)} unit="วัน/ปี" step="0.5" />
              </Field>
              <Field label="พนักงานเข้าใหม่ระหว่างปี">
                <CustomSelect value={form.prorationMethod} onChange={(e) => set('prorationMethod', e.target.value as LeaveProrationMethod)} className={selectCls}>
                  <option value="FULL">ได้สิทธิ์เต็มปี</option>
                  <option value="PRORATA_MONTHLY">คิดตามสัดส่วนเดือนที่เหลือ</option>
                </CustomSelect>
              </Field>
              <Field label="อายุงานขั้นต่ำก่อนใช้สิทธิ์" hint="0 = วันแรก · 365 = 1 ปี">
                <NumberBox value={form.minimumServiceDays} onChange={(v) => set('minimumServiceDays', v)} unit="วัน" />
              </Field>
            </div>
          </Section>

          {/* 3. เงื่อนไขการยื่น */}
          <Section no={3} title="เงื่อนไขการยื่นลา">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="ต้องยื่นล่วงหน้าอย่างน้อย">
                <NumberBox value={form.advanceRequestDays} onChange={(v) => set('advanceRequestDays', v)} unit="วัน" />
              </Field>
              <Field label="จำนวนครั้งตลอดอายุงาน" hint="เช่น ลาบวช = 1">
                <NumberBox value={form.maxLifetimeOccurrences} onChange={(v) => set('maxLifetimeOccurrences', v)} unit="ครั้ง" placeholder="ไม่จำกัด" />
              </Field>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <FileCheck2 className="w-4 h-4 text-gray-400 dark:text-slate-500 dark:text-slate-400" /> ต้องแนบเอกสารประกอบ (เช่น ใบรับรองแพทย์)
                </span>
                <Toggle checked={form.isDocumentRequired} onChange={(v) => set('isDocumentRequired', v)} />
              </div>
              {form.isDocumentRequired && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="เมื่อลาตั้งแต่" hint="เว้นว่าง = ต้องแนบทุกครั้ง">
                    <div className="w-44">
                      <NumberBox value={form.documentRequiredAfterDays} onChange={(v) => set('documentRequiredAfterDays', v)} unit="วันขึ้นไป" step="0.5" placeholder="ทุกครั้ง" />
                    </div>
                  </Field>
                  <Field label="แนบภายหลังได้ภายใน" hint="นับจากวันสุดท้ายที่ลา · เว้นว่าง = ต้องแนบตอนยื่น">
                    <div className="w-44">
                      <NumberBox value={form.documentGraceDays} onChange={(v) => set('documentGraceDays', v)} unit="วัน" placeholder="ตอนยื่น" />
                    </div>
                  </Field>
                </div>
              )}
            </div>
          </Section>

          {/* 4. ยกยอด */}
          <Section no={4} title="ยกยอดวันลาข้ามปี">
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">วันลาที่เหลือยกไปใช้ปีถัดไปได้</span>
                <Toggle checked={form.isCarryForwardAllowed} onChange={(v) => set('isCarryForwardAllowed', v)} />
              </div>
              {form.isCarryForwardAllowed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                  <Field label="ยกไปได้สูงสุด" hint="เว้นว่าง = เท่าจำนวนวันลาต่อปี">
                    <NumberBox value={form.carryForwardMaxDays} onChange={(v) => set('carryForwardMaxDays', v)} unit="วัน" step="0.5" placeholder={String(form.entitlementDays || 0)} />
                  </Field>
                  <Field label="ต้องใช้ให้หมดภายใน" hint="นับจาก 1 ม.ค. ของปีถัดไป (เว้นว่าง = 3 เดือน)">
                    <NumberBox value={form.carryForwardExpiryMonths} onChange={(v) => set('carryForwardExpiryMonths', v)} unit="เดือน" placeholder="3" />
                  </Field>
                </div>
              )}
            </div>
          </Section>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              loading={loading}
            >
              บันทึก
            </Button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};
