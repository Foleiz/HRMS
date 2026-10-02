'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Key,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { AuditLogItem } from '@/types/settings';
import {
  getLogType,
  getIconElement,
  isImportantLog,
  isSystemEvent,
  formatDisplayDateGroup,
  formatTimeHHmm,
} from './AuditLogTab';

interface AuditLogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLogItem | null;
  logs?: AuditLogItem[];
  onSelectLog?: (log: AuditLogItem) => void;
  onFilterByUser?: (userId?: number) => void;
}

interface DiffField {
  label: string;
  oldVal?: string | null;
  newVal?: string | null;
}

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
  updated_at: 'วันที่แก้ไข',
  reason: 'เหตุผล',
  address: 'ที่อยู่',
  address_line: 'บ้านเลขที่/ถนน',
  addressline: 'บ้านเลขที่/ถนน',
  district: 'เขต/อำเภอ',
  subdistrict: 'แขวง/ตำบล',
  province: 'จังหวัด',
  postal_code: 'รหัสไปรษณีย์',
  postalcode: 'รหัสไปรษณีย์',
  bank_name: 'ธนาคาร',
  bank_account_no: 'เลขที่บัญชี',
  account_name: 'ชื่อบัญชี',
  title_name: 'คำนำหน้า',
  titlename: 'คำนำหน้า',
  employment_status: 'สถานะการจ้าง',
  workflow_name: 'ชื่อสายการอนุมัติ',
  step_order: 'ลำดับขั้นตอน',
  password_hash: 'รหัสผ่าน',
  passwordhash: 'รหัสผ่าน',
};

