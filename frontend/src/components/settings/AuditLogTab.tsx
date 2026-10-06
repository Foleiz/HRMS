'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Key,
  Shield,
  Pencil,
  X,
  Plus,
  Settings as SettingsIcon,
  Layers,
} from 'lucide-react';
import { AuditLogItem, UserAccount } from '@/types/settings';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';

interface AuditLogTabProps {
  logs: AuditLogItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageSizeChange?: (size: number) => void;
  users: UserAccount[];
  onPageChange: (page: number) => void;
  onFilterChange: (filters: {
    startDate?: string;
    endDate?: string;
    userId?: number;
    action?: string;
    entityType?: string;
    search?: string;
  }) => void;
  onExport: () => void;
  onViewDetail: (log: AuditLogItem) => void;
  isLoading: boolean;
}

export type QuickTab = 'all' | 'imp' | 'sec' | 'data' | 'sys';

export const isSystemEvent = (item: AuditLogItem) => {
  const u = (item.username || '').toLowerCase();
  const act = (item.action || '').toUpperCase();
  const ent = (item.entityType || '').toLowerCase();
  return (
    u === 'system' ||
    u === 'ระบบ' ||
    act === 'CLEANUP' ||
    ent === 'session' ||
    ent.includes('system')
  );
};

export const isImportantLog = (item: AuditLogItem) => {
  const act = (item.action || '').toUpperCase();
  const desc = (item.description || '').toLowerCase();
  const ent = (item.entityType || '').toLowerCase();
  return (
    act === 'DELETE' ||
    act === 'LOGIN_FAILED' ||
    act === 'EXPORT' ||
    desc.includes('รหัสผ่าน') ||
    desc.includes('password') ||
    ent.includes('role') ||
    ent.includes('user_role') ||
    (ent.includes('user') && act === 'UPDATE')
  );
};

export const isSecurityLog = (item: AuditLogItem) => {
  const act = (item.action || '').toUpperCase();
  const desc = (item.description || '').toLowerCase();
  const ent = (item.entityType || '').toLowerCase();
  return (
    act === 'LOGIN' ||
    act === 'LOGOUT' ||
    act === 'LOGIN_FAILED' ||
    act === 'EXPORT' ||
    ent === 'auth' ||
    desc.includes('รหัสผ่าน') ||
    desc.includes('password')
  );
};

export const isDataEditLog = (item: AuditLogItem) => {
  const act = (item.action || '').toUpperCase();
  return act === 'UPDATE' || act === 'INSERT' || act === 'DELETE';
};

export const getLogType = (
  item: AuditLogItem
): 'login' | 'fail' | 'pw' | 'role' | 'edit' | 'del' | 'exp' | 'sys' => {
  const act = (item.action || '').toUpperCase();
  const desc = (item.description || '').toLowerCase();
  const ent = (item.entityType || '').toLowerCase();

  if (act === 'LOGIN_FAILED') return 'fail';
  if (desc.includes('รหัสผ่าน') || desc.includes('password')) return 'pw';
  if (ent.includes('role') || ent.includes('user_role')) return 'role';
  if (act === 'LOGIN' || act === 'LOGOUT') return 'login';
  if (act === 'DELETE') return 'del';
  if (act === 'UPDATE' || act === 'INSERT') return 'edit';
  if (act === 'EXPORT') return 'exp';
  if (isSystemEvent(item)) return 'sys';
  return 'edit';
};

export const getIconElement = (type: ReturnType<typeof getLogType>) => {
  switch (type) {
    case 'login':
      return { icon: <ArrowRight className="w-3.5 h-3.5 text-slate-500" />, bg: 'bg-slate-100 dark:bg-slate-800' };
    case 'fail':
      return { icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />, bg: 'bg-rose-100 dark:bg-rose-950/50' };
    case 'pw':
      return { icon: <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />, bg: 'bg-amber-100 dark:bg-amber-950/50' };
    case 'role':
      return { icon: <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />, bg: 'bg-amber-100 dark:bg-amber-950/50' };
    case 'edit':
      return { icon: <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />, bg: 'bg-blue-100 dark:bg-blue-950/50' };
    case 'del':
      return { icon: <X className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />, bg: 'bg-rose-100 dark:bg-rose-950/50' };
    case 'exp':
      return { icon: <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />, bg: 'bg-amber-100 dark:bg-amber-950/50' };
    case 'sys':
      return { icon: <SettingsIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />, bg: 'bg-slate-100 dark:bg-slate-800' };
  }
};

