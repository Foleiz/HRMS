'use client';

import React from 'react';
import type { EmployeeAddress } from '@/types/employee';

/** ช่องที่อยู่ 1 ชุด */
export interface AddressFields {
  addressLine: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

/** ที่อยู่ตามทะเบียนบ้าน + ที่อยู่ปัจจุบัน */
export interface AddressPair {
  registered: AddressFields;
  current: AddressFields;
  /** ที่อยู่ปัจจุบันเหมือนที่อยู่ตามทะเบียนบ้าน */
  sameAsRegistered: boolean;
}

export const emptyAddress = (): AddressFields => ({
  addressLine: '',
  subDistrict: '',
  district: '',
  province: '',
  postalCode: '',
});

export const emptyAddressPair = (): AddressPair => ({
  registered: emptyAddress(),
  current: emptyAddress(),
  sameAsRegistered: false,
});

const toFields = (a?: Partial<EmployeeAddress> | null): AddressFields => ({
  addressLine: a?.addressLine || '',
  subDistrict: a?.subDistrict || '',
  district: a?.district || '',
  province: a?.province || '',
  postalCode: a?.postalCode || '',
});

const isEmpty = (f: AddressFields) => !Object.values(f).some((v) => v.trim());
const sameFields = (a: AddressFields, b: AddressFields) =>
  (Object.keys(a) as (keyof AddressFields)[]).every((k) => a[k].trim() === b[k].trim());

/** แปลงที่อยู่จาก API → ฟอร์ม (ข้อมูลเดิมมีแต่ที่อยู่ปัจจุบัน → ทะเบียนบ้านว่างไว้) */
export function addressPairFromEmployee(addresses?: EmployeeAddress[] | null): AddressPair {
  const list = addresses || [];
  const reg = list.find((a) => (a.addressType || '').toUpperCase() === 'REGISTERED');
  const cur =
    list.find((a) => (a.addressType || '').toUpperCase() === 'CURRENT') ||
    list.find((a) => a.isCurrent && a !== reg) ||
    list.find((a) => a !== reg);
  const registered = toFields(reg);
  const current = toFields(cur);
  const sameAsRegistered = !!reg && !!cur && !isEmpty(registered) && sameFields(registered, current);
  return { registered, current: sameAsRegistered ? emptyAddress() : current, sameAsRegistered };
}

const clean = (f: AddressFields) => ({
  addressLine: f.addressLine.trim(),
  subDistrict: f.subDistrict.trim(),
  district: f.district.trim(),
  province: f.province.trim(),
  postalCode: f.postalCode.trim(),
});

/** แปลงฟอร์ม → รายการที่อยู่ที่ส่งให้ API (ทะเบียนบ้านที่ว่างจะไม่ส่ง) */
export function addressesForPayload(pair: AddressPair) {
  const current = pair.sameAsRegistered ? pair.registered : pair.current;
  const items: Array<ReturnType<typeof clean> & { addressType: string; isCurrent: boolean }> = [];
  if (!isEmpty(pair.registered)) items.push({ addressType: 'REGISTERED', ...clean(pair.registered), isCurrent: false });
  if (!isEmpty(current)) items.push({ addressType: 'CURRENT', ...clean(current), isCurrent: true });
  return items;
}

/** ตรวจช่องบังคับ — key ของทะเบียนบ้าน: reg_*, ของปัจจุบัน: cur_* */
export function validateAddressPair(pair: AddressPair): Record<string, string> {
  const errors: Record<string, string> = {};
  const check = (f: AddressFields, prefix: string) => {
    if (!f.addressLine.trim()) errors[`${prefix}addressLine`] = 'กรุณากรอกบ้านเลขที่';
    if (!f.subDistrict.trim()) errors[`${prefix}subDistrict`] = 'กรุณากรอกตำบล / แขวง';
    if (!f.district.trim()) errors[`${prefix}district`] = 'กรุณากรอกอำเภอ / เขต';
    if (!f.province.trim()) errors[`${prefix}province`] = 'กรุณากรอกจังหวัด';
    const digits = f.postalCode.replace(/\D/g, '');
    if (!f.postalCode.trim()) errors[`${prefix}postalCode`] = 'กรุณากรอกรหัสไปรษณีย์';
    else if (digits.length !== 5) errors[`${prefix}postalCode`] = 'รหัสไปรษณีย์ต้องมี 5 หลัก';
  };
  check(pair.registered, 'reg_');
  if (!pair.sameAsRegistered) check(pair.current, 'cur_');
  return errors;
}

/** ข้อความที่อยู่บรรทัดเดียว */
export function formatAddressLine(a?: Partial<EmployeeAddress> | null): string {
  if (!a) return '';
  return [
    a.addressLine,
    a.subDistrict && `ต.${a.subDistrict}`,
    a.district && `อ.${a.district}`,
    a.province && `จ.${a.province}`,
    a.postalCode,
  ]
    .filter(Boolean)
    .join(' ');
}

interface AddressPairFieldsProps {
  value: AddressPair;
  onChange: (next: AddressPair) => void;
  /** class ของ input — key เช่น reg_addressLine (ใช้แสดงกรอบแดงเมื่อผิด) */
  inputClassFor: (key: string, mono?: boolean) => string;
  errors?: Record<string, string>;
  onFieldEdited?: (key: string) => void;
  /** แสดงดอกจันบังคับ */
  required?: boolean;
  idPrefix?: string;
}

const FIELD_DEFS: Array<{ key: keyof AddressFields; label: string; placeholder: string; mono?: boolean; maxLength?: number }> = [
  { key: 'addressLine', label: 'บ้านเลขที่ / หมู่บ้าน / ถนน', placeholder: 'บ้านเลขที่ 4' },
  { key: 'subDistrict', label: 'ตำบล / แขวง', placeholder: 'แขวงหัวหมาก' },
  { key: 'district', label: 'อำเภอ / เขต', placeholder: 'บางกะปิ' },
  { key: 'province', label: 'จังหวัด', placeholder: 'กรุงเทพมหานคร' },
  { key: 'postalCode', label: 'รหัสไปรษณีย์', placeholder: '10240', mono: true, maxLength: 5 },
];

export function AddressPairFields({
  value,
  onChange,
  inputClassFor,
  errors = {},
  onFieldEdited,
  required = true,
  idPrefix = 'addr',
}: AddressPairFieldsProps) {
  const star = required ? <span className="text-rose-500">*</span> : null;

  const renderGroup = (which: 'registered' | 'current', prefix: string) => {
    const f = value[which];
    return (
      <div className="space-y-3">
        {FIELD_DEFS.filter((d) => d.key === 'addressLine').map((d) => (
          <div key={d.key}>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
              {d.label} {star}
            </span>
            <input
              type="text"
              placeholder={d.placeholder}
              value={f[d.key]}
              onChange={(e) => {
                onChange({ ...value, [which]: { ...f, [d.key]: e.target.value } });
                onFieldEdited?.(`${prefix}${d.key}`);
              }}
              className={inputClassFor(`${prefix}${d.key}`)}
            />
            {errors[`${prefix}${d.key}`] && <p className="mt-1 text-[11px] text-rose-600">{errors[`${prefix}${d.key}`]}</p>}
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          {FIELD_DEFS.filter((d) => d.key !== 'addressLine').map((d) => (
            <div key={d.key}>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                {d.label} {star}
              </span>
              <input
                type="text"
                placeholder={d.placeholder}
                maxLength={d.maxLength}
                value={f[d.key]}
                onChange={(e) => {
                  const v = d.key === 'postalCode' ? e.target.value.replace(/\D/g, '').slice(0, 5) : e.target.value;
                  onChange({ ...value, [which]: { ...f, [d.key]: v } });
                  onFieldEdited?.(`${prefix}${d.key}`);
                }}
                className={inputClassFor(`${prefix}${d.key}`, d.mono)}
              />
              {errors[`${prefix}${d.key}`] && <p className="mt-1 text-[11px] text-rose-600">{errors[`${prefix}${d.key}`]}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
        <label className="font-semibold text-slate-700 dark:text-slate-300 block text-xs">ที่อยู่ตามทะเบียนบ้าน {star}</label>
        {renderGroup('registered', 'reg_')}
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="font-semibold text-slate-700 dark:text-slate-300 block text-xs">ที่อยู่ปัจจุบัน {star}</label>
          <label htmlFor={`${idPrefix}-same`} className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              id={`${idPrefix}-same`}
              type="checkbox"
              checked={value.sameAsRegistered}
              onChange={(e) => onChange({ ...value, sameAsRegistered: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 cursor-pointer"
            />
            เหมือนที่อยู่ตามทะเบียนบ้าน
          </label>
        </div>
        {value.sameAsRegistered ? (
          <div className="px-3.5 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400">
            ใช้ที่อยู่เดียวกับทะเบียนบ้าน
            {!isEmpty(value.registered) && (
              <span className="block mt-0.5 text-slate-800 dark:text-slate-200">{formatAddressLine(value.registered)}</span>
            )}
          </div>
        ) : (
          renderGroup('current', 'cur_')
        )}
      </div>
    </div>
  );
}
