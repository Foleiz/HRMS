'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Sparkles, FileCheck2 } from 'lucide-react';
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
type BackdateMode = 'UNLIMITED' | 'LIMIT' | 'NONE';

interface PolicyForm {
  entitlementDays: NumInput;
  prorationMethod: LeaveProrationMethod;
  minimumServiceDays: NumInput;
  isAllowedDuringProbation: boolean;
  advanceRequestDays: NumInput;
  backdateMode: BackdateMode;
  maxBackdateDays: NumInput;
  maxDaysPerOccurrence: NumInput;
  maxOccurrencesPerYear: NumInput;
  maxLifetimeOccurrences: NumInput;
  isDocumentRequired: boolean;
  documentRequiredAfterDays: NumInput;
  isCarryForwardAllowed: boolean;
  carryForwardMaxDays: NumInput;
  carryForwardExpiryMonths: NumInput;
}

/** ค่าแนะนำตามหมวดการลา (อ้างอิงแนวปฏิบัติทั่วไปตามกฎหมายแรงงาน — ปรับได้ทุกช่อง) */
const TEMPLATES: Record<LeaveFormCategory, PolicyForm> = {
  SICK: {
    entitlementDays: 30, prorationMethod: 'FULL', minimumServiceDays: 0, isAllowedDuringProbation: true,
    advanceRequestDays: 0, backdateMode: 'LIMIT', maxBackdateDays: 7,
    maxDaysPerOccurrence: '', maxOccurrencesPerYear: '', maxLifetimeOccurrences: '',
    isDocumentRequired: true, documentRequiredAfterDays: 3,
    isCarryForwardAllowed: false, carryForwardMaxDays: '', carryForwardExpiryMonths: '',
  },
  PERSONAL: {
    entitlementDays: 3, prorationMethod: 'FULL', minimumServiceDays: 0, isAllowedDuringProbation: true,
    advanceRequestDays: 1, backdateMode: 'LIMIT', maxBackdateDays: 3,
    maxDaysPerOccurrence: '', maxOccurrencesPerYear: '', maxLifetimeOccurrences: '',
    isDocumentRequired: false, documentRequiredAfterDays: '',
    isCarryForwardAllowed: false, carryForwardMaxDays: '', carryForwardExpiryMonths: '',
  },
  VACATION: {
    entitlementDays: 6, prorationMethod: 'PRORATA_MONTHLY', minimumServiceDays: 365, isAllowedDuringProbation: false,
    advanceRequestDays: 7, backdateMode: 'NONE', maxBackdateDays: '',
    maxDaysPerOccurrence: '', maxOccurrencesPerYear: '', maxLifetimeOccurrences: '',
    isDocumentRequired: false, documentRequiredAfterDays: '',
    isCarryForwardAllowed: true, carryForwardMaxDays: 6, carryForwardExpiryMonths: 3,
  },
  SPECIAL: {
    entitlementDays: 0, prorationMethod: 'FULL', minimumServiceDays: 0, isAllowedDuringProbation: true,
    advanceRequestDays: 7, backdateMode: 'UNLIMITED', maxBackdateDays: '',
    maxDaysPerOccurrence: '', maxOccurrencesPerYear: '', maxLifetimeOccurrences: '',
    isDocumentRequired: true, documentRequiredAfterDays: '',
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
  isAllowedDuringProbation: p.isAllowedDuringProbation,
  advanceRequestDays: p.advanceRequestDays,
  backdateMode: p.maxBackdateDays === null || p.maxBackdateDays === undefined ? 'UNLIMITED' : p.maxBackdateDays === 0 ? 'NONE' : 'LIMIT',
  maxBackdateDays: p.maxBackdateDays ? p.maxBackdateDays : '',
  maxDaysPerOccurrence: fromNum(p.maxDaysPerOccurrence),
  maxOccurrencesPerYear: fromNum(p.maxOccurrencesPerYear),
  maxLifetimeOccurrences: fromNum(p.maxLifetimeOccurrences),
  isDocumentRequired: p.isDocumentRequired,
  documentRequiredAfterDays: p.documentRequiredAfterDays ? p.documentRequiredAfterDays : '',
  isCarryForwardAllowed: p.isCarryForwardAllowed,
  carryForwardMaxDays: fromNum(p.carryForwardMaxDays ?? (p.isCarryForwardAllowed ? p.carryForwardMaxMonths : null)),
  carryForwardExpiryMonths: fromNum(p.carryForwardExpiryMonths),
});

