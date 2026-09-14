'use client';

import React from 'react';
import { X, FileText, User, Globe, Calendar, ArrowRight } from 'lucide-react';
import { AuditLogItem } from '@/types/settings';

interface AuditLogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLogItem | null;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  isOpen,
  onClose,
  log,
}) => {
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                รายละเอียดการเปลี่ยนแปลง (Audit Log #{log.id})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {formatDate(log.createdAt)}
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

        <div className="p-6 space-y-5 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <div>
              <span className="text-[11px] text-slate-400">ผู้ใช้งาน:</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{log.username} ({log.fullName})</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400">การกระทำ (Action):</span>
              <div className="font-semibold text-slate-800 mt-0.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {log.action}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400">ประเภทข้อมูล / ตาราง:</span>
              <div className="font-semibold text-slate-800 mt-0.5">
                {log.entityType} {log.entityId ? `#${log.entityId}` : ''}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400">IP Address:</span>
              <div className="font-mono text-slate-700 flex items-center gap-1.5 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>{log.ipAddress || '-'}</span>
              </div>
            </div>
          </div>

          {/* Change Data Capture (CDC: Old vs New) */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <span>ฟิลด์ที่แก้ไข:</span>
              <span className="font-mono text-indigo-600 font-semibold">{log.fieldName || 'ข้อมูลทั่วไป'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Old Value */}
              <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl">
                <span className="text-[11px] font-bold text-rose-600 block mb-1">
                  ค่าเดิม (Old Value):
                </span>
                <div className="font-mono text-[11px] text-rose-800 break-all bg-white/70 p-2.5 rounded-lg border border-rose-100">
                  {log.oldValue || '<ว่าง>'}
                </div>
              </div>

              {/* New Value */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <span className="text-[11px] font-bold text-emerald-600 block mb-1">
                  ค่าใหม่ (New Value):
                </span>
                <div className="font-mono text-[11px] text-emerald-800 break-all bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                  {log.newValue || '<ว่าง>'}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Description */}
          {log.description && (
            <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600">
              <span className="font-semibold text-slate-700 block mb-0.5">คำอธิบายเพิ่มเติม:</span>
              <span>{log.description}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
