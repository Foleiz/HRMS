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
  ArrowUpDown,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toInputDate } from '@/components/ui/ThaiDatePicker';
import { LeaveDateRangePicker } from '@/components/leave/LeaveDateRangePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/Button';
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

/** วันที่ตามเวลาเครื่อง (yyyy-MM-dd) */
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
/** ค่าตัวกรองขั้นสูง (ร่างในแผงตัวกรอง → กด "ปรับใช้ตัวกรอง" แล้วจึงมีผล) */
interface HistoryFilter {
  category: string;
  rangePreset: RangePreset;
  dateFrom: string;
  dateTo: string;
  action: string;
  changedBy: string;
}
const EMPTY_FILTER: HistoryFilter = {
  category: 'ALL',
  rangePreset: 'ALL',
  dateFrom: '',
  dateTo: '',
  action: 'ALL',
  changedBy: 'ALL',
};
const filterLabelCls = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1';
const filterInputCls =
  'w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer';

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
    <div className="flex items-start gap-3 text-xs py-1.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
      {/* Field name */}
      <span className="w-36 shrink-0 text-slate-500 dark:text-slate-400 truncate pt-0.5 font-medium">
        {c.field}
      </span>

      {/* Value(s) */}
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        {isDelete && (
          <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            <Minus className="w-3 h-3 text-rose-500 inline shrink-0" />
            <span>{c.oldValue ?? <Empty />}</span>
          </span>
        )}
        {isInsert && (
          <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
            <Plus className="w-3 h-3 text-emerald-600 inline shrink-0" />
            <span>{c.newValue ?? <Empty />}</span>
          </span>
        )}
        {isUpdate && (
          <>
            <span className="text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600">
              {c.oldValue ?? <Empty />}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 mx-0.5" />
            <span className="text-slate-900 dark:text-slate-100 font-bold">
              {c.newValue ?? <Empty />}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Clean summary helper ───────────────────────────────────────── */
const cleanSummary = (summary?: string, fallback = '') => {
  if (!summary) return fallback;
  const fromIdx = summary.indexOf(' จาก ');
  const toIdx = summary.indexOf(' เป็น ', fromIdx + 6);
  if (fromIdx > 0 && toIdx > fromIdx) {
    return summary.substring(0, fromIdx);
  }
  const colonIdx = summary.indexOf(':');
  if (colonIdx > 0) {
    let base = summary.substring(0, colonIdx).trim();
    base = base.replace(/\s+\d+\s+ช่อง$/, '');
    return base;
  }
  const delIdx = summary.indexOf(' (เดิม ');
  if (delIdx > 0) {
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
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">
              {title}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <User className="w-3 h-3 text-slate-400" />
                <span>โดย <strong className="font-semibold text-slate-700 dark:text-slate-200">{e.changedBy || 'ระบบ'}</strong></span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium border border-slate-200/60 dark:border-slate-600">
                <CategoryIcon className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
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
          <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2 bg-slate-50/40 dark:bg-slate-800/40">
            {shown.map((c, i) => (
              <ChangeRow key={i} c={c} action={e.action} />
            ))}
            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
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
  const [filter, setFilter] = useState<HistoryFilter>(EMPTY_FILTER);
  const [draft, setDraft] = useState<HistoryFilter>(EMPTY_FILTER);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { category, rangePreset, dateFrom, dateTo } = filter;
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const topRef = useRef<HTMLDivElement>(null);

  const goToPage = (p: number) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleAdvanced = () => {
    if (!showAdvanced) setDraft(filter);
    setShowAdvanced((v) => !v);
  };
  const applyFilter = () => setFilter(draft);
  const clearFilter = () => {
    setDraft(EMPTY_FILTER);
    setFilter(EMPTY_FILTER);
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
  }, [filter, sortOrder]);

  /* Category filter chips (นับเฉพาะในช่วงวันที่ที่เลือก) เรียงตามจำนวนรายการมากไปน้อยตาม mockup */
  const categories = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    inRange.forEach((e) => {
      const c = map.get(e.categoryKey) ?? { label: e.category, count: 0 };
      c.count += 1;
      map.set(e.categoryKey, c);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [inRange]);

  /* ตัวเลือกในแผงตัวกรอง: การกระทำ และผู้แก้ไขที่มีอยู่จริงในประวัติ */
  const actionOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries]
  );
  const editorOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.changedBy?.trim()).filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, 'th')),
    [entries]
  );
  const activeFilterCount =
    (filter.category !== 'ALL' ? 1 : 0) +
    (filter.rangePreset !== 'ALL' ? 1 : 0) +
    (filter.action !== 'ALL' ? 1 : 0) +
    (filter.changedBy !== 'ALL' ? 1 : 0);

  /* กรองตามหมวดหมู่ การกระทำ ผู้แก้ไข แล้วเรียงลำดับวันที่ (ใหม่สุดก่อน / เก่าสุดก่อน) */
  const filtered = useMemo(() => {
    const list = inRange.filter(
      (e) =>
        (category === 'ALL' || e.categoryKey === category) &&
        (filter.action === 'ALL' || e.action === filter.action) &&
        (filter.changedBy === 'ALL' || e.changedBy?.trim() === filter.changedBy)
    );

    return [...list].sort((a, b) => {
      const tA = new Date(a.at).getTime();
      const tB = new Date(b.at).getTime();
      return sortOrder === 'desc' ? tB - tA : tA - tB;
    });
  }, [inRange, category, filter.action, filter.changedBy, sortOrder]);

  /* แบ่งหน้าตามจำนวนรายการ แล้วจัดกลุ่มตามวันในหน้านั้น */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageEntries = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  /* Group by date (รักษารูปแบบลำดับตาม sortOrder) */
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
      {/* ─── Row 1: Title + ปุ่มตัวกรองขั้นสูง ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
            <History className="w-4 h-4" />
          </span>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">ประวัติการเปลี่ยนแปลงข้อมูล</h3>
        </div>

        {!loading && !error && entries.length > 0 && (
          <button
            type="button"
            onClick={toggleAdvanced}
            aria-expanded={showAdvanced}
            className={`h-9 px-3.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto ${
              showAdvanced
                ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>ตัวกรองขั้นสูง</span>
            {activeFilterCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-bold inline-flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ─── Row 2: แผงตัวกรองขั้นสูง (รูปแบบเดียวกับบันทึกการใช้งานระบบ) ─── */}
      {showAdvanced && !loading && !error && entries.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className={filterLabelCls}>ช่วงเวลา</label>
              <CustomSelect
                value={draft.rangePreset === 'CUSTOM' ? 'ALL' : draft.rangePreset}
                onChange={(e) => setDraft((d) => ({ ...d, rangePreset: e.target.value as RangePreset, dateFrom: '', dateTo: '' }))}
                numbered={false}
                className={filterInputCls}
              >
                {RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </CustomSelect>
            </div>

            <div>
              <label className={filterLabelCls}>หรือเลือกช่วงวันที่</label>
              <LeaveDateRangePicker
                startDate={draft.dateFrom}
                endDate={draft.dateTo}
                onChange={(from, to) =>
                  setDraft((d) => ({ ...d, dateFrom: from, dateTo: to, rangePreset: from || to ? 'CUSTOM' : 'ALL' }))
                }
                className="h-9 w-full max-w-none py-0! px-3! text-xs! rounded-lg! border-slate-200! dark:border-slate-700! bg-slate-50! dark:bg-slate-800! text-slate-700! dark:text-slate-300!"
              />
            </div>

            <div>
              <label className={filterLabelCls}>หมวดข้อมูล</label>
              <CustomSelect
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                numbered={false}
                className={filterInputCls}
              >
                <option value="ALL">ทุกหมวด ({inRange.length})</option>
                {categories.map(([key, c]) => (
                  <option key={key} value={key}>{c.label} ({c.count})</option>
                ))}
              </CustomSelect>
            </div>

            <div>
              <label className={filterLabelCls}>ประเภทการกระทำ</label>
              <CustomSelect
                value={draft.action}
                onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
                numbered={false}
                className={filterInputCls}
              >
                <option value="ALL">ทั้งหมด</option>
                {actionOptions.map((a) => (
                  <option key={a} value={a}>{ACTION_CONFIG[a]?.label ?? a}</option>
                ))}
              </CustomSelect>
            </div>

            <div>
              <label className={filterLabelCls}>ผู้แก้ไข</label>
              <CustomSelect
                value={draft.changedBy}
                onChange={(e) => setDraft((d) => ({ ...d, changedBy: e.target.value }))}
                numbered={false}
                className={filterInputCls}
              >
                <option value="ALL">ผู้แก้ไขทั้งหมด</option>
                {editorOptions.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={clearFilter}
              className="h-8 px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>ล้างค่า</span>
            </button>
            <Button type="button" size="sm" onClick={applyFilter}>
              ปรับใช้ตัวกรอง
            </Button>
          </div>
        </div>
      )}

      {/* จำนวนรายการตามตัวกรอง */}
      {!loading && !error && entries.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            พบ <strong className="text-slate-700 dark:text-slate-200">{filtered.length.toLocaleString()}</strong>
            {activeFilterCount > 0 ? ` จาก ${entries.length.toLocaleString()} รายการตามตัวกรอง` : ' รายการ'}
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilter}
              className="text-primary dark:text-blue-400 font-semibold hover:underline cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      )}

      {/* ─── Row 3+: Timeline + Date Group Headers + Sort Toggle ─── */}
      {loading ? (
        <div className="py-16 flex items-center justify-center text-slate-400 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-primary" /> กำลังโหลด...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-sm">
          {entries.length === 0 ? 'ยังไม่มีประวัติการเปลี่ยนแปลง' : 'ไม่มีประวัติในช่วงวันที่หรือหมวดที่เลือก'}
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dk, dayEntries], idx) => (
            <div key={dk} className="space-y-2.5">
              {/* Date Header + Horizontal Divider Line + Sort Button (on first group) */}
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">
                <div className="flex items-center gap-1.5 shrink-0 text-slate-800 dark:text-slate-200">
                  <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="font-bold">{formatDateShort(dayEntries[0].at)}</span>
                </div>

                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />

                {idx === 0 && (
                  <button
                    type="button"
                    onClick={() => setSortOrder((p) => (p === 'desc' ? 'asc' : 'desc'))}
                    className="inline-flex items-center gap-1.5 shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 transition-colors cursor-pointer select-none"
                    title={`สลับลำดับวันที่ (ปัจจุบัน: ${sortOrder === 'desc' ? 'ใหม่สุดก่อน' : 'เก่าสุดก่อน'})`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>{sortOrder === 'desc' ? 'ใหม่สุดก่อน' : 'เก่าสุดก่อน'}</span>
                  </button>
                )}
              </div>

              {/* Entry cards */}
              <div className="space-y-3">
                {dayEntries.map((e, eIdx) => (
                  <EntryCard key={`${e.at}-${eIdx}`} e={e} />
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
