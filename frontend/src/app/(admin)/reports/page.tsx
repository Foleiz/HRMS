'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import AccessDenied from '@/components/common/AccessDenied';
import { useToast } from '@/context/ToastContext';
import { reportService } from '@/services/reportService';
import { organizationService } from '@/services/organizationService';
import {
  DailyHeadcountSummary,
  MonthlyLatenessReport,
  PayrollTaxSummary,
  MonthlyTurnoverSummary,
} from '@/types/reports';
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
  Receipt,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  UserMinus,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';

export default function ReportsPage() {
  const { hasPermission, hasRole } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Permissions
  const canViewHeadcount = hasPermission('REPORT_HEADCOUNT_VIEW') || hasPermission('REPORT_VIEW') || hasRole('ADMIN');
  const canExportHeadcount = hasPermission('REPORT_HEADCOUNT_EXPORT') || hasPermission('REPORT_EXPORT') || hasRole('ADMIN');

  const canViewLateness = hasPermission('REPORT_ATT_VIEW') || hasPermission('REPORT_VIEW') || hasRole('ADMIN');
  const canExportLateness = hasPermission('REPORT_ATT_EXPORT') || hasPermission('REPORT_EXPORT') || hasRole('ADMIN');

  const canViewTax = hasPermission('PAYROLL_VIEW') || hasPermission('REPORT_VIEW') || hasRole('ADMIN') || hasRole('FINANCE');
  const canExportTax = hasPermission('PAYROLL_EXPORT') || hasPermission('REPORT_EXPORT') || hasRole('ADMIN') || hasRole('FINANCE');

  const canViewTurnover = hasPermission('REPORT_HEADCOUNT_VIEW') || hasPermission('REPORT_VIEW') || hasRole('ADMIN');
  const canExportTurnover = hasPermission('REPORT_HEADCOUNT_EXPORT') || hasPermission('REPORT_EXPORT') || hasRole('ADMIN');

  const canViewAnyReport = canViewHeadcount || canViewLateness || canViewTax || canViewTurnover;

  // Active Tab
  type ReportTab = 'headcount' | 'lateness' | 'tax' | 'turnover';
  const [activeTab, setActiveTab] = useState<ReportTab>(() => {
    if (canViewHeadcount) return 'headcount';
    if (canViewLateness) return 'lateness';
    if (canViewTax) return 'tax';
    if (canViewTurnover) return 'turnover';
    return 'headcount';
  });
  const { setBreadcrumb } = useBreadcrumb();

  // Sync breadcrumb with activeTab
  useEffect(() => {
    const tabTitles: Record<ReportTab, string> = {
      headcount: 'อัตรากำลังคนประจำวัน',
      lateness: 'รายงานการมาสายประจำเดือน',
      tax: 'ภาษีและประกันสังคม (ภ.ง.ด.1 / สปส. 1-10)',
      turnover: 'อัตราการเข้า-ออกของพนักงาน (Turnover Rate)',
    };
    setBreadcrumb({
      section: 'รายงาน',
      page: tabTitles[activeTab] || 'รายงาน',
    });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

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

  // -------------------------------------------------------------
  // Tab 3: Payroll Tax & SSO State (ภ.ง.ด.1 / สปส. 1-10)
  // -------------------------------------------------------------
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [taxMonth, setTaxMonth] = useState<number>(8); // มีข้อมูลคำนวณเงินเดือนล่าสุดที่เดือน 8
  const [taxDepartment, setTaxDepartment] = useState<number | 'ALL'>('ALL');
  const [taxSearch, setTaxSearch] = useState<string>('');
  const [taxData, setTaxData] = useState<PayrollTaxSummary | null>(null);
  const [isLoadingTax, setIsLoadingTax] = useState(false);
  const [isExportingTax, setIsExportingTax] = useState(false);
  const [isExportingSso, setIsExportingSso] = useState(false);
  const [taxPage, setTaxPage] = useState(1);
  const [taxRowsPerPage, setTaxRowsPerPage] = useState(10);

  // -------------------------------------------------------------
  // Tab 4: Turnover Analytics State
  // -------------------------------------------------------------
  const [turnoverYear, setTurnoverYear] = useState<number>(new Date().getFullYear());
  const [turnoverMonth, setTurnoverMonth] = useState<number>(new Date().getMonth() + 1);
  const [turnoverDivision, setTurnoverDivision] = useState<number | 'ALL'>('ALL');
  const [turnoverDepartment, setTurnoverDepartment] = useState<number | 'ALL'>('ALL');
  const [turnoverData, setTurnoverData] = useState<MonthlyTurnoverSummary | null>(null);
  const [isLoadingTurnover, setIsLoadingTurnover] = useState(false);
  const [isExportingTurnover, setIsExportingTurnover] = useState(false);

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

  // -------------------------------------------------------------
  // Load Payroll Tax & SSO Report
  // -------------------------------------------------------------
  const loadPayrollTax = useCallback(async () => {
    try {
      setIsLoadingTax(true);
      const deptId = taxDepartment === 'ALL' ? undefined : Number(taxDepartment);
      const data = await reportService.getPayrollTaxSummary(taxYear, taxMonth, deptId);
      setTaxData(data);
      setTaxPage(1);
    } catch (err: unknown) {
      console.error('Failed to load payroll tax report:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานภาษีและประกันสังคมได้';
      toastRef.current.error(msg);
    } finally {
      setIsLoadingTax(false);
    }
  }, [taxYear, taxMonth, taxDepartment]);

  // -------------------------------------------------------------
  // Load Monthly Turnover Report
  // -------------------------------------------------------------
  const loadTurnover = useCallback(async () => {
    try {
      setIsLoadingTurnover(true);
      const divId = turnoverDivision === 'ALL' ? undefined : Number(turnoverDivision);
      const deptId = turnoverDepartment === 'ALL' ? undefined : Number(turnoverDepartment);
      const data = await reportService.getMonthlyTurnover(turnoverYear, turnoverMonth, divId, deptId);
      setTurnoverData(data);
    } catch (err: unknown) {
      console.error('Failed to load turnover report:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานอัตราการเข้า-ออกของพนักงานได้';
      toastRef.current.error(msg);
    } finally {
      setIsLoadingTurnover(false);
    }
  }, [turnoverYear, turnoverMonth, turnoverDivision, turnoverDepartment]);

  useEffect(() => {
    if (activeTab === 'headcount') {
      loadDailyHeadcount();
    } else if (activeTab === 'lateness') {
      loadMonthlyLateness();
    } else if (activeTab === 'tax') {
      loadPayrollTax();
    } else if (activeTab === 'turnover') {
      loadTurnover();
    }
  }, [activeTab, loadDailyHeadcount, loadMonthlyLateness, loadPayrollTax, loadTurnover]);

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

  const handleExportPayrollTax = async () => {
    try {
      setIsExportingTax(true);
      const deptId = taxDepartment === 'ALL' ? undefined : taxDepartment;
      await reportService.downloadPayrollTaxCsv(taxYear, taxMonth, deptId);
      toast.success('ดาวน์โหลดรายงานภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.1) สำเร็จ');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดรายงาน ภ.ง.ด.1');
    } finally {
      setIsExportingTax(false);
    }
  };

  const handleExportSso = async () => {
    try {
      setIsExportingSso(true);
      const deptId = taxDepartment === 'ALL' ? undefined : taxDepartment;
      await reportService.downloadSsoCsv(taxYear, taxMonth, deptId);
      toast.success('ดาวน์โหลดรายงานนำส่งเงินสมทบประกันสังคม (สปส. 1-10) สำเร็จ');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดรายงาน สปส. 1-10');
    } finally {
      setIsExportingSso(false);
    }
  };

  const handleExportTurnover = async () => {
    try {
      setIsExportingTurnover(true);
      const divId = turnoverDivision === 'ALL' ? undefined : turnoverDivision;
      const deptId = turnoverDepartment === 'ALL' ? undefined : turnoverDepartment;
      await reportService.downloadMonthlyTurnoverCsv(turnoverYear, turnoverMonth, divId, deptId);
      toast.success('ดาวน์โหลดรายงานอัตราการเข้า-ออกของพนักงานสำเร็จ');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดรายงาน Turnover');
    } finally {
      setIsExportingTurnover(false);
    }
  };

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  if (!canViewAnyReport) {
    return <AccessDenied message="คุณไม่มีสิทธิ์เข้าถึงรายงานสรุปและสถิติ" />;
  }

  // Filtered Tax Items
  const filteredTaxItems = (taxData?.items || []).filter((item) => {
    if (!taxSearch.trim()) return true;
    const q = taxSearch.toLowerCase().trim();
    return (
      item.employeeName.toLowerCase().includes(q) ||
      item.employeeCode.toLowerCase().includes(q) ||
      item.departmentName.toLowerCase().includes(q) ||
      item.citizenIdMasked.toLowerCase().includes(q)
    );
  });

  const totalTaxPages = Math.ceil(filteredTaxItems.length / taxRowsPerPage) || 1;
  const currentTaxPage = Math.min(taxPage, totalTaxPages);
  const pagedTaxItems = filteredTaxItems.slice(
    (currentTaxPage - 1) * taxRowsPerPage,
    currentTaxPage * taxRowsPerPage
  );

  return (
    <div className="space-y-6 pb-12">
      {/* ─────────────────────────────────────────────────────────────
          Sub-menu Tabs (รูปแบบเดียวกับเมนูพนักงาน)
      ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {canViewHeadcount && (
            <button
              onClick={() => setActiveTab('headcount')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'headcount'
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              อัตรากำลังคนประจำวัน
            </button>
          )}

          {canViewLateness && (
            <button
              onClick={() => setActiveTab('lateness')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'lateness'
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              รายงานการมาสายประจำเดือน
            </button>
          )}

          {canViewTax && (
            <button
              onClick={() => setActiveTab('tax')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'tax'
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              ภาษีและประกันสังคม (ภ.ง.ด.1 / สปส. 1-10)
            </button>
          )}

          {canViewTurnover && (
            <button
              onClick={() => setActiveTab('turnover')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'turnover'
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              อัตราการเข้า-ออกงาน (Turnover Rate)
            </button>
          )}
        </nav>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: อัตรากำลังคนประจำวัน (Daily Headcount) */}
      {/* ============================================================= */}
      {activeTab === 'headcount' && canViewHeadcount && (
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
            {canExportHeadcount && (
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
            )}
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
      {activeTab === 'lateness' && canViewLateness && (
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
            {canExportLateness && (
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
            )}
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

      {/* ============================================================= */}
      {/* TAB 3: ภาษีและประกันสังคม (Payroll Tax & SSO / ภ.ง.ด.1 & สปส. 1-10) */}
      {/* ============================================================= */}
      {activeTab === 'tax' && canViewTax && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Select */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">ปี:</span>
                <select
                  value={taxYear}
                  onChange={(e) => setTaxYear(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y + 543} ({y})
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Select */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">งวดเดือน:</span>
                <select
                  value={taxMonth}
                  onChange={(e) => setTaxMonth(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                >
                  {thaiMonths.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Select */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={taxDepartment}
                  onChange={(e) =>
                    setTaxDepartment(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
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
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ/รหัส/บัตรประชาชน..."
                  value={taxSearch}
                  onChange={(e) => {
                    setTaxSearch(e.target.value);
                    setTaxPage(1);
                  }}
                  className="text-xs text-slate-800 bg-transparent focus:outline-none w-44"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadPayrollTax}
                disabled={isLoadingTax}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingTax ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {/* Export Buttons */}
            {canExportTax && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportPayrollTax}
                  disabled={isExportingTax || !taxData || taxData.items.length === 0}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isExportingTax ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Receipt className="w-4 h-4 text-amber-300" />
                  )}
                  ส่งออก ภ.ง.ด.1 (CSV)
                </button>

                <button
                  onClick={handleExportSso}
                  disabled={isExportingSso || !taxData || taxData.items.length === 0}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isExportingSso ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  )}
                  ส่งออก สปส. 1-10 (CSV)
                </button>
              </div>
            )}
          </div>

          {/* 4 Summary KPI Cards */}
          {taxData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">เงินได้พึงประเมินรวม</span>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-extrabold text-[#0B2046]">
                  {taxData.totalGrossIncome.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1">บาท</span>
                </div>
                <div className="text-2xs text-slate-400">ฐานคำนวณภาษีและค่าจ้างรอบเดือน</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-600 font-medium">ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1)</span>
                  <Receipt className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-extrabold text-rose-600">
                  {taxData.totalWithholdingTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1">บาท</span>
                </div>
                <div className="text-2xs text-rose-500">
                  มีผู้ถูกหักภาษี {taxData.taxableEmployeesCount} จาก {taxData.totalEmployees} คน
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600 font-medium">นำส่งประกันสังคม (สปส. 1-10)</span>
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-extrabold text-blue-700">
                  {taxData.totalSsoRemittance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1">บาท</span>
                </div>
                <div className="text-2xs text-slate-500 flex justify-between">
                  <span>ลูกจ้าง: {taxData.totalSsoEmployee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  <span>นายจ้าง: {taxData.totalSsoEmployer.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-600 font-medium">เงินเดือนสุทธินำจ่าย</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-700">
                  {taxData.totalNetSalary.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1">บาท</span>
                </div>
                <div className="text-2xs text-slate-400">
                  สถานะรอบ: <span className="font-semibold text-slate-700">{taxData.periodStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Tax & SSO Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  ตารางจำแนกภาษีเงินได้หัก ณ ที่จ่าย และเงินสมทบประกันสังคมรายบุคคล
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  ทั้งหมด {filteredTaxItems.length} รายการ
                </span>
                {/* Rows per page */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>แสดง</span>
                  <select
                    value={taxRowsPerPage}
                    onChange={(e) => {
                      setTaxRowsPerPage(Number(e.target.value));
                      setTaxPage(1);
                    }}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50 focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span>แถว</span>
                </div>
              </div>
            </div>

            {isLoadingTax ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                กำลังโหลดรายงานภาษีและประกันสังคม...
              </div>
            ) : filteredTaxItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                {taxData?.periodStatus === 'NONE'
                  ? `ไม่พบข้อมูลงวดการจ่ายเงินเดือนประจำเดือน ${thaiMonths[taxMonth - 1]} ${taxYear + 543}`
                  : 'ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-center w-12">ลำดับ</th>
                      <th className="py-3 px-4">พนักงาน</th>
                      <th className="py-3 px-4">เลขประจำตัวประชาชน</th>
                      <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                      <th className="py-3 px-4 text-right">เงินได้พึงประเมิน</th>
                      <th className="py-3 px-4 text-right text-rose-700">ภาษี ภ.ง.ด.1</th>
                      <th className="py-3 px-4 text-right text-blue-700">ปกส. ลูกจ้าง</th>
                      <th className="py-3 px-4 text-right text-indigo-700">ปกส. นายจ้าง</th>
                      <th className="py-3 px-4 text-right font-bold text-blue-900">รวมนำส่ง ปกส.</th>
                      <th className="py-3 px-4 text-right text-emerald-700">เงินได้สุทธิ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedTaxItems.map((item, idx) => {
                      const rowNum = (currentTaxPage - 1) * taxRowsPerPage + idx + 1;
                      const ssoTotal = item.ssoEmployee + item.ssoEmployer;
                      return (
                        <tr key={item.employeeId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 text-center text-xs text-slate-400">{rowNum}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">{item.employeeName}</span>
                            <span className="text-xs font-mono text-slate-400">รหัส {item.employeeCode}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600">
                            {item.citizenIdMasked}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            <span className="font-medium text-slate-800 block">{item.departmentName}</span>
                            <span className="text-slate-400">{item.positionName}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900">
                            {item.grossIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-rose-600">
                            {item.withholdingTax > 0 ? (
                              item.withholdingTax.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                            ) : (
                              <span className="text-slate-300 font-normal">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-medium text-blue-600">
                            {item.ssoEmployee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-medium text-indigo-600">
                            {item.ssoEmployer.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-blue-800">
                            {ssoTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            {item.netSalary.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Summary Footer */}
                  {taxData && (
                    <tfoot className="bg-slate-100/80 text-xs font-bold text-slate-800 border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 text-center">
                          รวมทั้งสิ้น ({filteredTaxItems.length} คน)
                        </td>
                        <td className="py-3 px-4 text-right">
                          {filteredTaxItems
                            .reduce((sum, i) => sum + i.grossIncome, 0)
                            .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-700">
                          {filteredTaxItems
                            .reduce((sum, i) => sum + i.withholdingTax, 0)
                            .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-blue-700">
                          {filteredTaxItems
                            .reduce((sum, i) => sum + i.ssoEmployee, 0)
                            .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-indigo-700">
                          {filteredTaxItems
                            .reduce((sum, i) => sum + i.ssoEmployer, 0)
                            .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-blue-900">
                          {filteredTaxItems
                            .reduce((sum, i) => sum + (i.ssoEmployee + i.ssoEmployer), 0)
                            .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-800">
                          {filteredTaxItems
                            .reduce((sum, i) => sum + i.netSalary, 0)
                            .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* Pagination Controls */}
                {totalTaxPages > 1 && (
                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      หน้า {currentTaxPage} จาก {totalTaxPages} (ทั้งหมด {filteredTaxItems.length} แถว)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTaxPage((p) => Math.max(1, p - 1))}
                        disabled={currentTaxPage <= 1}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTaxPage((p) => Math.min(totalTaxPages, p + 1))}
                        disabled={currentTaxPage >= totalTaxPages}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: อัตราการเข้า-ออกงาน (Turnover Rate Analytics) */}
      {/* ============================================================= */}
      {activeTab === 'turnover' && canViewTurnover && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Select */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">ปี:</span>
                <select
                  value={turnoverYear}
                  onChange={(e) => setTurnoverYear(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y + 543} ({y})
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Select */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">เดือน:</span>
                <select
                  value={turnoverMonth}
                  onChange={(e) => setTurnoverMonth(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                >
                  {thaiMonths.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Division Filter */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={turnoverDivision}
                  onChange={(e) => {
                    const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                    setTurnoverDivision(val);
                    setTurnoverDepartment('ALL');
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
                  value={turnoverDepartment}
                  onChange={(e) =>
                    setTurnoverDepartment(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                  }
                  className="text-xs font-medium text-slate-700 bg-transparent focus:outline-none"
                >
                  <option value="ALL">แผนกทั้งหมด</option>
                  {departments
                    .filter((dept) => turnoverDivision === 'ALL' || dept.divisionId === turnoverDivision)
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.departmentName}
                      </option>
                    ))}
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadTurnover}
                disabled={isLoadingTurnover}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingTurnover ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {/* Export Button */}
            {canExportTurnover && (
              <button
                onClick={handleExportTurnover}
                disabled={isExportingTurnover || !turnoverData}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isExportingTurnover ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                )}
                ส่งออก Turnover (CSV)
              </button>
            )}
          </div>

          {/* 5 Summary KPI Cards */}
          {turnoverData && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-slate-500 font-medium">พนักงานต้นงวด</span>
                <div className="text-2xl font-extrabold text-slate-800">
                  {turnoverData.totalBeginningHeadcount} <span className="text-xs font-normal text-slate-400">คน</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-600 font-medium">เข้าใหม่ (New Hires)</span>
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-600">
                  +{turnoverData.totalJoinedCount} <span className="text-xs font-normal text-slate-400">คน</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-600 font-medium">ลาออก (Resigned)</span>
                  <UserMinus className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-extrabold text-rose-600">
                  -{turnoverData.totalResignedCount} <span className="text-xs font-normal text-slate-400">คน</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-blue-600 font-medium">พนักงานสิ้นงวด</span>
                <div className="text-2xl font-extrabold text-[#0B2046]">
                  {turnoverData.totalEndingHeadcount} <span className="text-xs font-normal text-slate-400">คน</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-slate-500 font-medium">Turnover / Retention</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-amber-600">
                    {turnoverData.overallTurnoverRate}%
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    (คงอยู่ {turnoverData.overallRetentionRate}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Department Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                อัตราการเข้า-ออกของพนักงานจำแนกตามแผนก
              </h3>
              <span className="text-xs text-slate-400">
                {turnoverData?.departmentTurnovers.length || 0} แผนก
              </span>
            </div>

            {isLoadingTurnover ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                กำลังโหลดรายงานอัตราการเข้า-ออกของพนักงาน...
              </div>
            ) : !turnoverData || turnoverData.departmentTurnovers.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                ไม่พบข้อมูลแผนกตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">ฝ่าย</th>
                      <th className="py-3 px-4">รหัสแผนก</th>
                      <th className="py-3 px-4">ชื่อแผนก</th>
                      <th className="py-3 px-4 text-center">ต้นงวด (คน)</th>
                      <th className="py-3 px-4 text-center text-emerald-700">เข้าใหม่</th>
                      <th className="py-3 px-4 text-center text-rose-700">ลาออก</th>
                      <th className="py-3 px-4 text-center text-blue-900">สิ้นงวด (คน)</th>
                      <th className="py-3 px-4 text-center">Turnover Rate (%)</th>
                      <th className="py-3 px-4 text-center">Retention Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {turnoverData.departmentTurnovers.map((dept) => (
                      <tr key={dept.departmentId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-xs font-medium text-slate-500">{dept.divisionName}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">{dept.departmentCode}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{dept.departmentName}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{dept.beginningHeadcount}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {dept.joinedCount > 0 ? `+${dept.joinedCount}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-rose-600">
                          {dept.resignedCount > 0 ? `-${dept.resignedCount}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">{dept.endingHeadcount}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              dept.turnoverRate === 0
                                ? 'bg-slate-50 text-slate-600 border border-slate-200'
                                : dept.turnoverRate <= 5
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {dept.turnoverRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              dept.retentionRate >= 95
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : dept.retentionRate >= 80
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {dept.retentionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Event Logs Table */}
          {turnoverData && turnoverData.eventLogs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  บันทึกประวัติการเคลื่อนไหวพนักงานประจำงวดเดือน
                </h3>
                <span className="text-xs text-slate-400">
                  {turnoverData.eventLogs.length} รายการ
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">วันที่</th>
                      <th className="py-3 px-4">พนักงาน</th>
                      <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                      <th className="py-3 px-4 text-center">ประเภทเหตุการณ์</th>
                      <th className="py-3 px-4">เหตุผล / หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {turnoverData.eventLogs.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">{ev.eventDate}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">{ev.employeeName}</span>
                          <span className="text-xs font-mono text-slate-400">รหัส {ev.employeeCode}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <span className="font-medium text-slate-800 block">{ev.departmentName}</span>
                          <span className="text-slate-400">{ev.positionName}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {ev.eventType === 'JOINED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <UserPlus className="w-3 h-3" /> เริ่มงานใหม่
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <UserMinus className="w-3 h-3" /> {ev.eventType === 'TERMINATED' ? 'เลิกจ้าง' : 'ลาออก'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">{ev.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