export const formatDisplayDateGroup = (isoString: string) => {
  try {
    const d = new Date(isoString);
    const now = new Date();

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const thaiYear = d.getFullYear() + 543;
    const formatted = `${d.getDate()} ${months[d.getMonth()]} ${thaiYear}`;

    if (isToday) return `วันนี้ · ${formatted}`;
    if (isYesterday) return `เมื่อวาน · ${formatted}`;
    return formatted;
  } catch {
    return isoString;
  }
};

export const formatTimeHHmm = (isoString?: string) => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '-';
  }
};

const dateOnlyKey = (isoString: string) => {
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? isoString : d.toISOString().slice(0, 10);
  } catch {
    return isoString;
  }
};

export const AuditLogTab: React.FC<AuditLogTabProps> = ({
  logs,
  totalCount,
  currentPage,
  pageSize,
  onPageSizeChange,
  users,
  onPageChange,
  onFilterChange,
  onExport,
  onViewDetail,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<QuickTab>('all');
  const [selectedRange, setSelectedRange] = useState<number | 'all'>('all');
  const [showSystemEvents, setShowSystemEvents] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('ทั้งหมด');
  const [selectedAction, setSelectedAction] = useState<string>('ทั้งหมด');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ทั้งหมด');

  // Handle Range Selection (วันนี้ = 0, 7 วัน = 7, 30 วัน = 30)
  const handleRangeChange = (days: number | 'all') => {
    setSelectedRange(days);
    if (days === 'all') {
      setStartDate('');
      setEndDate('');
      onFilterChange({
        startDate: undefined,
        endDate: undefined,
        search: searchQuery.trim() || undefined,
      });
    } else {
      const now = new Date();
      const end = now.toISOString().slice(0, 10);
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
      onFilterChange({
        startDate: start,
        endDate: end,
        search: searchQuery.trim() || undefined,
      });
    }
  };

  const handleApplyFilter = () => {
    onFilterChange({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      userId: selectedUserId !== 'ทั้งหมด' ? Number(selectedUserId) : undefined,
      action: selectedAction !== 'ทั้งหมด' ? selectedAction : undefined,
      entityType: selectedEntityType !== 'ทั้งหมด' ? selectedEntityType : undefined,
      search: searchQuery.trim() || undefined,
    });
  };

  const handleClearFilter = () => {
    setSelectedRange('all');
    setStartDate('');
    setEndDate('');
    setSelectedUserId('ทั้งหมด');
    setSelectedAction('ทั้งหมด');
    setSelectedEntityType('ทั้งหมด');
    setSearchQuery('');
    setActiveTab('all');
    onFilterChange({});
  };

  // Filter pass function
  const passesFilter = (item: AuditLogItem, tab: QuickTab) => {
    const isSys = isSystemEvent(item);
    if (!showSystemEvents && isSys && tab === 'all') {
      return false;
    }
    if (tab === 'imp' && !isImportantLog(item)) return false;
    if (tab === 'sec' && !isSecurityLog(item)) return false;
    if (tab === 'data' && !isDataEditLog(item)) return false;
    if (tab === 'sys' && !isSys) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${item.fullName} ${item.username} ${item.description} ${item.action} ${item.ipAddress} ${item.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: logs.filter((e) => passesFilter(e, 'all')).length,
      imp: logs.filter((e) => passesFilter(e, 'imp')).length,
      sec: logs.filter((e) => passesFilter(e, 'sec')).length,
      data: logs.filter((e) => passesFilter(e, 'data')).length,
      sys: logs.filter((e) => isSystemEvent(e)).length,
    };
  }, [logs, showSystemEvents, searchQuery]);

  // Filtered logs
  const displayLogs = useMemo(() => {
    return logs.filter((e) => passesFilter(e, activeTab));
  }, [logs, activeTab, showSystemEvents, searchQuery]);

  // Group by date
  const groupedLogs = useMemo(() => {
    const map = new Map<string, AuditLogItem[]>();
    displayLogs.forEach((item) => {
      const key = dateOnlyKey(item.createdAt);
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [displayLogs]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="space-y-3.5 font-sans animate-in fade-in duration-150">
      {/* 1. Header (Title + Export button) */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
          บันทึกการใช้งานระบบ
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`h-8.5 px-3 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showAdvanced
                ? 'bg-slate-100 border-slate-300 text-slate-800'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>ตัวกรองขั้นสูง</span>
          </button>

          <button
            type="button"
            onClick={onExport}
            className="h-8.5 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>ส่งออก (ตามตัวกรอง)</span>
          </button>
        </div>
      </div>

      {/* 2. Top Filter Bar (Sticky friendly) */}
      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
        {/* Row 1: Search + Segmented Range */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
              placeholder="ค้นหา เช่น ชื่อผู้ใช้, รหัสข้อมูล, IP…"
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            />
          </div>

          {/* Segmented Button (วันนี้ / 7 วัน / 30 วัน) */}
          <div className="flex bg-slate-200/70 p-1 rounded-xl gap-0.5 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => handleRangeChange('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedRange === 'all'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange(0)}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedRange === 0
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange(7)}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedRange === 7
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 วัน
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange(30)}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedRange === 30
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 วัน
            </button>
          </div>
        </div>

        {/* Row 2: Category Tabs + System Events Checkbox */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-[#0f2547] text-white border-[#0f2547] shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ทั้งหมด</span>
              <span className="opacity-80 font-normal">{tabCounts.all}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('imp')}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'imp'
                  ? 'bg-[#0f2547] text-white border-[#0f2547] shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === 'imp' ? 'text-amber-300' : 'text-amber-500'}`} />
              <span>สำคัญ</span>
              <span className="opacity-80 font-normal">{tabCounts.imp}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sec')}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sec'
                  ? 'bg-[#0f2547] text-white border-[#0f2547] shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${activeTab === 'sec' ? 'text-sky-300' : 'text-sky-500'}`} />
              <span>ความปลอดภัย</span>
              <span className="opacity-80 font-normal">{tabCounts.sec}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'data'
                  ? 'bg-[#0f2547] text-white border-[#0f2547] shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Pencil className={`w-3.5 h-3.5 ${activeTab === 'data' ? 'text-blue-300' : 'text-blue-500'}`} />
              <span>แก้ไขข้อมูล</span>
              <span className="opacity-80 font-normal">{tabCounts.data}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sys')}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sys'
                  ? 'bg-[#0f2547] text-white border-[#0f2547] shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <SettingsIcon className={`w-3.5 h-3.5 ${activeTab === 'sys' ? 'text-slate-300' : 'text-slate-500'}`} />
              <span>ระบบ</span>
              <span className="opacity-80 font-normal">{tabCounts.sys}</span>
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSystemEvents}
              onChange={(e) => setShowSystemEvents(e.target.checked)}
              className="rounded border-slate-300 text-[#0f2547] focus:ring-0 cursor-pointer"
            />
            <span>แสดงเหตุการณ์อัตโนมัติของระบบ</span>
          </label>
        </div>
      </div>

      {/* Advanced Filter Collapse Box */}
      {showAdvanced && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                วันที่เริ่มต้น - สิ้นสุด
              </label>
              <div className="flex items-center gap-1.5">
                <ThaiDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="เริ่มต้น"
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <span className="text-slate-400 text-xs">-</span>
                <ThaiDatePicker
                  min={startDate || undefined}
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="สิ้นสุด"
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ผู้ใช้งาน
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ทั้งหมด">ผู้ใช้งานทั้งหมด</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.fullName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ประเภทการกระทำ
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ทั้งหมด">ทั้งหมด</option>
                <option value="INSERT">สร้างข้อมูลใหม่</option>
                <option value="UPDATE">แก้ไขข้อมูล</option>
                <option value="DELETE">ลบข้อมูล</option>
                <option value="LOGIN">เข้าสู่ระบบ</option>
                <option value="LOGIN_FAILED">เข้าสู่ระบบไม่สำเร็จ</option>
                <option value="LOGOUT">ออกจากระบบ</option>
                <option value="APPROVE">อนุมัติ</option>
                <option value="REJECT">ปฏิเสธ</option>
                <option value="EXPORT">ส่งออก</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                โมดูล
              </label>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ทั้งหมด">ทุกประเภทข้อมูล</option>
                <option value="employee">ข้อมูลพนักงาน</option>
                <option value="user_account">บัญชีผู้ใช้งาน</option>
                <option value="role">บทบาทและสิทธิ์</option>
                <option value="approval_flow">สายการอนุมัติ</option>
                <option value="leave_request">การลา</option>
                <option value="attendance_daily">เวลาทำงาน</option>
                <option value="document">เอกสาร</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClearFilter}
              className="h-8 px-3 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>ล้างค่า</span>
            </button>
            <button
              type="button"
              onClick={handleApplyFilter}
              className="h-8 px-4 bg-[#0f2547] text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
            >
              ปรับใช้ตัวกรอง
            </button>
          </div>
        </div>
      )}

      {/* Summary Count Text */}
      <div className="text-xs text-slate-500 pt-0.5">
        พบ {displayLogs.length} รายการ (จากทั้งหมด {totalCount.toLocaleString()} ในฐานข้อมูล)
      </div>

      {/* 3. Grouped Date List */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          กำลังโหลดบันทึกการใช้งานระบบ...
        </div>
      ) : displayLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          ไม่พบรายการ ลองขยายช่วงเวลาหรือเปิดการแสดงเหตุการณ์ของระบบ
        </div>
      ) : (
        <div className="space-y-4">
          {groupedLogs.map(([dk, dayItems]) => (
            <div key={dk} className="space-y-1.5">
              {/* Day Header with trailing line */}
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 pl-0.5">
                <span>{formatDisplayDateGroup(dayItems[0].createdAt)}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Day List Container */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                {dayItems.map((item) => {
                  const type = getLogType(item);
                  const { icon, bg } = getIconElement(type);
                  const isFail = item.action === 'LOGIN_FAILED';
                  const isImp = isImportantLog(item);
                  const isSys = isSystemEvent(item);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onViewDetail(item)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                        isSys ? 'opacity-65' : ''
                      }`}
                    >
                      {/* Round Icon */}
                      <span
                        className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}
                      >
                        {icon}
                      </span>

                      {/* Time */}
                      <span className="text-xs text-slate-400 font-mono w-11 shrink-0">
                        {formatTimeHHmm(item.createdAt)}
                      </span>

                      {/* Text */}
                      <div className="flex-1 min-w-0 text-xs text-slate-700 truncate">
                        <strong className="font-bold text-slate-900 mr-1.5">
                          {item.fullName || item.username}
                        </strong>
                        <span>{item.description || item.action}</span>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isFail && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                            <span>ล้มเหลว</span>
                          </span>
                        )}
                        {isImp && !isFail && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            <span>สำคัญ</span>
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Footer Pagination */}
      <div className="py-2.5 px-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span>แสดง</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              if (onPageSizeChange) onPageSizeChange(newSize);
              onPageChange(1);
            }}
            className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span>แถวต่อหน้า</span>
          <span className="text-slate-400 text-[11px]">
            (ทั้งหมด {totalCount.toLocaleString()} รายการ)
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {getPageNumbers().map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold ${
                currentPage === p
                  ? 'bg-[#0f2547] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
