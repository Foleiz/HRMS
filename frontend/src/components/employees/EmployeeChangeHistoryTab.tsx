'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { History, Loader2, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';

interface FieldChange {
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
}

interface HistoryEntry {
  at: string;
  changedBy?: string | null;
  category: string;
  categoryKey: string;
  action: 'UPDATE' | 'INSERT' | 'DELETE' | 'REPLACE' | string;
  changes: FieldChange[];
}

const ACTION_LABEL: Record<string, { label: string; className: string }> = {
  UPDATE: { label: 'แก้ไข', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  INSERT: { label: 'เพิ่ม', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DELETE: { label: 'ลบ', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  REPLACE: { label: 'ปรับรายการ', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const formatDateTime = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime())
    ? v
    : d.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const apiMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** แท็บประวัติการเปลี่ยนแปลงข้อมูลพนักงาน (จาก audit log) */
export default function EmployeeChangeHistoryTab({ employeeId }: { employeeId: number }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('ALL');

  useEffect(() => {
    let active = true;
    apiClient
      .get<ApiResponse<HistoryEntry[]>>(`/employees/${employeeId}/change-history`)
      .then((res) => {
        if (!active) return;
        setEntries(res.data.data || []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(apiMessage(err, 'ไม่สามารถโหลดประวัติการเปลี่ยนแปลงได้'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [employeeId]);

  const categories = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    entries.forEach((e) => {
      const c = map.get(e.categoryKey) ?? { label: e.category, count: 0 };
      c.count += 1;
      map.set(e.categoryKey, c);
    });
    return Array.from(map.entries());
  }, [entries]);

  const filtered = category === 'ALL' ? entries : entries.filter((e) => e.categoryKey === category);

  return (
    <div className="pt-6 flex-1 text-xs animate-in fade-in duration-150 space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-[#0B2046]" />
        <h3 className="font-bold text-slate-800 text-sm">ประวัติการเปลี่ยนแปลงข้อมูล</h3>
      </div>

      {!loading && !error && entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory('ALL')}
            className={`px-3 py-1 rounded-full border cursor-pointer ${
              category === 'ALL' ? 'bg-[#0B2046] text-white border-[#0B2046]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด ({entries.length})
          </button>
          {categories.map(([key, c]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`px-3 py-1 rounded-full border cursor-pointer ${
                category === key ? 'bg-[#0B2046] text-white border-[#0B2046]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          ยังไม่มีประวัติการเปลี่ยนแปลง
        </p>
      ) : (
        <ol className="relative border-l border-slate-200 ml-2 space-y-4">
          {filtered.map((e, idx) => {
            const action = ACTION_LABEL[e.action] ?? ACTION_LABEL.UPDATE;
            return (
              <li key={`${e.at}-${idx}`} className="ml-4">
                <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-[#0B2046] ring-4 ring-white" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800">{formatDateTime(e.at)}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{e.category}</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${action.className}`}>{action.label}</span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <User className="w-3 h-3" /> {e.changedBy || 'ระบบ'}
                  </span>
                </div>
                <div className="mt-2 rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {e.changes.map((c, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-1 md:gap-3 px-3 py-2">
                      <span className="text-slate-500">{c.field}</span>
                      <span className="flex flex-wrap items-start gap-2 text-slate-800">
                        {c.oldValue != null && (
                          <span className="line-through text-slate-400 whitespace-pre-line break-words">{c.oldValue}</span>
                        )}
                        {c.oldValue != null && c.newValue != null && <ArrowRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />}
                        {c.newValue != null ? (
                          <span className="font-medium whitespace-pre-line break-words">{c.newValue}</span>
                        ) : (
                          c.oldValue == null && <span className="text-slate-400">-</span>
                        )}
                        {c.newValue == null && c.oldValue != null && <span className="text-slate-400">(ล้างค่า)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
