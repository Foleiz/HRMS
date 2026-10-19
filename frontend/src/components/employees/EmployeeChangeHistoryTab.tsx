'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  History,
  Loader2,
  AlertTriangle,
  Pencil,
  X,
  Plus,
  Minus,
  ArrowRight,
  RefreshCw,
  MoveRight,
  User,
  Calendar,
  CreditCard,
  FileText,
  MapPin,
  Phone,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toInputDate } from '@/components/ui/ThaiDatePicker';
import { LeaveDateRangePicker } from '@/components/leave/LeaveDateRangePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { ApiResponse } from '@/types/api';

/* ─── Types ─────────────────────────────────────────────────────── */
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
  action: 'UPDATE' | 'INSERT' | 'DELETE' | 'REPLACE' | 'MOVE' | string;
  summary?: string;
  changes: FieldChange[];
}

/* ─── Action config ──────────────────────────────────────────────── */
const ACTION_CONFIG: Record<
  string,
  {
    Icon: React.ElementType;
    bg: string;
    iconColor: string;
    label: string;
    border: string;
  }
> = {
  UPDATE: {
    Icon: Pencil,
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    label: 'แก้ไข',
    border: 'border-blue-200 dark:border-blue-900',
  },
  INSERT: {
    Icon: Plus,
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    label: 'เพิ่ม',
    border: 'border-emerald-200 dark:border-emerald-900',
  },
  DELETE: {
    Icon: X,
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
    label: 'ลบ',
    border: 'border-rose-200 dark:border-rose-900',
  },
  REPLACE: {
    Icon: RefreshCw,
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    label: 'ปรับรายการ',
    border: 'border-amber-200 dark:border-amber-900',
  },
  MOVE: {
    Icon: MoveRight,
    bg: 'bg-violet-50 dark:bg-violet-950/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
    label: 'เปลี่ยนตำแหน่ง/สังกัด',
    border: 'border-violet-200 dark:border-violet-900',
  },
};

/* ─── Category Icon helper ───────────────────────────────────────── */
const getCategoryIcon = (key: string) => {
  const k = key.toLowerCase();
  if (k.includes('bank') || k.includes('บัญชี') || k.includes('เงิน')) return CreditCard;
  if (k.includes('personal') || k.includes('profile') || k.includes('ส่วนตัว')) return User;
  if (k.includes('doc') || k.includes('file') || k.includes('เอกสาร')) return FileText;
  if (k.includes('address') || k.includes('ที่อยู่')) return MapPin;
  if (k.includes('contact') || k.includes('โทร') || k.includes('ติดต่อ')) return Phone;
  return Tag;
};

/* ─── Helpers ────────────────────────────────────────────────────── */
const formatDateShort = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime())
    ? v
    : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTimeOnly = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime())
    ? v
    : d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

/** วันที่ตามเวลาเครื่อง (yyyy-MM-dd) — เดิมใช้ toISOString ทำให้รายการหลังเที่ยงคืนไทยไปอยู่วันก่อนหน้า */
const dateKey = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : toInputDate(d);
};

type RangePreset = 'ALL' | '7D' | '30D' | '90D' | 'CUSTOM';
const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'ALL', label: 'ทุกช่วงเวลา' },
  { value: '7D', label: '7 วันล่าสุด' },
  { value: '30D', label: '30 วันล่าสุด' },
  { value: '90D', label: '3 เดือนล่าสุด' },
];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toInputDate(d);
};

const apiMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const Empty = () => <span className="text-slate-400 italic">(ว่าง)</span>;

