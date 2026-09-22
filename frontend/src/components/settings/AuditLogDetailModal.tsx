'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  User,
  Calendar,
  Layers,
  Copy,
  Check,
  Code2,
  Table as TableIcon,
  ArrowRight,
} from 'lucide-react';
import { AuditLogItem } from '@/types/settings';

interface AuditLogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLogItem | null;
}

interface DiffRow {
  key: string;
  label: string;
  oldVal: any;
  newVal: any;
  status: 'modified' | 'added' | 'deleted' | 'unchanged';
}

// แผนผังคำแปลชื่อฟิลด์ภาษาไทยสำหรับตารางฐานข้อมูลทั่วไป
const FIELD_TRANSLATIONS: Record<string, string> = {
  id: 'รหัสข้อมูล',
  employee_id: 'รหัสพนักงาน',
  employeeid: 'รหัสพนักงาน',
  username: 'ชื่อผู้ใช้งาน',
  firstname: 'ชื่อจริง',
  lastname: 'นามสกุล',
  email: 'อีเมล',
  phone: 'เบอร์โทรศัพท์',
  status: 'สถานะ',
  role: 'บทบาท',
  title: 'หัวข้อ',
  description: 'คำอธิบาย',
  amount: 'จำนวน / จำนวนเงิน',
  start_date: 'วันที่เริ่มต้น',
  startdate: 'วันที่เริ่มต้น',
  end_date: 'วันที่สิ้นสุด',
  enddate: 'วันที่สิ้นสุด',
  created_at: 'วันที่สร้าง',
  createdat: 'วันที่สร้าง',
  updated_at: 'วันที่แก้ไข',
  updatedat: 'วันที่แก้ไข',
  reason: 'เหตุผล',
  workflow_name: 'ชื่อสายการอนุมัติ',
  step_order: 'ลำดับขั้นตอน',
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  INSERT: { label: 'สร้างข้อมูลใหม่', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  UPDATE: { label: 'แก้ไขข้อมูล', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  DELETE: { label: 'ลบข้อมูล', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  LOGIN: { label: 'เข้าสู่ระบบ', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  LOGOUT: { label: 'ออกจากระบบ', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  APPROVE: { label: 'อนุมัติรายการ', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  REJECT: { label: 'ปฏิเสธรายการ', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  EXPORT: { label: 'ส่งออกข้อมูล', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  isOpen,
  onClose,
  log,
}) => {
  const [viewMode, setViewMode] = useState<'diff' | 'json'>('diff');
  const [copied, setCopied] = useState(false);

  // คำนวณตาราง Diff จาก OldValue และ NewValue
  const { diffRows, isJsonDiff } = useMemo(() => {
    if (!log) return { diffRows: [], isJsonDiff: false };

    let oldObj: Record<string, any> | null = null;
    let newObj: Record<string, any> | null = null;

    try {
      if (log.oldValue && (log.oldValue.startsWith('{') || log.oldValue.startsWith('['))) {
        oldObj = JSON.parse(log.oldValue);
      }
    } catch {
      oldObj = null;
    }

    try {
      if (log.newValue && (log.newValue.startsWith('{') || log.newValue.startsWith('['))) {
        newObj = JSON.parse(log.newValue);
      }
    } catch {
      newObj = null;
    }

    if (!oldObj && !newObj) {
      return { diffRows: [], isJsonDiff: false };
    }

    const allKeys = Array.from(
      new Set([
        ...(oldObj && typeof oldObj === 'object' ? Object.keys(oldObj) : []),
        ...(newObj && typeof newObj === 'object' ? Object.keys(newObj) : []),
      ])
    );

    const rows: DiffRow[] = allKeys.map((key) => {
      const oldVal = oldObj ? oldObj[key] : undefined;
      const newVal = newObj ? newObj[key] : undefined;

      let status: DiffRow['status'] = 'unchanged';
      if (oldVal === undefined && newVal !== undefined) {
        status = 'added';
      } else if (oldVal !== undefined && newVal === undefined) {
        status = 'deleted';
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        status = 'modified';
      }

      const lowerKey = key.toLowerCase();
      const label = FIELD_TRANSLATIONS[lowerKey] || key;

      return { key, label, oldVal, newVal, status };
    });

    return { diffRows: rows, isJsonDiff: true };
  }, [log]);

  if (!isOpen || !log) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const thaiYear = d.getFullYear() + 543;
      return `${d.getDate()} ${months[d.getMonth()]} ${thaiYear} - ${d.toLocaleTimeString('th-TH')}`;
    } catch {
      return isoString;
    }
  };

  const handleCopyJson = () => {
    const dataToCopy = {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      fieldName: log.fieldName,
      oldValue: log.oldValue,
      newValue: log.newValue,
      user: log.username,
      createdAt: log.createdAt,
    };
    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCellValue = (val: any) => {
    if (val === undefined || val === null) {
      return <span className="text-slate-300 italic">ไม่มีข้อมูล</span>;
    }
    if (typeof val === 'boolean') {
      return val ? (
        <span className="text-emerald-700 font-semibold">จริง (เปิดใช้งาน)</span>
      ) : (
        <span className="text-slate-500 font-semibold">เท็จ (ปิดใช้งาน)</span>
      );
    }
    if (typeof val === 'object') {
      return <pre className="font-mono text-[10px] whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>;
    }
    if (val === '[REDACTED]') {
      return <span className="text-amber-700 font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">ปกปิดข้อมูลความลับ</span>;
    }
    return String(val);
  };

  const actionInfo = ACTION_LABELS[log.action] || {
    label: log.action,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  รายละเอียดการเปลี่ยนแปลงข้อมูล
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-lg bg-slate-100 text-slate-600">
                  #{log.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(log.createdAt)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
            <div>
              <span className="text-[10px] font-medium text-slate-400 block mb-0.5">ผู้ดำเนินการ</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{log.fullName || log.username}</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">@{log.username}</span>
            </div>

            <div>
              <span className="text-[10px] font-medium text-slate-400 block mb-0.5">การกระทำ</span>
              <div>
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${actionInfo.color}`}>
                  {actionInfo.label}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-medium text-slate-400 block mb-0.5">โมดูล / ตาราง</span>
              <div className="font-semibold text-slate-800 truncate">
                {log.entityType}
              </div>
              {log.entityId && (
                <span className="text-[10px] text-slate-500 font-mono">ID: #{log.entityId}</span>
              )}
            </div>
          </div>

          {/* Description Box */}
          {log.description && (
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-900 flex items-center gap-2">
              <span className="font-bold text-[11px] text-blue-700 shrink-0">คำอธิบาย:</span>
              <span className="text-xs text-blue-800">{log.description}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('diff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'diff'
                    ? 'bg-[#0B2046] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>ตารางเปรียบเทียบ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('json')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'json'
                    ? 'bg-[#0B2046] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>มุมมองข้อมูลดิบ</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyJson}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">คัดลอกสำเร็จ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกข้อมูล</span>
                </>
              )}
            </button>
          </div>

          {/* Tab 1: Visual Diff View */}
          {viewMode === 'diff' && (
            <div className="space-y-3">
              {isJsonDiff && diffRows.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <th className="py-2.5 px-3 w-1/4">ชื่อฟิลด์</th>
                        <th className="py-2.5 px-3 w-5/12 text-rose-700 bg-rose-50/50">ค่าเดิมก่อนแก้ไข</th>
                        <th className="py-2.5 px-3 w-5/12 text-emerald-700 bg-emerald-50/50">ค่าใหม่หลังแก้ไข</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {diffRows.map((row) => {
                        const isChanged = row.status !== 'unchanged';
                        return (
                          <tr
                            key={row.key}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isChanged ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 align-top">
                              <span className="font-semibold text-slate-800 block">
                                {row.label}
                              </span>
                              {row.label !== row.key && (
                                <span className="font-mono text-[10px] text-slate-400 block">
                                  {row.key}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 align-top bg-rose-50/30 font-mono text-[11px] text-rose-900 break-all">
                              {formatCellValue(row.oldVal)}
                            </td>
                            <td className="py-2.5 px-3 align-top bg-emerald-50/30 font-mono text-[11px] text-emerald-900 break-all">
                              {formatCellValue(row.newVal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Fallback for simple non-JSON values */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-rose-700 block">
                      ค่าเดิมก่อนทำรายการ
                    </span>
                    <div className="font-mono text-[11px] text-rose-900 bg-white/80 p-2.5 rounded-lg border border-rose-100 break-all min-h-[48px]">
                      {log.oldValue || '<ว่าง>'}
                    </div>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-emerald-700 block">
                      ค่าใหม่หลังทำรายการ
                    </span>
                    <div className="font-mono text-[11px] text-emerald-900 bg-white/80 p-2.5 rounded-lg border border-emerald-100 break-all min-h-[48px]">
                      {log.newValue || '<ว่าง>'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Raw JSON View */}
          {viewMode === 'json' && (
            <div className="space-y-3 font-mono text-[11px]">
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1 font-sans">
                  ข้อมูลเดิม (ค่าดิบ):
                </span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto max-h-48 leading-relaxed">
                  {log.oldValue
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(log.oldValue), null, 2);
                        } catch {
                          return log.oldValue;
                        }
                      })()
                    : 'null'}
                </pre>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1 font-sans">
                  ข้อมูลใหม่ (ค่าดิบ):
                </span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto max-h-48 leading-relaxed">
                  {log.newValue
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(log.newValue), null, 2);
                        } catch {
                          return log.newValue;
                        }
                      })()
                    : 'null'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex justify-end bg-slate-50/60 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
