'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/context/ToastContext';
import { reportService } from '@/services/reportService';
import { organizationService } from '@/services/organizationService';
import { DailyHeadcountSummary, MonthlyLatenessReport } from '@/types/reports';
import { Department, Division } from '@/types/organization';
import {
  Users,
  Clock,
  Download,
  Calendar,
  Building2,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  BarChart3,
  CalendarDays,
  Percent,
} from 'lucide-react';

export default function ReportsPage() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'headcount' | 'lateness'>('headcount');

  // Master Data Filters
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // -------------------------------------------------------------
  // Tab 1: Daily Headcount State
  // -------------------------------------------------------------
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDivision, setSelectedDivision] = useState<number | 'ALL'>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'ALL'>('ALL');
  const [headcountData, setHeadcountData] = useState<DailyHeadcountSummary | null>(null);
  const [isLoadingHeadcount, setIsLoadingHeadcount] = useState(false);
  const [isExportingHeadcount, setIsExportingHeadcount] = useState(false);

  // -------------------------------------------------------------
  // Tab 2: Monthly Attendance & Lateness State
  // -------------------------------------------------------------
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [latenessDepartment, setLatenessDepartment] = useState<number | 'ALL'>('ALL');
  const [latenessSearch, setLatenessSearch] = useState<string>('');
  const [latenessData, setLatenessData] = useState<MonthlyLatenessReport | null>(null);
  const [isLoadingLateness, setIsLoadingLateness] = useState(false);
  const [isExportingLateness, setIsExportingLateness] = useState(false);

  // Load Divisions & Departments
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [divs, depts] = await Promise.all([
          organizationService.getDivisions(),
          organizationService.getDepartments(),
        ]);
        setDivisions(divs);
        setDepartments(depts);
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    };
    loadMasterData();
  }, []);

  // -------------------------------------------------------------
  // Load Daily Headcount
  // -------------------------------------------------------------
  const loadDailyHeadcount = useCallback(async () => {
    try {
      setIsLoadingHeadcount(true);
      const divId = selectedDivision === 'ALL' ? undefined : Number(selectedDivision);
      const deptId = selectedDepartment === 'ALL' ? undefined : Number(selectedDepartment);
      const data = await reportService.getDailyHeadcount(selectedDate, divId, deptId);
      setHeadcountData(data);
    } catch (err: unknown) {
      console.error('Failed to load daily headcount:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานอัตรากำลังคนประจำวันได้';
      toastRef.current.error(msg);
    } finally {
      setIsLoadingHeadcount(false);
    }
  }, [selectedDate, selectedDivision, selectedDepartment]);

  // -------------------------------------------------------------
  // Load Monthly Lateness Report
  // -------------------------------------------------------------
  const loadMonthlyLateness = useCallback(async () => {
    try {
      setIsLoadingLateness(true);
      const deptId = latenessDepartment === 'ALL' ? undefined : Number(latenessDepartment);
      const data = await reportService.getMonthlyLateness(
        selectedYear,
        selectedMonth,
        deptId,
        latenessSearch.trim() || undefined
      );
      setLatenessData(data);
    } catch (err: unknown) {
      console.error('Failed to load monthly lateness report:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานบันทึกเวลาและการมาสายได้';
      toastRef.current.error(msg);
    } finally {
      setIsLoadingLateness(false);
    }
  }, [selectedYear, selectedMonth, latenessDepartment, latenessSearch]);

  useEffect(() => {
    if (activeTab === 'headcount') {
      loadDailyHeadcount();
    } else {
      loadMonthlyLateness();
    }
  }, [activeTab, loadDailyHeadcount, loadMonthlyLateness]);

  // -------------------------------------------------------------
  // Export Handlers
  // -------------------------------------------------------------
  const handleExportDailyHeadcount = async () => {
    try {
      setIsExportingHeadcount(true);
      const divId = selectedDivision === 'ALL' ? undefined : selectedDivision;
      const deptId = selectedDepartment === 'ALL' ? undefined : selectedDepartment;
      await reportService.downloadDailyHeadcountCsv(selectedDate, divId, deptId);
      toast.success('ดาวน์โหลดรายงานอัตรากำลังคนประจำวันสำเร็จ');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ CSV');
    } finally {
      setIsExportingHeadcount(false);
    }
  };

  const handleExportMonthlyLateness = async () => {
    try {
      setIsExportingLateness(true);
      const deptId = latenessDepartment === 'ALL' ? undefined : latenessDepartment;
      await reportService.downloadMonthlyLatenessCsv(
        selectedYear,
        selectedMonth,
        deptId,
        latenessSearch.trim() || undefined
      );
      toast.success('ดาวน์โหลดรายงานบันทึกเวลาและการมาสายสำเร็จ');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ CSV');
    } finally {
      setIsExportingLateness(false);
    }
  };

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ─────────────────────────────────────────────────────────────
          Sub-menu Tabs (Exact same style as ตรวจบันทึกเวลา)
      ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 shadow-sm overflow-x-auto">
        <div className="flex gap-2 text-sm font-medium whitespace-nowrap min-w-max">
          <button
            onClick={() => setActiveTab('headcount')}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'headcount'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>อัตรากำลังคนประจำวัน (Daily Headcount)</span>
          </button>

          <button
            onClick={() => setActiveTab('lateness')}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'lateness'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>รายงานการมาสายประจำเดือน (Monthly Lateness)</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: อัตรากำลังคนประจำวัน (Daily Headcount) */}
      {/* ============================================================= */}
      {activeTab === 'headcount' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Picker */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">วันที่:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                />
              </div>

              {/* Division Filter */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedDivision}
                  onChange={(e) => {
                    const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                    setSelectedDivision(val);
                    setSelectedDepartment('ALL');
                  }}
                  className="text-xs font-medium text-slate-700 bg-transparent focus:outline-none"
                >
                  <option value="ALL">ฝ่ายทั้งหมด</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.divisionName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <select
                  value={selectedDepartment}
                  onChange={(e) =>
                    setSelectedDepartment(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                  }
                  className="text-xs font-medium text-slate-700 bg-transparent focus:outline-none"
                >
                  <option value="ALL">แผนกทั้งหมด</option>
                  {departments
                    .filter((dept) => selectedDivision === 'ALL' || dept.divisionId === selectedDivision)
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.departmentName}
                      </option>
                    ))}
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadDailyHeadcount}
                disabled={isLoadingHeadcount}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHeadcount ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportDailyHeadcount}
              disabled={isExportingHeadcount || !headcountData}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isExportingHeadcount ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              ส่งออก CSV (Excel)
            </button>
          </div>

          {/* 4 Summary KPI Cards */}
          {headcountData && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-slate-500">พนักงานทั้งหมด</span>
                <div className="text-2xl font-extrabold text-slate-900">{headcountData.totalEmployees} คน</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-emerald-600 font-medium">มาปฏิบัติงาน</span>
                <div className="text-2xl font-extrabold text-emerald-600">{headcountData.totalPresent} คน</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-amber-600 font-medium">มาสาย</span>
                <div className="text-2xl font-extrabold text-amber-600">{headcountData.totalLate} คน</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-rose-600 font-medium">ขาดงาน / ยังไม่ลงเวลา</span>
                <div className="text-2xl font-extrabold text-rose-600">{headcountData.totalAbsent} คน</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 col-span-2 lg:col-span-1">
                <span className="text-xs text-blue-600 font-medium">อัตราการเข้างาน</span>
                <div className="text-2xl font-extrabold text-[#0B2046]">{headcountData.overallAttendanceRate}%</div>
              </div>
            </div>
          )}

          {/* Table Breakdown by Department */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                ตารางสรุปอัตรากำลังคนจำแนกตามแผนก
              </h3>
              <span className="text-xs text-slate-400">
                {headcountData?.departments.length || 0} แผนก
              </span>
            </div>

            {isLoadingHeadcount ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0B2046]" />
                กำลังโหลดข้อมูลอัตรากำลังคน...
              </div>
            ) : !headcountData || headcountData.departments.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                ไม่พบข้อมูลแผนกตามตัวกรองที่เลือก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">รหัสแผนก</th>
                      <th className="py-3 px-4">ชื่อแผนก</th>
                      <th className="py-3 px-4">ฝ่าย</th>
                      <th className="py-3 px-4 text-center">พนักงานทั้งหมด</th>
                      <th className="py-3 px-4 text-center text-emerald-700">มาทำงาน</th>
                      <th className="py-3 px-4 text-center text-amber-700">มาสาย</th>
                      <th className="py-3 px-4 text-center text-orange-700">ออกก่อน</th>
                      <th className="py-3 px-4 text-center text-rose-700">ขาดงาน</th>
                      <th className="py-3 px-4 text-center">อัตราการเข้างาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {headcountData.departments.map((dept) => (
                      <tr key={dept.departmentId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                          {dept.departmentCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {dept.departmentName}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {dept.divisionName}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {dept.totalHeadcount}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {dept.presentCount}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-amber-600">
                          {dept.lateCount}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-orange-600">
                          {dept.earlyLeaveCount}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-rose-600">
                          {dept.absentCount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  dept.attendanceRate >= 90
                                    ? 'bg-emerald-500'
                                    : dept.attendanceRate >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(dept.attendanceRate, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold text-slate-700 min-w-[36px]">
                              {dept.attendanceRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: รายงานการมาสายประจำเดือน (Monthly Lateness) */}
      {/* ============================================================= */}
      {activeTab === 'lateness' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <span className="text-xs text-slate-500 font-medium">เดือน:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                >
                  {thaiMonths.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <span className="text-xs text-slate-500 font-medium">ปี:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      พ.ศ. {y + 543}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Selector */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <select
                  value={latenessDepartment}
                  onChange={(e) =>
                    setLatenessDepartment(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                  }
                  className="text-xs font-medium text-slate-700 bg-transparent focus:outline-none"
                >
                  <option value="ALL">แผนกทั้งหมด</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
                  value={latenessSearch}
                  onChange={(e) => setLatenessSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-56"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadMonthlyLateness}
                disabled={isLoadingLateness}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLateness ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportMonthlyLateness}
              disabled={isExportingLateness || !latenessData}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isExportingLateness ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              ส่งออก CSV (Excel)
            </button>
          </div>

          {/* 4 Summary KPI Cards */}
          {latenessData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-slate-500">พนักงานที่ตรวจสอบ</span>
                <div className="text-2xl font-extrabold text-slate-900">{latenessData.totalAuditedEmployees} คน</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-amber-600 font-medium">การมาสายรวม</span>
                <div className="text-2xl font-extrabold text-amber-600">{latenessData.totalLateOccurrences} ครั้ง</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-orange-600 font-medium">เวลารวมที่สาย</span>
                <div className="text-2xl font-extrabold text-orange-600">
                  {latenessData.totalLateMinutes} <span className="text-xs font-normal text-slate-400">นาที</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-blue-600 font-medium">อัตราการเข้างานเฉลี่ย</span>
                <div className="text-2xl font-extrabold text-[#0B2046]">{latenessData.overallAttendanceRate}%</div>
              </div>
            </div>
          )}

          {/* Detailed Table per Employee */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                ตารางสรุปเวลาทำงานและการมาสายรายบุคคล
              </h3>
              <span className="text-xs text-slate-400">
                {latenessData?.items.length || 0} คน
              </span>
            </div>

            {isLoadingLateness ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0B2046]" />
                กำลังโหลดรายงานการมาสาย...
              </div>
            ) : !latenessData || latenessData.items.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                ไม่พบข้อมูลพนักงานตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">พนักงาน</th>
                      <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                      <th className="py-3 px-4 text-center">วันทำงาน</th>
                      <th className="py-3 px-4 text-center text-emerald-700">ตรงเวลา</th>
                      <th className="py-3 px-4 text-center text-amber-700">มาสาย</th>
                      <th className="py-3 px-4 text-center text-orange-700">ออกก่อน</th>
                      <th className="py-3 px-4 text-center text-rose-700">ขาดงาน</th>
                      <th className="py-3 px-4 text-center">อัตราการเข้างาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {latenessData.items.map((item) => (
                      <tr key={item.employeeId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">{item.employeeName}</span>
                          <span className="text-xs font-mono text-slate-400">รหัส {item.employeeCode}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <span className="font-medium text-slate-800 block">{item.departmentName}</span>
                          <span className="text-slate-400">{item.positionName}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {item.totalWorkDays} วัน
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {item.presentDays} วัน
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.lateDays > 0 ? (
                            <div>
                              <span className="font-bold text-amber-600">{item.lateDays} ครั้ง</span>
                              <span className="block text-2xs text-amber-500 font-mono">
                                ({item.totalLateMinutes} นาที)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.earlyLeaveDays > 0 ? (
                            <div>
                              <span className="font-bold text-orange-600">{item.earlyLeaveDays} ครั้ง</span>
                              <span className="block text-2xs text-orange-500 font-mono">
                                ({item.totalEarlyLeaveMinutes} นาที)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-rose-600">
                          {item.absentDays > 0 ? `${item.absentDays} วัน` : <span className="text-slate-300 font-normal">-</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              item.attendanceRate >= 90
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.attendanceRate >= 75
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {item.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
