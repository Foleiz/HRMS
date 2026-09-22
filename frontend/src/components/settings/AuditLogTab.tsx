'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { AuditLogItem, UserAccount } from '@/types/settings';
import { settingsService } from '@/services/settingsService';

interface AuditLogTabProps {
  logs: AuditLogItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
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

const ACTION_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  INSERT: { label: 'สร้างใหม่', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  UPDATE: { label: 'แก้ไข', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  DELETE: { label: 'ลบ', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  LOGIN: { label: 'เข้าสู่ระบบ', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  LOGOUT: { label: 'ออกจากระบบ', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  APPROVE: { label: 'อนุมัติ', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  REJECT: { label: 'ปฏิเสธ', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  EXPORT: { label: 'ส่งออก', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300' },
};

const ENTITY_TRANSLATIONS: Record<string, string> = {
  employee: 'ข้อมูลพนักงาน',
  user_account: 'บัญชีผู้ใช้งาน',
  useraccount: 'บัญชีผู้ใช้งาน',
  role: 'บทบาทและสิทธิ์',
  approval_flow: 'สายการอนุมัติ',
  approvalflow: 'สายการอนุมัติ',
  approval_instance: 'การขออนุมัติ',
  approvalinstance: 'การขออนุมัติ',
  leave_request: 'การขออนุมัติลา',
  leaverequest: 'การขออนุมัติลา',
  leave_balance: 'ยอดวันลาคงเหลือ',
  leavebalance: 'ยอดวันลาคงเหลือ',
  attendance_daily: 'เวลาทำงาน',
  attendancedaily: 'เวลาทำงาน',
  announcement: 'ประกาศองค์กร',
  notification: 'การแจ้งเตือน',
  certificate_request: 'ขอหนังสือรับรอง',
  certificaterequest: 'ขอหนังสือรับรอง',
  employment_contract: 'สัญญาจ้างงาน',
  employmentcontract: 'สัญญาจ้างงาน',
  salary_structure: 'รายงานเงินเดือน',
  salarystructure: 'รายงานเงินเดือน',
  department: 'แผนก',
  division: 'ฝ่าย',
  position: 'ตำแหน่ง',
  company: 'บริษัท',
  auth: 'ระบบรักษาความปลอดภัย',
  audit_log: 'บันทึกการใช้งานระบบ',
  'audit-logs': 'บันทึกการใช้งานระบบ',
};

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
  amount: 'จำนวนเงิน',
  start_date: 'วันที่เริ่มต้น',
  startdate: 'วันที่เริ่มต้น',
  end_date: 'วันที่สิ้นสุด',
  enddate: 'วันที่สิ้นสุด',
  created_at: 'วันที่สร้าง',
  createdat: 'วันที่สร้าง',
  updated_at: 'วันที่แก้ไข',
  updatedat: 'วันที่แก้ไข',
  reason: 'เหตุผล',
  workflow_name: 'สายการอนุมัติ',
  step_order: 'ลำดับ',
};

export const AuditLogTab: React.FC<AuditLogTabProps> = ({
  logs,
  totalCount,
  currentPage,
  pageSize,
  users,
  onPageChange,
  onFilterChange,
  onExport,
  onViewDetail,
  isLoading,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('ทั้งหมด');
  const [selectedAction, setSelectedAction] = useState<string>('ทั้งหมด');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableModules, setAvailableModules] = useState<string[]>([]);

  // โหลดรายชื่อโมดูลที่มีในระบบจริงเพื่อแสดงในตัวกรอง
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const modules = await settingsService.getAuditLogModules();
        if (modules && modules.length > 0) {
          setAvailableModules(modules);
        }
      } catch {
        // Fallback to static list
      }
    };
    fetchModules();
  }, []);

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
    setStartDate('');
    setEndDate('');
    setSelectedUserId('ทั้งหมด');
    setSelectedAction('ทั้งหมด');
    setSelectedEntityType('ทั้งหมด');
    setSearchQuery('');
    onFilterChange({});
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const formatLogDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const thaiYear = d.getFullYear() + 543;
      const day = d.getDate();
      const month = months[d.getMonth()];
      const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return `${day} ${month} ${thaiYear} - ${time}`;
    } catch {
      return isoString;
    }
  };

  const getEntityDisplayName = (entityType: string) => {
    const lower = entityType.toLowerCase();
    return ENTITY_TRANSLATIONS[lower] || entityType;
  };

  const formatCellPreview = (val: string | null | undefined, action: string, isOld: boolean) => {
    if (!val || val === 'null' || val === '<ว่าง>') return '-';

    if (action === 'LOGIN' && !isOld) return 'เข้าสู่ระบบสำเร็จ';
    if (action === 'LOGOUT' && !isOld) return 'ออกจากระบบ';

    try {
      if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
        const parsed = JSON.parse(val);
        if (typeof parsed === 'object' && parsed !== null) {
          const keys = Object.keys(parsed);
          if (keys.length === 0) return '-';
          if (keys.length === 1) {
            const k = keys[0];
            const translatedKey = FIELD_TRANSLATIONS[k.toLowerCase()] || k;
            return `${translatedKey}: ${parsed[k]}`;
          }
          return keys
            .slice(0, 2)
            .map((k) => `${FIELD_TRANSLATIONS[k.toLowerCase()] || k}: ${parsed[k]}`)
            .join(', ') + (keys.length > 2 ? ' ...' : '');
        }
      }
    } catch {
      // ignore json parse error
    }

    return val;
  };

