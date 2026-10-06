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
import LeaveSummaryReportTab from '@/components/reports/LeaveSummaryReportTab';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import {
  ChartCard,
  Legend,
  MonthlyColumns,
  ProportionBars,
  RankBars,
  VIZ,
  fmtBaht,
  fmtNumber,
} from '@/components/reports/ReportCharts';
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
  // ไฟล์ ภ.ง.ด.1 / สปส.1-10 มีข้อมูลเงินได้ทุกคน — ให้ตรงกับสิทธิ์ฝั่ง Backend
  const canExportTax =
    hasPermission('PAYROLL_TAX_VIEW') || hasPermission('PAYROLL_FINANCE_VIEW') || hasPermission('PAYROLL_ADMIN_VIEW') || hasPermission('PAYROLL_EXPORT') || hasRole('ADMIN');
  const canExportSso = canExportTax || hasPermission('PAYROLL_HR_VIEW');

  const canViewTurnover = hasPermission('REPORT_HEADCOUNT_VIEW') || hasPermission('REPORT_VIEW') || hasRole('ADMIN');
  const canExportTurnover = hasPermission('REPORT_HEADCOUNT_EXPORT') || hasPermission('REPORT_EXPORT') || hasRole('ADMIN');

  // รายงานการลา: ใช้สิทธิ์ REPORT_LEAVE_VIEW ตามระบบ Permissions
  const canViewLeave = hasPermission('REPORT_LEAVE_VIEW') || hasPermission('REPORT_LEAVE') || hasPermission('REPORT_VIEW') || hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const handleLeaveReportError = useCallback((message: string) => toastRef.current.error(message), []);

  const canViewAnyReport = canViewHeadcount || canViewLateness || canViewTax || canViewTurnover || canViewLeave;

  // Active Tab
  type ReportTab = 'headcount' | 'lateness' | 'tax' | 'turnover' | 'leave';
  const [activeTab, setActiveTab] = useState<ReportTab>(() => {
    if (canViewHeadcount) return 'headcount';
    if (canViewLateness) return 'lateness';
    if (canViewTax) return 'tax';
    if (canViewTurnover) return 'turnover';
    if (canViewLeave) return 'leave';
    return 'headcount';
  });
  const { setBreadcrumb } = useBreadcrumb();

  // Sync breadcrumb with activeTab
  useEffect(() => {
    const tabTitles: Record<ReportTab, string> = {
      headcount: 'กำลังคนรายวัน',
      lateness: 'การมาสาย',
      tax: 'ภาษีและประกันสังคม',
      turnover: 'การเข้า-ออกพนักงาน',
      leave: 'การลา',
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
  const [taxMonth, setTaxMonth] = useState<number>(new Date().getMonth() + 1);
  // แนวโน้ม 12 เดือนของปีที่เลือก (null = เดือนนั้นยังไม่มีรอบเงินเดือน)
  const [taxTrend, setTaxTrend] = useState<{ tax: (number | null)[]; sso: (number | null)[] } | null>(null);
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
  const [turnoverTrend, setTurnoverTrend] = useState<{ rate: (number | null)[]; joined: (number | null)[]; resigned: (number | null)[] } | null>(null);

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

  // -------------------------------------------------------------
  // แนวโน้มรายเดือนทั้งปี (เรียกรายงานเดือนละครั้ง เฉพาะเดือนที่ผ่านมาแล้ว)
  // -------------------------------------------------------------
  const monthsUpTo = (year: number) => {
    const now = new Date();
    const last = year < now.getFullYear() ? 12 : year === now.getFullYear() ? now.getMonth() + 1 : 0;
    return Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => m <= last);
  };

  useEffect(() => {
    if (activeTab !== 'tax') return;
    let cancelled = false;
    const deptId = taxDepartment === 'ALL' ? undefined : Number(taxDepartment);
    const months = monthsUpTo(taxYear);
    Promise.allSettled(months.map((m) => reportService.getPayrollTaxSummary(taxYear, m, deptId))).then((res) => {
      if (cancelled) return;
      const tax: (number | null)[] = Array(12).fill(null);
      const sso: (number | null)[] = Array(12).fill(null);
      res.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.periodStatus !== 'NONE' && r.value.items.length > 0) {
          tax[months[i] - 1] = r.value.totalWithholdingTax;
          sso[months[i] - 1] = r.value.totalSsoRemittance;
        }
      });
      setTaxTrend({ tax, sso });
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, taxYear, taxDepartment]);

  useEffect(() => {
    if (activeTab !== 'turnover') return;
    let cancelled = false;
    const divId = turnoverDivision === 'ALL' ? undefined : Number(turnoverDivision);
    const deptId = turnoverDepartment === 'ALL' ? undefined : Number(turnoverDepartment);
    const months = monthsUpTo(turnoverYear);
    Promise.allSettled(months.map((m) => reportService.getMonthlyTurnover(turnoverYear, m, divId, deptId))).then((res) => {
      if (cancelled) return;
      const rate: (number | null)[] = Array(12).fill(null);
      const joined: (number | null)[] = Array(12).fill(null);
      const resigned: (number | null)[] = Array(12).fill(null);
      res.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          rate[months[i] - 1] = r.value.overallTurnoverRate;
          joined[months[i] - 1] = r.value.totalJoinedCount;
          resigned[months[i] - 1] = r.value.totalResignedCount;
        }
      });
      setTurnoverTrend({ rate, joined, resigned });
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, turnoverYear, turnoverDivision, turnoverDepartment]);

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
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดรายงานการเข้า-ออกพนักงาน');
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
      <div className="border-b border-slate-200 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl dark:border-slate-700 dark:bg-slate-900">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {canViewHeadcount && (
            <button
              onClick={() => setActiveTab('headcount')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'headcount'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              กำลังคนรายวัน
            </button>
          )}

          {canViewLateness && (
            <button
              onClick={() => setActiveTab('lateness')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'lateness'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              การมาสาย
            </button>
          )}

          {canViewTax && (
            <button
              onClick={() => setActiveTab('tax')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'tax'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              ภาษีและประกันสังคม
            </button>
          )}

          {canViewTurnover && (
            <button
              onClick={() => setActiveTab('turnover')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'turnover'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              การเข้า-ออกพนักงาน
            </button>
          )}

          {canViewLeave && (
            <button
              onClick={() => setActiveTab('leave')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'leave'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              การลา
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
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">วันที่:</span>
                <ThaiDatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200"
                />
              </div>

              {/* Division Filter */}
              <CustomSelect
                value={selectedDivision}
                onChange={(val) => {
                  const parsed = val === 'ALL' ? 'ALL' : Number(val);
                  setSelectedDivision(parsed);
                  setSelectedDepartment('ALL');
                }}
                placeholder="ฝ่ายทั้งหมด"
                className="min-w-[150px]"
                options={[
                  { value: 'ALL', label: 'ฝ่ายทั้งหมด' },
                  ...divisions.map((div) => ({ value: div.id, label: div.divisionName })),
                ]}
              />

              {/* Department Filter */}
              <CustomSelect
                value={selectedDepartment}
                onChange={(val) => {
                  const parsed = val === 'ALL' ? 'ALL' : Number(val);
                  setSelectedDepartment(parsed);
                }}
                placeholder="แผนกทั้งหมด"
                className="min-w-[150px]"
                options={[
                  { value: 'ALL', label: 'แผนกทั้งหมด' },
                  ...departments
                    .filter((dept) => selectedDivision === 'ALL' || dept.divisionId === selectedDivision)
                    .map((dept) => ({ value: dept.id, label: dept.departmentName })),
                ]}
              />

              {/* Refresh Button */}
              <button
                onClick={loadDailyHeadcount}
                disabled={isLoadingHeadcount}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 border border-slate-200 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:border-slate-700"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'พนักงานทั้งหมด', value: headcountData.totalEmployees, sub: `ต้องมาทำงาน ${headcountData.totalExpected ?? headcountData.totalEmployees} คน` },
                { label: 'มาปฏิบัติงาน', value: headcountData.totalPresent, color: VIZ.good, sub: `สาย ${headcountData.totalLate} · ออกก่อน ${headcountData.totalEarlyLeave}` },
                { label: 'มาสาย', value: headcountData.totalLate, color: VIZ.warning, sub: 'นับรวมในมาปฏิบัติงาน' },
                { label: 'ขาด / ยังไม่ลงเวลา', value: headcountData.totalAbsent, color: VIZ.critical },
                {
                  label: 'ลา / วันหยุด',
                  value: (headcountData.totalLeave ?? 0) + (headcountData.totalOff ?? 0),
                  color: VIZ.s1,
                  sub: `ลา ${headcountData.totalLeave ?? 0} · หยุด ${headcountData.totalOff ?? 0}`,
                },
              ].map((c) => (
                <div key={c.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    {c.color && <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />}
                    {c.label}
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {c.value} <span className="text-xs font-normal text-slate-400">คน</span>
                  </div>
                  {c.sub && <div className="text-[11px] text-slate-400">{c.sub}</div>}
                </div>
              ))}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-500">อัตราการเข้างาน</span>
                <div className="text-2xl font-extrabold text-[#0B2046]">{Math.min(100, Math.max(0, headcountData.overallAttendanceRate))}%</div>
                <div className="text-[11px] text-slate-400">คิดจากคนที่ต้องมาทำงาน</div>
              </div>
            </div>
          )}

          {/* แจ้งเมื่อยังไม่มีใครลงเวลา */}
          {headcountData && headcountData.totalPresent === 0 && (headcountData.totalExpected ?? headcountData.totalEmployees) > 0 && (
            <div className="flex items-center gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              วันที่ {selectedDate} ยังไม่มีการลงเวลาทำงานในระบบ — ถ้าเป็นวันที่ผ่านมาแล้ว ตรวจสอบว่านำเข้าข้อมูลเครื่องสแกนแล้วหรือยัง
            </div>
          )}

          {/* กราฟสัดส่วนสถานะรายแผนก */}
          {headcountData && headcountData.departments.some((d) => d.totalHeadcount > 0) && !isLoadingHeadcount && (
            <ChartCard
              title="สถานะการมาทำงานรายแผนก"
              subtitle="ชี้ที่แถบเพื่อดูจำนวนแต่ละสถานะ · ตัวเลขหลังชื่อแผนก = อัตราการเข้างาน"
              legend={
                <Legend
                  items={[
                    { label: 'ตรงเวลา', color: VIZ.good },
                    { label: 'มาสาย', color: VIZ.warning },
                    { label: 'ขาด / ยังไม่ลงเวลา', color: VIZ.critical },
                    { label: 'ลา', color: VIZ.s1 },
                    { label: 'วันหยุด', color: VIZ.neutral },
                  ]}
                />
              }
            >
              <ProportionBars
                rows={headcountData.departments
                  .filter((d) => d.totalHeadcount > 0)
                  .map((d) => ({
                    id: d.departmentId,
                    label: d.departmentName,
                    sub: `${Math.min(100, Math.max(0, d.attendanceRate))}%`,
                    segments: [
                      { key: 'present', label: 'ตรงเวลา', value: Math.max(0, d.presentCount - d.lateCount), color: VIZ.good },
                      { key: 'late', label: 'มาสาย', value: d.lateCount, color: VIZ.warning },
                      { key: 'absent', label: 'ขาด / ยังไม่ลงเวลา', value: d.absentCount, color: VIZ.critical },
                      { key: 'leave', label: 'ลา', value: d.leaveCount ?? 0, color: VIZ.s1 },
                      { key: 'off', label: 'วันหยุด', value: d.offCount ?? 0, color: VIZ.neutral },
                    ],
                  }))}
              />
            </ChartCard>
          )}

          {/* Table Breakdown by Department */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between dark:border-slate-700/60">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 dark:text-slate-200">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                ตารางสรุปอัตรากำลังคนจำแนกตามแผนก
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                {headcountData?.departments.length || 0} แผนก
              </span>
            </div>

            {isLoadingHeadcount ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0B2046]" />
                กำลังโหลดข้อมูลอัตรากำลังคน...
              </div>
            ) : !headcountData || headcountData.departments.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm dark:text-slate-500 dark:text-slate-400">
                ไม่พบข้อมูลแผนกตามตัวกรองที่เลือก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr className="whitespace-nowrap">
                      <th className="py-3 px-4 sticky left-0 bg-slate-50 z-[1]">ชื่อแผนก</th>
                      <th className="py-3 px-4">รหัสแผนก</th>
                      <th className="py-3 px-4">ฝ่าย</th>
                      <th className="py-3 px-4 text-center">พนักงานทั้งหมด</th>
                      <th className="py-3 px-4 text-center text-emerald-700">มาทำงาน</th>
                      <th className="py-3 px-4 text-center text-amber-700">มาสาย</th>
                      <th className="py-3 px-4 text-center text-orange-700">ออกก่อน</th>
                      <th className="py-3 px-4 text-center text-blue-700">ลา</th>
                      <th className="py-3 px-4 text-center text-slate-500">วันหยุด</th>
                      <th className="py-3 px-4 text-center text-rose-700">ขาดงาน</th>
                      <th className="py-3 px-4 text-center">อัตราการเข้างาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {headcountData.departments.map((dept) => (
                      <tr key={dept.departmentId} className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 sticky left-0 bg-white z-[1]">
                          {dept.departmentName}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {dept.departmentCode}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {dept.divisionName}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
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
                        <td className="py-3 px-4 text-center font-semibold text-blue-600">
                          {dept.leaveCount ?? 0}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">
                          {dept.offCount ?? 0}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-rose-600">
                          {dept.absentCount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full ${
                                  dept.attendanceRate >= 90
                                    ? 'bg-emerald-500'
                                    : dept.attendanceRate >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, dept.attendanceRate))}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[36px] dark:text-slate-300">
                              {Math.min(100, Math.max(0, dept.attendanceRate))}%
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
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium dark:text-slate-400">เดือน:</span>
                <CustomSelect
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none dark:text-slate-200"
                >
                  {thaiMonths.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium dark:text-slate-400">ปี:</span>
                <CustomSelect
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none dark:text-slate-200"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      พ.ศ. {y + 543}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* Department Selector */}
              <CustomSelect
                value={latenessDepartment}
                onChange={(val) => {
                  const parsed = val === 'ALL' ? 'ALL' : Number(val);
                  setLatenessDepartment(parsed);
                }}
                placeholder="แผนกทั้งหมด"
                className="min-w-[150px]"
                options={[
                  { value: 'ALL', label: 'แผนกทั้งหมด' },
                  ...departments.map((dept) => ({ value: dept.id, label: dept.departmentName })),
                ]}
              />

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
                  value={latenessSearch}
                  onChange={(e) => setLatenessSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-56 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadMonthlyLateness}
                disabled={isLoadingLateness}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 border border-slate-200 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:border-slate-700"
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
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400">พนักงานที่ตรวจสอบ</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{latenessData.totalAuditedEmployees} คน</div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <span className="text-xs text-amber-600 font-medium">การมาสายรวม</span>
                <div className="text-2xl font-extrabold text-amber-600">{latenessData.totalLateOccurrences} ครั้ง</div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <span className="text-xs text-orange-600 font-medium">เวลารวมที่สาย</span>
                <div className="text-2xl font-extrabold text-orange-600">
                  {latenessData.totalLateMinutes} <span className="text-xs font-normal text-slate-400 dark:text-slate-500 dark:text-slate-400">นาที</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <span className="text-xs text-blue-600 font-medium">อัตราการเข้างานเฉลี่ย</span>
                <div className="text-2xl font-extrabold text-[#0B2046]">{Math.min(100, Math.max(0, latenessData.overallAttendanceRate))}%</div>
              </div>
            </div>
          )}

          {/* 10 อันดับมาสายบ่อย */}
          {latenessData && latenessData.items.some((i) => i.lateDays > 0) && !isLoadingLateness && (
            <ChartCard title="10 อันดับพนักงานที่มาสายบ่อยที่สุด" subtitle="เรียงตามจำนวนครั้ง แล้วตามนาทีรวม · ชี้เพื่อดูรายละเอียด">
              <RankBars
                color={VIZ.s2}
                items={[...latenessData.items]
                  .filter((i) => i.lateDays > 0)
                  .sort((a, b) => b.lateDays - a.lateDays || b.totalLateMinutes - a.totalLateMinutes)
                  .slice(0, 10)
                  .map((i) => ({
                    id: i.employeeId,
                    label: i.employeeName,
                    sub: i.departmentName,
                    value: i.lateDays,
                    valueLabel: `${i.lateDays} ครั้ง · ${i.totalLateMinutes} นาที`,
                    tip: (
                      <div>
                        <div className="font-semibold text-slate-900">{i.employeeName}</div>
                        <div className="text-slate-500">
                          {i.departmentName} · {i.positionName}
                        </div>
                        <div className="mt-1">
                          มาสาย {i.lateDays} ครั้ง รวม {i.totalLateMinutes} นาที
                        </div>
                        <div>
                          ขาดงาน {i.absentDays} วัน · ออกก่อน {i.earlyLeaveDays} ครั้ง
                        </div>
                      </div>
                    ),
                  }))}
              />
            </ChartCard>
          )}

          {/* Detailed Table per Employee */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between dark:border-slate-700/60">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 dark:text-slate-200">
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                ตารางสรุปเวลาทำงานและการมาสายรายบุคคล
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                {latenessData?.items.length || 0} คน
              </span>
            </div>

            {isLoadingLateness ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0B2046]" />
                กำลังโหลดรายงานการมาสาย...
              </div>
            ) : !latenessData || latenessData.items.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm dark:text-slate-500 dark:text-slate-400">
                ไม่พบข้อมูลพนักงานตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr className="whitespace-nowrap">
                      <th className="py-3 px-4 sticky left-0 bg-slate-50 z-[1]">พนักงาน</th>
                      <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                      <th className="py-3 px-4 text-center">วันทำงาน</th>
                      <th className="py-3 px-4 text-center text-emerald-700">ตรงเวลา</th>
                      <th className="py-3 px-4 text-center text-amber-700">มาสาย</th>
                      <th className="py-3 px-4 text-center text-orange-700">ออกก่อน</th>
                      <th className="py-3 px-4 text-center text-rose-700">ขาดงาน</th>
                      <th className="py-3 px-4 text-center">อัตราการเข้างาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {latenessData.items.map((item) => (
                      <tr key={item.employeeId} className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 sticky left-0 bg-white z-[1]">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block dark:text-slate-100">{item.employeeName}</span>
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 dark:text-slate-400">รหัส {item.employeeCode}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-800 dark:text-slate-200 block dark:text-slate-200">{item.departmentName}</span>
                          <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">{item.positionName}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {item.totalWorkDays} วัน
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {item.presentDays} วัน
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.lateDays > 0 ? (
                            <div>
                              <span className="font-bold text-amber-600">{item.lateDays} ครั้ง</span>
                              {item.lateDays >= 3 && (
                                <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 px-1.5 text-[10px] font-semibold text-amber-700" title="มาสายตั้งแต่ 3 ครั้งขึ้นไปในเดือนนี้">
                                  <AlertTriangle className="w-2.5 h-2.5" /> บ่อย
                                </span>
                              )}
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
                            {Math.min(100, Math.max(0, item.attendanceRate))}%
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
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Select */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium dark:text-slate-400">ปี:</span>
                <CustomSelect
                  value={taxYear}
                  onChange={(e) => setTaxYear(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none dark:text-slate-200"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      พ.ศ. {y + 543}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* Month Select */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium dark:text-slate-400">งวดเดือน:</span>
                <CustomSelect
                  value={taxMonth}
                  onChange={(e) => setTaxMonth(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none dark:text-slate-200"
                >
                  {thaiMonths.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* Department Select */}
              <CustomSelect
                value={taxDepartment}
                onChange={(val) => {
                  const parsed = val === 'ALL' ? 'ALL' : Number(val);
                  setTaxDepartment(parsed);
                }}
                placeholder="แผนกทั้งหมด"
                className="min-w-[150px]"
                options={[
                  { value: 'ALL', label: 'แผนกทั้งหมด' },
                  ...departments.map((dept) => ({ value: dept.id, label: dept.departmentName })),
                ]}
              />

              {/* Search Box */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ/รหัส/บัตรประชาชน..."
                  value={taxSearch}
                  onChange={(e) => {
                    setTaxSearch(e.target.value);
                    setTaxPage(1);
                  }}
                  className="text-xs text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none w-44 dark:text-slate-200"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadPayrollTax}
                disabled={isLoadingTax}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 border border-slate-200 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:border-slate-700"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingTax ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {/* Export Buttons */}
            {(canExportTax || canExportSso) && (
              <div className="flex flex-wrap items-center gap-2">
                {canExportTax && (
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
                )}

                {canExportSso && (
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
                )}
              </div>
            )}
          </div>

          {/* 4 Summary KPI Cards */}
          {taxData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium dark:text-slate-400">เงินได้พึงประเมินรวม</span>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-extrabold text-[#0B2046]">
                  {taxData.totalGrossIncome.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1 dark:text-slate-500 dark:text-slate-400">บาท</span>
                </div>
                <div className="text-2xs text-slate-400 dark:text-slate-500 dark:text-slate-400">ฐานคำนวณภาษีและค่าจ้างรอบเดือน</div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-600 font-medium">ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1)</span>
                  <Receipt className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-extrabold text-rose-600">
                  {taxData.totalWithholdingTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1 dark:text-slate-500 dark:text-slate-400">บาท</span>
                </div>
                <div className="text-2xs text-rose-500">
                  มีผู้ถูกหักภาษี {taxData.taxableEmployeesCount} จาก {taxData.totalEmployees} คน
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600 font-medium">นำส่งประกันสังคม (สปส. 1-10)</span>
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-extrabold text-blue-700">
                  {taxData.totalSsoRemittance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1 dark:text-slate-500 dark:text-slate-400">บาท</span>
                </div>
                <div className="text-2xs text-slate-500 dark:text-slate-400 flex justify-between dark:text-slate-400">
                  <span>ลูกจ้าง: {taxData.totalSsoEmployee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  <span>นายจ้าง: {taxData.totalSsoEmployer.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-600 font-medium">เงินเดือนสุทธินำจ่าย</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-700">
                  {taxData.totalNetSalary.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-slate-400 ml-1 dark:text-slate-500 dark:text-slate-400">บาท</span>
                </div>
                <div className="text-2xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                  สถานะรอบ: <span className="font-semibold text-slate-700 dark:text-slate-300">{taxData.periodStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* สถานะรอบเงินเดือน — กันนำตัวเลขที่ยังไม่ปิดรอบไปยื่น */}
          {taxData && !isLoadingTax &&
            (taxData.periodStatus === 'NONE' ? (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                ยังไม่มีรอบเงินเดือนของเดือนนี้ — สร้างและคำนวณรอบเงินเดือนก่อน รายงานจึงจะมีข้อมูล
              </div>
            ) : ['APPROVED', 'PROCESSING', 'PAID', 'CLOSED'].includes(taxData.periodStatus) ? (
              <div className="flex items-center gap-2 p-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                รอบเงินเดือนอนุมัติแล้ว ({taxData.periodStatus}) — ตัวเลขพร้อมใช้ยื่น ภ.ง.ด.1 / สปส.1-10
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                รอบเงินเดือนยังไม่อนุมัติ ({taxData.periodStatus}) — ตัวเลขอาจเปลี่ยน ยังไม่ควรใช้ยื่นจริง
              </div>
            ))}

          {/* แนวโน้มทั้งปี */}
          {taxTrend && taxTrend.tax.some((v) => v != null) && (
            <ChartCard
              title={`ภาษีหัก ณ ที่จ่าย และเงินสมทบประกันสังคม ปี ${taxYear + 543}`}
              subtitle="ยอดรวมรายเดือน (บาท) · เดือนที่ยังไม่มีรอบเงินเดือนจะว่างไว้ · แถบพื้นหลัง = เดือนที่เลือก"
              legend={
                <Legend
                  items={[
                    { label: 'ภาษี ภ.ง.ด.1', color: VIZ.s1 },
                    { label: 'ประกันสังคมรวมนำส่ง', color: VIZ.s3 },
                  ]}
                />
              }
            >
              <MonthlyColumns
                highlightMonth={taxMonth}
                tipFormat={fmtBaht}
                series={[
                  { key: 'tax', label: 'ภาษี ภ.ง.ด.1', color: VIZ.s1, values: taxTrend.tax },
                  { key: 'sso', label: 'ประกันสังคมรวมนำส่ง', color: VIZ.s3, values: taxTrend.sso },
                ]}
              />
            </ChartCard>
          )}

          {/* Detailed Tax & SSO Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm dark:text-slate-200">
                  ตารางจำแนกภาษีเงินได้หัก ณ ที่จ่าย และเงินสมทบประกันสังคมรายบุคคล
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                  ทั้งหมด {filteredTaxItems.length} รายการ
                </span>
                {/* Rows per page */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>แสดง</span>
                  <CustomSelect
                    value={taxRowsPerPage}
                    onChange={(e) => {
                      setTaxRowsPerPage(Number(e.target.value));
                      setTaxPage(1);
                    }}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </CustomSelect>
                  <span>แถว</span>
                </div>
              </div>
            </div>

            {isLoadingTax ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                กำลังโหลดรายงานภาษีและประกันสังคม...
              </div>
            ) : filteredTaxItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                {taxData?.periodStatus === 'NONE'
                  ? `ไม่พบข้อมูลงวดการจ่ายเงินเดือนประจำเดือน ${thaiMonths[taxMonth - 1]} ${taxYear + 543}`
                  : 'ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr className="whitespace-nowrap">
                      <th className="py-3 px-4 text-center w-12">ลำดับ</th>
                      <th className="py-3 px-4 sticky left-0 bg-slate-50 z-[1]">พนักงาน</th>
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
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {pagedTaxItems.map((item, idx) => {
                      const rowNum = (currentTaxPage - 1) * taxRowsPerPage + idx + 1;
                      const ssoTotal = item.ssoEmployee + item.ssoEmployer;
                      return (
                        <tr key={item.employeeId} className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 text-center text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{rowNum}</td>
                          <td className="py-3 px-4 sticky left-0 bg-white z-[1]">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block dark:text-slate-100">{item.employeeName}</span>
                            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 dark:text-slate-400">รหัส {item.employeeCode}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                            {item.citizenIdMasked}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block dark:text-slate-200">{item.departmentName}</span>
                            <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">{item.positionName}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
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
                    <tfoot className="bg-slate-100/80 text-xs font-bold text-slate-800 dark:text-slate-200 border-t-2 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700">
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
                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 dark:border-slate-700/60 dark:text-slate-400">
                    <span>
                      หน้า {currentTaxPage} จาก {totalTaxPages} (ทั้งหมด {filteredTaxItems.length} แถว)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTaxPage((p) => Math.max(1, p - 1))}
                        disabled={currentTaxPage <= 1}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-slate-800/40 dark:border-slate-700"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTaxPage((p) => Math.min(totalTaxPages, p + 1))}
                        disabled={currentTaxPage >= totalTaxPages}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-slate-800/40 dark:border-slate-700"
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

      {/* TAB 5: รายงานการลา */}
      {activeTab === 'leave' && canViewLeave && (
        <LeaveSummaryReportTab canExport={canViewLeave} onError={handleLeaveReportError} />
      )}

      {/* ============================================================= */}
      {/* TAB 4: อัตราการเข้า-ออกงาน (Turnover Rate Analytics) */}
      {/* ============================================================= */}
      {activeTab === 'turnover' && canViewTurnover && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Select */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium dark:text-slate-400">ปี:</span>
                <CustomSelect
                  value={turnoverYear}
                  onChange={(e) => setTurnoverYear(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none dark:text-slate-200"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      พ.ศ. {y + 543}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* Month Select */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium dark:text-slate-400">เดือน:</span>
                <CustomSelect
                  value={turnoverMonth}
                  onChange={(e) => setTurnoverMonth(Number(e.target.value))}
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none dark:text-slate-200"
                >
                  {thaiMonths.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* Division Filter */}
              <CustomSelect
                value={turnoverDivision}
                onChange={(val) => {
                  const parsed = val === 'ALL' ? 'ALL' : Number(val);
                  setTurnoverDivision(parsed);
                  setTurnoverDepartment('ALL');
                }}
                placeholder="ฝ่ายทั้งหมด"
                className="min-w-[150px]"
                options={[
                  { value: 'ALL', label: 'ฝ่ายทั้งหมด' },
                  ...divisions.map((div) => ({ value: div.id, label: div.divisionName })),
                ]}
              />

              {/* Department Filter */}
              <CustomSelect
                value={turnoverDepartment}
                onChange={(val) => {
                  const parsed = val === 'ALL' ? 'ALL' : Number(val);
                  setTurnoverDepartment(parsed);
                }}
                placeholder="แผนกทั้งหมด"
                className="min-w-[150px]"
                options={[
                  { value: 'ALL', label: 'แผนกทั้งหมด' },
                  ...departments
                    .filter((dept) => turnoverDivision === 'ALL' || dept.divisionId === turnoverDivision)
                    .map((dept) => ({ value: dept.id, label: dept.departmentName })),
                ]}
              />

              {/* Refresh Button */}
              <button
                onClick={loadTurnover}
                disabled={isLoadingTurnover}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 border border-slate-200 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:border-slate-700"
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
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium dark:text-slate-400">พนักงานต้นงวด</span>
                <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">
                  {turnoverData.totalBeginningHeadcount} <span className="text-xs font-normal text-slate-400 dark:text-slate-500 dark:text-slate-400">คน</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-600 font-medium">เข้าใหม่</span>
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-600">
                  {turnoverData.totalJoinedCount} <span className="text-xs font-normal text-slate-400 dark:text-slate-500 dark:text-slate-400">คน</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-600 font-medium">ลาออก</span>
                  <UserMinus className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-extrabold text-rose-600">
                  {turnoverData.totalResignedCount} <span className="text-xs font-normal text-slate-400 dark:text-slate-500 dark:text-slate-400">คน</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <span className="text-xs text-blue-600 font-medium">พนักงานสิ้นงวด</span>
                <div className="text-2xl font-extrabold text-[#0B2046]">
                  {turnoverData.totalEndingHeadcount} <span className="text-xs font-normal text-slate-400 dark:text-slate-500 dark:text-slate-400">คน</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium dark:text-slate-400">อัตราลาออก / อัตราคงอยู่</span>
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

          {/* แนวโน้มทั้งปี: แยกเป็น 2 กราฟ (พนักงานเข้าใหม่ และ พนักงานลาออก) */}
          {turnoverTrend && (turnoverTrend.joined.some((v) => v != null) || turnoverTrend.resigned.some((v) => v != null)) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ChartCard
                title={`พนักงานเข้าใหม่ ปี ${turnoverYear + 543}`}
                subtitle="จำนวนพนักงานเริ่มงานในแต่ละเดือน (คน)"
                legend={
                  <Legend
                    items={[
                      { label: 'เข้าใหม่', color: VIZ.s3 },
                    ]}
                  />
                }
              >
                <MonthlyColumns
                  highlightMonth={turnoverMonth}
                  minMax={4}
                  format={fmtNumber}
                  tipFormat={(v) => `${fmtNumber(v)} คน`}
                  series={[
                    { key: 'joined', label: 'เข้าใหม่', color: VIZ.s3, values: turnoverTrend.joined },
                  ]}
                />
              </ChartCard>
              <ChartCard
                title={`พนักงานลาออก ปี ${turnoverYear + 543}`}
                subtitle="จำนวนพนักงานสิ้นสุดสภาพการจ้างในแต่ละเดือน (คน)"
                legend={
                  <Legend
                    items={[
                      { label: 'ลาออก', color: VIZ.s2 },
                    ]}
                  />
                }
              >
                <MonthlyColumns
                  highlightMonth={turnoverMonth}
                  minMax={4}
                  format={fmtNumber}
                  tipFormat={(v) => `${fmtNumber(v)} คน`}
                  series={[
                    { key: 'resigned', label: 'ลาออก', color: VIZ.s2, values: turnoverTrend.resigned },
                  ]}
                />
              </ChartCard>
            </div>
          )}

          {/* Department Breakdown Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between dark:border-slate-700/60">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 dark:text-slate-200">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                อัตราการเข้า-ออกของพนักงานจำแนกตามแผนก
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                {turnoverData?.departmentTurnovers.length || 0} แผนก
              </span>
            </div>

            {isLoadingTurnover ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                กำลังโหลดรายงานอัตราการเข้า-ออกของพนักงาน...
              </div>
            ) : !turnoverData || turnoverData.departmentTurnovers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                ไม่พบข้อมูลแผนกตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr className="whitespace-nowrap">
                      <th className="py-3 px-4">ฝ่าย</th>
                      <th className="py-3 px-4">รหัสแผนก</th>
                      <th className="py-3 px-4">ชื่อแผนก</th>
                      <th className="py-3 px-4 text-center">ต้นงวด (คน)</th>
                      <th className="py-3 px-4 text-center text-emerald-700">เข้าใหม่</th>
                      <th className="py-3 px-4 text-center text-rose-700">ลาออก</th>
                      <th className="py-3 px-4 text-center text-blue-900">สิ้นงวด (คน)</th>
                      <th className="py-3 px-4 text-center">อัตราลาออก (%)</th>
                      <th className="py-3 px-4 text-center">อัตราคงอยู่ (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {turnoverData.departmentTurnovers.map((dept) => (
                      <tr key={dept.departmentId} className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">{dept.divisionName}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">{dept.departmentCode}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{dept.departmentName}</td>
                        <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{dept.beginningHeadcount}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {dept.joinedCount > 0 ? dept.joinedCount : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-rose-600">
                          {dept.resignedCount > 0 ? dept.resignedCount : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-slate-100">{dept.endingHeadcount}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              dept.turnoverRate === 0
                                ? 'bg-slate-50 text-slate-600 dark:text-slate-400 border border-slate-200'
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between dark:border-slate-700/60">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 dark:text-slate-200">
                  <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  บันทึกประวัติการเคลื่อนไหวพนักงานประจำงวดเดือน
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                  {turnoverData.eventLogs.length} รายการ
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr className="whitespace-nowrap">
                      <th className="py-3 px-4">วันที่</th>
                      <th className="py-3 px-4">พนักงาน</th>
                      <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                      <th className="py-3 px-4 text-center">ประเภทเหตุการณ์</th>
                      <th className="py-3 px-4">เหตุผล / หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {turnoverData.eventLogs.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">{ev.eventDate}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block dark:text-slate-100">{ev.employeeName}</span>
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 dark:text-slate-400">รหัส {ev.employeeCode}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-800 dark:text-slate-200 block dark:text-slate-200">{ev.departmentName}</span>
                          <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">{ev.positionName}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {ev.eventType === 'JOINED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400">
                              <UserPlus className="w-3 h-3" /> เริ่มงานใหม่
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400">
                              <UserMinus className="w-3 h-3" /> {ev.eventType === 'TERMINATED' ? 'เลิกจ้าง' : 'ลาออก'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">{ev.reason || '-'}</td>
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