/* ─── Inline change row ──────────────────────────────────────────── */
function ChangeRow({ c, action }: { c: FieldChange; action: string }) {
  const isDelete = action === 'DELETE' || (c.newValue == null && c.oldValue != null);
  const isInsert = action === 'INSERT' || (c.oldValue == null && c.newValue != null && action !== 'MOVE');
  const isUpdate = !isDelete && !isInsert;

  return (
    <div className="flex items-start gap-3 text-xs py-1.5 border-b border-slate-100 last:border-0">
      {/* Field name */}
      <span className="w-36 shrink-0 text-slate-500 truncate pt-0.5 font-medium">
        {c.field}
      </span>

      {/* Value(s) */}
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        {isDelete && (
          <span className="text-rose-600 font-medium flex items-center gap-1">
            <Minus className="w-3 h-3 text-rose-500 inline shrink-0" />
            <span>{c.oldValue ?? <Empty />}</span>
          </span>
        )}
        {isInsert && (
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <Plus className="w-3 h-3 text-emerald-600 inline shrink-0" />
            <span>{c.newValue ?? <Empty />}</span>
          </span>
        )}
        {isUpdate && (
          <>
            <span className="text-slate-400 line-through decoration-slate-300">
              {c.oldValue ?? <Empty />}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 mx-0.5" />
            <span className="text-slate-900 font-bold">
              {c.newValue ?? <Empty />}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Clean summary helper (แสดงแค่ชื่อการเปลี่ยน ไม่ต้องบอกจากอะไรเป็นอะไร) ─── */
const cleanSummary = (summary?: string, fallback = '') => {
  if (!summary) return fallback;
  // ตัดส่วน " จาก ... เป็น ..." ออก เช่น "เปลี่ยนเลขประกันสังคม จาก ... เป็น ..." -> "เปลี่ยนเลขประกันสังคม"
  const fromIdx = summary.indexOf(' จาก ');
  const toIdx = summary.indexOf(' เป็น ', fromIdx + 6);
  if (fromIdx > 0 && toIdx > fromIdx) {
    return summary.substring(0, fromIdx);
  }
  // ตัด ": <value>" เช่น "กรอกเลขประจำตัวประชาชน: 1-xxxx" -> "กรอกเลขประจำตัวประชาชน"
  const colonIdx = summary.indexOf(': ');
  if (colonIdx > 0 && summary.startsWith('กรอก')) {
    return summary.substring(0, colonIdx);
  }
  // ตัด " (เดิม ...)" เช่น "ลบค่าเลขประกันสังคม (เดิม 1-xxxx)" -> "ลบค่าเลขประกันสังคม"
  const delIdx = summary.indexOf(' (เดิม ');
  if (delIdx > 0 && summary.startsWith('ลบค่า')) {
    return summary.substring(0, delIdx);
  }
  if (summary.startsWith('ตั้งหัวหน้างานโดยตรงเป็น ')) {
    return 'เปลี่ยนหัวหน้างานโดยตรง';
  }
  return summary;
};

/* ─── Entry card ─────────────────────────────────────────────────── */
const SHOW_LIMIT = 3;

function EntryCard({ e }: { e: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTION_CONFIG[e.action] ?? ACTION_CONFIG.UPDATE;
  const { Icon } = cfg;
  const CategoryIcon = getCategoryIcon(e.categoryKey);

  const shown = expanded ? e.changes : e.changes.slice(0, SHOW_LIMIT);
  const hidden = e.changes.length - SHOW_LIMIT;
  const title = cleanSummary(e.summary, cfg.label);

  return (
    <div className="flex items-start gap-3">
      {/* Action icon (Lucide) */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center mt-0.5 shadow-2xs`}
      >
        <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-snug">
              {title}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-slate-500">
                <User className="w-3 h-3 text-slate-400" />
                <span>โดย <strong className="font-semibold text-slate-700">{e.changedBy || 'ระบบ'}</strong></span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200/60">
                <CategoryIcon className="w-2.5 h-2.5 text-slate-500" />
                <span>{e.category}</span>
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono shrink-0 pt-0.5">
            {formatTimeOnly(e.at)} น.
          </span>
        </div>

        {/* Change rows */}
        {e.changes.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/40">
            {shown.map((c, i) => (
              <ChangeRow key={i} c={c} action={e.action} />
            ))}
            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="mt-1 text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {expanded ? (
                  <>
                    <span>แสดงน้อยลง</span>
                    <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <span>ดูอีก {hidden} ช่อง</span>
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function EmployeeChangeHistoryTab({ employeeId }: { employeeId: number }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('ALL');
  const [rangePreset, setRangePreset] = useState<RangePreset>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const topRef = useRef<HTMLDivElement>(null);
  /* เปลี่ยนหน้าแล้วเลื่อนกลับขึ้นไปหัวรายการ (ปุ่มเปลี่ยนหน้าอยู่ท้ายรายการ) */
  const goToPage = (p: number) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  /* ช่วงวันที่ที่เลือก (yyyy-MM-dd ตามเวลาเครื่อง) */
  const [rangeFrom, rangeTo] = useMemo((): [string, string] => {
    switch (rangePreset) {
      case '7D': return [daysAgo(6), ''];
      case '30D': return [daysAgo(29), ''];
      case '90D': return [daysAgo(89), ''];
      // ระหว่างเลือก (มีแค่วันเริ่ม) ให้กรองเฉพาะวันนั้นไปก่อน
      case 'CUSTOM': return [dateFrom, dateTo || dateFrom];
      default: return ['', ''];
    }
  }, [rangePreset, dateFrom, dateTo]);

  const inRange = useMemo(
    () => entries.filter((e) => {
      const k = dateKey(e.at);
      return (!rangeFrom || k >= rangeFrom) && (!rangeTo || k <= rangeTo);
    }),
    [entries, rangeFrom, rangeTo]
  );

  useEffect(() => {
    setPage(1);
  }, [category, rangeFrom, rangeTo]);

  /* Category filter chips (นับเฉพาะในช่วงวันที่ที่เลือก) */
  const categories = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    inRange.forEach((e) => {
      const c = map.get(e.categoryKey) ?? { label: e.category, count: 0 };
      c.count += 1;
      map.set(e.categoryKey, c);
    });
    return Array.from(map.entries());
  }, [inRange]);

  const filtered = category === 'ALL'
    ? inRange
    : inRange.filter((e) => e.categoryKey === category);

  /* แบ่งหน้าตามจำนวนรายการ แล้วจัดกลุ่มตามวันในหน้านั้น */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageEntries = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  /* Group by date */
  const grouped = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    pageEntries.forEach((e) => {
      const key = dateKey(e.at);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [pageEntries]);

  return (
    <div ref={topRef} className="pt-6 flex-1 text-xs animate-in fade-in duration-150 space-y-4 scroll-mt-24">
      {/* Title + date range filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ประวัติการเปลี่ยนแปลงข้อมูล</h3>
        </div>
        {!loading && !error && entries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect
              // เลือกช่วงวันที่เอง → ปุ่มนี้ยังแสดง "ทุกช่วงเวลา" (กดเลือกอีกครั้งเพื่อล้างวันที่)
              value={rangePreset === 'CUSTOM' ? 'ALL' : rangePreset}
              onChange={(e) => {
                // เลือกช่วงสำเร็จรูป = ยกเลิกช่วงวันที่ที่เลือกเอง
                setRangePreset(e.target.value as RangePreset);
                setDateFrom('');
                setDateTo('');
              }}
              numbered={false}
              placeholder="ทุกช่วงเวลา"
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </CustomSelect>
            {/* เลือกช่วงวันที่เอง (คลิกวันเริ่ม แล้วคลิกวันสิ้นสุด) */}
            <LeaveDateRangePicker
              startDate={dateFrom}
              endDate={dateTo}
              onChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
                setRangePreset(from || to ? 'CUSTOM' : 'ALL');
              }}
              align="right"
              className="w-[230px] max-w-none py-1.5! text-xs! rounded-lg!"
            />
          </div>
        )}
      </div>

      {/* Category chips with Lucide icons */}
      {!loading && !error && entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setCategory('ALL')}
            className={`px-3 py-1.5 rounded-full border cursor-pointer transition-colors flex items-center gap-1.5 ${
              category === 'ALL'
                ? 'bg-[#0B2046] text-white border-[#0B2046] shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>ทั้งหมด</span>
            <span className="opacity-80 font-normal">({inRange.length})</span>
          </button>

          {categories.map(([key, c]) => {
            const CatIcon = getCategoryIcon(key);
            const isSelected = category === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`px-3 py-1.5 rounded-full border cursor-pointer transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0B2046] text-white border-[#0B2046] shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CatIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span>{c.label}</span>
                <span className="opacity-80 font-normal">({c.count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="py-16 flex items-center justify-center text-slate-400 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[#0B2046]" /> กำลังโหลด...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm">
          {entries.length === 0 ? 'ยังไม่มีประวัติการเปลี่ยนแปลง' : 'ไม่มีประวัติในช่วงวันที่หรือหมวดที่เลือก'}
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dk, dayEntries]) => (
            <div key={dk} className="space-y-2.5">
              {/* Date header with trailing line and Calendar icon */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pl-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDateShort(dayEntries[0].at)}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Entry cards */}
              <div className="space-y-3">
                {dayEntries.map((e, idx) => (
                  <EntryCard key={`${e.at}-${idx}`} e={e} />
                ))}
              </div>
            </div>
          ))}
          <TablePagination
            total={filtered.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={goToPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}