  // รวมรายการโมดูลสำหรับ Dropdown โดยไม่ให้ซ้ำ
  const moduleOptions = Array.from(
    new Set([
      'employee',
      'user_account',
      'role',
      'approval_flow',
      'leave_request',
      'attendance_daily',
      'announcement',
      'certificate_request',
      'employment_contract',
      'salary_structure',
      'auth',
      ...availableModules.map((m) => m.toLowerCase()),
    ])
  );

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Filter Card (ตรงตามรูปแบบ Figma) */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. วันที่ทำกิจกรรม (เริ่มต้น - สิ้นสุด) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              วันที่ทำกิจกรรม (เริ่มต้น - สิ้นสุด)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
              />
            </div>
          </div>

          {/* 2. ผู้ใช้งาน */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ผู้ใช้งาน
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] cursor-pointer"
            >
              <option value="ทั้งหมด">ผู้ใช้งานทั้งหมด</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.fullName})
                </option>
              ))}
            </select>
          </div>

          {/* 3. ประเภทการกระทำ */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ประเภทการกระทำ
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] cursor-pointer"
            >
              <option value="ทั้งหมด">การกระทำทั้งหมด</option>
              <option value="INSERT">สร้างข้อมูลใหม่</option>
              <option value="UPDATE">แก้ไขข้อมูล</option>
              <option value="DELETE">ลบข้อมูล</option>
              <option value="LOGIN">เข้าสู่ระบบ</option>
              <option value="LOGOUT">ออกจากระบบ</option>
              <option value="APPROVE">อนุมัติรายการ</option>
              <option value="REJECT">ปฏิเสธรายการ</option>
              <option value="EXPORT">ส่งออกข้อมูล</option>
            </select>
          </div>

          {/* 4. ประเภทข้อมูล */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ประเภทข้อมูล
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] cursor-pointer"
            >
              <option value="ทั้งหมด">ทุกประเภทข้อมูล</option>
              {moduleOptions.map((mod) => (
                <option key={mod} value={mod}>
                  {getEntityDisplayName(mod)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row: Search + Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
              placeholder="ใส่คำค้นหา (คีย์เวิร์ด, บัญชีผู้ใช้, รหัสข้อมูล...)"
              className="w-full h-9.5 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <button
              onClick={handleClearFilter}
              className="h-9.5 px-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>ล้างค่าตัวกรอง</span>
            </button>

            <button
              onClick={handleApplyFilter}
              className="h-9.5 px-4 bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>ค้นหาข้อมูลบันทึก</span>
            </button>

            <button
              onClick={onExport}
              className="h-9.5 px-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="ส่งออกไฟล์ข้อมูล CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>ส่งออกข้อมูล</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Audit Log Table (ตรงตามโครงสร้าง Figma พร้อม IP Address) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500">
                <th className="py-3.5 px-4 min-w-[150px]">วันเวลา</th>
                <th className="py-3.5 px-4 min-w-[140px]">ผู้ใช้งาน</th>
                <th className="py-3.5 px-3 min-w-[90px] text-center">การกระทำ</th>
                <th className="py-3.5 px-4 min-w-[130px]">ประเภทข้อมูล</th>
                <th className="py-3.5 px-3 min-w-[90px]">รหัสข้อมูล</th>
                <th className="py-3.5 px-3 min-w-[100px]">ฟิลด์ที่เปลี่ยน</th>
                <th className="py-3.5 px-3 min-w-[90px]">ค่าเดิม</th>
                <th className="py-3.5 px-4 min-w-[180px]">ค่าใหม่ / ข้อมูลเพิ่มเติม</th>
                <th className="py-3.5 px-4 min-w-[110px]">IP Address</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    กำลังโหลดบันทึกการใช้งานระบบ...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    ไม่พบบันทึกการใช้งานระบบที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                logs.map((item) => {
                  const actionInfo = ACTION_CONFIG[item.action] || {
                    label: item.action,
                    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
                  };

                  const oldPreview = formatCellPreview(item.oldValue, item.action, true);
                  const newPreview = item.description || formatCellPreview(item.newValue, item.action, false);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onViewDetail(item)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      {/* 1. วันเวลา */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {formatLogDate(item.createdAt)}
                      </td>

                      {/* 2. ผู้ใช้งาน */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <span>{item.username}</span>
                        {item.fullName && (
                          <span className="text-slate-400 font-normal ml-1">({item.fullName})</span>
                        )}
                      </td>

                      {/* 3. การกระทำ (Pastel Badge) */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${actionInfo.badgeClass}`}>
                          {actionInfo.label}
                        </span>
                      </td>

                      {/* 4. ประเภทข้อมูล */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {getEntityDisplayName(item.entityType)}
                      </td>

                      {/* 5. รหัสข้อมูล */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                        {item.entityId ? `#${item.entityId}` : '-'}
                      </td>

                      {/* 6. ฟิลด์ที่เปลี่ยน */}
                      <td className="py-3.5 px-3 text-[11px] font-mono text-slate-600 truncate max-w-[120px]">
                        {item.fieldName || '-'}
                      </td>

                      {/* 7. ค่าเดิม (สีแดงตาม Figma) */}
                      <td className="py-3.5 px-3 text-[11px] font-mono text-rose-600 font-medium truncate max-w-[120px]">
                        {oldPreview}
                      </td>

                      {/* 8. ค่าใหม่ / ข้อมูลเพิ่มเติม (สีเขียวตาม Figma) */}
                      <td className="py-3.5 px-4 text-[11px] font-mono text-emerald-600 font-medium truncate max-w-[200px]">
                        {newPreview}
                      </td>

                      {/* 9. IP Address */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {item.ipAddress || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Pagination Bar (ตรงตามรูปแบบ Figma) */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
          <div>
            แสดง <span className="font-semibold text-slate-800">{logs.length}</span> ของทั้งหมด{' '}
            <span className="font-semibold text-slate-800">{totalCount.toLocaleString()}</span> รายการการบันทึกระบบ
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg font-semibold transition-all cursor-pointer ${
                  p === currentPage
                    ? 'bg-[#0B2046] text-white shadow-xs'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