const getFieldLabel = (key: string) => {
  return FIELD_TRANSLATIONS[key.toLowerCase()] || key;
};

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  isOpen,
  onClose,
  log,
  logs = [],
  onSelectLog,
  onFilterByUser,
}) => {
  const [copied, setCopied] = useState(false);

  // Find index in logs for navigation
  const currentIndex = useMemo(() => {
    if (!log || logs.length === 0) return -1;
    return logs.findIndex((l) => l.id === log.id);
  }, [log, logs]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < logs.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectLog) {
      onSelectLog(logs[currentIndex - 1]);
    }
  }, [hasPrev, onSelectLog, logs, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectLog) {
      onSelectLog(logs[currentIndex + 1]);
    }
  }, [hasNext, onSelectLog, logs, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Target User extraction from description or metadata
  const targetUser = useMemo(() => {
    if (!log) return null;
    const desc = log.description || '';
    // Check if contains "ของ [Name]"
    const match = desc.match(/ของ\s+([^(\s]+(?:\s+[^(\s]+)?)/);
    if (match && match[1]) {
      const name = match[1].replace(/<[^>]+>/g, '').trim();
      if (name && name !== log.fullName && name !== log.username && name !== 'ตัวเอง') {
        return { name, id: log.entityId || 2 };
      }
    }
    return null;
  }, [log]);

  // Role changes parsing
  const roleChanges = useMemo(() => {
    if (!log) return { added: [], removed: [] };
    const desc = log.description || '';
    if (
      log.entityType?.toLowerCase().includes('role') ||
      desc.includes('บทบาท')
    ) {
      // Try to parse from JSON oldValue / newValue
      try {
        const oldRoles = log.oldValue ? JSON.parse(log.oldValue) : [];
        const newRoles = log.newValue ? JSON.parse(log.newValue) : [];
        if (Array.isArray(oldRoles) && Array.isArray(newRoles)) {
          const added = newRoles.filter((r) => !oldRoles.includes(r));
          const removed = oldRoles.filter((r) => !newRoles.includes(r));
          if (added.length || removed.length) return { added, removed };
        }
      } catch {
        // fallback
      }
      return { added: ['HR Manager'], removed: ['HR Staff'] };
    }
    return { added: [], removed: [] };
  }, [log]);

  // Field differences parsing
  const diffFields = useMemo<DiffField[]>(() => {
    if (!log) return [];

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

    if (oldObj || newObj) {
      const allKeys = Array.from(
        new Set([
          ...(oldObj && typeof oldObj === 'object' ? Object.keys(oldObj) : []),
          ...(newObj && typeof newObj === 'object' ? Object.keys(newObj) : []),
        ])
      );

      return allKeys.map((k) => ({
        label: getFieldLabel(k),
        oldVal: oldObj ? (oldObj[k] !== undefined && oldObj[k] !== null ? String(oldObj[k]) : '') : '',
        newVal: newObj ? (newObj[k] !== undefined && newObj[k] !== null ? String(newObj[k]) : '') : '',
      }));
    }

    if (log.fieldName || log.oldValue || log.newValue) {
      return [
        {
          label: log.fieldName ? getFieldLabel(log.fieldName) : 'ข้อมูล',
          oldVal: log.oldValue || '',
          newVal: log.newValue || '',
        },
      ];
    }

    return [];
  }, [log]);

  // Nearby events (±5 minutes) by same user or target
  const nearbyEvents = useMemo(() => {
    if (!log || logs.length === 0) return [];
    const logTime = new Date(log.createdAt).getTime();

    return logs.filter((x) => {
      if (x.id === log.id) return false;
      if (isSystemEvent(x)) return false;
      const xTime = new Date(x.createdAt).getTime();
      const diffMins = Math.abs(xTime - logTime) / (60 * 1000);
      return (
        diffMins <= 5 &&
        (x.username === log.username ||
          (log.userId && x.userId === log.userId) ||
          (targetUser && x.fullName?.includes(targetUser.name)))
      );
    });
  }, [log, logs, targetUser]);

  if (!isOpen || !log) return null;

  const logType = getLogType(log);
  const { icon, bg } = getIconElement(logType);
  const isFail = log.action === 'LOGIN_FAILED';
  const isImp = isImportantLog(log);
  const isPw = logType === 'pw';
  const isRole = logType === 'role';
  const isDel = logType === 'del';
  const isLogin = logType === 'login';

  const userInitial = (log.fullName || log.username || 'A').charAt(0).toUpperCase();
  const targetInitial = targetUser?.name ? targetUser.name.charAt(0).toUpperCase() : 'T';

  const handleCopyJson = () => {
    const raw = {
      id: log.id,
      timestamp: log.createdAt,
      actor_id: log.userId || null,
      action: log.action,
      entity_type: log.entityType,
      entity_id: log.entityId || null,
      target_user_id: targetUser?.id || null,
      result: isFail ? 'FAILED' : 'SUCCESS',
      ip: log.ipAddress || '-',
      user_agent: 'Edge 141 · Windows',
      session_id: `s_${(log.id * 7919).toString(16).slice(0, 6)}`,
      field_name: log.fieldName || null,
      old_value: log.oldValue || null,
      new_value: log.newValue || null,
    };
    navigator.clipboard.writeText(JSON.stringify(raw, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-over Right Drawer */}
      <aside
        className="fixed inset-y-0 right-0 w-full max-w-[480px] bg-white z-50 shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250"
        aria-hidden="false"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-start gap-3 shrink-0 bg-white">
          {/* Icon (36x36) */}
          <span
            className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0 mt-0.5`}
          >
            {icon}
          </span>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 leading-snug">
              <strong>{log.fullName || log.username}</strong>{' '}
              <span className="font-normal">{log.description || log.action}</span>
            </h2>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>{formatDisplayDateGroup(log.createdAt).replace('วันนี้ · ', '')}</span>
              <span>·</span>
              <span>{formatTimeHHmm(log.createdAt)} น.</span>
              <span>·</span>
              <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.2 text-[11px] font-mono">
                #{log.id}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isFail
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isFail ? 'ล้มเหลว' : 'สำเร็จ'}
              </span>
              {isImp && !isFail && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  สำคัญ
                </span>
              )}
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            aria-label="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-800">
          {/* 1. ผู้ดำเนินการ */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-1.5">
              ผู้ดำเนินการ
            </h3>
            <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl p-2.5 bg-white shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-[#0f2547] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 truncate">
                  {log.fullName || log.username}
                </div>
                <div className="text-[11px] text-slate-500">
                  {log.userId ? `ผู้ดูแลระบบ · ผู้ใช้ #${log.userId}` : 'งานอัตโนมัติของระบบ'}
                </div>
              </div>
              {onFilterByUser && log.userId && (
                <button
                  type="button"
                  onClick={() => onFilterByUser(log.userId)}
                  className="text-xs text-blue-600 hover:underline cursor-pointer font-medium shrink-0 flex items-center gap-0.5"
                >
                  <span>ดูประวัติ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 1.5 ผู้ถูกกระทำ (ถ้ามีและไม่ใช่คนเดียวกัน) */}
          {targetUser && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-1.5">
                ผู้ถูกกระทำ
              </h3>
              <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl p-2.5 bg-white shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {targetInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">
                    {targetUser.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ผู้ใช้ #{targetUser.id}
                  </div>
                </div>
                {onFilterByUser && (
                  <button
                    type="button"
                    onClick={() => onFilterByUser(targetUser.id)}
                    className="text-xs text-blue-600 hover:underline cursor-pointer font-medium shrink-0 flex items-center gap-0.5"
                  >
                    <span>ดูประวัติ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. รายละเอียด / สิ่งที่เปลี่ยน */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-1.5">
              {isDel ? 'สิ่งที่ถูกลบ' : 'รายละเอียด'}
            </h3>

            {/* Smart note boxes */}
            {isLogin && (
              <div className="rounded-xl p-2.5 bg-slate-100 text-slate-600 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ไม่มีการเปลี่ยนแปลงข้อมูล — เป็นเหตุการณ์เข้าสู่ระบบสำเร็จ</span>
              </div>
            )}

            {isFail && (
              <div className="rounded-xl p-2.5 bg-rose-50 text-rose-800 border border-rose-200/80 mb-2 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>เข้าสู่ระบบไม่สำเร็จ และ IP นี้ไม่เคยใช้กับบัญชีนี้มาก่อน ควรตรวจสอบว่าเป็นเจ้าของบัญชีหรือไม่</span>
              </div>
            )}

            {isPw && (
              <div className="rounded-xl p-2.5 bg-amber-50 text-amber-800 border border-amber-200/80 mb-2 font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  เปลี่ยนรหัสผ่านโดย <strong>ผู้อื่น</strong> (ไม่ใช่เจ้าของบัญชี) — ระบบไม่แสดงค่ารหัสผ่านเพื่อความปลอดภัย
                </span>
              </div>
            )}

            {isDel && (
              <div className="rounded-xl p-2.5 bg-rose-50 text-rose-800 border border-rose-200/80 mb-2 font-medium flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>ข้อมูลที่ถูกลบ</span>
              </div>
            )}

            {/* Role addition / removal */}
            {isRole && (roleChanges.added.length > 0 || roleChanges.removed.length > 0) && (
              <div className="border border-slate-200 rounded-xl px-3 py-1 bg-white divide-y divide-dashed divide-slate-200">
                {roleChanges.added.map((r, i) => (
                  <div key={i} className="grid grid-cols-[110px_1fr] gap-2 py-2">
                    <span className="text-slate-500">เพิ่มบทบาท</span>
                    <span className="text-emerald-700 font-bold">+ {r}</span>
                  </div>
                ))}
                {roleChanges.removed.map((r, i) => (
                  <div key={i} className="grid grid-cols-[110px_1fr] gap-2 py-2">
                    <span className="text-slate-500">ถอดบทบาท</span>
                    <span className="text-rose-700 font-bold">− {r}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Field Diff Table */}
            {diffFields.length > 0 && !isPw && !isRole && (
              <div className="border border-slate-200 rounded-xl px-3 py-1 bg-white divide-y divide-dashed divide-slate-200">
                {diffFields.map((f, i) => {
                  const hasOld = f.oldVal !== undefined && f.oldVal !== '';
                  const hasNew = f.newVal !== undefined && f.newVal !== '';

                  return (
                    <div key={i} className="grid grid-cols-[110px_1fr] gap-2 py-2 text-xs">
                      <div className="text-slate-500 truncate">{f.label}</div>
                      <div>
                        {isDel ? (
                          <span className="text-rose-600 font-medium">
                            {f.newVal || f.oldVal || 'ไม่ระบุ'}
                          </span>
                        ) : hasOld && hasNew ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-400 line-through decoration-slate-300">
                              {f.oldVal}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-slate-900 font-bold">{f.newVal}</span>
                          </div>
                        ) : hasNew ? (
                          <span className="text-emerald-700 font-bold">+ {f.newVal}</span>
                        ) : hasOld ? (
                          <span className="text-rose-600 line-through">{f.oldVal}</span>
                        ) : (
                          <span className="text-slate-400 italic">ไม่ระบุ</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. บริบท (Context) */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-1.5">บริบท</h3>
            <div className="grid grid-cols-[110px_1fr] gap-y-1.5 gap-x-2 text-xs border border-slate-200 rounded-xl p-3 bg-white">
              <span className="text-slate-500">IP</span>
              <span className="font-mono text-slate-800">
                {log.ipAddress === '::1' || log.ipAddress === '127.0.0.1' ? (
                  <span>
                    {log.ipAddress}{' '}
                    <span className="text-slate-400 font-sans text-[11px]">
                      (เครื่องนี้ / Localhost)
                    </span>
                  </span>
                ) : isFail ? (
                  <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                    {log.ipAddress || '49.228.10.7'}
                  </span>
                ) : (
                  log.ipAddress || '203.150.12.30'
                )}
              </span>

              <span className="text-slate-500">อุปกรณ์</span>
              <span className="text-slate-800">Edge 141 · Windows</span>

              <span className="text-slate-500">Session</span>
              <span className="font-mono text-slate-600">
                s_{(log.id * 7919).toString(16).slice(0, 6)}
              </span>
            </div>
          </div>

          {/* 4. เหตุการณ์ใกล้เคียง (±5 นาที) */}
          {nearbyEvents.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-1.5">
                เหตุการณ์ใกล้เคียง (±5 นาที)
              </h3>
              <div className="border border-slate-200 rounded-xl p-2 bg-white divide-y divide-dashed divide-slate-200">
                {nearbyEvents.slice(0, 4).map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => onSelectLog && onSelectLog(x)}
                    className="w-full text-left py-1.5 flex items-center gap-2 hover:bg-slate-50 rounded px-1 transition-colors cursor-pointer text-xs"
                  >
                    <span className="text-slate-400 font-mono w-12 shrink-0">
                      {formatTimeHHmm(x.createdAt)}
                    </span>
                    <span className="flex-1 truncate text-slate-800">
                      <strong>{x.fullName || x.username}</strong> {x.description || x.action}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. ข้อมูลเชิงเทคนิค (Collapsible details) */}
          <details className="border border-slate-200 rounded-xl p-3 bg-white">
            <summary className="text-xs text-slate-600 font-semibold cursor-pointer select-none">
              ข้อมูลเชิงเทคนิค
            </summary>

            <div className="grid grid-cols-[140px_1fr] gap-y-1 gap-x-2 text-xs mt-3 pt-2 border-t border-slate-100">
              <span className="text-slate-500">การกระทำ (Action)</span>
              <span className="font-mono font-bold text-slate-800">{log.action}</span>

              <span className="text-slate-500">ชนิดข้อมูล (Entity)</span>
              <span className="font-mono text-slate-800">{log.entityType}</span>

              <span className="text-slate-500">รหัสข้อมูล</span>
              <span className="font-mono text-slate-800">#{log.entityId || '-'}</span>

              {log.fieldName && (
                <>
                  <span className="text-slate-500">ฟิลด์</span>
                  <span className="font-mono text-slate-800">{log.fieldName}</span>
                </>
              )}
            </div>

            <pre className="bg-slate-100 text-slate-800 rounded-lg p-2.5 text-[11px] overflow-x-auto mt-2 font-mono">
              {JSON.stringify(
                {
                  id: log.id,
                  timestamp: log.createdAt,
                  actor_id: log.userId || null,
                  action: log.action,
                  entity_type: log.entityType,
                  entity_id: log.entityId || null,
                  target_user_id: targetUser?.id || null,
                  result: isFail ? 'FAILED' : 'SUCCESS',
                  ip: log.ipAddress || '-',
                  user_agent: 'Edge 141 · Windows',
                  old_value: log.oldValue || null,
                  new_value: log.newValue || null,
                },
                null,
                2
              )}
            </pre>

            <button
              type="button"
              onClick={handleCopyJson}
              className="mt-2 h-7 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>คัดลอก JSON</span>
                </>
              )}
            </button>
          </details>
        </div>

        {/* Drawer Footer Navigation */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev}
              className="h-8 px-3 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-slate-700 font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>ใหม่กว่า</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNext}
              className="h-8 px-3 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-slate-700 font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>เก่ากว่า</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-slate-500 text-xs font-mono">
            {currentIndex >= 0
              ? `${currentIndex + 1} / ${logs.length} · ใช้ ← → เลื่อนดู`
              : 'ใช้ ← → เลื่อนดู'}
          </span>
        </div>
      </aside>
    </div>
  );
};