// ───────────────────────── UI helpers ─────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
      checked ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'
    }`}
  >
    <div className="w-4 h-4 rounded-full bg-white shadow" />
  </button>
);

const Section: React.FC<{ no: number; title: string; children: React.ReactNode }> = ({ no, title, children }) => (
  <section className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-3.5">
    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
      <span className="w-5 h-5 rounded-full bg-[#0B2046] text-white text-[11px] flex items-center justify-center">{no}</span>
      {title}
    </h4>
    {children}
  </section>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
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
  <div className={`flex items-center rounded-xl border bg-white ${disabled ? 'border-gray-100 opacity-50' : 'border-gray-200 focus-within:ring-2 focus-within:ring-blue-500'}`}>
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
    <span className="px-3 text-xs text-gray-400 whitespace-nowrap">{unit}</span>
  </div>
);

const selectCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none';

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

  // สรุปเป็นประโยคให้ HR อ่านทวนก่อนบันทึก
  const summary = useMemo(() => {
    const typeName = leaveTypes.find((t) => t.id === leaveTypeId)?.leaveName || 'ประเภทการลานี้';
    const empType = employeeTypes.find((t) => t.id === employeeTypeId)?.typeName;
    const level = employeeLevels.find((l) => l.id === employeeLevelId)?.levelName;
    const who = `${empType ? `พนักงาน${empType}` : 'พนักงานทุกประเภท'} ${level ? `ระดับ ${level}` : 'ทุกระดับ'}`;
    const parts: string[] = [`${who} ได้${typeName} ${form.entitlementDays || 0} วัน/ปี`];
    if (form.prorationMethod === 'PRORATA_MONTHLY') parts.push('ปีแรกคิดตามสัดส่วนเดือนที่เหลือ');
    if (Number(form.minimumServiceDays) > 0) parts.push(`เมื่อทำงานครบ ${form.minimumServiceDays} วัน`);
    parts.push(form.isAllowedDuringProbation ? 'ใช้ได้ระหว่างทดลองงาน' : 'ใช้ไม่ได้ระหว่างทดลองงาน');
    parts.push(Number(form.advanceRequestDays) > 0 ? `ต้องยื่นล่วงหน้า ${form.advanceRequestDays} วัน` : 'ยื่นวันเดียวกันได้');
    if (form.backdateMode === 'NONE') parts.push('ห้ามยื่นย้อนหลัง');
    if (form.backdateMode === 'LIMIT' && form.maxBackdateDays !== '') parts.push(`ยื่นย้อนหลังได้ ${form.maxBackdateDays} วัน`);
    if (form.maxDaysPerOccurrence !== '') parts.push(`ครั้งละไม่เกิน ${form.maxDaysPerOccurrence} วัน`);
    if (form.maxOccurrencesPerYear !== '') parts.push(`ไม่เกิน ${form.maxOccurrencesPerYear} ครั้ง/ปี`);
    if (form.maxLifetimeOccurrences !== '') parts.push(`ไม่เกิน ${form.maxLifetimeOccurrences} ครั้งตลอดอายุงาน`);
    if (form.isDocumentRequired)
      parts.push(Number(form.documentRequiredAfterDays) > 0 ? `แนบเอกสารเมื่อลา ${form.documentRequiredAfterDays} วันขึ้นไป` : 'แนบเอกสารทุกครั้ง');
    if (form.isCarryForwardAllowed)
      parts.push(
        `ยกยอดไปปีถัดไปได้สูงสุด ${form.carryForwardMaxDays === '' ? form.entitlementDays || 0 : form.carryForwardMaxDays} วัน` +
          ` ใช้ภายใน ${form.carryForwardExpiryMonths === '' ? 3 : form.carryForwardExpiryMonths} เดือน`
      );
    else parts.push('ไม่ยกยอดข้ามปี');
    return parts.join(' · ');
  }, [form, leaveTypeId, employeeTypeId, employeeLevelId, leaveTypes, employeeTypes, employeeLevels]);

  if (!isOpen) return null;

  const handleLeaveTypeChange = (id: number) => {
    setLeaveTypeId(id);
    if (!isEditing) setForm(TEMPLATES[categoryOf(id)]); // สร้างใหม่: ใช้ค่าแนะนำของหมวดนั้น
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId) return setError('กรุณาเลือกประเภทการลา');
    if (form.entitlementDays === '' || Number(form.entitlementDays) < 0) return setError('กรุณาระบุจำนวนวันลาที่ได้รับต่อปี');
    if (form.backdateMode === 'LIMIT' && (form.maxBackdateDays === '' || Number(form.maxBackdateDays) <= 0))
      return setError('กรุณาระบุจำนวนวันที่ยื่นย้อนหลังได้ (มากกว่า 0)');
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
        isAllowedDuringProbation: form.isAllowedDuringProbation,
        advanceRequestDays: toNum(form.advanceRequestDays) ?? 0,
        maxBackdateDays: form.backdateMode === 'UNLIMITED' ? null : form.backdateMode === 'NONE' ? 0 : toNum(form.maxBackdateDays),
        maxDaysPerOccurrence: toNum(form.maxDaysPerOccurrence),
        maxOccurrencesPerYear: toNum(form.maxOccurrencesPerYear),
        maxLifetimeOccurrences: toNum(form.maxLifetimeOccurrences),
        isDocumentRequired: form.isDocumentRequired,
        documentRequiredAfterDays: form.isDocumentRequired ? toNum(form.documentRequiredAfterDays) : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{isEditing ? 'แก้ไขสิทธิ์การลา' : 'เพิ่มสิทธิ์การลา'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">กำหนดว่าใครได้ลาประเภทนี้กี่วัน และมีเงื่อนไขอะไร — ระบบบังคับใช้ตอนยื่นลาจริง</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl whitespace-pre-line">{error}</div>}

          {/* 1. ใช้กับใคร */}
          <Section no={1} title="ใช้กับใคร">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="ประเภทการลา *">
                <select
                  value={leaveTypeId}
                  disabled={isEditing}
                  onChange={(e) => handleLeaveTypeChange(Number(e.target.value))}
                  className={`${selectCls} ${isEditing ? 'bg-gray-50 text-gray-500' : ''}`}
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.leaveName}
                      {t.status !== 'ACTIVE' ? ' (ปิดใช้งาน)' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ประเภทพนักงาน">
                <select value={employeeTypeId} onChange={(e) => setEmployeeTypeId(e.target.value === '' ? '' : Number(e.target.value))} className={selectCls}>
                  <option value="">ทุกประเภท</option>
                  {employeeTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.typeName}</option>
                  ))}
                </select>
              </Field>
              <Field label="ระดับพนักงาน">
                <select value={employeeLevelId} onChange={(e) => setEmployeeLevelId(e.target.value === '' ? '' : Number(e.target.value))} className={selectCls}>
                  <option value="">ทุกระดับ</option>
                  {employeeLevels.map((l) => (
                    <option key={l.id} value={l.id}>{l.levelName}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="text-[11px] text-gray-400">
              ถ้ามีหลายรายการตรงกับพนักงาน ระบบใช้รายการที่เจาะจงที่สุด (ระบุประเภท/ระดับ) ก่อน · ประเภทการลา + กลุ่มพนักงานเดียวกันสร้างซ้ำไม่ได้
            </p>
            {!isEditing && (
              <p className="flex items-center gap-1.5 text-[11px] text-blue-700">
                <Sparkles className="w-3.5 h-3.5" /> เติมค่าแนะนำตามหมวดของประเภทการลาให้แล้ว ปรับได้ทุกช่อง
              </p>
            )}
          </Section>

          {/* 2. สิทธิ์ */}
          <Section no={2} title="สิทธิ์ที่ได้รับ">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="จำนวนวันลาต่อปี *">
                <NumberBox value={form.entitlementDays} onChange={(v) => set('entitlementDays', v)} unit="วัน/ปี" step="0.5" />
              </Field>
              <Field label="พนักงานเข้าใหม่ระหว่างปี">
                <select value={form.prorationMethod} onChange={(e) => set('prorationMethod', e.target.value as LeaveProrationMethod)} className={selectCls}>
                  <option value="FULL">ได้สิทธิ์เต็มปี</option>
                  <option value="PRORATA_MONTHLY">คิดตามสัดส่วนเดือนที่เหลือ</option>
                </select>
              </Field>
              <Field label="อายุงานขั้นต่ำก่อนใช้สิทธิ์" hint="0 = ใช้ได้ตั้งแต่วันแรก · 365 = ทำงานครบ 1 ปี">
                <NumberBox value={form.minimumServiceDays} onChange={(v) => set('minimumServiceDays', v)} unit="วัน" />
              </Field>
              <Field label="ระหว่างทดลองงาน">
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                  <span className="text-sm text-gray-700">{form.isAllowedDuringProbation ? 'ใช้สิทธิ์ได้' : 'ยังใช้สิทธิ์ไม่ได้'}</span>
                  <Toggle checked={form.isAllowedDuringProbation} onChange={(v) => set('isAllowedDuringProbation', v)} />
                </div>
              </Field>
            </div>
          </Section>

          {/* 3. เงื่อนไขการยื่น */}
          <Section no={3} title="เงื่อนไขการยื่นลา">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="ต้องยื่นล่วงหน้าอย่างน้อย" hint="0 = ยื่นวันเดียวกับวันลาได้">
                <NumberBox value={form.advanceRequestDays} onChange={(v) => set('advanceRequestDays', v)} unit="วัน" />
              </Field>
              <Field label="การยื่นย้อนหลัง">
                <div className="flex gap-2">
                  <select value={form.backdateMode} onChange={(e) => set('backdateMode', e.target.value as BackdateMode)} className={selectCls}>
                    <option value="UNLIMITED">ยื่นย้อนหลังได้ไม่จำกัด</option>
                    <option value="LIMIT">ยื่นย้อนหลังได้ไม่เกิน…</option>
                    <option value="NONE">ห้ามยื่นย้อนหลัง</option>
                  </select>
                  {form.backdateMode === 'LIMIT' && (
                    <div className="w-32 shrink-0">
                      <NumberBox value={form.maxBackdateDays} onChange={(v) => set('maxBackdateDays', v)} unit="วัน" />
                    </div>
                  )}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="ลาได้สูงสุดต่อครั้ง">
                <NumberBox value={form.maxDaysPerOccurrence} onChange={(v) => set('maxDaysPerOccurrence', v)} unit="วัน" step="0.5" placeholder="ไม่จำกัด" />
              </Field>
              <Field label="จำนวนครั้งต่อปี">
                <NumberBox value={form.maxOccurrencesPerYear} onChange={(v) => set('maxOccurrencesPerYear', v)} unit="ครั้ง" placeholder="ไม่จำกัด" />
              </Field>
              <Field label="จำนวนครั้งตลอดอายุงาน" hint="เช่น ลาบวช = 1">
                <NumberBox value={form.maxLifetimeOccurrences} onChange={(v) => set('maxLifetimeOccurrences', v)} unit="ครั้ง" placeholder="ไม่จำกัด" />
              </Field>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <FileCheck2 className="w-4 h-4 text-gray-400" /> ต้องแนบเอกสารประกอบ (เช่น ใบรับรองแพทย์)
                </span>
                <Toggle checked={form.isDocumentRequired} onChange={(v) => set('isDocumentRequired', v)} />
              </div>
              {form.isDocumentRequired && (
                <Field label="เมื่อลาตั้งแต่" hint="เว้นว่าง = ต้องแนบทุกครั้ง">
                  <div className="w-44">
                    <NumberBox value={form.documentRequiredAfterDays} onChange={(v) => set('documentRequiredAfterDays', v)} unit="วันขึ้นไป" step="0.5" placeholder="ทุกครั้ง" />
                  </div>
                </Field>
              )}
            </div>
          </Section>

          {/* 4. ยกยอด */}
          <Section no={4} title="ยกยอดวันลาข้ามปี">
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-gray-200 bg-white">
              <span className="text-sm text-gray-700">วันลาที่เหลือยกไปใช้ปีถัดไปได้</span>
              <Toggle checked={form.isCarryForwardAllowed} onChange={(v) => set('isCarryForwardAllowed', v)} />
            </div>
            {form.isCarryForwardAllowed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="ยกไปได้สูงสุด" hint="เว้นว่าง = เท่าจำนวนวันลาต่อปี">
                  <NumberBox value={form.carryForwardMaxDays} onChange={(v) => set('carryForwardMaxDays', v)} unit="วัน" step="0.5" placeholder={String(form.entitlementDays || 0)} />
                </Field>
                <Field label="ต้องใช้ให้หมดภายใน" hint="นับจาก 1 มกราคมของปีถัดไป (เว้นว่าง = 3 เดือน)">
                  <NumberBox value={form.carryForwardExpiryMonths} onChange={(v) => set('carryForwardExpiryMonths', v)} unit="เดือน" placeholder="3" />
                </Field>
              </div>
            )}
          </Section>

          <Field label="เริ่มมีผลตั้งแต่วันที่">
            <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="w-48 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </Field>

          {/* สรุป */}
          <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-4">
            <p className="text-xs font-semibold text-blue-800 mb-1">สรุปสิทธิ์ที่จะบันทึก</p>
            <p className="text-sm text-blue-900 leading-relaxed">{summary}</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
