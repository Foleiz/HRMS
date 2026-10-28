'use client';

import { MoneyInput } from '@/components/ui/MoneyInput';
import { YearPicker } from '@/components/ui/YearPicker';
import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  MoreHorizontal,
  MoreVertical,
  ArrowRight,
  Plus,
  Edit2,
  Trash2,
  History,
  Search,
  Users,
  Scale,
  Gift,
  Percent,
  CheckCircle,
  CheckCircle2,
  Loader2,
  Building2,
  Briefcase,
  Layers,
  FileSpreadsheet,
  Banknote,
  ShieldCheck,
  Calendar,
  Clock,
  Check,
  Eye,
  Send,
  XCircle,
  Upload,
  Download,
  Lock,
  Paperclip,
  Landmark,
  Calculator,
  Sliders,
  Save,
  Coins,
  Sparkles,
  SlidersHorizontal,
  AlertTriangle,
  X,
  ArrowDownToLine,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import { salaryService } from '@/services/salaryService';
import { organizationService } from '@/services/organizationService';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import {
  SalaryStructure,
  TaxBracket,
  SocialSecurityRate,
  EmployeeSalaryOverview,
  CreateSalaryStructurePayload,
  UpdateSalaryStructurePayload,
  AdjustEmployeeSalaryPayload,
  PayrollOverview,
  PayrollItem,
  PayrollPeriod,
  PayrollRecord,
  BankTransferSummary,
  TaxSsoSummary,
  PayrollTransferList,
  PayrollTransferItem,
  UpdateTaxBracketPayload,
  UpdateSocialSecurityRatePayload,
  EmployeeBonus,
  BonusPeriodSummary,
  SaveEmployeeBonusesPayload,
} from '@/types/payroll';
import { Position, EmployeeLevel, Department } from '@/types/organization';
import { SalaryStructureModal } from '@/components/payroll/SalaryStructureModal';
import { PayrollItemModal } from '@/components/payroll/PayrollItemModal';
import { TaxBracketModal } from '@/components/payroll/TaxBracketModal';
import { SocialSecurityRateModal } from '@/components/payroll/SocialSecurityRateModal';
import { getAutoPullSource } from '@/components/payroll/autoPullItems';
import { Button, ActiveStatus, RowActions, RowActionButton } from '@/components/ui';
import { PARAM_TEMPLATES, parseFormulaParams, serializeFormulaParams } from '@/components/payroll/FormulaParamsEditor';
import { AdjustSalaryModal } from '@/components/payroll/AdjustSalaryModal';
import { SalaryHistoryModal } from '@/components/payroll/SalaryHistoryModal';
import { PayrollDetailDrawer } from '@/components/payroll/PayrollDetailDrawer';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { confirmAction } from '@/lib/sweetalert';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { PayrollViewSwitcher, PayrollViewMode } from '@/components/payroll/PayrollViewSwitcher';
import { MaskedDataViewer } from '@/components/common/MaskedDataViewer';
import CommissionTab from '@/components/payroll/CommissionTab';
import { commissionService } from '@/services/commissionService';
import { CommissionPeriodSummary } from '@/types/commission';
import PayrollPeriodsTab from '@/components/payroll/PayrollPeriodsTab';
import PayrollScheduleTab from '@/components/payroll/PayrollScheduleTab';
import { calculatePeriodDatesFromSettings, getPayrollScheduleSettings } from '@/services/payrollScheduleService';

type ActiveTab =
  | 'overview'
  | 'periods'
  | 'structures'
  | 'items'
  | 'bonus'
  | 'commission'
  | 'process'
  | 'schedule-settings'
  | 'bank-transfer'
  | 'tax-sso';

interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  unitText?: string;
}

function TablePagination({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100, 200],
  unitText = 'คน',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalCount);

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, safeCurrentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-white dark:bg-slate-800">
      {/* Left: Summary and Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
        <span>
          แสดง <strong className="font-semibold text-slate-800 dark:text-slate-200">{startIndex} - {endIndex}</strong> จากทั้งหมด{' '}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">{totalCount}</strong> {unitText}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">แสดงหน้าละ:</span>
          <CustomSelect
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              onPageSizeChange(newSize);
              onPageChange(1);
            }}
            className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer shadow-2xs transition-colors"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} {unitText}
              </option>
            ))}
          </CustomSelect>
        </div>
      </div>

      {/* Right: Page Navigation matching Image exactly */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="หน้าก่อนหน้า"
        >
          ←
        </button>

        {pageNumbers[0] > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="w-7 h-7 rounded-lg font-semibold flex items-center justify-center border border-slate-200 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              1
            </button>
            {pageNumbers[0] > 2 && <span className="px-1 text-slate-400">…</span>}
          </>
        )}

        {pageNumbers.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`w-7 h-7 rounded-lg font-semibold flex items-center justify-center transition-all cursor-pointer ${
              safeCurrentPage === p
                ? 'bg-[#0B2046] text-white shadow-xs'
                : 'border border-slate-200 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {p}
          </button>
        ))}

        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="w-7 h-7 rounded-lg font-semibold flex items-center justify-center border border-slate-200 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="หน้าถัดไป"
        >
          →
        </button>
      </div>
    </div>
  );
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/** แปลง 'YYYY-MM-DD' เป็นวันที่ไทยแบบย่อ เช่น 29 ส.ค. 2569 */
const formatThaiShortDate = (iso?: string | null) => {
  if (!iso) return '-';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  const abbr = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d} ${abbr[m - 1]} ${y + 543}`;
};

/** แปลง 'YYYY-MM-DD' เป็นวันที่ไทยแบบตัวเลข เช่น 01/08/2569 */
const formatThaiDateSlash = (iso?: string | null) => {
  if (!iso) return '-';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}`;
};

const getDefaultPeriodValues = (year: number, month: number) => {
  const safeMonth = Math.min(Math.max(1, month || 1), 12);
  const thaiMonth = THAI_MONTH_NAMES[safeMonth - 1];
  const safeYear = year || 2026;
  const thaiYear = safeYear + 543;
  const monthStr = safeMonth.toString().padStart(2, '0');
  const lastDay = new Date(safeYear, safeMonth, 0).getDate();
  const lastDayStr = lastDay.toString().padStart(2, '0');
  const payDay = Math.min(29, lastDay).toString().padStart(2, '0');

  return {
    periodName: `รอบเดือน${thaiMonth} ${thaiYear}`,
    startDate: `${safeYear}-${monthStr}-01`,
    endDate: `${safeYear}-${monthStr}-${lastDayStr}`,
    paymentDate: `${safeYear}-${monthStr}-${payDay}`,
  };
};

const isFuturePeriod = (period?: PayrollPeriod | null) => {
  if (!period) return false;
  const now = new Date();
  const currentPeriodVal = now.getFullYear() * 12 + (now.getMonth() + 1);
  const periodVal = period.year * 12 + period.month;
  return periodVal > currentPeriodVal;
};

/** รายการหลักที่ลบไม่ได้ (แก้ไข/ปิดใช้งานได้ตามปกติ): เงินเดือนพื้นฐาน, เงินประจำตำแหน่ง, โบนัส, ค่าคอมมิชชั่น */
const UNDELETABLE_ITEM_CODES = ['INC_BASE', 'INC_POSITION', 'INC_BONUS', 'INC_COMMISSION'];

export default function PayrollPage() {
  const router = useRouter();
  const { user, hasPermission, hasRole } = useAuth();
  const toast = useToast();
  // บทบาทในหน้าเงินเดือน — ใช้ชุดรหัสสิทธิ์เดียวกับ backend (PayrollAccess.cs) ไม่ผูกกับชื่อบทบาทตายตัว
  const isAdmin = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');

  // สิทธิ์การเข้าถึงแต่ละแท็บย่อย (อิงตามการติ๊กสิทธิ์จริงในหน้าบทบาทและสิทธิ์)
  const canViewBonus = hasPermission('PAYROLL_BONUS_VIEW');
  const canCalculateBonus = hasPermission('PAYROLL_BONUS_CREATE');
  const canEditBonus = hasPermission('PAYROLL_BONUS_EDIT');
  const canApproveBonus =
    hasPermission('PAYROLL_BONUS_APPROVE') ||
    hasPermission('PAYROLL_BONUS_EDIT') ||
    hasPermission('PAYROLL_BONUS_CREATE') ||
    hasPermission('PAYROLL_HR_APPROVE') ||
    hasPermission('PAYROLL_HR_CREATE');
  const canExportBonus = hasPermission('PAYROLL_BONUS_VIEW') || hasPermission('PAYROLL_BANK_VIEW');

  const canViewStructures = hasPermission('PAYROLL_STRUCTURE_VIEW') || isAdmin;
  const canCreateStructure = hasPermission('PAYROLL_STRUCTURE_CREATE') || isAdmin;
  const canEditStructure = hasPermission('PAYROLL_STRUCTURE_EDIT') || isAdmin;

  const canViewItems = hasPermission('PAYROLL_ITEMS_VIEW') || isAdmin;
  const canCreateItem = hasPermission('PAYROLL_ITEMS_CREATE') || isAdmin;
  const canEditItem = hasPermission('PAYROLL_ITEMS_EDIT') || isAdmin;

  const canAdjustSalary =
    hasPermission('PAYROLL_CALC_EDIT') ||
    hasPermission('PAYROLL_CALC_CREATE') ||
    hasPermission('PAYROLL_SALARY_EDIT') ||
    isAdmin;
  const canViewBankTransfer = hasPermission('PAYROLL_BANK_VIEW');
  const canViewTaxSso = hasPermission('PAYROLL_TAX_VIEW');
  const canViewProcess =
    hasPermission('PAYROLL_CALC_VIEW') ||
    hasPermission('PAYROLL_HR_VIEW') ||
    hasPermission('PAYROLL_FINANCE_VIEW') ||
    hasPermission('PAYROLL_BANK_VIEW') ||
    hasPermission('PAYROLL_ADMIN_VIEW') ||
    isAdmin;

  const canViewPeriods = hasPermission('PAYROLL_PERIOD_VIEW');

  const canViewOverview =
    hasPermission('PAYROLL_VIEW') ||
    hasPermission('PAYROLL_ADMIN_VIEW') ||
    hasPermission('PAYROLL_HR_VIEW') ||
    hasPermission('PAYROLL_FINANCE_VIEW');

  const canViewPayroll =
    hasPermission('PAYROLL_VIEW') ||
    hasPermission('PAYROLL_PERIOD_VIEW') ||
    hasPermission('PAYROLL_CALC_VIEW') ||
    hasPermission('PAYROLL_SLIP_VIEW') ||
    hasPermission('PAYROLL_BONUS_VIEW') ||
    hasPermission('PAYROLL_STRUCTURE_VIEW') ||
    hasPermission('PAYROLL_ITEMS_VIEW') ||
    hasPermission('PAYROLL_BANK_VIEW') ||
    hasPermission('PAYROLL_TAX_VIEW') ||
    hasPermission('PAYROLL_HR_VIEW') ||
    hasPermission('PAYROLL_FINANCE_VIEW') ||
    hasPermission('PAYROLL_ADMIN_VIEW');

  const PAYROLL_HR_PERMS = ['PAYROLL_CALC_CREATE', 'PAYROLL_CALC_EDIT', 'PAYROLL_HR_CREATE', 'PAYROLL_HR_EDIT'];
  const PAYROLL_FINANCE_PERMS = [
    'PAYROLL_FINANCE_CREATE', 'PAYROLL_FINANCE_EDIT', 'PAYROLL_FINANCE_APPROVE',
    'PAYROLL_BANK_CREATE', 'PAYROLL_BANK_EDIT', 'PAYROLL_TAX_EDIT', 'PAYROLL_TAX_MANAGE',
  ];
  const PAYROLL_APPROVER_PERMS = ['APPROVAL_PAYROLL_APPROVE', 'PAYROLL_ADMIN_APPROVE', 'PAYROLL_APPROVE'];
  const hasHrPayrollPerm = PAYROLL_HR_PERMS.some((p) => hasPermission(p));
  const hasFinancePayrollPerm = PAYROLL_FINANCE_PERMS.some((p) => hasPermission(p));
  const hasApproverPayrollPerm = PAYROLL_APPROVER_PERMS.some((p) => hasPermission(p));

  // ปุ่มดำเนินการ: ตามสิทธิ์ทำงาน (ตรงกับ backend)
  const isCEO = isAdmin || hasRole('CEO') || hasRole('EXECUTIVE') || hasApproverPayrollPerm;
  const isFinance = isAdmin || hasRole('PAYROLL_ADMIN') || hasFinancePayrollPerm;
  const isHR = isAdmin || hasRole('HR_MGR') || hasHrPayrollPerm;

  // มุมมอง (แท็บ HR / การเงิน / ผู้บริหาร): ใช้สิทธิ์ดูแบบแยก (PAYROLL_*_VIEW) ถ้าบทบาทตั้งไว้
  // ถ้าบทบาทยังไม่ได้ตั้งสิทธิ์ดูแบบแยก → ใช้สิทธิ์ทำงานของหน้าที่นั้นแทน
  const hasConfiguredExplicitViews =
    hasPermission('PAYROLL_HR_VIEW') ||
    hasPermission('PAYROLL_FINANCE_VIEW') ||
    hasPermission('PAYROLL_ADMIN_VIEW');

  const canAccessHrView =
    isAdmin || hasPermission('PAYROLL_HR_VIEW') || (!hasConfiguredExplicitViews && hasHrPayrollPerm);

  const canAccessFinanceView =
    isAdmin || hasPermission('PAYROLL_FINANCE_VIEW') || (!hasConfiguredExplicitViews && hasFinancePayrollPerm);

  const canAccessApproverView =
    isAdmin ||
    hasPermission('PAYROLL_ADMIN_VIEW') ||
    (!hasConfiguredExplicitViews && (hasApproverPayrollPerm || hasPermission('APPROVAL_PAYROLL_VIEW')));

  const canAccessBankView =
    isAdmin ||
    isCEO ||
    canAccessApproverView ||
    canViewBankTransfer ||
    canAccessFinanceView ||
    isFinance;

  const canEditTax =
    isAdmin ||
    hasPermission('PAYROLL_TAX_EDIT') ||
    hasPermission('PAYROLL_TAX_MANAGE') ||
    hasPermission('PAYROLL_FINANCE_EDIT');

  const canEditSso =
    isAdmin ||
    canEditTax ||
    hasPermission('PAYROLL_TAX_EDIT') ||
    hasPermission('PAYROLL_TAX_MANAGE') ||
    hasPermission('PAYROLL_FINANCE_EDIT');

  const { setBreadcrumb } = useBreadcrumb();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const tabParam = searchParams?.get('tab') as ActiveTab;
    if (tabParam === 'bank-transfer') {
      return 'process';
    }
    if (tabParam && ['periods', 'structures', 'items', 'bonus', 'commission', 'process', 'schedule-settings', 'tax-sso'].includes(tabParam)) {
      return tabParam;
    }
    return 'periods';
  });

  const [viewMode, setViewMode] = useState<PayrollViewMode>('ALL');
  const [processSubTab, setProcessSubTab] = useState<'HR' | 'FINANCE' | 'APPROVER' | 'BANK'>(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'bank-transfer') {
      return 'BANK';
    }
    return 'HR';
  });

  useEffect(() => {
    const tabParam = searchParams?.get('tab') as ActiveTab;
    if (tabParam === 'bank-transfer') {
      setActiveTab('process');
      setProcessSubTab('BANK');
      setViewMode('FINANCE');
    } else if (tabParam === 'overview') {
      setActiveTab('periods');
    } else if (tabParam && ['periods', 'structures', 'items', 'bonus', 'commission', 'process', 'schedule-settings', 'tax-sso'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);



  useEffect(() => {
    setBreadcrumb({ section: 'เงินเดือน', page: getTabLabel(activeTab) });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  // Master Data & State
  const [overview, setOverview] = useState<PayrollOverview | null>(null);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [ssoRates, setSsoRates] = useState<SocialSecurityRate[]>([]);
  const [employees, setEmployees] = useState<EmployeeSalaryOverview[]>([]);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [levels, setLevels] = useState<EmployeeLevel[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  // Sub-tab in Structure view: 'positions' vs 'employees'
  // กรอบโครงสร้างเงินเดือนย้ายไปอยู่ที่ โครงสร้างองค์กร › ระดับพนักงาน แล้ว — แท็บนี้เหลือฐานเงินเดือนพนักงาน
  const [structureSubTab, setStructureSubTab] = useState<'positions' | 'employees'>('employees');
  const [structurePage, setStructurePage] = useState<number>(1);
  const [structurePageSize, setStructurePageSize] = useState<number>(10);
  const [employeeSalaryPage, setEmployeeSalaryPage] = useState<number>(1);
  const [employeeSalaryPageSize, setEmployeeSalaryPageSize] = useState<number>(10);

  // Sub-tab in Payroll items view: 'EARNING' vs 'DEDUCTION'
  const [itemsSubTab, setItemsSubTab] = useState<'EARNING' | 'DEDUCTION'>('EARNING');

  // Filters for Employee Salaries
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // Tab 4: Payroll Processing (ประมวลเงินเดือน)
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [selectedProcessMonth, setSelectedProcessMonth] = useState<number | null>(null);
  const [selectedYearFilter, setSelectedYearFilter] = useState<number>(() => new Date().getFullYear());
  const [periodsTabYearFilter, setPeriodsTabYearFilter] = useState<string>('ALL');
  const [periodsTabSelectedYear, setPeriodsTabSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [periodsTabSelectedMonth, setPeriodsTabSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [periodsTabPage, setPeriodsTabPage] = useState<number>(1);
  const [periodsTabPageSize, setPeriodsTabPageSize] = useState<number>(10);

  useEffect(() => {
    if (selectedPeriod?.year) {
      setSelectedYearFilter(selectedPeriod.year);
    }
  }, [selectedPeriod?.year]);

  const lastAlignedPeriodRef = useRef<{ id: number; status: string } | null>(null);

  // Auto-align process subtab when period or its status changes to match the active workflow stage
  useEffect(() => {
    if (!selectedPeriod) {
      if (canAccessHrView || isAdmin) {
        setProcessSubTab('HR');
        setViewMode('HR');
      } else if (canAccessFinanceView) {
        setProcessSubTab('FINANCE');
        setViewMode('FINANCE');
      } else if (isCEO || canAccessApproverView) {
        setProcessSubTab('APPROVER');
        setViewMode('ALL');
      }
      return;
    }

    // ตรวจสอบว่ามีการเปลี่ยนรอบเงินเดือน หรือสถานะรอบเงินเดือนเปลี่ยนจริงหรือไม่
    // ป้องกันการเด้งสลับแท็บกลับไป HR หรือ CEO ขณะที่ผู้ใช้งานกำลังทำงานอยู่ในแท็บที่เลือก
    const isNewPeriod = lastAlignedPeriodRef.current?.id !== selectedPeriod.id;
    const isStatusChanged = lastAlignedPeriodRef.current?.status !== selectedPeriod.status;

    if (!isNewPeriod && !isStatusChanged) {
      return;
    }

    lastAlignedPeriodRef.current = { id: selectedPeriod.id, status: selectedPeriod.status };

    const s = selectedPeriod.status;
    if (s === 'APPROVED' || s === 'PROCESSING' || s === 'PROCESSING_BANK' || s === 'PAID' || s === 'CLOSED') {
      if (canAccessBankView) {
        setProcessSubTab('BANK');
        setViewMode('FINANCE');
      } else if (canAccessFinanceView) {
        setProcessSubTab('FINANCE');
        setViewMode('FINANCE');
      } else if (canAccessApproverView) {
        setProcessSubTab('APPROVER');
        setViewMode('ALL');
      } else if (canAccessHrView) {
        setProcessSubTab('HR');
        setViewMode('HR');
      }
    } else if (s === 'FINANCE_VERIFIED' || s === 'PENDING_APPROVAL') {
      if (canAccessApproverView) {
        setProcessSubTab('APPROVER');
        setViewMode('ALL');
      } else if (canAccessFinanceView) {
        setProcessSubTab('FINANCE');
        setViewMode('FINANCE');
      } else if (canAccessHrView) {
        setProcessSubTab('HR');
        setViewMode('HR');
      }
    } else if (s === 'SUBMITTED_TO_FINANCE') {
      if (canAccessFinanceView) {
        setProcessSubTab('FINANCE');
        setViewMode('FINANCE');
      } else if (canAccessApproverView) {
        setProcessSubTab('APPROVER');
        setViewMode('ALL');
      } else if (canAccessHrView) {
        setProcessSubTab('HR');
        setViewMode('HR');
      }
    } else if (s === 'REVIEW' || s === 'DRAFT') {
      if (canAccessHrView) {
        setProcessSubTab('HR');
        setViewMode('HR');
      } else if (canAccessFinanceView) {
        setProcessSubTab('FINANCE');
        setViewMode('FINANCE');
      } else if (canAccessApproverView) {
        setProcessSubTab('APPROVER');
        setViewMode('ALL');
      }
    }
  }, [selectedPeriod?.id, selectedPeriod?.status, canAccessFinanceView, canAccessApproverView, canAccessBankView, canAccessHrView, isCEO]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [isPeriodLoading, setIsPeriodLoading] = useState(false);
  const [selectedPayrollRecord, setSelectedPayrollRecord] = useState<PayrollRecord | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [processPage, setProcessPage] = useState<number>(1);
  const [processPageSize, setProcessPageSize] = useState<number>(10);
  const [processSearchQuery, setProcessSearchQuery] = useState<string>('');
  const [processDeptFilter, setProcessDeptFilter] = useState<string>('ALL');
  const [expandedPeriodId, setExpandedPeriodId] = useState<number | null>(null);
  const [expandedPayrolls, setExpandedPayrolls] = useState<PayrollRecord[]>([]);
  const [isExpandedLoading, setIsExpandedLoading] = useState<boolean>(false);
  const [expandedSearchQuery, setExpandedSearchQuery] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAddingBonus, setIsAddingBonus] = useState(false);
  const [bonusPayoutYear, setBonusPayoutYear] = useState<number | null>(null);
  const [isAdvancingStatus, setIsAdvancingStatus] = useState(false);
  const [isCreatePeriodModalOpen, setIsCreatePeriodModalOpen] = useState(false);
  const [isAllPeriodsModalOpen, setIsAllPeriodsModalOpen] = useState(false);
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);
  const [isDuplicatePeriodAlertOpen, setIsDuplicatePeriodAlertOpen] = useState(false);
  const [duplicatePeriodTarget, setDuplicatePeriodTarget] = useState<PayrollPeriod | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [deletePeriodConfirmOpen, setDeletePeriodConfirmOpen] = useState(false);
  const [isDeletingPeriod, setIsDeletingPeriod] = useState(false);
  const [isPeriodNameCustom, setIsPeriodNameCustom] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return { year: y, month: m, ...getDefaultPeriodValues(y, m), claimCutoffDate: '' };
  });

  const handleMonthChange = (newMonth: number) => {
    const safeMonth = Math.min(Math.max(1, newMonth || 1), 12);
    const defaults = getDefaultPeriodValues(newPeriodForm.year, safeMonth);
    setNewPeriodForm(prev => ({
      ...prev,
      month: safeMonth,
      periodName: isPeriodNameCustom ? prev.periodName : defaults.periodName,
      startDate: defaults.startDate,
      endDate: defaults.endDate,
      paymentDate: defaults.paymentDate,
      claimCutoffDate: '',
    }));
  };

  const handleYearChange = (newYear: number) => {
    const safeYear = newYear || 2026;
    const defaults = getDefaultPeriodValues(safeYear, newPeriodForm.month);
    setNewPeriodForm(prev => ({
      ...prev,
      year: safeYear,
      periodName: isPeriodNameCustom ? prev.periodName : defaults.periodName,
      startDate: defaults.startDate,
      endDate: defaults.endDate,
      paymentDate: defaults.paymentDate,
      claimCutoffDate: '',
    }));
  };

  const handleOpenCreatePeriodModal = () => {
    handleCreatePeriodFromProcessTab();
  };

  // Modals
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);

  const [isPayrollItemModalOpen, setIsPayrollItemModalOpen] = useState(false);
  const [selectedPayrollItem, setSelectedPayrollItem] = useState<PayrollItem | null>(null);
  const [deleteItemConfirmOpen, setDeleteItemConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PayrollItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedEmployeeForAdjust, setSelectedEmployeeForAdjust] = useState<EmployeeSalaryOverview | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<EmployeeSalaryOverview | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [structureToDelete, setStructureToDelete] = useState<SalaryStructure | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [isSavingTax, setIsSavingTax] = useState(false);
  const [isSsoModalOpen, setIsSsoModalOpen] = useState(false);
  const [selectedSsoRate, setSelectedSsoRate] = useState<SocialSecurityRate | null>(null);
  const [isSavingSso, setIsSavingSso] = useState(false);

  // Tab 5: Payment Workflow state
  const [transferList, setTransferList] = useState<PayrollTransferList | null>(null);
  const [isLoadingTransferList, setIsLoadingTransferList] = useState(false);
  const [isSettingPaymentMethod, setIsSettingPaymentMethod] = useState(false);
  const [isMarkingTransferred, setIsMarkingTransferred] = useState<number | null>(null); // payrollId
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isGeneratingBankFile, setIsGeneratingBankFile] = useState(false);
  // Upload Slip Modal
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [slipModalTarget, setSlipModalTarget] = useState<PayrollTransferItem | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipTransferRef, setSlipTransferRef] = useState('');
  const [slipDragOver, setSlipDragOver] = useState(false);
  // Confirm Payment Modal
  const [confirmPaymentModalOpen, setConfirmPaymentModalOpen] = useState(false);
  const [confirmPaymentNote, setConfirmPaymentNote] = useState('');
  // Legacy bank summary (for old bank-transfer-file download)
  const [bankSummary, setBankSummary] = useState<BankTransferSummary | null>(null);
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');
  const [isExportingBankFile, setIsExportingBankFile] = useState<boolean>(false);

  // Tab 5: Tax & SSO state
  const [taxSsoSummary, setTaxSsoSummary] = useState<TaxSsoSummary | null>(null);

  // Tab: Bonus state
  const [bonusSubTab, setBonusSubTab] = useState<'CALCULATE' | 'HISTORY'>('CALCULATE');
  const [bonuses, setBonuses] = useState<EmployeeBonus[]>([]);
  const [bonusPeriods, setBonusPeriods] = useState<BonusPeriodSummary[]>([]);
  const [isLoadingBonusPeriods, setIsLoadingBonusPeriods] = useState<boolean>(false);
  const [bonusPeriodsCurrentPage, setBonusPeriodsCurrentPage] = useState<number>(1);
  const [bonusPeriodsPageSize, setBonusPeriodsPageSize] = useState<number>(10);
  const [selectedBonusPeriodModal, setSelectedBonusPeriodModal] = useState<BonusPeriodSummary | null>(null);
  const [expandedBonuses, setExpandedBonuses] = useState<EmployeeBonus[]>([]);
  const [isExpandedBonusLoading, setIsExpandedBonusLoading] = useState<boolean>(false);
  const [expandedBonusSearchQuery, setExpandedBonusSearchQuery] = useState<string>('');
  const [bonusYear, setBonusYear] = useState<number>(2026);
  const [bonusMonth, setBonusMonth] = useState<number>(12);
  // โหมดกรอกโบนัส: กำหนดตัวคูณ (ยอด = ฐานเงินเดือน × ตัวคูณ) หรือ กำหนดยอดโบนัสเอง
  const [bonusInputMode, setBonusInputMode] = useState<'MULTIPLIER' | 'AMOUNT'>('MULTIPLIER');
  const [showBonusFilters, setShowBonusFilters] = useState<boolean>(true);
  // แถวโบนัสที่แก้ไขแล้วแต่ยังไม่ได้กด "คำนวณ" (บันทึก)
  const [dirtyBonusIds, setDirtyBonusIds] = useState<Set<number>>(new Set());
  const markBonusDirty = (employeeId: number) =>
    setDirtyBonusIds((prev) => (prev.has(employeeId) ? prev : new Set(prev).add(employeeId)));
  // ยอดโบนัสที่จะได้จริงตามโหมด: โหมดตัวคูณ = ฐานเงินเดือนปัจจุบัน × ตัวคูณ (ยกเว้นแถวที่ล็อกแล้ว)
  const bonusDisplayAmount = (b: EmployeeBonus) =>
    bonusInputMode === 'MULTIPLIER' && b.status !== 'PAID'
      ? Math.round((b.baseSalary || 0) * (b.multiplier || 0) * 100) / 100
      : b.bonusAmount || 0;
  // แถวที่ยอดบนจอไม่ตรงกับที่บันทึกไว้ (แก้ไขแล้ว หรือฐานเงินเดือนเปลี่ยน) → ต้องกด "คำนวณ" ใหม่
  const isBonusRowDirty = (b: EmployeeBonus) =>
    dirtyBonusIds.has(b.employeeId) ||
    ((b.status === 'SAVED' || b.status === 'IN_PAYROLL' || b.status === 'APPROVED') &&
      Math.abs(bonusDisplayAmount(b) - (b.bonusAmount || 0)) > 0.005);
  const [isSavingBonus, setIsSavingBonus] = useState<boolean>(false);
  const [bonusSearchTerm, setBonusSearchTerm] = useState<string>('');
  const [bonusDeptFilter, setBonusDeptFilter] = useState<string>('ALL');
  const [bonusCurrentPage, setBonusCurrentPage] = useState<number>(1);
  const [bonusPageSize, setBonusPageSize] = useState<number>(10);
  const [isApplyBonusModalOpen, setIsApplyBonusModalOpen] = useState<boolean>(false);
  const [selectedTargetPeriodId, setSelectedTargetPeriodId] = useState<number | null>(null);
  const [isApplyingBonus, setIsApplyingBonus] = useState<boolean>(false);

  useEffect(() => {
    if (canViewPayroll) {
      loadData();
    }
  }, [canViewPayroll]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        overviewData,
        structData,
        taxData,
        ssoData,
        empData,
        itemsData,
        posData,
        lvlData,
        deptData,
        periodsData,
        bonusData,
      ] = await Promise.all([
        salaryService.getOverview().catch(() => null),
        canViewStructures ? salaryService.getStructures().catch(() => []) : Promise.resolve([]),
        canViewTaxSso ? salaryService.getTaxBrackets().catch(() => []) : Promise.resolve([]),
        canViewTaxSso ? salaryService.getSocialSecurityRates().catch(() => []) : Promise.resolve([]),
        salaryService.getEmployeesOverview().catch(() => []),
        canViewItems ? salaryService.getPayrollItems().catch(() => []) : Promise.resolve([]),
        organizationService.getPositions().catch(() => []),
        organizationService.getLevels().catch(() => []),
        organizationService.getDepartments().catch(() => []),
        salaryService.getPayrollPeriods().catch(() => []),
        salaryService.getBonusPeriods().catch(() => []),
      ]);

      setOverview(overviewData);
      setStructures(structData || []);
      setTaxBrackets(taxData || []);
      setSsoRates(ssoData || []);
      setEmployees(empData || []);
      setPayrollItems(itemsData || []);
      setPositions(posData || []);
      setLevels(lvlData || []);
      setDepartments(deptData || []);
      setPeriods(periodsData || []);
      setBonusPeriods(bonusData || []);

      if (periodsData && periodsData.length > 0) {
        const today = new Date();
        const openPeriods = periodsData.filter((p) => p.status !== 'CLOSED');
        const targetPeriod =
          openPeriods.find((p) => p.year === today.getFullYear() && p.month === today.getMonth() + 1) ||
          openPeriods[0] ||
          periodsData.find((p) => p.year === today.getFullYear() && p.month === today.getMonth() + 1) ||
          periodsData[0];
        setSelectedPeriod(targetPeriod);
        const pRows = await salaryService.getPayrollsByPeriod(targetPeriod.id).catch(() => []);
        setPayrolls(pRows || []);
      } else {
        setSelectedPeriod(null);
        setPayrolls([]);
        setTransferList(null);
        setBankSummary(null);
        setTaxSsoSummary(null);
      }
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, durationMs = 4500) => {
    if (
      msg.includes('เกิดข้อผิดพลาด') ||
      msg.includes('ไม่สามารถ') ||
      msg.includes('ล้มเหลว') ||
      msg.includes('ผิดพลาด')
    ) {
      toast.error(msg, undefined, durationMs);
    } else if (msg.includes('กรุณา') || msg.includes('ไม่อนุญาต') || msg.includes('ยังไม่') || msg.includes('ต้องแนบ')) {
      toast.warning(msg, undefined, durationMs);
    } else {
      toast.success(msg, undefined, durationMs);
    }
  };

  const [currentPeriodCommission, setCurrentPeriodCommission] = useState<CommissionPeriodSummary | null>(null);

  // Dynamic fetch when switching to Process, Bank Transfer, or Tax/SSO tab
  useEffect(() => {
    if (!selectedPeriod) {
      setTransferList(null);
      setBankSummary(null);
      setTaxSsoSummary(null);
      setCurrentPeriodCommission(null);
      return;
    }

    if (activeTab === 'process') {
      commissionService
        .getCommissionPeriod(selectedPeriod.year, selectedPeriod.month)
        .then((res) => setCurrentPeriodCommission(res))
        .catch(() => setCurrentPeriodCommission(null));
      salaryService
        .getBonusPeriods()
        .then((res) => setBonusPeriods(res || []))
        .catch(() => {});
    }

    if (activeTab === 'bank-transfer' || (activeTab === 'process' && processSubTab === 'BANK')) {
      loadTransferList(selectedPeriod.id);
      loadBankTransfer(selectedPeriod.id, selectedBankFilter);
    } else if (activeTab === 'tax-sso') {
      loadTaxSsoSummary(selectedPeriod.id);
    }
  }, [activeTab, processSubTab, selectedPeriod, selectedBankFilter]);

  // Dynamic fetch when switching to Periods tab
  useEffect(() => {
    if (activeTab === 'periods' && periods.length === 0) {
      loadPayrollPeriods();
    }
  }, [activeTab]);

  const loadPayrollPeriods = async () => {
    try {
      setLoading(true);
      const data = await salaryService.getPayrollPeriods();
      if (data && data.length > 0) {
        setPeriods(data);
        if (!selectedPeriod) {
          const today = new Date();
          const openPeriods = data.filter((p) => p.status !== 'CLOSED');
          const targetPeriod =
            openPeriods.find((p) => p.year === today.getFullYear() && p.month === today.getMonth() + 1) ||
            openPeriods[0] ||
            data[0];
          setSelectedPeriod(targetPeriod);
        }
      }
    } catch (err) {
      console.error('Failed to load payroll periods:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic fetch when switching to Bonus tab
  useEffect(() => {
    if (activeTab === 'bonus') {
      loadBonuses(bonusYear, bonusMonth);
      loadBonusPeriods();
    }
  }, [activeTab, bonusYear, bonusMonth]);

  const loadBonusPeriods = async () => {
    try {
      setIsLoadingBonusPeriods(true);
      const data = await salaryService.getBonusPeriods();
      setBonusPeriods(data || []);
    } catch (err) {
      console.error('Failed to load bonus periods:', err);
      setBonusPeriods([]);
    } finally {
      setIsLoadingBonusPeriods(false);
    }
  };

  const loadBonuses = async (year?: number, month?: number) => {
    try {
      const yr = year || bonusYear || 2026;
      const mo = month || bonusMonth || 12;
      const bonusData = await salaryService.getEmployeeBonuses(yr, mo);
      setBonuses(bonusData || []);
      setDirtyBonusIds(new Set());
    } catch (err) {
      console.error('Failed to load bonuses:', err);
    }
  };

  const handleOpenBonusPeriodModal = async (bp: BonusPeriodSummary) => {
    setSelectedBonusPeriodModal(bp);
    setIsExpandedBonusLoading(true);
    setExpandedBonusSearchQuery('');
    try {
      const data = await salaryService.getEmployeeBonuses(bp.year, bp.month, true);
      // แสดงเฉพาะพนักงานที่บันทึกโบนัสในรอบนั้นจริง
      setExpandedBonuses(data || []);
    } catch (err) {
      console.error('Failed to load expanded bonuses:', err);
      setExpandedBonuses([]);
    } finally {
      setIsExpandedBonusLoading(false);
    }
  };

  const handleCloseBonusPeriodModal = () => {
    setSelectedBonusPeriodModal(null);
    setExpandedBonuses([]);
    setExpandedBonusSearchQuery('');
  };

  const loadBankTransfer = async (periodId: number, bankCode?: string) => {
    if (!periodId) return;
    try {
      const summary = await salaryService.getBankTransferSummary(
        periodId,
        bankCode !== 'ALL' ? bankCode : undefined
      );
      setBankSummary(summary);
    } catch (err) {
      console.error('Failed to load bank transfer summary:', err);
      setBankSummary(null);
    }
  };

  const loadTaxSsoSummary = async (periodId: number) => {
    if (!periodId) return;
    try {
      const summary = await salaryService.getTaxSsoSummary(periodId);
      setTaxSsoSummary(summary);
    } catch (err) {
      console.error('Failed to load tax & SSO summary:', err);
      setTaxSsoSummary(null);
    }
  };

  const [bankReceiptFile, setBankReceiptFile] = useState<File | null>(null);
  const [isUploadingBankReceipt, setIsUploadingBankReceipt] = useState<boolean>(false);

  const handleSubmitToFinance = async () => {
    if (!selectedPeriod) return;
    // ยืนยันก่อนส่ง — แจ้งจำนวนคนที่ไม่มีฐานเงินเดือน (ไม่ได้คำนวณ = ไม่ได้รับเงินรอบนี้)
    const noSalaryCount = payrolls.filter((p) => p.inputStatus === 'PENDING_SALARY').length;
    const totalNet = (selectedPeriod.totalNetSalary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const isConfirmed = await confirmAction({
      title: 'ส่งให้ฝ่ายการเงินตรวจสอบ?',
      text:
        `รอบเงินเดือน: ${selectedPeriod.periodName}\nยอดสุทธิรวม: ฿${totalNet}` +
        (noSalaryCount > 0
          ? `\n\n(หมายเหตุ: มีพนักงาน ${noSalaryCount} คนที่ยังไม่มีฐานเงินเดือน จะไม่ได้รับเงินในรอบนี้)`
          : '') +
        '\n\nหลังส่งแล้ว HR จะคำนวณใหม่ไม่ได้ จนกว่าการเงินจะส่งคืน',
      confirmButtonText: 'ส่งให้การเงิน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!isConfirmed) return;
    try {
      const updated = await salaryService.submitToFinance(selectedPeriod.id);
      setSelectedPeriod(updated);
      setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      showToast('ส่งเรื่องให้ฝ่ายการเงิน/บัญชีตรวจสอบเรียบร้อยแล้ว (สถานะ: ส่งการเงินตรวจสอบ)');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งให้ฝ่ายการเงิน');
    }
  };

  const handleVerifyByFinance = async () => {
    if (!selectedPeriod) return;
    try {
      const updated = await salaryService.verifyByFinance(selectedPeriod.id);
      setSelectedPeriod(updated);
      setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      showToast('ฝ่ายการเงินตรวจสอบเรียบร้อยแล้ว ส่งเรื่องให้ผู้อนุมัติอนุมัติเงินเดือน');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการยืนยันจากฝ่ายการเงิน');
    }
  };

  const handleUploadBankReceiptSubmit = async (markAsPaid: boolean = true) => {
    if (!selectedPeriod || !bankReceiptFile) return;

    if (markAsPaid) {
      if (isFuturePeriod(selectedPeriod)) {
        const isConfirmed = await confirmAction({
          title: 'แจ้งเตือน: รอบเงินเดือนล่วงหน้า',
          text: `รอบเงินเดือน "${selectedPeriod.periodName}" เป็นงวดล่วงหน้าในอนาคต (เกินเดือนปัจจุบัน) คุณแน่ใจหรือไม่ว่าต้องการยืนยันการจ่ายเงินล่วงหน้านี้?`,
          confirmButtonText: 'ยืนยันจ่ายเงินล่วงหน้า',
          cancelButtonText: 'ยกเลิก',
        });
        if (!isConfirmed) return;
      }

      const empCount = selectedPeriod.employeeCount ?? payrolls.length;
      const totalNet = (selectedPeriod.totalNetSalary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
      const isConfirmed = await confirmAction({
        title: 'ยืนยันบันทึกสลิปและปรับสถานะจ่ายเงิน?',
        text: `รอบเงินเดือน: ${selectedPeriod.periodName}\nจำนวนพนักงาน: ${empCount} คน\nยอดเงินรวมสุทธิ: ฿${totalNet}\n\nต้องการบันทึกสลิปและปรับสถานะรอบเป็น "โอนสำเร็จ (PAID)" ใช่หรือไม่?`,
        confirmButtonText: 'ยืนยันการจ่ายเงิน',
        cancelButtonText: 'ยกเลิก',
      });
      if (!isConfirmed) return;
    }

    setIsUploadingBankReceipt(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Str = (reader.result as string).split(',')[1];
          const updated = await salaryService.uploadBankReceipt(selectedPeriod.id, {
            base64Data: base64Str,
            fileName: bankReceiptFile.name,
            contentType: bankReceiptFile.type || 'application/pdf',
            note: confirmPaymentNote.trim() || undefined,
            markAsPaid,
          });
          setSelectedPeriod(updated);
          setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
          setConfirmPaymentModalOpen(false);
          setBankReceiptFile(null);
          if (markAsPaid) {
            showToast('อัปโหลดสลิปธนาคารและยืนยันรอบเงินเดือนเป็นโอนสำเร็จ (PAID) เรียบร้อยแล้ว');
          } else {
            showToast('อัปโหลดสลิป/ใบเสร็จธนาคารเรียบร้อยแล้ว');
          }
        } catch (err: any) {
          if (!err?.response && (await recoverIfReachedStatus(selectedPeriod.id, markAsPaid ? ['PAID', 'CLOSED'] : [selectedPeriod.status]))) {
            setConfirmPaymentModalOpen(false);
            setBankReceiptFile(null);
            showToast(markAsPaid
              ? 'อัปโหลดสลิปธนาคารและยืนยันรอบเงินเดือนเป็นโอนสำเร็จ (PAID) เรียบร้อยแล้ว'
              : 'อัปโหลดสลิป/ใบเสร็จธนาคารเรียบร้อยแล้ว');
          } else {
            showToast(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการอัปโหลดสลิปธนาคาร');
          }
        } finally {
          setIsUploadingBankReceipt(false);
        }
      };
      reader.readAsDataURL(bankReceiptFile);
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการอ่านไฟล์');
      setIsUploadingBankReceipt(false);
    }
  };

  // ถ้าคำขอหมดเวลา/หลุด (ไม่มี response) แต่ backend ทำต่อจนเสร็จ → เช็คสถานะงวดจริงก่อนแจ้งผิดพลาด
  const recoverIfReachedStatus = async (periodId: number, statuses: string[]): Promise<boolean> => {
    try {
      const fresh = await salaryService.getPayrollPeriodById(periodId);
      if (fresh && statuses.includes(fresh.status)) {
        setSelectedPeriod(fresh);
        setPeriods(prev => prev.map(p => (p.id === fresh.id ? fresh : p)));
        return true;
      }
    } catch {
      /* ignore — แจ้งข้อผิดพลาดเดิม */
    }
    return false;
  };

  const handleMarkPaid = async () => {
    if (!selectedPeriod) return;
    if (selectedPeriod.paymentMethod === 'BANK_BATCH' && !selectedPeriod.hasBankReceipt) {
      showToast('ไม่อนุญาตให้กดยืนยัน: ต้องแนบสลิปหรือไฟล์ใบเสร็จของธนาคารก่อน');
      return;
    }

    if (isFuturePeriod(selectedPeriod)) {
      const isConfirmed = await confirmAction({
        title: 'แจ้งเตือน: รอบเงินเดือนล่วงหน้า',
        text: `รอบเงินเดือน "${selectedPeriod.periodName}" เป็นงวดล่วงหน้าในอนาคต (เกินเดือนปัจจุบัน) คุณแน่ใจหรือไม่ว่าต้องการยืนยันการจ่ายเงินล่วงหน้านี้?`,
        confirmButtonText: 'ยืนยันจ่ายเงินล่วงหน้า',
        cancelButtonText: 'ยกเลิก',
      });
      if (!isConfirmed) return;
    }

    const empCount = selectedPeriod.employeeCount ?? payrolls.length;
    const totalNet = (selectedPeriod.totalNetSalary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const isConfirmed = await confirmAction({
      title: 'ยืนยันการจ่ายเงินรอบนี้?',
      text: `รอบเงินเดือน: ${selectedPeriod.periodName}\nจำนวนพนักงาน: ${empCount} คน\nยอดเงินรวมสุทธิ: ฿${totalNet}\n\nเมื่อยืนยันแล้ว สถานะจะเปลี่ยนเป็น "โอนสำเร็จ (PAID)" และจะไม่สามารถแก้ไขได้อีก`,
      confirmButtonText: 'ยืนยันการจ่ายเงิน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!isConfirmed) return;

    setIsConfirmingPayment(true);
    try {
      const updated = await salaryService.updatePayrollPeriodStatus(selectedPeriod.id, 'PAID');
      setSelectedPeriod(updated);
      setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      showToast('ยืนยันรอบเงินเดือนเข้าสู่สถานะโอนสำเร็จ (PAID) เรียบร้อยแล้ว');
    } catch (err: any) {
      if (!err?.response && (await recoverIfReachedStatus(selectedPeriod.id, ['PAID', 'CLOSED']))) {
        showToast('ยืนยันรอบเงินเดือนเข้าสู่สถานะโอนสำเร็จ (PAID) เรียบร้อยแล้ว');
      } else {
        showToast(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะเป็นโอนสำเร็จ (PAID)');
      }
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleDownloadBankReceipt = async () => {
    if (!selectedPeriod) return;
    try {
      const blob = await salaryService.downloadBankReceipt(selectedPeriod.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedPeriod.bankReceiptFileName || `BankReceipt_P${selectedPeriod.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      showToast('ไม่พบไฟล์สลิป/ใบเสร็จการโอนเงินรวมของธนาคาร');
    }
  };

  // ===== PAYMENT WORKFLOW HANDLERS =====

  const loadTransferList = async (periodId: number) => {
    if (!periodId) return;
    setIsLoadingTransferList(true);
    try {
      const list = await salaryService.getTransferList(periodId);
      setTransferList(list);
    } catch (err) {
      console.error('Failed to load transfer list:', err);
      setTransferList(null);
    } finally {
      setIsLoadingTransferList(false);
    }
  };

  const [claimCutoffEditing, setClaimCutoffEditing] = useState(false);
  const [claimCutoffDraft, setClaimCutoffDraft] = useState('');
  const [isSavingClaimCutoff, setIsSavingClaimCutoff] = useState(false);
  useEffect(() => {
    setClaimCutoffEditing(false);
  }, [selectedPeriod?.id]);

  const handleSaveClaimCutoff = async (value: string | null) => {
    if (!selectedPeriod) return;
    setIsSavingClaimCutoff(true);
    try {
      const updated = await salaryService.updateClaimCutoff(selectedPeriod.id, value);
      setSelectedPeriod(updated);
      setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setClaimCutoffEditing(false);
      showToast('บันทึกวันตัดรอบเงินเบิกแล้ว กรุณากดคำนวณเงินเดือนใหม่');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'บันทึกวันตัดรอบเงินเบิกไม่สำเร็จ');
    } finally {
      setIsSavingClaimCutoff(false);
    }
  };

  const handleSetPaymentMethod = async (method: 'BANK_BATCH' | 'DIRECT_TRANSFER', silent = false) => {
    if (!selectedPeriod) return;
    setIsSettingPaymentMethod(true);
    try {
      const updated = await salaryService.setPaymentMethod(selectedPeriod.id, { paymentMethod: method });
      setSelectedPeriod(updated);
      setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      await loadTransferList(selectedPeriod.id);
      if (!silent) {
        showToast(`เลือกวิธีการจ่ายเงิน: ${method === 'BANK_BATCH' ? 'ส่งไฟล์ธนาคาร' : 'โอนเองทีละคน'}`);
      }
    } catch (err: any) {
      if (!silent) {
        showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการตั้งค่าวิธีการจ่ายเงิน');
      }
    } finally {
      setIsSettingPaymentMethod(false);
    }
  };

  // Auto-apply default payment method from schedule settings if period is APPROVED and has no method set
  useEffect(() => {
    if (
      selectedPeriod?.status === 'APPROVED' &&
      !selectedPeriod?.paymentMethod &&
      (isFinance || isCEO || isAdmin) &&
      !isSettingPaymentMethod
    ) {
      const defaultMethod = getPayrollScheduleSettings().defaultPaymentMethod || 'BANK_BATCH';
      handleSetPaymentMethod(defaultMethod, true);
    }
  }, [selectedPeriod?.id, selectedPeriod?.status, selectedPeriod?.paymentMethod, isFinance, isCEO, isAdmin]);

  const handleOpenSlipModal = (item: PayrollTransferItem) => {
    setSlipModalTarget(item);
    setSlipFile(null);
    setSlipTransferRef(item.transferReference || '');
    setSlipModalOpen(true);
  };

  const handleSlipFileChange = (file: File | null) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      showToast('ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF เท่านั้น');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('ขนาดไฟล์ต้องไม่เกิน 10 MB');
      return;
    }
    setSlipFile(file);
  };

  const handleMarkTransferred = async () => {
    if (!selectedPeriod || !slipModalTarget) {
      return;
    }
    setIsMarkingTransferred(slipModalTarget.payrollId);
    try {
      let base64: string | undefined = undefined;
      if (slipFile) {
        // Convert file to base64
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:xxx/xxx;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(slipFile);
        });
      }

      await salaryService.markTransferred(selectedPeriod.id, slipModalTarget.payrollId, {
        transferReference: slipTransferRef.trim() || undefined,
        slipFileName: slipFile?.name || undefined,
        slipContentType: slipFile?.type || undefined,
        slipBase64: base64,
      });

      setSlipModalOpen(false);
      setSlipFile(null);
      setSlipModalTarget(null);
      await loadTransferList(selectedPeriod.id);
      const updatedPeriod = await salaryService.getPayrollPeriodById(selectedPeriod.id);
      setSelectedPeriod(updatedPeriod);
      setPeriods(prev => prev.map(p => (p.id === updatedPeriod.id ? updatedPeriod : p)));
      showToast('บันทึกการโอนเงินเรียบร้อยแล้ว');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกการโอนเงิน');
    } finally {
      setIsMarkingTransferred(null);
    }
  };

  const [isMarkingAllTransferred, setIsMarkingAllTransferred] = useState(false);
  const handleMarkAllTransferred = async () => {
    if (!selectedPeriod) return;
    const isConfirmed = await confirmAction({
      title: 'ยืนยันการโอนเงินทั้งหมด',
      text: `ต้องการทำเครื่องหมายว่า "โอนเงินเรียบร้อยแล้ว" สำหรับพนักงานทุกคนในรอบนี้ใช่หรือไม่? (สามารถกดยืนยันการจ่ายเงินทั้งหมดต่อได้ทันที)`,
      confirmButtonText: 'ยืนยันโอนแล้วทุกคน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!isConfirmed) return;

    setIsMarkingAllTransferred(true);
    try {
      const list = await salaryService.markAllTransferred(selectedPeriod.id);
      setTransferList(list);
      const updatedPeriod = await salaryService.getPayrollPeriodById(selectedPeriod.id);
      setSelectedPeriod(updatedPeriod);
      setPeriods(prev => prev.map(p => (p.id === updatedPeriod.id ? updatedPeriod : p)));
      showToast('ทำเครื่องหมายว่าโอนเงินให้พนักงานทุกคนเรียบร้อยแล้ว');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการทำเครื่องหมายโอนทั้งหมด');
    } finally {
      setIsMarkingAllTransferred(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPeriod) return;

    if (isFuturePeriod(selectedPeriod)) {
      const isConfirmed = await confirmAction({
        title: 'แจ้งเตือน: รอบเงินเดือนล่วงหน้า',
        text: `รอบเงินเดือน "${selectedPeriod.periodName}" เป็นงวดล่วงหน้าในอนาคต (เกินเดือนปัจจุบัน) คุณแน่ใจหรือไม่ว่าต้องการยืนยันการจ่ายเงินล่วงหน้านี้?`,
        confirmButtonText: 'ยืนยันจ่ายเงินล่วงหน้า',
        cancelButtonText: 'ยกเลิก',
      });
      if (!isConfirmed) return;
    }

    setIsConfirmingPayment(true);
    try {
      const updated = await salaryService.confirmPayment(selectedPeriod.id, {
        note: confirmPaymentNote.trim() || undefined,
      });
      setSelectedPeriod(updated);
      setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setConfirmPaymentModalOpen(false);
      setConfirmPaymentNote('');
      await loadTransferList(selectedPeriod.id);
      showToast('ยืนยันการจ่ายเงินสำเร็จ รอบเงินเดือนเปลี่ยนเป็นสถานะโอนสำเร็จ (PAID) เรียบร้อยแล้ว');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการยืนยันการจ่ายเงิน');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleGenerateAndDownloadBankFile = async () => {
    if (!selectedPeriod) return;
    setIsGeneratingBankFile(true);
    try {
      const blob = await salaryService.generateBankFile(selectedPeriod.id, selectedBankFilter !== 'ALL' ? selectedBankFilter : undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BankTransfer_P${selectedPeriod.id}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      // Refresh period to show bankFileGeneratedAt
      const updatedPeriod = await salaryService.getPayrollPeriodById(selectedPeriod.id);
      setSelectedPeriod(updatedPeriod);
      showToast('ดาวน์โหลดไฟล์ธนาคารสำเร็จ สถานะเปลี่ยนเป็น PROCESSING');
    } catch (err: any) {
      // responseType เป็น blob → ข้อความ error จาก API อยู่ใน Blob ต้องแปลงเป็น JSON ก่อน
      let message: string | undefined = err?.response?.data?.message;
      const data = err?.response?.data;
      if (!message && data instanceof Blob) {
        try {
          message = JSON.parse(await data.text())?.message;
        } catch {
          /* ignore parse error */
        }
      }
      showToast(message || 'เกิดข้อผิดพลาดในการสร้างไฟล์ธนาคาร');
    } finally {
      setIsGeneratingBankFile(false);
    }
  };

  const handleConfirmBankTransfer = async () => {
    if (!selectedPeriod) return;

    if (isFuturePeriod(selectedPeriod)) {
      const isConfirmed = await confirmAction({
        title: 'แจ้งเตือน: รอบเงินเดือนล่วงหน้า',
        text: `รอบเงินเดือน "${selectedPeriod.periodName}" เป็นงวดล่วงหน้าในอนาคต (เกินเดือนปัจจุบัน) คุณแน่ใจหรือไม่ว่าต้องการยืนยันผลโอนล่วงหน้านี้?`,
        confirmButtonText: 'ยืนยันผลโอนล่วงหน้า',
        cancelButtonText: 'ยกเลิก',
      });
      if (!isConfirmed) return;
    }

    setIsConfirmingPayment(true);
    try {
      const updated = await salaryService.confirmBankTransfer(selectedPeriod.id, {
        note: confirmPaymentNote.trim() || undefined,
      });
      setSelectedPeriod(updated);
      setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setConfirmPaymentModalOpen(false);
      setConfirmPaymentNote('');
      showToast('ยืนยันธนาคารโอนเงินเรียบร้อยแล้ว (ขั้นตอนที่ 2 เสร็จสิ้น -> รอดำเนินการขั้นตอนที่ 3: ฝ่ายการเงินตรวจสลิป/ใบเสร็จ)');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการยืนยันผลโอนเงินจากธนาคาร');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleDownloadExistingSlip = async (payrollId: number, fileName: string) => {
    try {
      const blob = await salaryService.downloadSlip(payrollId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'slip.jpg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      showToast('ไม่พบไฟล์ Slip');
    }
  };

  // Handler: Download Bank Transfer Text/CSV file (legacy)

  const handleDownloadBankFile = async () => {
    if (!selectedPeriod) return;
    try {
      setIsExportingBankFile(true);
      const bankCode = selectedBankFilter !== 'ALL' ? selectedBankFilter : '004';
      // ขั้นส่งไฟล์ธนาคารจริง (BANK_BATCH, อนุมัติแล้ว) → ใช้ generate เพื่อบันทึกว่าดาวน์โหลดแล้ว (ปลดล็อกปุ่มยืนยันโอน)
      const marksDownload = selectedPeriod.paymentMethod === 'BANK_BATCH' && ['APPROVED', 'PROCESSING'].includes(selectedPeriod.status);
      const blob = marksDownload
        ? await salaryService.generateBankFile(selectedPeriod.id, bankCode)
        : await salaryService.exportBankTransferFile(selectedPeriod.id, bankCode);
      if (marksDownload) {
        try {
          const fresh = await salaryService.getPayrollPeriodById(selectedPeriod.id);
          setSelectedPeriod(fresh);
          setPeriods(prev => prev.map(p => (p.id === fresh.id ? fresh : p)));
        } catch {
          /* ไฟล์ได้แล้ว — รีเฟรชไม่สำเร็จไม่เป็นไร */
        }
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank_transfer_p${selectedPeriod.id}_${bankCode}_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(`ส่งออกไฟล์โอนเงินธนาคาร (${bankCode}) สำเร็จเรียบร้อย`);
    } catch (err: any) {
      console.error('Failed to download bank transfer file:', err);
      let message: string | undefined = err?.response?.data?.message;
      const data = err?.response?.data;
      if (!message && data instanceof Blob) {
        try {
          message = JSON.parse(await data.text())?.message;
        } catch {
          /* ignore parse error */
        }
      }
      showToast(message || 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์โอนเงิน');
    } finally {
      setIsExportingBankFile(false);
    }
  };

  // Handler: Export Tax (ภ.ง.ด.1) or SSO (สปส. 1-10) CSV
  // Structure handlers
  const handleOpenCreateStructure = () => {
    setSelectedStructure(null);
    setIsStructureModalOpen(true);
  };

  const handleOpenEditStructure = (s: SalaryStructure) => {
    setSelectedStructure(s);
    setIsStructureModalOpen(true);
  };

  const handleSaveStructure = async (
    payload: CreateSalaryStructurePayload | UpdateSalaryStructurePayload,
    id?: number
  ) => {
    if (id) {
      await salaryService.updateStructure(id, payload);
      showToast('แก้ไขโครงสร้างเงินเดือนสำเร็จ');
    } else {
      await salaryService.createStructure(payload);
      showToast('เพิ่มโครงสร้างเงินเดือนใหม่สำเร็จ');
    }
    const updated = await salaryService.getStructures();
    setStructures(updated);
  };

  const handleConfirmDelete = async () => {
    if (!structureToDelete) return;
    try {
      setIsDeleting(true);
      await salaryService.deleteStructure(structureToDelete.id);
      showToast('ลบโครงสร้างเงินเดือนเรียบร้อยแล้ว');
      const updated = await salaryService.getStructures();
      setStructures(updated);
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      console.error('Failed to delete structure:', err);
    } finally {
      setIsDeleting(false);
      setStructureToDelete(null);
    }
  };

  // Payroll Item Handlers
  const handleOpenCreateItem = () => {
    setSelectedPayrollItem(null);
    setIsPayrollItemModalOpen(true);
  };

  const handleOpenEditItem = (item: PayrollItem) => {
    setSelectedPayrollItem(item);
    setIsPayrollItemModalOpen(true);
  };

  const handleSaveItem = async (payload: Partial<PayrollItem>, id?: number) => {
    if (id) {
      await salaryService.updatePayrollItem(id, payload);
      showToast('แก้ไขรายการสำเร็จ');
    } else {
      await salaryService.createPayrollItem(payload);
      showToast('เพิ่มรายการใหม่สำเร็จ');
    }
    const updated = await salaryService.getPayrollItems();
    setPayrollItems(updated);
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeletingItem(true);
      await salaryService.deletePayrollItem(itemToDelete.id);
      showToast(`ลบรายการ "${itemToDelete.itemName}" สำเร็จ`);
      const updated = await salaryService.getPayrollItems();
      setPayrollItems(updated);
      setDeleteItemConfirmOpen(false);
    } catch (err: any) {
      console.error('Failed to delete item:', err);
      // เดิมไม่แจ้งอะไรเลยเมื่อลบไม่สำเร็จ ผู้ใช้จึงไม่รู้ว่าทำไมลบไม่ได้
      showToast(err?.response?.data?.message || 'ลบรายการไม่สำเร็จ', 8000);
      setDeleteItemConfirmOpen(false);
    } finally {
      setIsDeletingItem(false);
      setItemToDelete(null);
    }
  };

  // Employee Salary Handlers
  const handleOpenAdjustSalary = (emp: EmployeeSalaryOverview) => {
    setSelectedEmployeeForAdjust(emp);
    setIsAdjustModalOpen(true);
  };

  const handleOpenSalaryHistory = (emp: EmployeeSalaryOverview) => {
    setSelectedEmployeeForHistory(emp);
    setIsHistoryModalOpen(true);
  };

  const handleSaveAdjustSalary = async (employeeId: number, payload: AdjustEmployeeSalaryPayload) => {
    await salaryService.adjustEmployeeSalary(employeeId, payload);
    showToast('บันทึกปรับฐานเงินเดือนพนักงานสำเร็จ');
    const updatedEmps = await salaryService.getEmployeesOverview(
      searchQuery,
      selectedDeptId ? parseInt(selectedDeptId) : undefined
    );
    setEmployees(updatedEmps);
  };

  const handleSaveTaxBrackets = async (updatedBrackets: UpdateTaxBracketPayload[]) => {
    try {
      setIsSavingTax(true);
      const res = await salaryService.batchUpdateTaxBrackets(updatedBrackets);
      setTaxBrackets(res);
      showToast('บันทึกโครงสร้างอัตราภาษีเงินได้บุคคลธรรมดาสำเร็จ');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกอัตราภาษี');
    } finally {
      setIsSavingTax(false);
    }
  };

  const handleResetTaxBrackets = async () => {
    try {
      setIsSavingTax(true);
      const res = await salaryService.resetTaxBracketsToDefault();
      setTaxBrackets(res);
      showToast('รีเซ็ตอัตราภาษีเป็นค่ามาตรฐานสรรพากร (8 ขั้น) สำเร็จ');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตอัตราภาษี');
    } finally {
      setIsSavingTax(false);
    }
  };

  const handleOpenEditSsoRate = (rate: SocialSecurityRate) => {
    setSelectedSsoRate(rate);
    setIsSsoModalOpen(true);
  };

  const handleSaveSsoRate = async (payload: UpdateSocialSecurityRatePayload, id?: number) => {
    try {
      setIsSavingSso(true);
      if (id) {
        await salaryService.updateSocialSecurityRate(id, payload);
        showToast('อัปเดตเกณฑ์และอัตราเงินสมทบกองทุนประกันสังคมสำเร็จ');
      } else {
        await salaryService.createSocialSecurityRate(payload);
        showToast('เพิ่มเกณฑ์และอัตราเงินสมทบกองทุนประกันสังคมสำเร็จ');
      }
      const rates = await salaryService.getSocialSecurityRates();
      setSsoRates(rates);
      setIsSsoModalOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการบันทึกอัตราประกันสังคม');
    } finally {
      setIsSavingSso(false);
    }
  };

  const handleResetSsoRates = async () => {
    try {
      setIsSavingSso(true);
      const rates = await salaryService.resetSocialSecurityRatesToDefault();
      setSsoRates(rates);
      setIsSsoModalOpen(false);
      showToast('รีเซ็ตอัตราประกันสังคมเป็นค่ามาตรฐานตามกฎหมาย (5% เพดาน 15,000 บาท) สำเร็จ');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตอัตราประกันสังคม');
    } finally {
      setIsSavingSso(false);
    }
  };

  const handleFilterEmployees = async () => {
    try {
      const data = await salaryService.getEmployeesOverview(
        searchQuery.trim() || undefined,
        selectedDeptId ? parseInt(selectedDeptId) : undefined
      );
      setEmployees(data);
    } catch (err) {
      console.error('Failed to filter employees:', err);
    }
  };

  // ค้นหา/เลือกแผนกแล้วกรองทันที (ไม่ต้องกดปุ่ม) — หน่วง 300ms ระหว่างพิมพ์
  useEffect(() => {
    if (activeTab !== 'structures') return;
    const t = setTimeout(() => {
      handleFilterEmployees();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedDeptId]);

  // Tab: Bonus Handlers
  const handleBonusMultiplierChange = (employeeId: number, newMultiplier: number) => {
    markBonusDirty(employeeId);
    setBonuses((prev) =>
      prev.map((b) => {
        if (b.employeeId === employeeId) {
          const safeMult = isNaN(newMultiplier) ? 0 : Math.max(0, newMultiplier);
          const newBonusAmount = Math.round((b.baseSalary || 0) * safeMult * 100) / 100;
          return {
            ...b,
            multiplier: safeMult,
            bonusAmount: newBonusAmount,
            calculationMode: 'MULTIPLIER',
          };
        }
        return b;
      })
    );
  };

  const handleBonusAmountChange = (employeeId: number, newAmount: number) => {
    markBonusDirty(employeeId);
    setBonuses((prev) =>
      prev.map((b) => {
        if (b.employeeId === employeeId) {
          const safeAmount = isNaN(newAmount) ? 0 : Math.max(0, newAmount);
          const newMultiplier = (b.baseSalary || 0) > 0 ? Math.round((safeAmount / b.baseSalary) * 100) / 100 : 0;
          return {
            ...b,
            bonusAmount: safeAmount,
            multiplier: newMultiplier,
            calculationMode: 'MANUAL',
          };
        }
        return b;
      })
    );
  };

  const handleBonusNoteChange = (employeeId: number, note: string) => {
    markBonusDirty(employeeId);
    setBonuses((prev) =>
      prev.map((b) => (b.employeeId === employeeId ? { ...b, note } : b))
    );
  };

  // payload สำหรับบันทึกโบนัส — คำนวณยอดตามโหมดที่เลือก (ใช้ทั้งปุ่ม "คำนวณ" และ "บันทึกเข้างวด")
  const buildBonusSavePayload = (): SaveEmployeeBonusesPayload => {
    const isMultiplierMode = bonusInputMode === 'MULTIPLIER';
    return {
      year: bonusYear,
      month: bonusMonth,
      calculationMode: isMultiplierMode ? 'MULTIPLIER' : 'MANUAL',
      items: bonuses.map((b) => {
        const base = b.baseSalary || 0;
        const multiplier = b.multiplier || 0;
        // โหมดตัวคูณ: คำนวณยอดใหม่จากฐานเงินเดือน × ตัวคูณ / โหมดยอดเอง: ตัวคูณ = ยอด ÷ ฐาน
        const bonusAmount = isMultiplierMode ? Math.round(base * multiplier * 100) / 100 : (b.bonusAmount || 0);
        return {
          employeeId: b.employeeId,
          bonusAmount,
          multiplier: isMultiplierMode ? multiplier : (base > 0 ? Math.round((bonusAmount / base) * 100) / 100 : 0),
          note: b.note || undefined,
        };
      }),
    };
  };

  const handleSaveBonuses = async () => {
    if (bonuses.length === 0) {
      showToast('ไม่มีข้อมูลโบนัสสำหรับบันทึก');
      return;
    }
    try {
      setIsSavingBonus(true);
      const payload = buildBonusSavePayload();
      const saved = await salaryService.saveEmployeeBonuses(payload);
      setBonuses(saved || []);
      setDirtyBonusIds(new Set());
      await loadBonusPeriods();
      showToast(`คำนวณและบันทึกโบนัสรอบ ${bonusMonth}/${bonusYear + 543} สำเร็จ (${bonuses.length} รายการ - ระบบจะดึงไปคำนวณในรอบเงินเดือนให้อัตโนมัติ)`);
    } catch (err: any) {
      console.error('Failed to save bonuses:', err);
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโบนัส');
    } finally {
      setIsSavingBonus(false);
    }
  };

  const handleExportBonusBankFile = () => {
    if (bonuses.length === 0) {
      showToast('ไม่มีข้อมูลโบนัสสำหรับส่งออก กรุณากดคำนวณและจัดสรรโบนัสก่อน');
      return;
    }

    const csvRows: string[] = [];
    csvRows.push('ลำดับ,รหัสพนักงาน,ชื่อ-นามสกุล,แผนก,ตำแหน่ง,เงินเดือนฐาน(บาท),ตัวคูณ(เท่า),ยอดเงินโบนัส(บาท),สถานะ,หมายเหตุ');

    bonuses.forEach((b, idx) => {
      csvRows.push(
        [
          idx + 1,
          `"${b.employeeCode}"`,
          `"${b.employeeName}"`,
          `"${b.departmentName || '-'}"`,
          `"${b.positionName || '-'}"`,
          (b.baseSalary || 0).toFixed(2),
          (b.multiplier || 0).toFixed(2),
          (b.bonusAmount || 0).toFixed(2),
          `"${b.statusText || b.status || '-'}"`,
          `"${b.note || '-'}"`,
        ].join(',')
      );
    });

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bonus_Report_${bonusYear}_${String(bonusMonth).padStart(2, '0')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast(`ส่งออกไฟล์ข้อมูลโบนัสรอบ ${bonusMonth}/${bonusYear + 543} สำเร็จ (${bonuses.length} รายการ)`);
  };

  const handleOpenApplyBonusModal = () => {
    if (bonuses.length === 0) {
      showToast('กรุณากดคำนวณและจัดสรรโบนัสก่อนนำเข้าสู่งวดเงินเดือน');
      return;
    }
    const editable = periods.filter((p) => p.status === 'DRAFT' || p.status === 'REVIEW');
    const matchingPeriod = editable.find((p) => p.year === bonusYear && p.month === bonusMonth);
    const current = editable.find((p) => p.id === selectedPeriod?.id);
    setSelectedTargetPeriodId(matchingPeriod?.id ?? current?.id ?? editable[0]?.id ?? null);
    setIsApplyBonusModalOpen(true);
  };

  const handleConfirmApplyBonusToPeriod = async () => {
    if (!selectedTargetPeriodId) {
      showToast('กรุณาเลือกงวดเงินเดือนที่ต้องการนำโบนัสไปรวมจ่าย');
      return;
    }
    try {
      setIsApplyingBonus(true);
      await salaryService.saveEmployeeBonuses(buildBonusSavePayload());

      const res = await salaryService.addBonusPayout(selectedTargetPeriodId, bonusYear, bonusMonth);
      const targetPeriod = periods.find((p) => p.id === selectedTargetPeriodId);
      showToast(`บันทึกโบนัสเข้าสู่งวด ${targetPeriod?.periodName || ''} สำเร็จ (${res.addedCount} คน รวม ฿${(res.addedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
      setIsApplyBonusModalOpen(false);
      // โหลดใหม่ให้สถานะในตารางเปลี่ยนเป็น "อยู่ในงวด" ทันที
      await loadBonuses(bonusYear, bonusMonth);
      await loadBonusPeriods();

      if (selectedPeriod?.id === selectedTargetPeriodId) {
        const pRows = await salaryService.getPayrollsByPeriod(selectedTargetPeriodId);
        setPayrolls(pRows || []);
      }
    } catch (err: any) {
      console.error('Failed to apply bonus to period:', err);
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกโบนัสเข้างวดเงินเดือน');
    } finally {
      setIsApplyingBonus(false);
    }
  };

  // Tab 4 Handlers: Payroll Processing (ประมวลเงินเดือน)
  const handlePeriodChange = async (periodId: number) => {
    setSelectedProcessMonth(null);
    const p = periods.find((x) => x.id === periodId);
    if (p) {
      setSelectedPeriod(p);
      setProcessPage(1);
      try {
        setIsPeriodLoading(true);
        const pRows = await salaryService.getPayrollsByPeriod(p.id);
        setPayrolls(pRows || []);
      } catch (err) {
        console.error('Failed to load payrolls for period:', err);
      } finally {
        setIsPeriodLoading(false);
      }
    }
  };

  const handleYearFilterChange = (targetYear: number) => {
    setSelectedYearFilter(targetYear);
    setSelectedProcessMonth(null);
    const inYear = periods.filter((p) => p.year === targetYear).sort((a, b) => a.month - b.month);
    if (inYear.length > 0) {
      const target = inYear.find((p) => p.status !== 'CLOSED') || inYear[inYear.length - 1];
      handlePeriodChange(target.id);
    } else {
      // ปีที่ยังไม่มีรอบ (เลือกได้จากตารางปี) — เลือกเดือนปัจจุบันไว้ให้สร้างรอบได้ทันที
      setSelectedPeriod(null);
      setPayrolls([]);
      setSelectedProcessMonth(new Date().getMonth() + 1);
    }
  };

  const handleToggleExpandPeriod = async (periodId: number) => {
    if (expandedPeriodId === periodId) {
      setExpandedPeriodId(null);
      return;
    }

    setExpandedPeriodId(periodId);
    setExpandedSearchQuery('');
    try {
      setIsExpandedLoading(true);
      const rows = await salaryService.getPayrollsByPeriod(periodId);
      setExpandedPayrolls(rows || []);
    } catch (err) {
      console.error('Failed to load payroll records for period:', err);
      showToast('ไม่สามารถดึงข้อมูลรายการเงินเดือนของรอบนี้ได้');
    } finally {
      setIsExpandedLoading(false);
    }
  };

  const handleAdvancePeriodStatus = async () => {
    if (!selectedPeriod || isAdvancingStatus) return;
    let nextStatus = '';
    let actionToast = '';
    if (selectedPeriod.status === 'REVIEW' || selectedPeriod.status === 'DRAFT') {
      const isCalculated = payrolls.length > 0 && payrolls.some(p => p.status === 'CALCULATED' || (p.netPayableSalary != null && p.netPayableSalary > 0));
      if (!isCalculated) {
        showToast('กรุณากดคำนวณเงินเดือนประจำรอบก่อนส่งขออนุมัติจาก CEO');
        return;
      }
      nextStatus = 'PENDING_APPROVAL';
      actionToast = 'ส่งคำขออนุมัติรอบเงินเดือนไปยัง CEO เรียบร้อยแล้ว (สถานะ: รออนุมัติ)';
    } else if (selectedPeriod.status === 'PENDING_APPROVAL' || selectedPeriod.status === 'FINANCE_VERIFIED') {
      const totalNet = selectedPeriod.totalNetSalary != null && selectedPeriod.totalNetSalary > 0
        ? `฿${Number(selectedPeriod.totalNetSalary).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '';
      const totalEmp = (selectedPeriod.totalEmployees ?? selectedPeriod.employeeCount) ? `${selectedPeriod.totalEmployees ?? selectedPeriod.employeeCount} คน` : '';

      const confirmed = await confirmAction({
        title: 'ยืนยันการอนุมัติรอบเงินเดือน?',
        html: `
          <div class="text-left bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 text-slate-700 dark:text-slate-300">
            <div class="flex justify-between items-center">
              <span class="text-slate-500">รอบเงินเดือน:</span>
              <span class="font-bold text-slate-900 dark:text-slate-100">${selectedPeriod.periodName}</span>
            </div>
            ${totalEmp ? `<div class="flex justify-between items-center"><span class="text-slate-500">จำนวนพนักงาน:</span><span class="font-bold text-slate-800 dark:text-slate-200">${totalEmp}</span></div>` : ''}
            ${totalNet ? `<div class="flex justify-between items-center"><span class="text-slate-500">ยอดจ่ายสุทธิรวม:</span><span class="font-bold text-emerald-600 dark:text-emerald-400 text-sm">${totalNet}</span></div>` : ''}
          </div>
          <p class="mt-3 text-xs text-slate-500">เมื่ออนุมัติแล้ว ระบบจะส่งต่อไปยังขั้นตอนการโอนเงินธนาคาร</p>
        `,
        icon: 'question',
        confirmButtonText: 'ยืนยันอนุมัติรอบนี้',
        cancelButtonText: 'ยกเลิก',
      });

      if (!confirmed) return;

      nextStatus = 'APPROVED';
      actionToast = 'CEO อนุมัติรอบเงินเดือนเรียบร้อยแล้ว (สถานะ: อนุมัติแล้ว)';
    } else if (selectedPeriod.status === 'APPROVED' || selectedPeriod.status === 'PROCESSING') {
      if (selectedPeriod.paymentMethod === 'DIRECT_TRANSFER' || !selectedPeriod.paymentMethod) {
        if (canAccessBankView) {
          setActiveTab('process');
          setProcessSubTab('BANK');
        }
        showToast('กรุณาโอนเงินและแนบสลิปให้ครบทุกคนก่อนยืนยันจ่ายเงิน');
        return;
      }
      nextStatus = 'PAID';
      actionToast = 'บันทึกว่าจ่ายเงินเดือนแล้วสำเร็จ (สถานะ: จ่ายแล้ว)';
    } else if (selectedPeriod.status === 'PAID') {
      const confirmed = await confirmAction({
        title: 'ยืนยันการปิดรอบเงินเดือน?',
        text: `รอบเงินเดือน: ${selectedPeriod.periodName}\nเมื่อปิดรอบแล้วจะไม่สามารถแก้ไขข้อมูลหรือคำนวณเงินเดือนในรอบนี้ได้อีก`,
        icon: 'warning',
        confirmButtonText: 'ยืนยันปิดรอบ',
        cancelButtonText: 'ยกเลิก',
      });
      if (!confirmed) return;

      nextStatus = 'CLOSED';
      actionToast = 'ปิดรอบเงินเดือนสำเร็จ';
    } else {
      return;
    }

    try {
      setIsAdvancingStatus(true);
      const updated = await salaryService.updatePayrollPeriodStatus(selectedPeriod.id, nextStatus);
      showToast(actionToast);
      setSelectedPeriod(updated);
      setPeriods((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (nextStatus === 'APPROVED' && canAccessBankView) {
        setProcessSubTab('BANK');
        setViewMode('FINANCE');
        loadTransferList(updated.id);
        loadBankTransfer(updated.id, selectedBankFilter);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการปรับสถานะ');
    } finally {
      setIsAdvancingStatus(false);
    }
  };

  const handleRejectPeriodStatus = async () => {
    if (!selectedPeriod) return;
    try {
      const updated = await salaryService.updatePayrollPeriodStatus(selectedPeriod.id, 'REVIEW');
      showToast('ส่งคืนรอบเงินเดือนให้ HR แก้ไขเรียบร้อยแล้ว (สถานะ: รอตรวจสอบ)');
      setSelectedPeriod(updated);
      setPeriods((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setIsRejectModalOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคืนรอบเงินเดือน');
    }
  };

  const handleDeletePeriod = async () => {
    if (!selectedPeriod) return;
    try {
      setIsDeletingPeriod(true);
      await salaryService.deletePayrollPeriod(selectedPeriod.id);
      showToast(`ลบรอบเงินเดือน "${selectedPeriod.periodName}" เรียบร้อยแล้ว`);
      setDeletePeriodConfirmOpen(false);

      const [updatedPeriods, updatedOverview] = await Promise.all([
        salaryService.getPayrollPeriods(),
        salaryService.getOverview().catch(() => null),
      ]);
      setPeriods(updatedPeriods || []);
      if (updatedOverview) setOverview(updatedOverview);
      if (updatedPeriods && updatedPeriods.length > 0) {
        const nextPeriod = updatedPeriods[0];
        setSelectedPeriod(nextPeriod);
        const pRows = await salaryService.getPayrollsByPeriod(nextPeriod.id);
        setPayrolls(pRows || []);
      } else {
        setSelectedPeriod(null);
        setPayrolls([]);
      }
    } catch (err: any) {
      console.error('Failed to delete payroll period:', err);
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการลบรอบเงินเดือน');
    } finally {
      setIsDeletingPeriod(false);
    }
  };

  const handleCalculatePayroll = async () => {
    if (!selectedPeriod) return;

    if (isFuturePeriod(selectedPeriod)) {
      const isConfirmed = await confirmAction({
        title: 'แจ้งเตือน: รอบเงินเดือนล่วงหน้า',
        text: `รอบเงินเดือน "${selectedPeriod.periodName}" เป็นงวดล่วงหน้าในอนาคต (เกินเดือนปัจจุบัน) คุณแน่ใจหรือไม่ว่าต้องการคำนวณเงินเดือนล่วงหน้านี้?`,
        confirmButtonText: 'ยืนยันคำนวณล่วงหน้า',
        cancelButtonText: 'ยกเลิก',
      });
      if (!isConfirmed) return;
    }

    try {
      setIsCalculating(true);
      const { records: updatedPayrolls, message: calcMessage } = await salaryService.calculatePayrollPeriod(selectedPeriod.id);
      setPayrolls(updatedPayrolls || []);
      const [updatedPeriods, updatedOverview] = await Promise.all([
        salaryService.getPayrollPeriods(),
        salaryService.getOverview().catch(() => null),
      ]);
      setPeriods(updatedPeriods || []);
      if (updatedOverview) setOverview(updatedOverview);
      const current = updatedPeriods.find((p) => p.id === selectedPeriod.id);
      if (current) setSelectedPeriod(current);
      const hasWarning = !!calcMessage && calcMessage.includes('ข้อควรตรวจสอบ');
      const bonusCount = (updatedPayrolls || []).filter((p: any) =>
        p.details?.some((d: any) => (d.payrollItemCode === 'INC_BONUS' || d.calculationSource?.includes('BONUS')) && d.amount > 0)
      ).length;
      const successMsg = bonusCount > 0
        ? `คำนวณเงินเดือนประจำรอบสำเร็จแล้ว (รวมโบนัสประจำรอบ ${bonusCount} คน)`
        : 'คำนวณเงินเดือนประจำรอบสำเร็จแล้ว';
      showToast(hasWarning ? calcMessage : successMsg, hasWarning ? 12000 : 4000);
    } catch (err: any) {
      console.error('Failed to calculate payroll:', err);
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการคำนวณเงินเดือน');
    } finally {
      setIsCalculating(false);
    }
  };

  /** โหลดรายการเงินเดือนและสถานะรอบใหม่ หลังเพิ่ม/ลบรายการ manual หรือโบนัส (backend คำนวณใหม่ทั้งรอบแล้ว) */
  const refreshSelectedPeriodPayrolls = async () => {
    if (!selectedPeriod) return;
    try {
      const [pRows, updatedPeriods, updatedOverview] = await Promise.all([
        salaryService.getPayrollsByPeriod(selectedPeriod.id),
        salaryService.getPayrollPeriods(),
        salaryService.getOverview().catch(() => null),
      ]);
      setPayrolls(pRows || []);
      setPeriods(updatedPeriods || []);
      if (updatedOverview) setOverview(updatedOverview);
      const current = updatedPeriods.find((p) => p.id === selectedPeriod.id);
      if (current) setSelectedPeriod(current);
    } catch (err) {
      console.error('Failed to refresh payrolls:', err);
    }
  };

  // ปีของโบนัสที่จะดึง: ค่าเริ่มต้น = ปีก่อนหน้า ถ้าเป็นรอบ ม.ค.–มี.ค. (จ่ายโบนัสต้นปี) ไม่เช่นนั้นใช้ปีของรอบ
  const defaultBonusYear = selectedPeriod
    ? (selectedPeriod.month <= 3 ? selectedPeriod.year - 1 : selectedPeriod.year)
    : new Date().getFullYear();
  const effectiveBonusYear = bonusPayoutYear ?? defaultBonusYear;

  const handleAddBonusPayout = async () => {
    if (!selectedPeriod) return;
    try {
      setIsAddingBonus(true);
      const result = await salaryService.addBonusPayout(selectedPeriod.id, effectiveBonusYear);
      setPayrolls(result.payrolls || []);
      await refreshSelectedPeriodPayrolls();
      const parts = [`เพิ่มโบนัส ${result.addedCount} คน รวม ฿${(result.addedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`];
      if (result.alreadyPaidCount > 0) parts.push(`จ่ายไปแล้วในรอบอื่น ${result.alreadyPaidCount} คน`);
      if (result.skippedEmployeeCodes?.length) parts.push(`ข้าม ${result.skippedEmployeeCodes.length} คนที่ไม่อยู่ในรอบนี้ (${result.skippedEmployeeCodes.slice(0, 5).join(', ')})`);
      showToast(parts.join(' · '));
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการดึงโบนัสเข้ารอบเงินเดือน');
    } finally {
      setIsAddingBonus(false);
    }
  };

  const handleCreatePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingPeriod) return;

    // 1. ตรวจสอบรอบซ้ำล่วงหน้าจากรายการรอบเงินเดือนในระบบ (Client-side Pre-check)
    const duplicate = periods.find(
      p => p.year === newPeriodForm.year && p.month === newPeriodForm.month
    );
    if (duplicate) {
      setDuplicatePeriodTarget(duplicate);
      setIsDuplicatePeriodAlertOpen(true);
      return;
    }

    try {
      setIsCreatingPeriod(true);
      const created = await salaryService.createPayrollPeriod(newPeriodForm);
      showToast('สร้างรอบเงินเดือนใหม่สำเร็จแล้ว');
      setIsCreatePeriodModalOpen(false);
      const [updatedPeriods, updatedOverview] = await Promise.all([
        salaryService.getPayrollPeriods(),
        salaryService.getOverview().catch(() => null),
      ]);
      setPeriods(updatedPeriods || []);
      if (updatedOverview) setOverview(updatedOverview);
      setSelectedPeriod(created);
      const pRows = await salaryService.getPayrollsByPeriod(created.id);
      setPayrolls(pRows || []);
    } catch (err: any) {
      console.error('Failed to create payroll period:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการสร้างรอบเงินเดือน';
      if (errorMsg.includes('มีอยู่ในระบบแล้ว')) {
        const existing = periods.find(p => p.year === newPeriodForm.year && p.month === newPeriodForm.month);
        setDuplicatePeriodTarget(existing || null);
        setIsDuplicatePeriodAlertOpen(true);
      } else {
        showToast(errorMsg);
      }
    } finally {
      setIsCreatingPeriod(false);
    }
  };

  const handleCreatePeriodInstant = async (year: number, month: number) => {
    if (isCreatingPeriod) return;

    const existing = periods.find((p) => p.year === year && p.month === month);
    if (existing) {
      showToast(`รอบเดือน ${THAI_MONTH_NAMES[month - 1]} ${year + 543} มีอยู่ในระบบแล้ว`);
      setSelectedPeriod(existing);
      return;
    }

    const computed = calculatePeriodDatesFromSettings(year, month);

    const isConfirmed = await confirmAction({
      title: 'ยืนยันสร้างรอบเงินเดือนใหม่?',
      text: `ชื่อรอบ: ${computed.periodName}\nช่วงเวลาคำนวณ: ${formatThaiDateSlash(computed.startDate)} - ${formatThaiDateSlash(computed.endDate)}\nวันกำหนดจ่ายเงิน: ${formatThaiDateSlash(computed.paymentDate)}\nวันตัดรอบสวัสดิการ: ${formatThaiDateSlash(computed.claimCutoffDate)}`,
      confirmButtonText: 'ยืนยันสร้างรอบ',
      cancelButtonText: 'ยกเลิก',
    });
    if (!isConfirmed) return;

    try {
      setIsCreatingPeriod(true);
      const payload = {
        year,
        month,
        periodName: computed.periodName,
        startDate: computed.startDate,
        endDate: computed.endDate,
        paymentDate: computed.paymentDate,
        claimCutoffDate: computed.claimCutoffDate || undefined,
      };

      const created = await salaryService.createPayrollPeriod(payload);
      showToast(`สร้างรอบเดือน ${computed.periodName} สำเร็จแล้ว`);
      const [updatedPeriods, updatedOverview] = await Promise.all([
        salaryService.getPayrollPeriods(),
        salaryService.getOverview().catch(() => null),
      ]);
      setPeriods(updatedPeriods || []);
      if (updatedOverview) setOverview(updatedOverview);
      setSelectedPeriod(created);
      setSelectedProcessMonth(null);
      const pRows = await salaryService.getPayrollsByPeriod(created.id);
      setPayrolls(pRows || []);
    } catch (err: any) {
      console.error('Failed to create payroll period:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการสร้างรอบเงินเดือน';
      showToast(errorMsg);
    } finally {
      setIsCreatingPeriod(false);
    }
  };

  const handleCreatePeriodFromProcessTab = () => {
    const now = new Date();
    let targetYear = selectedPeriod ? selectedPeriod.year : now.getFullYear();
    let targetMonth = selectedPeriod ? selectedPeriod.month + 1 : now.getMonth() + 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }

    while (periods.some((p) => p.year === targetYear && p.month === targetMonth)) {
      targetMonth += 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
      if (targetYear > now.getFullYear() + 2) break;
    }

    setPeriodsTabSelectedYear(targetYear);
    setPeriodsTabSelectedMonth(targetMonth);
    setActiveTab('periods');
  };

  const handleOpenDetailDrawer = (record: PayrollRecord) => {
    setSelectedPayrollRecord(record);
    setIsDetailDrawerOpen(true);
  };

  if (!canViewPayroll) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์เข้าถึงระบบเงินเดือน"
        message="คุณไม่มีสิทธิ์ในการดูข้อมูลโครงสร้างเงินเดือนและค่าตอบแทน กรุณาติดต่อผู้ดูแลระบบ"
      />
    );
  }

  // Get Tab Display Name for Breadcrumb
  // ใช้ function declaration (hoisted) — useEffect ด้านบนเรียกใช้ และหน้านี้ return AccessDenied ก่อนถึงบรรทัดนี้
  // เดิมเป็น const ทำให้ผู้ไม่มีสิทธิ์เงินเดือนเจอ "Cannot access 'getTabLabel' before initialization"
  function getTabLabel(tab: ActiveTab) {
    switch (tab) {
      case 'overview':
        return 'ภาพรวม';
      case 'periods':
        return 'รอบเงินเดือน';
      case 'structures':
        return 'ฐานเงินเดือนพนักงาน';
      case 'items':
        return 'รายได้และรายหัก';
      case 'bonus':
        return 'โบนัส';
      case 'commission':
        return 'ค่าคอมมิชชั่น';
      case 'process':
        return 'ประมวลเงินเดือน';
      case 'schedule-settings':
        return 'กำหนดวันตัดรอบและจ่ายเงิน';
      case 'bank-transfer':
        return 'โอนเงินธนาคาร';
      case 'tax-sso':
        return 'ภาษี';
    }
  }

  // Filtered Payroll Items
  // รายการที่ระบบสร้างไว้จ่ายสวัสดิการ (ยอดมาจากเมนูสวัสดิการ) ไม่แสดงในหน้านี้
  // เรียง: ดึงข้อมูลอัตโนมัติ → สูตรคำนวณ → กำหนดเอง (ในกลุ่มเดียวกันคงลำดับเดิม)
  const calcRank = (i: PayrollItem) => (getAutoPullSource(i.itemCode) ? 0 : i.calculationType === 'FORMULA' ? 1 : 2);
  const filteredPayrollItems = payrollItems
    .filter((i) => i.itemType === itemsSubTab && !(i.linkedBenefitNames && i.linkedBenefitNames.length > 0))
    .map((i, idx) => ({ i, idx }))
    .sort((a, b) => calcRank(a.i) - calcRank(b.i) || a.idx - b.idx)
    .map(({ i }) => i);

  // Dynamic subNavTabs based on user permissions
  const visibleNavTabs: { id: ActiveTab; label: string }[] = [
    ...(canViewPeriods ? [{ id: 'periods' as ActiveTab, label: 'รอบเงินเดือน' }] : []),
    ...(canViewStructures ? [{ id: 'structures' as ActiveTab, label: 'ฐานเงินเดือนพนักงาน' }] : []),
    ...(canViewItems ? [{ id: 'items' as ActiveTab, label: 'รายได้และรายหัก' }] : []),
    ...(canViewBonus ? [{ id: 'bonus' as ActiveTab, label: 'โบนัส' }] : []),
    ...(canViewBonus || canViewProcess || canViewItems || isAdmin ? [{ id: 'commission' as ActiveTab, label: 'ค่าคอมมิชชั่น' }] : []),
    ...(canViewProcess ? [{ id: 'process' as ActiveTab, label: 'ประมวลเงินเดือน' }] : []),
    ...(canAccessHrView || canViewPeriods || isAdmin ? [{ id: 'schedule-settings' as ActiveTab, label: 'กำหนดวันตัดรอบและจ่ายเงิน' }] : []),
    ...(canViewTaxSso ? [{ id: 'tax-sso' as ActiveTab, label: 'ภาษี' }] : []),
  ];

  // Auto switch tab if current active tab is not in visible permitted tabs
  useEffect(() => {
    if (visibleNavTabs.length > 0 && !visibleNavTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleNavTabs[0].id);
    }
  }, [visibleNavTabs, activeTab]);

  // สถานะโบนัส (ไม่มีขั้นอนุมัติโบนัสแยก — อนุมัติรวมที่รอบเงินเดือน)
  const renderBonusStatusBadge = (b: EmployeeBonus, isDirty = false) => {
    const periodLabel = b.payoutPeriodMonth && b.payoutPeriodYear
      ? ` ${THAI_MONTH_NAMES[b.payoutPeriodMonth - 1] || b.payoutPeriodMonth} ${b.payoutPeriodYear + 543}`
      : '';
    if (isDirty && b.status !== 'PAID') {
      return (
        <span title="แก้ไขแล้ว กด &quot;คำนวณ&quot; เพื่อบันทึก" className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
          ยังไม่บันทึก
        </span>
      );
    }
    if (b.status === 'PAID') {
      return (
        <span title="งวดเงินเดือนเลยขั้นแก้ไขแล้ว แก้ยอดไม่ได้" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          <Lock className="w-3 h-3" />
          <span>ล็อกแล้ว{periodLabel && ` (งวด${periodLabel})`}</span>
        </span>
      );
    }
    if (b.status === 'IN_PAYROLL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>อยู่ในงวด{periodLabel}</span>
        </span>
      );
    }
    if (b.status === 'SAVED' || b.status === 'APPROVED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
          บันทึกแล้ว
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
        ยังไม่บันทึก
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">


      {/* Sub Navigation Bar - Standardized to Employee Module */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {visibleNavTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === t.id
                  ? 'border-[#0B2046] text-[#0B2046] dark:border-white dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>



      {/* === TAB 2: โครงสร้างเงินเดือน (Salary Structure & Employees) === */}
      {activeTab === 'structures' && (
        <div className="space-y-4">

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs p-4 space-y-4">

          {/* Sub-view 1: Salary Structure Table matching Image 1 */}
          {structureSubTab === 'positions' && (() => {
            const totalStructureCount = structures.length;
            const totalStructurePages = Math.max(1, Math.ceil(totalStructureCount / structurePageSize));
            const safeStructurePage = Math.min(Math.max(1, structurePage), totalStructurePages);
            const startStructureIdx = (safeStructurePage - 1) * structurePageSize;
            const paginatedStructures = structures.slice(startStructureIdx, startStructureIdx + structurePageSize);

            return (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="table-standard text-xs w-full min-w-[650px] text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 whitespace-nowrap">
                        <th className="py-3.5 px-5">ระดับพนักงาน</th>
                        <th className="py-3.5 px-5">เงินเดือนขั้นต่ำ</th>
                        <th className="py-3.5 px-5">เงินเดือนขั้นสูง</th>
                        <th className="py-3.5 px-5">ค่าตำแหน่ง</th>
                        <th className="py-3.5 px-5">สถานะ</th>
                        <th className="py-3.5 px-5 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <div className="inline-flex items-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูล...
                            </div>
                          </td>
                        </tr>
                      ) : structures.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            ยังไม่มีการกำหนดโครงสร้างเงินเดือนในระบบ
                          </td>
                        </tr>
                      ) : (
                        paginatedStructures.map((s, idx) => {
                        const isStructureActive = s.status ? s.status.toUpperCase() === 'ACTIVE' : true;
                        const isLastRows = idx >= paginatedStructures.length - 2;
                        return (
                          <tr
                            key={s.id}
                            onDoubleClick={() => {
                              if (canEditStructure) handleOpenEditStructure(s);
                            }}
                            className="hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="py-4 px-5 font-medium text-slate-800 dark:text-slate-200">
                              {s.levelName || s.positionName || 'ระดับปฏิบัติการ'}
                            </td>
                            <td className="py-4 px-5 font-medium text-slate-700 dark:text-slate-300">
                              ฿{s.minSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-5 font-medium text-slate-700 dark:text-slate-300">
                              ฿{s.maxSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-5 font-medium text-slate-700 dark:text-slate-300">
                              ฿{(s.positionAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-5">
                              {isStructureActive ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  <span>ใช้งาน</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                  <span>ไม่ได้ใช้งาน</span>
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-5 text-right whitespace-nowrap">
                              {canEditStructure ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* ปุ่มลัดแก้ไขตรง (Quick Edit) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditStructure(s);
                                    }}
                                    title="แก้ไขโครงสร้างเงินเดือน"
                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                                  </button>

                                  {/* ปุ่ม Option Dropdown 3 จุด */}
                                  <ActionDropdown
                                    menuClassName="w-28"
                                    items={[
                                      {
                                        label: 'แก้ไข',
                                        icon: <Edit2 className="w-3.5 h-3.5 text-amber-500" />,
                                        onClick: () => handleOpenEditStructure(s),
                                      },
                                      {
                                        label: 'ลบ',
                                        icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
                                        danger: true,
                                        onClick: () => {
                                          setStructureToDelete(s);
                                          setDeleteConfirmOpen(true);
                                        },
                                      },
                                    ]}
                                  />
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

                {/* Pagination */}
                <TablePagination
                  currentPage={safeStructurePage}
                  pageSize={structurePageSize}
                  totalCount={totalStructureCount}
                  onPageChange={setStructurePage}
                  onPageSizeChange={(newSize) => {
                    setStructurePageSize(newSize);
                    setStructurePage(1);
                  }}
                  pageSizeOptions={[10, 20, 50, 100, 200]}
                  unitText="รายการ"
                />
              </div>
            );
          })()}

          {/* Sub-view 2: ข้อมูลเงินเดือนพนักงาน */}
          {structureSubTab === 'employees' && (() => {
            const totalEmployeeCount = employees.length;
            const totalEmployeePages = Math.max(1, Math.ceil(totalEmployeeCount / employeeSalaryPageSize));
            const safeEmployeePage = Math.min(Math.max(1, employeeSalaryPage), totalEmployeePages);
            const startEmployeeIdx = (safeEmployeePage - 1) * employeeSalaryPageSize;
            const paginatedEmployees = employees.slice(startEmployeeIdx, startEmployeeIdx + employeeSalaryPageSize);

            return (
              <div className="space-y-4">
                {/* Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 min-h-9">
                  <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:max-w-xs">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ค้นหารหัส หรือชื่อพนักงาน..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <CustomSelect
                      value={selectedDeptId}
                      onChange={(val) => setSelectedDeptId(String(val))}
                      placeholder="ทุกแผนก"
                      className="min-w-[150px]"
                      options={[
                        { value: '', label: 'ทุกแผนก' },
                        ...departments.map((d) => ({ value: String(d.id), label: d.departmentName })),
                      ]}
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                  <table className="table-standard text-xs w-full min-w-[880px] text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 whitespace-nowrap">
                        <th className="py-3.5 px-4">รหัส / ชื่อพนักงาน</th>
                        <th className="py-3.5 px-4">แผนก / ตำแหน่ง</th>
                        <th className="py-3.5 px-4">ระดับพนักงาน</th>
                        <th className="py-3.5 px-4">กรอบเงินเดือนอ้างอิง</th>
                        <th className="py-3.5 px-4 text-right">ฐานเงินเดือนปัจจุบัน</th>
                        <th className="py-3.5 px-4 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {paginatedEmployees.map((emp) => {
                        const hasSalary = (emp.currentSalary || 0) > 0;
                        return (
                          <tr key={emp.employeeId} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{emp.employeeName}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{emp.employeeCode}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-800 dark:text-slate-200 text-xs font-medium">
                                {emp.departmentName || 'ไม่ระบุแผนก'}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {emp.positionName || 'ไม่ระบุตำแหน่ง'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {emp.levelName ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                                  {emp.levelName}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {emp.salaryStructureMin != null && emp.salaryStructureMax != null ? (
                                <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  ฿{emp.salaryStructureMin.toLocaleString()} - ฿{emp.salaryStructureMax.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {hasSalary ? (
                                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                                  ฿{emp.currentSalary?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                                  ยังไม่ระบุ
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center gap-2">
                                {canAdjustSalary && (
                                  <button
                                    onClick={() => handleOpenAdjustSalary(emp)}
                                    className="px-3 py-1.5 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                  >
                                    {hasSalary ? 'ปรับเงินเดือน' : 'กำหนดเงินเดือน'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenSalaryHistory(emp)}
                                  title="ดูประวัติการปรับเงินเดือน"
                                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <TablePagination
                  currentPage={safeEmployeePage}
                  pageSize={employeeSalaryPageSize}
                  totalCount={totalEmployeeCount}
                  onPageChange={setEmployeeSalaryPage}
                  onPageSizeChange={(newSize) => {
                    setEmployeeSalaryPageSize(newSize);
                    setEmployeeSalaryPage(1);
                  }}
                  pageSizeOptions={[10, 20, 50, 100, 200]}
                  unitText="คน"
                />
              </div>
            );
          })()}
          </div>
        </div>
      )}

      {/* === TAB 3: รายได้และรายหัก (Earnings & Deductions) - Matches media_1789453524860.png === */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Table Container */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
            {/* แถบเลือกรายได้/รายหัก + ปุ่มเพิ่ม — อยู่ใน panel เดียวกับตาราง (แบบเดียวกับฐานเงินเดือน) */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 min-h-9">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setItemsSubTab('EARNING')}
                className={`h-9 inline-flex items-center px-5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  itemsSubTab === 'EARNING'
                    ? 'bg-[#0B2046] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                รายการรายได้
              </button>
              <button
                onClick={() => setItemsSubTab('DEDUCTION')}
                className={`h-9 inline-flex items-center px-5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  itemsSubTab === 'DEDUCTION'
                    ? 'bg-[#0B2046] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                รายการรายหัก
              </button>
            </div>

            {/* Action Button: "+ เพิ่มรายการรายได้" / "+ เพิ่มรายการรายหัก" */}
            {canCreateItem && (
              <Button size="sm" className="h-9" onClick={handleOpenCreateItem} icon={<Plus className="w-3.5 h-3.5" />}>
                {itemsSubTab === 'EARNING' ? 'เพิ่มรายการรายได้' : 'เพิ่มรายการรายหัก'}
              </Button>
            )}
            </div>

            <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="table-standard text-xs w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    <th className="py-3.5 px-5">รายการ</th>
                    <th className="py-3.5 px-5">ประเภทการคำนวณ</th>
                    <th className="py-3.5 px-5">ค่า / สูตร</th>
                    {itemsSubTab === 'DEDUCTION' ? (
                      <>
                        {['ลดฐานภาษี', 'ลดฐานประกันสังคม', 'เป็นค่าลดหย่อน'].map((h) => (
                          <th key={h} className="py-3.5 px-5 text-center">{h}</th>
                        ))}
                      </>
                    ) : (
                      <>
                        <th className="py-3.5 px-5 text-center">คิดภาษี</th>
                        <th className="py-3.5 px-5 text-center">คิดประกันสังคม</th>
                      </>
                    )}
                    <th className="py-3.5 px-5">สถานะ</th>
                    <th className="py-3.5 px-5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPayrollItems
                    .map((item) => {
                      const isItemActive = item.status ? item.status.toUpperCase() === 'ACTIVE' : true;
                      const autoPull = getAutoPullSource(item.itemCode);
                      const isAutoPullModuleItem = !!autoPull;

                      const calcTypeLabel = isAutoPullModuleItem
                        ? 'ดึงข้อมูลจากระบบ'
                        : item.calculationType === 'FORMULA'
                        ? 'สูตรคำนวณ'
                        : 'กำหนดเอง';

                      const effectiveTpl = (
                        item.formulaTemplate ||
                        (item.itemCode === 'DED_UNPAID_LEAVE' ? 'UNPAID_LEAVE' : item.itemCode === 'INC_OT' ? 'OVERTIME' : '')
                      ).toUpperCase();
                      // ข้อความสูตรสร้างจากค่าตัวแปรจริง (ข้อความเดิมใน DB อาจเก่า/ไม่ครบ เช่น ไม่บอกเงื่อนไขลา หรือไม่มีตัวคูณ OT)
                      const formulaText = (() => {
                        if (effectiveTpl === 'SSO_STANDARD') {
                          const todayKey = new Date().toLocaleDateString('sv-SE');
                          const cur =
                            [...ssoRates]
                              .filter((r) => r.status === 'ACTIVE' && r.effectiveFrom <= todayKey && (!r.effectiveTo || r.effectiveTo >= todayKey))
                              .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
                          if (cur) {
                            const pct = cur.employeeContributionPercent <= 1 ? cur.employeeContributionPercent * 100 : cur.employeeContributionPercent;
                            const max = (cur.maxWageBaseAmount * pct) / 100;
                            return `${pct}% ฐานค่าจ้าง ${cur.minWageBaseAmount.toLocaleString()}–${cur.maxWageBaseAmount.toLocaleString()} บาท (หักสูงสุด ${max.toLocaleString()} บาท/เดือน)`;
                          }
                        }
                        if (PARAM_TEMPLATES.includes(effectiveTpl) && effectiveTpl !== 'PERCENT_SALES') {
                          return serializeFormulaParams(effectiveTpl, parseFormulaParams(effectiveTpl, item.formulaValue));
                        }
                        return item.formulaValue || '-';
                      })();
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{item.itemName}</div>
                            {item.linkedBenefitNames && item.linkedBenefitNames.length > 0 && (
                              <div
                                className="inline-flex mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                                title={item.linkedBenefitNames.join(', ')}
                              >
                                ใช้กับสวัสดิการ: {item.linkedBenefitNames.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              isAutoPullModuleItem
                                ? 'bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
                                : item.calculationType === 'FORMULA'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : item.calculationType === 'FIXED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              <span>{calcTypeLabel}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            {isAutoPullModuleItem ? (
                              <span className="text-xs text-slate-600 dark:text-slate-400">จาก {autoPull?.short}</span>
                            ) : item.calculationType === 'FORMULA' ? (
                              <span className="text-xs text-slate-700 dark:text-slate-300 whitespace-normal">{formulaText}</span>
                            ) : (() => {
                              const amt = (item.formulaValue || '').replace(/,/g, '').trim();
                              return amt !== '' && !isNaN(Number(amt)) ? (
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  ฿{Number(amt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">ระบุตอนประมวลผล</span>
                              );
                            })()}
                          </td>
                          {item.itemType === 'DEDUCTION' ? (
                            (() => {
                              // ค่าลดหย่อนตอนคิดภาษีทั้งปี: ประกันสังคม และกองทุนสำรองเลี้ยงชีพ (ระบบรู้จากรหัส/ชื่อรายการ)
                              const isAllowance =
                                item.itemCode === 'DED_SSO' ||
                                /PVD|PROVIDENT/i.test(item.itemCode) ||
                                (item.itemName || '').includes('สำรองเลี้ยงชีพ');
                              // ติ๊กถูกแบบเดียวกับแท็บรายการได้
                              const mark = (on: boolean) => (
                                <td className="py-3.5 px-5 text-center">
                                  {on ? (
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-sm">-</span>
                                  )}
                                </td>
                              );
                              return (
                                <>
                                  {mark(item.isTaxable && !isAllowance)}
                                  {mark(item.isSocialSecurityCalculated && !isAllowance)}
                                  {mark(isAllowance)}
                                </>
                              );
                            })()
                          ) : (
                            <>
                          <td className="py-3.5 px-5 text-center">
                            {item.isTaxable ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            {item.isSocialSecurityCalculated ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </td>
                            </>
                          )}
                          <td className="py-3.5 px-5">
                            <ActiveStatus active={isItemActive} />
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            {canEditItem ? (
                              <RowActions>
                                <RowActionButton action="edit" onClick={() => handleOpenEditItem(item)} />
                                {/* ลบได้เฉพาะแบบกำหนดเอง — ดึงข้อมูลจากระบบ/สูตร แก้ไขได้อย่างเดียว */}
                                {!UNDELETABLE_ITEM_CODES.includes(item.itemCode) && !isAutoPullModuleItem && item.calculationType !== 'FORMULA' && (
                                  <RowActionButton
                                    action="delete"
                                    onClick={() => {
                                      setItemToDelete(item);
                                      setDeleteItemConfirmOpen(true);
                                    }}
                                  />
                                )}
                              </RowActions>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === TAB: รอบเงินเดือน (Payroll Periods List with 12-Month Selector) === */}
      {activeTab === 'periods' && (
        <PayrollPeriodsTab
          periods={periods}
          overview={overview}
          selectedYear={periodsTabSelectedYear}
          onYearChange={setPeriodsTabSelectedYear}
          selectedMonth={periodsTabSelectedMonth}
          onMonthChange={setPeriodsTabSelectedMonth}
          onCreatePeriod={handleCreatePeriodInstant}
          onOpenPeriodInProcess={(periodId) => {
            handlePeriodChange(periodId);
            setActiveTab('process');
          }}
          onDeletePeriod={(period) => {
            setSelectedPeriod(period);
            setDeletePeriodConfirmOpen(true);
          }}
          onRefresh={() => {
            loadPayrollPeriods();
            loadData();
          }}
          isLoading={loading}
          isCreating={isCreatingPeriod}
          canAccessHrView={canAccessHrView}
          canViewProcess={canViewProcess}
          onNavigateToScheduleSettings={() => setActiveTab('schedule-settings')}
        />
      )}

      {/* === TAB: กำหนดวันตัดรอบและจ่ายเงิน (Payroll Schedule Settings) === */}
      {activeTab === 'schedule-settings' && (
        <PayrollScheduleTab
          canEdit={canAccessHrView || isAdmin}
        />
      )}

      {/* === TAB: โบนัส (Annual Bonus Management) === */}
      {activeTab === 'bonus' && (() => {
        // ปุ่มเมนูย่อย — วางไว้ใน panel แถวบนสุด (แบบเดียวกับรายได้และรายหัก)
        const bonusPills = (
<div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBonusSubTab('CALCULATE')}
              className={`h-9 inline-flex items-center px-5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                bonusSubTab === 'CALCULATE'
                  ? 'bg-[#0B2046] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              คำนวณและจัดสรรโบนัส
            </button>
            <button
              type="button"
              onClick={() => {
                setBonusSubTab('HISTORY');
                loadBonusPeriods();
              }}
              className={`h-9 inline-flex items-center px-5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                bonusSubTab === 'HISTORY'
                  ? 'bg-[#0B2046] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              รายการโบนัสที่ผ่านมา
            </button>
          </div>
        );
        return (
        <div className="space-y-4">
          {/* Sub Tab 1: คำนวณและจัดสรรโบนัส */}
          {bonusSubTab === 'CALCULATE' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs p-4 space-y-4">
              {/* แถวบน: เมนูย่อย (ซ้าย) + ปุ่มดำเนินการ (ขวา) */}
              <div className="flex flex-wrap items-center justify-between gap-3 min-h-9">
                {bonusPills}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBonusFilters((v) => !v)}
                    className={`relative h-9 inline-flex items-center gap-1.5 px-3.5 border rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      showBonusFilters
                        ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>ตัวกรองขั้นสูง</span>
                    {(bonusSearchTerm || bonusDeptFilter !== 'ALL') && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-800" />
                    )}
                  </button>

                  {canEditBonus && (
                    <button
                      type="button"
                      onClick={handleSaveBonuses}
                      disabled={bonuses.length === 0 || isSavingBonus}
                      title="คำนวณยอดโบนัสตามโหมดที่เลือก และบันทึก"
                      className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSavingBonus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                      <span>คำนวณ</span>
                    </button>
                  )}

                  {canApproveBonus && (
                    <button
                      type="button"
                      onClick={handleOpenApplyBonusModal}
                      disabled={bonuses.length === 0}
                      className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>บันทึกเข้างวด</span>
                    </button>
                  )}
                  {canExportBonus && (
                    <button
                      type="button"
                      onClick={handleExportBonusBankFile}
                      disabled={bonuses.length === 0}
                      className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>ส่งออก</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ตัวกรองขั้นสูง: เดือน, ปี, ค้นหา, แผนก, โหมดกรอกโบนัส */}
              {showBonusFilters && (
                <div className="flex flex-wrap items-center gap-2.5 p-3 bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700 rounded-2xl animate-in fade-in duration-150">
                  {/* Search Input */}
                  <div className="relative min-w-[200px] max-w-xs flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
                      value={bonusSearchTerm}
                      onChange={(e) => {
                        setBonusSearchTerm(e.target.value);
                        setBonusCurrentPage(1);
                      }}
                      className="w-full h-9 pl-9 pr-3.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Department Dropdown */}
                  <CustomSelect
                    value={bonusDeptFilter}
                    onChange={(e) => {
                      setBonusDeptFilter(e.target.value);
                      setBonusCurrentPage(1);
                    }}
                    placeholder="ทุกแผนก"
                    className="min-w-[140px]"
                    options={[
                      { value: 'ALL', label: 'ทุกแผนก' },
                      ...departments.map((d) => ({ value: d.departmentName, label: d.departmentName })),
                    ]}
                  />

                  {/* Month Selection */}
                  <div className="relative inline-block">
                    <CustomSelect
                      value={bonusMonth}
                      onChange={(e) => {
                        const mo = parseInt(e.target.value) || 12;
                        setBonusMonth(mo);
                        loadBonuses(bonusYear, mo);
                      }}
                      numbered={false}
                      size="sm"
                      className="min-w-[130px]"
                      buttonClassName="font-bold text-slate-800 dark:text-slate-100 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300 h-9"
                    >
                      {THAI_MONTH_NAMES.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>

                  {/* Year Selection */}
                  <div className="relative inline-block">
                    <CustomSelect
                      value={bonusYear}
                      onChange={(e) => {
                        const yr = parseInt(e.target.value) || 2026;
                        setBonusYear(yr);
                        loadBonuses(yr, bonusMonth);
                      }}
                      numbered={false}
                      size="sm"
                      className="w-28"
                      buttonClassName="font-bold text-slate-800 dark:text-slate-100 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300 h-9"
                    >
                      {Array.from(
                        new Set([
                          ...Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 2 + i),
                          bonusYear,
                          ...bonusPeriods.map((bp) => bp.year),
                        ])
                      ).sort((a, b) => a - b).map((yr) => (
                        <option key={yr} value={yr}>
                          ปี {yr + 543}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>

                  {(bonusSearchTerm || bonusDeptFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setBonusSearchTerm('');
                        setBonusDeptFilter('ALL');
                        setBonusCurrentPage(1);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-1 cursor-pointer"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}

                  {/* โหมดกรอกโบนัส: กำหนดตัวคูณ / กำหนดยอดโบนัส */}
                  {canEditBonus && (
                    <div className="ml-auto inline-flex items-center h-9 p-0.5 bg-slate-200/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                      {([
                        { key: 'MULTIPLIER', label: 'กำหนดตัวคูณ' },
                        { key: 'AMOUNT', label: 'กำหนดยอดโบนัส' },
                      ] as const).map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setBonusInputMode(m.key)}
                          className={`h-full px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                            bonusInputMode === m.key
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Bonus Table & Pagination */}
              {(() => {
                const filteredBonuses = bonuses.filter((b) => {
                  const matchesSearch =
                    !bonusSearchTerm ||
                    b.employeeName.toLowerCase().includes(bonusSearchTerm.toLowerCase()) ||
                    b.employeeCode.toLowerCase().includes(bonusSearchTerm.toLowerCase()) ||
                    (b.departmentName && b.departmentName.toLowerCase().includes(bonusSearchTerm.toLowerCase())) ||
                    (b.positionName && b.positionName.toLowerCase().includes(bonusSearchTerm.toLowerCase()));
                  const matchesDept = bonusDeptFilter === 'ALL' || b.departmentName === bonusDeptFilter;
                  return matchesSearch && matchesDept;
                });

                const totalBonusItems = filteredBonuses.length;
                const safeBonusPage = Math.min(
                  Math.max(1, bonusCurrentPage),
                  Math.max(1, Math.ceil(totalBonusItems / bonusPageSize))
                );
                const pagedBonuses = filteredBonuses.slice(
                  (safeBonusPage - 1) * bonusPageSize,
                  safeBonusPage * bonusPageSize
                );

                return (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                      <table className="table-standard text-xs w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <th className="py-3 px-3.5 whitespace-nowrap">รหัสพนักงาน</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">ชื่อ-นามสกุล</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">แผนก / ตำแหน่ง</th>
                            <th className="py-3 px-3.5 text-right whitespace-nowrap">ฐานเงินเดือน</th>
                            <th className="py-3 px-3.5 text-center whitespace-nowrap">ตัวคูณ (เท่า)</th>
                            <th className="py-3 px-3.5 text-right font-bold whitespace-nowrap">ยอดโบนัส (บาท)</th>
                            <th className="py-3 px-3.5 text-center whitespace-nowrap">สถานะ</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                          {filteredBonuses.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-14 text-center text-slate-400">
                                <Gift className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
                                  {bonuses.length === 0
                                    ? `ยังไม่มีข้อมูลโบนัสสำหรับรอบ ${THAI_MONTH_NAMES[bonusMonth - 1]} ${bonusYear + 543}`
                                    : 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {bonuses.length === 0 && canCalculateBonus
                                    ? 'ต้องมีพนักงานที่มีฐานเงินเดือนก่อน ระบบจึงจะคำนวณโบนัสได้'
                                    : ''}
                                </p>
                              </td>
                            </tr>
                          ) : (
                            pagedBonuses.map((b) => (
                              <tr key={b.employeeId} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="py-3 px-3.5 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {b.employeeCode}
                                </td>
                                <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {b.employeeName}
                                </td>
                                <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  <div className="font-medium text-slate-800 dark:text-slate-200">{b.departmentName || '-'}</div>
                                  <div className="text-[11px] text-slate-400">{b.positionName || '-'}</div>
                                </td>
                                <td
                                  className={`py-3 px-3.5 text-right font-mono font-medium whitespace-nowrap transition-colors ${
                                    bonusInputMode === 'AMOUNT'
                                      ? 'text-slate-400 dark:text-slate-500'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                  title={bonusInputMode === 'AMOUNT' ? 'โหมดกำหนดยอดโบนัส: ไม่ใช้ฐานเงินเดือนในการคำนวณ' : undefined}
                                >
                                  ฿{(b.baseSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                {/* Multiplier */}
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  {canEditBonus && b.status !== 'PAID' ? (
                                    <div className="inline-flex items-center justify-center gap-1">
                                      <input
                                        type="number"
                                        step="0.05"
                                        min="0"
                                        max="100"
                                        value={b.multiplier}
                                        onChange={(e) => handleBonusMultiplierChange(b.employeeId, parseFloat(e.target.value))}
                                        disabled={bonusInputMode !== 'MULTIPLIER'}
                                        className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg text-center font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed dark:disabled:bg-slate-900/60 dark:disabled:text-slate-500"
                                      />
                                      <span className="text-[11px] text-slate-400 font-semibold">x</span>
                                    </div>
                                  ) : (
                                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{b.multiplier}x</span>
                                  )}
                                </td>
                                {/* Bonus Amount */}
                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                  {canEditBonus && b.status !== 'PAID' && bonusInputMode === 'AMOUNT' ? (
                                    // แสดงแบบเดียวกับโหมดตัวคูณ (฿53,250.00) — คลิกแล้วแก้เป็นตัวเลขล้วน
                                    <MoneyInput
                                      value={b.bonusAmount}
                                      onChange={(n) => handleBonusAmountChange(b.employeeId, n)}
                                      className="w-32 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-lg font-mono font-bold text-amber-900 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                                    />
                                  ) : (
                                    <span className="font-mono font-bold text-amber-900 dark:text-amber-400">
                                      ฿{bonusDisplayAmount(b).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </td>
                                {/* Status */}
                                <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                  {renderBonusStatusBadge(b, isBonusRowDirty(b))}
                                </td>
                                {/* Note */}
                                <td className="py-2 px-3 whitespace-nowrap">
                                  {canEditBonus && b.status !== 'PAID' ? (
                                    <input
                                      type="text"
                                      placeholder="หมายเหตุ..."
                                      value={b.note || ''}
                                      onChange={(e) => handleBonusNoteChange(b.employeeId, e.target.value)}
                                      className="w-36 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-slate-500 dark:text-slate-400">{b.note || '-'}</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {filteredBonuses.length > 0 && (
                          <tfoot>
                            <tr className="bg-slate-50/90 dark:bg-slate-900/50 border-t-2 border-slate-200 dark:border-slate-700 text-xs">
                              <td colSpan={5} className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100">
                                รวม {filteredBonuses.length} คน
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white">
                                ฿{filteredBonuses.reduce((sum, x) => sum + bonusDisplayAmount(x), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {/* Pagination Footer */}
                    {totalBonusItems > 0 && (
                      <TablePagination
                        currentPage={safeBonusPage}
                        pageSize={bonusPageSize}
                        totalCount={totalBonusItems}
                        onPageChange={setBonusCurrentPage}
                        onPageSizeChange={setBonusPageSize}
                        pageSizeOptions={[10, 20, 50, 100, 200]}
                        unitText="คน"
                      />
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Sub Tab 2: รายการโบนัสที่ผ่านมา (Historical Bonus Periods) */}
          {bonusSubTab === 'HISTORY' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
              {/* Toolbar — แบบเดียวกับฐานเงินเดือน */}
              <div className="px-4 pt-4 flex flex-wrap items-center justify-between gap-3 min-h-9">
                {bonusPills}

                <button
                  type="button"
                  onClick={loadBonusPeriods}
                  disabled={isLoadingBonusPeriods}
                  className="h-9 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  {isLoadingBonusPeriods ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                  <span>รีเฟรชข้อมูล</span>
                </button>
              </div>

              {/* Table Content */}
              <div className="p-4 space-y-4">
                {isLoadingBonusPeriods ? (
                  <div className="py-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0B2046] dark:text-blue-400" />
                    <p className="text-xs">กำลังโหลดข้อมูลรอบโบนัสย้อนหลัง...</p>
                  </div>
                ) : bonusPeriods.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 mx-auto flex items-center justify-center mb-3">
                      <Gift className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">ยังไม่มีประวัติรอบโบนัสในระบบ</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      เมื่อมีการคำนวณและบันทึกการจัดสรรโบนัสในแท็บ &quot;คำนวณและจัดสรรโบนัส&quot; รายการรอบจะปรากฏที่นี่
                    </p>
                    <button
                      type="button"
                      onClick={() => setBonusSubTab('CALCULATE')}
                      className="px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ไปที่หน้าคำนวณโบนัส</span>
                    </button>
                  </div>
                ) : (() => {
                  const totalPeriodsCount = bonusPeriods.length;
                  const safePeriodsPage = Math.min(
                    Math.max(1, bonusPeriodsCurrentPage),
                    Math.max(1, Math.ceil(totalPeriodsCount / bonusPeriodsPageSize))
                  );
                  const pagedPeriods = bonusPeriods.slice(
                    (safePeriodsPage - 1) * bonusPeriodsPageSize,
                    safePeriodsPage * bonusPeriodsPageSize
                  );

                  return (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="table-standard w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400">
                              <th className="py-3 px-4">รอบโบนัส</th>
                              <th className="py-3 px-4 text-center">ตัวคูณเฉลี่ย</th>
                              <th className="py-3 px-4 text-center">จำนวนพนักงาน</th>
                              <th className="py-3 px-4 text-center">เข้างวดแล้ว</th>
                              <th className="py-3 px-4 text-right">ยอดรวมโบนัส</th>
                              <th className="py-3 px-4 text-center">สถานะ</th>
                              <th className="py-3 px-4 text-center">การจัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                            {pagedPeriods.map((bp) => {
                              const isSelectedRound = bonusYear === bp.year && bonusMonth === bp.month;
                              const rowKey = `${bp.year}-${bp.month}`;

                              return (
                                <tr
                                  key={rowKey}
                                  className={`hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors ${
                                    isSelectedRound ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                                  }`}
                                >
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px]">
                                        {bp.periodName}
                                      </span>
                                      {isSelectedRound && (
                                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                          เลือกอยู่
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-mono font-semibold whitespace-nowrap">
                                    {bp.averageMultiplier}x
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-semibold whitespace-nowrap">
                                    {bp.totalEmployees} คน
                                  </td>
                                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                      {bp.approvedCount}
                                    </span>{' '}
                                    <span className="text-slate-400 text-[11px]">/ {bp.totalEmployees} คน</span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-900 dark:text-amber-400 whitespace-nowrap">
                                    ฿{bp.totalBonusAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                        bp.status === 'IN_PAYROLL'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                          : bp.status === 'PARTIAL_IN_PAYROLL'
                                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                      }`}
                                    >
                                      {bp.statusText}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenBonusPeriodModal(bp)}
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 shadow-2xs transition active:scale-95 cursor-pointer"
                                      title="เปิดดูข้อมูลโบนัสรายบุคคลของรอบนี้"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>ดูรายการสรุป</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination for Bonus Periods */}
                      {totalPeriodsCount > 0 && (
                        <TablePagination
                          currentPage={safePeriodsPage}
                          pageSize={bonusPeriodsPageSize}
                          totalCount={totalPeriodsCount}
                          onPageChange={setBonusPeriodsCurrentPage}
                          onPageSizeChange={setBonusPeriodsPageSize}
                          pageSizeOptions={[10, 20, 50, 100, 200]}
                          unitText="รอบ"
                        />
                      )}

                      {/* Modal: สรุปและจัดการโบนัสรายบุคคลประจำรอบ (Popup) */}
                      {selectedBonusPeriodModal && (() => {
                        const currentExpandedSum = expandedBonuses.reduce((sum, b) => sum + (b.bonusAmount || 0), 0);
                        const currentExpandedAvgMult = expandedBonuses.length > 0
                          ? Math.round((expandedBonuses.reduce((sum, b) => sum + (b.multiplier || 0), 0) / expandedBonuses.length) * 100) / 100
                          : 0;
                        const inPayrollCountInExpanded = expandedBonuses.filter((b) => b.status === 'IN_PAYROLL' || b.status === 'PAID').length;

                        const filteredBonuses = expandedBonuses.filter((b) => {
                          if (!expandedBonusSearchQuery.trim()) return true;
                          const q = expandedBonusSearchQuery.toLowerCase();
                          return (
                            (b.employeeName && b.employeeName.toLowerCase().includes(q)) ||
                            (b.employeeCode && b.employeeCode.toLowerCase().includes(q)) ||
                            (b.departmentName && b.departmentName.toLowerCase().includes(q)) ||
                            (b.positionName && b.positionName.toLowerCase().includes(q))
                          );
                        });

                        return (
                          <ModalShell className="z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" innerClassName="items-center justify-center p-3 sm:p-4">
                            <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
                              {/* Modal Header */}
                              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 flex items-center justify-center shadow-xs">
                                    <Gift className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        รายการโบนัสรายบุคคล: {selectedBonusPeriodModal.periodName}
                                      </h3>
                                      <span
                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                          selectedBonusPeriodModal.status === 'IN_PAYROLL'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                            : selectedBonusPeriodModal.status === 'PARTIAL_IN_PAYROLL'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                        }`}
                                      >
                                        {selectedBonusPeriodModal.statusText}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      พนักงานทั้งหมด {expandedBonuses.length} คน
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleCloseBonusPeriodModal}
                                  className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                                  title="ปิดหน้าต่าง"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Modal Body */}
                              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                                {/* Stat Summary Box */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">ยอดรวมโบนัส</div>
                                    <div className="text-base font-bold font-mono text-amber-900 dark:text-amber-400">
                                      ฿{currentExpandedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">ตัวคูณเฉลี่ย</div>
                                    <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                                      {currentExpandedAvgMult}x
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">จำนวนพนักงาน</div>
                                    <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                                      {expandedBonuses.length} คน
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">เข้างวดเงินเดือนแล้ว</div>
                                    <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                      {inPayrollCountInExpanded} / {expandedBonuses.length} คน
                                    </div>
                                  </div>
                                </div>

                                {/* Toolbar: Search & Action Buttons */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="relative flex-1 sm:max-w-xs w-full">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                      type="text"
                                      placeholder="ค้นหารหัส, ชื่อพนักงาน หรือตำแหน่ง..."
                                      value={expandedBonusSearchQuery}
                                      onChange={(e) => setExpandedBonusSearchQuery(e.target.value)}
                                      className="w-full h-9 pl-9 pr-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200"
                                    />
                                  </div>

                                </div>

                                {/* Table */}
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                  {isExpandedBonusLoading ? (
                                    <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                                      <span className="text-xs">กำลังโหลดข้อมูลโบนัสรายบุคคล...</span>
                                    </div>
                                  ) : expandedBonuses.length === 0 ? (
                                    <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                                      ยังไม่มีข้อมูลพนักงานที่ได้รับโบนัสในรอบนี้
                                    </div>
                                  ) : filteredBonuses.length === 0 ? (
                                    <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                                      ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา &ldquo;{expandedBonusSearchQuery}&rdquo;
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                                      <table className="table-standard w-full text-left text-xs border-collapse">
                                        <thead className="bg-[#0B2046] text-white font-semibold sticky top-0 z-10">
                                          <tr className="whitespace-nowrap">
                                            <th className="py-3 px-4 font-semibold">พนักงาน</th>
                                            <th className="py-3 px-4 font-semibold">แผนก / ตำแหน่ง</th>
                                            <th className="py-3 px-4 text-right font-semibold">ฐานเงินเดือน</th>
                                            <th className="py-3 px-4 text-center font-semibold">ตัวคูณ (เท่า)</th>
                                            <th className="py-3 px-4 text-right font-bold">ยอดโบนัส (บาท)</th>
                                            <th className="py-3 px-4 text-center font-semibold">สถานะ</th>
                                            <th className="py-3 px-4 font-semibold">หมายเหตุ</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
                                          {filteredBonuses.map((b) => {
                                            return (
                                              <tr key={b.employeeId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="py-2.5 px-4 whitespace-nowrap">
                                                  <div className="font-semibold text-slate-900 dark:text-slate-100">{b.employeeName}</div>
                                                  <div className="font-mono text-slate-400 text-[10px]">{b.employeeCode}</div>
                                                </td>
                                                <td className="py-2.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                                  <div className="font-medium text-slate-800 dark:text-slate-200">{b.departmentName || '-'}</div>
                                                  <div className="text-[11px] text-slate-400">{b.positionName || '-'}</div>
                                                </td>
                                                <td className="py-2.5 px-4 text-right font-mono text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
                                                  ฿{(b.baseSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                {/* Multiplier */}
                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{b.multiplier}x</span>
                                                </td>
                                                {/* Bonus Amount */}
                                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                                  <span className="font-mono font-bold text-amber-900 dark:text-amber-400">
                                                      ฿{(b.bonusAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                {/* Status */}
                                                <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                  {renderBonusStatusBadge(b)}
                                                </td>
                                                {/* Note */}
                                                <td className="py-2 px-3 whitespace-nowrap">
                                                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                                                      {b.note || '-'}
                                                    </span>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                        {filteredBonuses.length > 0 && (
                                          <tfoot>
                                            <tr className="bg-slate-50/90 dark:bg-slate-900/50 border-t-2 border-slate-200 dark:border-slate-700 text-xs">
                                              <td colSpan={4} className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                                                รวม {filteredBonuses.length} คน
                                              </td>
                                              <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white">
                                                ฿{filteredBonuses.reduce((sum, x) => sum + (x.bonusAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </td>
                                              <td colSpan={2} />
                                            </tr>
                                          </tfoot>
                                        )}
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Modal Footer */}
                              <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  แสดง {filteredBonuses.length} จาก {expandedBonuses.length} รายการ
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handleCloseBonusPeriodModal}
                                    className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                                  >
                                    ปิด
                                  </button>
                                </div>
                              </div>
                            </div>
                          </ModalShell>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* === TAB: ค่าคอมมิชชั่น (Sales Commission) === */}
      {activeTab === 'commission' && <CommissionTab />}

      {/* === TAB 4: ประมวลเงินเดือน (Payroll Processing) === */}
      {activeTab === 'process' && (() => {
        const totalEmployees = payrolls.length;
        const pendingCheckCount = payrolls.filter(p => p.inputStatus === 'PENDING_CHECK').length;
        const totalLeaveDays = payrolls.reduce((sum, p) => sum + (p.leaveDays || 0), 0);

        const totalGross = payrolls.reduce((acc, p) => acc + (p.totalGrossIncome || 0), 0);
        // ใช้ยอดจากผลคำนวณจริงของ backend (ไม่คำนวณซ้ำด้วยสูตรตายตัว 5% / 750 บาท)
        const totalSso = payrolls.reduce((acc, p) => acc + (p.ssoAmount || 0), 0);
        const totalTax = payrolls.reduce((acc, p) => acc + (p.taxAmount || 0), 0);
        const taxAndSso = totalSso + totalTax;
        const totalNet = payrolls.reduce((acc, p) => acc + (p.netPayableSalary || 0), 0);
        // นับเฉพาะคนที่มียอดต้องโอนจริง (สุทธิ > 0) ให้ตรงกับฝั่ง backend — คนที่ได้ 0 บาทไม่มีการโอน
        const payableTransfers = payrolls.filter(p => (p.netPayableSalary || 0) > 0);
        const transferTotal = payableTransfers.length;
        const transferredCount = payableTransfers.filter(p => p.paymentStatus === 'TRANSFERRED').length;
        const pendingTransferCount = transferTotal - transferredCount;
        const zeroSalaryCount = payrolls.filter(p => !p.netPayableSalary || p.netPayableSalary === 0).length;
        const openPeriods = periods.filter(p => p.status !== 'CLOSED');

        const availableYears = Array.from(
          new Set([new Date().getFullYear(), ...periods.map((p) => p.year).filter(Boolean)])
        ).sort((a, b) => b - a);

        const activeYear = selectedPeriod?.year || selectedYearFilter || availableYears[0];

        const periodsInSelectedYear = periods
          .filter((p) => p.year === activeYear)
          .sort((a, b) => a.month - b.month);

        const filteredPayrolls = payrolls.filter((p) => {
          const matchesSearch = !processSearchQuery ||
            p.employeeName?.toLowerCase().includes(processSearchQuery.toLowerCase()) ||
            p.employeeCode?.toLowerCase().includes(processSearchQuery.toLowerCase()) ||
            (p.departmentName && p.departmentName.toLowerCase().includes(processSearchQuery.toLowerCase()));
          const matchesDept = processDeptFilter === 'ALL' || p.departmentName === processDeptFilter;
          return matchesSearch && matchesDept;
        });

        const totalProcessCount = filteredPayrolls.length;
        const totalProcessPages = Math.max(1, Math.ceil(totalProcessCount / processPageSize));
        const safeProcessPage = Math.min(Math.max(1, processPage), totalProcessPages);
        const startProcessIdx = (safeProcessPage - 1) * processPageSize;
        const paginatedPayrolls = filteredPayrolls.slice(startProcessIdx, startProcessIdx + processPageSize);

        const getWorkflowStep = (status?: string) => {
          if (!status || status === 'DRAFT' || status === 'REVIEW') return 1;
          if (status === 'SUBMITTED_TO_FINANCE') return 2;
          if (status === 'FINANCE_VERIFIED' || status === 'PENDING_APPROVAL') return 3;
          if (status === 'APPROVED' || status === 'PROCESSING' || status === 'PROCESSING_BANK') return 4;
          if (status === 'PAID' || status === 'CLOSED') return 5;
          return 4;
        };
        const currentStep = getWorkflowStep(selectedPeriod?.status);

        const activeSubStepNum =
          processSubTab === 'HR' ? 1 : processSubTab === 'FINANCE' ? 2 : processSubTab === 'APPROVER' ? 3 : 4;

        const displayMonthNum =
          selectedProcessMonth ?? (selectedPeriod ? selectedPeriod.month : new Date().getMonth() + 1);
        const fallbackPeriodDates = getDefaultPeriodValues(activeYear, displayMonthNum);

        const stateSteps: {
          num: number;
          subTab: 'HR' | 'FINANCE' | 'APPROVER' | 'BANK';
          title: string;
          sub: string;
          canAccess: boolean;
        }[] = [
          {
            num: 1,
            subTab: 'HR',
            title: 'คำนวณ',
            sub: 'ฝ่ายบุคคล (HR)',
            canAccess: Boolean(canAccessHrView || isAdmin),
          },
          {
            num: 2,
            subTab: 'FINANCE',
            title: 'ตรวจสอบ',
            sub: 'ฝ่ายการเงิน',
            canAccess: Boolean(canAccessFinanceView || isAdmin),
          },
          {
            num: 3,
            subTab: 'APPROVER',
            title: 'อนุมัติ',
            sub: 'ผู้บริหาร (CEO)',
            canAccess: Boolean(canAccessApproverView || isAdmin),
          },
          {
            num: 4,
            subTab: 'BANK',
            title: 'ชำระเงิน',
            sub: 'โอนเงินธนาคาร',
            canAccess: Boolean(canAccessBankView || isAdmin),
          },
        ];

        return (
          <div className="space-y-4">
            {/* ── PANEL 1: TOP PERIOD SELECTOR & ACTIONS BAR (คงเดิม) ── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-5">
              {/* ── TIER 1: Period Selection & Period Management (สร้าง/ลบรอบ) ── */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left: Period Selector & Status Badge */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      รอบเงินเดือน:
                    </span>
                  </div>

                  {/* 1. ตัวเลือกรอบเดือน (แสดงครบทั้ง 12 เดือน) */}
                  <div className="relative inline-block">
                    <CustomSelect
                      value={
                        selectedProcessMonth != null
                          ? `UNCREATED_${selectedProcessMonth}`
                          : selectedPeriod && selectedPeriod.year === activeYear
                          ? selectedPeriod.id
                          : (periodsInSelectedYear[0]?.id || '')
                      }
                      onChange={(e) => {
                        const val = String(e?.target?.value ?? e ?? '');
                        if (val.startsWith('UNCREATED_')) {
                          const monthNum = parseInt(val.replace('UNCREATED_', ''), 10);
                          setSelectedProcessMonth(monthNum);
                          setSelectedPeriod(null);
                          setPayrolls([]);
                        } else if (val) {
                          setSelectedProcessMonth(null);
                          handlePeriodChange(Number(val));
                        }
                      }}
                      numbered={false}
                      size="sm"
                      className="min-w-[150px] sm:min-w-[180px]"
                      buttonClassName="font-bold text-slate-800 dark:text-slate-100 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      title="เลือกรอบเดือน"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = i + 1;
                        const p = periodsInSelectedYear.find((x) => x.month === m);
                        if (p) {
                          const statusHint =
                            p.status === 'CLOSED' ? 'ปิดรอบแล้ว' : p.status === 'PAID' ? 'จ่ายแล้ว' : undefined;
                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              data-hint={statusHint}
                              className="text-slate-900 dark:text-slate-100 dark:bg-slate-800"
                            >
                              {THAI_MONTH_NAMES[i]}
                            </option>
                          );
                        }
                        return (
                          <option
                            key={`UNCREATED_${m}`}
                            value={`UNCREATED_${m}`}
                            data-hint="ยังไม่มีรอบ"
                            className="text-slate-400 dark:text-slate-500 italic dark:bg-slate-800"
                          >
                            {THAI_MONTH_NAMES[i]}
                          </option>
                        );
                      })}
                    </CustomSelect>
                  </div>

                  {/* 2. ตัวเลือกปี พ.ศ. (เลือกปีตามหลัง) */}
                  <div className="relative inline-block">
                    <YearPicker
                      value={activeYear}
                      onChange={(y) => handleYearFilterChange(y)}
                      className="w-28 sm:w-32"
                      buttonClassName="font-bold text-slate-800 dark:text-slate-100 rounded-xl bg-slate-50 dark:bg-slate-900/60"
                      title="เลือกปีรอบเงินเดือน"
                    />
                  </div>

                  {/* สถานะรอบ */}
                  {selectedPeriod ? (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedPeriod.status === 'PENDING_APPROVAL' || selectedPeriod.status === 'FINANCE_VERIFIED'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs'
                          : selectedPeriod.status === 'REVIEW' || selectedPeriod.status === 'DRAFT'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : selectedPeriod.status === 'SUBMITTED_TO_FINANCE'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : selectedPeriod.status === 'PROCESSING_BANK'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : selectedPeriod.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : selectedPeriod.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {selectedPeriod.status === 'PENDING_APPROVAL'
                        ? 'รอ CEO อนุมัติ'
                        : selectedPeriod.status === 'FINANCE_VERIFIED'
                        ? 'การเงินตรวจแล้ว (รออนุมัติ)'
                        : selectedPeriod.status === 'SUBMITTED_TO_FINANCE'
                        ? 'ส่งการเงินตรวจทานแล้ว'
                        : selectedPeriod.status === 'PROCESSING_BANK'
                        ? 'ส่งโอนธนาคารแล้ว (รอการเงินตรวจสลิป)'
                        : selectedPeriod.status === 'APPROVED'
                        ? 'CEO อนุมัติแล้ว (รอโอนเงิน)'
                        : selectedPeriod.status === 'PAID'
                        ? 'จ่ายเงินแล้ว'
                        : selectedPeriod.status === 'CLOSED'
                        ? 'ปิดรอบแล้ว'
                        : selectedPeriod.statusText}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      ยังไม่มีรอบเงินเดือน
                    </span>
                  )}
                  {isFuturePeriod(selectedPeriod) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      งวดล่วงหน้า (อนาคต)
                    </span>
                  )}
                  {(!isAdmin &&
                    [canAccessHrView, canAccessFinanceView, canAccessApproverView, canAccessBankView].filter(Boolean)
                      .length <= 1) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                      {processSubTab === 'HR' && 'ฝ่ายบุคคล (HR)'}
                      {processSubTab === 'FINANCE' && 'ฝ่ายการเงิน (Finance)'}
                      {processSubTab === 'APPROVER' && 'ผู้บริหาร (CEO / Approver)'}
                      {processSubTab === 'BANK' && 'โอนเงินธนาคาร (Bank Transfer)'}
                    </span>
                  )}
                </div>

                {/* Right: Primary Role Workflow Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {(!selectedPeriod || selectedProcessMonth != null) ? (
                    (canAccessHrView || isAdmin) ? (
                      <button
                        type="button"
                        disabled={isCreatingPeriod}
                        onClick={() => {
                          const targetMonth =
                            selectedProcessMonth ??
                            (selectedPeriod ? selectedPeriod.month : new Date().getMonth() + 1);
                          handleCreatePeriodInstant(activeYear, targetMonth);
                        }}
                        className="h-9 inline-flex items-center gap-1.5 px-4 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isCreatingPeriod ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>สร้างรอบเงินเดือน</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>ยังไม่ได้สร้างรอบเงินเดือนประจำเดือนนี้</span>
                      </span>
                    )
                  ) : (
                    <>
                      {processSubTab === 'HR' && (canAccessHrView || isAdmin) && (
                        <>
                          {(selectedPeriod?.status === 'REVIEW' || selectedPeriod?.status === 'DRAFT') && (
                            <button
                              type="button"
                              onClick={() => setDeletePeriodConfirmOpen(true)}
                              disabled={!selectedPeriod || isDeletingPeriod}
                              className="h-9 inline-flex items-center gap-1.5 px-3 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                              title="ลบรอบเงินเดือนนี้ออกจากระบบ"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>ลบรอบ</span>
                            </button>
                          )}

                          {/* คำนวณเงินเดือน */}
                          <button
                            type="button"
                            onClick={handleCalculatePayroll}
                            disabled={
                              isCalculating ||
                              !selectedPeriod ||
                              (selectedPeriod?.status !== 'DRAFT' && selectedPeriod?.status !== 'REVIEW')
                            }
                            className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isCalculating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Scale className="w-3.5 h-3.5" />
                            )}
                            <span>{isCalculating ? 'กำลังคำนวณ...' : 'คำนวณเงินเดือน'}</span>
                          </button>

                          {/* ส่งให้ฝ่ายการเงิน */}
                          {(selectedPeriod?.status === 'REVIEW' || selectedPeriod?.status === 'DRAFT') &&
                            (payrolls.length > 0 &&
                            payrolls.some(
                              (p) => p.status === 'CALCULATED' || (p.netPayableSalary != null && p.netPayableSalary > 0)
                            ) ? (
                              <button
                                type="button"
                                onClick={handleSubmitToFinance}
                                className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>ส่งให้ฝ่ายการเงินตรวจสอบ</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="h-9 inline-flex items-center gap-1.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-not-allowed opacity-80"
                                title="กรุณากดคำนวณเงินเดือนก่อนส่งการเงิน"
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>ส่งให้การเงิน (ต้องคำนวณก่อน)</span>
                              </button>
                            ))}
                        </>
                      )}

                      {processSubTab === 'FINANCE' && (
                        <>
                          {(selectedPeriod?.status === 'SUBMITTED_TO_FINANCE' ||
                            selectedPeriod?.status === 'FINANCE_VERIFIED') && (
                            <button
                              type="button"
                              onClick={() => setIsRejectModalOpen(true)}
                              className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>ไม่อนุมัติ (ส่งคืน HR แก้ไข)</span>
                            </button>
                          )}

                          {selectedPeriod?.status === 'SUBMITTED_TO_FINANCE' && (
                            <button
                              type="button"
                              onClick={handleVerifyByFinance}
                              className="h-9 inline-flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>การเงินยืนยันความถูกต้อง (ส่งขออนุมัติจาก CEO)</span>
                            </button>
                          )}

                          {selectedPeriod?.status === 'FINANCE_VERIFIED' && (
                            <span className="h-9 inline-flex items-center gap-1.5 px-3 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold">
                              <Clock className="w-3.5 h-3.5 text-purple-500" />
                              <span>ส่งขออนุมัติจาก CEO แล้ว (รออนุมัติ)</span>
                            </span>
                          )}

                          {['APPROVED', 'PAID', 'CLOSED'].includes(selectedPeriod?.status || '') ? (
                            <>
                              <button
                                type="button"
                                onClick={handleDownloadBankFile}
                                disabled={isExportingBankFile}
                                className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                <span>{isExportingBankFile ? 'กำลังสร้างไฟล์...' : '↓ ไฟล์โอนเงินธนาคาร'}</span>
                              </button>

                              {selectedPeriod?.status === 'APPROVED' && (
                                <button
                                  type="button"
                                  onClick={handleAdvancePeriodStatus}
                                  className="h-9 inline-flex items-center gap-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                                >
                                  <Banknote className="w-3.5 h-3.5" />
                                  <span>บันทึกว่าจ่ายแล้ว</span>
                                </button>
                              )}

                              {selectedPeriod?.status === 'PAID' && (
                                <button
                                  type="button"
                                  onClick={handleAdvancePeriodStatus}
                                  disabled={isAdvancingStatus}
                                  className="h-9 inline-flex items-center gap-2 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isAdvancingStatus ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isAdvancingStatus ? 'กำลังปิดรอบ...' : 'ปิดรอบเงินเดือน'}</span>
                                </button>
                              )}

                              {selectedPeriod?.status === 'CLOSED' && (
                                <span className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>ปิดรอบเงินเดือนเรียบร้อยแล้ว</span>
                                </span>
                              )}
                            </>
                          ) : selectedPeriod?.status !== 'SUBMITTED_TO_FINANCE' &&
                            selectedPeriod?.status !== 'FINANCE_VERIFIED' ? (
                            <span className="h-9 inline-flex items-center gap-1.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>รอ HR ส่งเรื่องให้การเงิน</span>
                            </span>
                          ) : null}
                        </>
                      )}

                      {processSubTab === 'APPROVER' && (
                        <>
                          {selectedPeriod?.status === 'FINANCE_VERIFIED' ||
                          selectedPeriod?.status === 'PENDING_APPROVAL' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setIsRejectModalOpen(true)}
                                className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>ไม่อนุมัติ (ส่งคืน HR)</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleAdvancePeriodStatus}
                                className="h-9 inline-flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>อนุมัติรอบเงินเดือน</span>
                              </button>
                            </>
                          ) : ['APPROVED', 'PAID', 'CLOSED'].includes(selectedPeriod?.status || '') ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>
                                {selectedPeriod?.status === 'CLOSED'
                                  ? 'ปิดรอบเงินเดือนสมบูรณ์แล้ว'
                                  : 'CEO อนุมัติรอบนี้เรียบร้อยแล้ว'}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span>ยังไม่ถึงขั้นตอนการอนุมัติ (รอ HR และการเงิน)</span>
                            </span>
                          )}
                        </>
                      )}

                      {processSubTab === 'BANK' && (
                        <>
                          <button
                            type="button"
                            onClick={handleDownloadBankFile}
                            disabled={
                              isExportingBankFile ||
                              !['APPROVED', 'PAID', 'CLOSED'].includes(selectedPeriod?.status || '')
                            }
                            className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            <span>{isExportingBankFile ? 'กำลังสร้างไฟล์...' : '↓ ไฟล์โอนเงินธนาคาร'}</span>
                          </button>

                          {selectedPeriod?.status === 'APPROVED' && (isFinance || isAdmin || isCEO) && (
                            <button
                              type="button"
                              onClick={handleAdvancePeriodStatus}
                              className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>บันทึกว่าจ่ายแล้ว</span>
                            </button>
                          )}

                          {selectedPeriod?.status === 'PAID' && (isFinance || isAdmin || isCEO) && (
                            <button
                              type="button"
                              onClick={handleAdvancePeriodStatus}
                              disabled={isAdvancingStatus}
                              className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isAdvancingStatus ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              )}
                              <span>{isAdvancingStatus ? 'กำลังปิดรอบ...' : 'ปิดรอบเงินเดือน'}</span>
                            </button>
                          )}

                          {selectedPeriod?.status === 'CLOSED' && (
                            <span className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ปิดรอบเงินเดือนเรียบร้อยแล้ว</span>
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ── TIER 2: Schedule Metadata (4 Columns like Image 2) ── */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. ช่วงเงินเดือน */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-600/60 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">ช่วงเงินเดือน</div>
                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                      {selectedPeriod
                        ? (() => {
                            const s = selectedPeriod.startDate?.slice(0, 10).split('-').map(Number);
                            const e = selectedPeriod.endDate?.slice(0, 10).split('-').map(Number);
                            const abbr = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                            if (s && e && s.length === 3 && e.length === 3 && s[0] === e[0]) {
                              return `${s[2]} ${abbr[s[1] - 1]} – ${e[2]} ${abbr[e[1] - 1]} ${e[0] + 543}`;
                            }
                            return `${formatThaiShortDate(selectedPeriod.startDate)} – ${formatThaiShortDate(selectedPeriod.endDate)}`;
                          })()
                        : '-'}
                    </div>
                  </div>
                </div>

                {/* 2. วันจ่ายเงิน */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-600/60 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">วันจ่ายเงิน</div>
                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                      {formatThaiShortDate(selectedPeriod?.paymentDate)}
                    </div>
                  </div>
                </div>

                {/* 3. ตัดรอบเงินเบิก */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-600/60 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">ตัดรอบเงินเบิก</div>
                    {selectedPeriod && claimCutoffEditing ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <ThaiDatePicker
                          value={claimCutoffDraft}
                          max={selectedPeriod.paymentDate || selectedPeriod.endDate}
                          onChange={setClaimCutoffDraft}
                          className="px-1.5 py-0.5 text-[11px] border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        />
                        <button
                          type="button"
                          disabled={isSavingClaimCutoff}
                          onClick={() => handleSaveClaimCutoff(claimCutoffDraft || null)}
                          className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          disabled={isSavingClaimCutoff}
                          onClick={() => handleSaveClaimCutoff(null)}
                          className="text-[11px] text-slate-500 hover:underline cursor-pointer disabled:opacity-50"
                          title="ใช้วันกำหนดจ่ายเงินเป็นวันตัดรอบ"
                        >
                          ใช้วันจ่ายเงิน
                        </button>
                        <button
                          type="button"
                          onClick={() => setClaimCutoffEditing(false)}
                          className="text-[11px] text-slate-400 hover:underline cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">
                          {selectedPeriod?.effectiveClaimCutoffDate
                            ? formatThaiShortDate(selectedPeriod.effectiveClaimCutoffDate)
                            : '-'}
                        </span>
                        {selectedPeriod &&
                          (isHR || isAdmin) &&
                          !['APPROVED', 'PROCESSING', 'PAID', 'CLOSED'].includes(selectedPeriod.status) && (
                            <button
                              type="button"
                              onClick={() => {
                                setClaimCutoffDraft(
                                  selectedPeriod.claimCutoffDate || selectedPeriod.effectiveClaimCutoffDate || ''
                                );
                                setClaimCutoffEditing(true);
                              }}
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                            >
                              แก้ไข
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. พนักงานในรอบ */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-600/60 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">พนักงานในรอบ</div>
                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                      {payrolls.length} คน
                    </div>
                  </div>
                </div>
              </div>

              {/* ── TIER 3: 4-State Workflow Stepper (Horizontal layout matching Image 2) ── */}
              {selectedPeriod && selectedProcessMonth == null && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center justify-between w-full overflow-x-auto py-0.5">
                    {stateSteps.map((st, idx) => {
                      const isDone = currentStep > st.num;
                      const isViewing = activeSubStepNum === st.num;

                      return (
                        <React.Fragment key={st.subTab}>
                          <button
                            type="button"
                            disabled={!st.canAccess}
                            onClick={() => {
                              if (!st.canAccess) return;
                              setProcessSubTab(st.subTab);
                              if (st.subTab === 'HR') setViewMode('HR');
                              else if (st.subTab === 'APPROVER') setViewMode('ALL');
                              else setViewMode('FINANCE');

                              if (st.subTab === 'BANK' && selectedPeriod) {
                                loadTransferList(selectedPeriod.id);
                                loadBankTransfer(selectedPeriod.id, selectedBankFilter);
                              }
                            }}
                            className={`flex items-center gap-3 shrink-0 group select-none text-left ${
                              st.canAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                                isViewing
                                  ? 'bg-[#1d6bf3] text-white ring-4 ring-[#1d6bf3]/15'
                                  : isDone
                                  ? 'bg-[#059669] text-white'
                                  : 'bg-slate-300 dark:bg-slate-600 text-white group-hover:bg-slate-400'
                              }`}
                            >
                              {isDone && !isViewing ? <Check className="w-4 h-4 stroke-[3]" /> : st.num}
                            </div>
                            <div className="flex flex-col leading-tight">
                              <span
                                className={`text-[13px] font-bold whitespace-nowrap transition-colors ${
                                  isViewing
                                    ? 'text-[#1d6bf3]'
                                    : isDone
                                    ? 'text-slate-800 dark:text-slate-100'
                                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                                }`}
                              >
                                {st.title}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap mt-0.5">
                                {st.sub}
                              </span>
                            </div>
                          </button>

                          {idx < stateSteps.length - 1 && (
                            <div
                              className={`flex-1 min-w-[28px] h-[2px] mx-4 transition-colors ${
                                currentStep > st.num
                                  ? 'bg-[#10b981] dark:bg-emerald-500'
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* If no period exists for this selected month */}
            {(!selectedPeriod || selectedProcessMonth != null) ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/30 text-[#0B2046] dark:text-blue-400 mx-auto flex items-center justify-center">
                  <Calendar className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    ยังไม่มีรอบเงินเดือนประจำเดือน{' '}
                    {THAI_MONTH_NAMES[
                      (selectedProcessMonth ?? (selectedPeriod ? selectedPeriod.month : new Date().getMonth() + 1)) - 1
                    ]}{' '}
                    {activeYear + 543}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    ยังไม่ได้สร้างรอบเงินเดือนสำหรับเดือนนี้ คุณสามารถกดปุ่ม &ldquo;สร้างรอบเงินเดือน&rdquo; เพื่อเริ่มประมวลผล
                  </p>
                </div>
                {(canAccessHrView || isAdmin) && (
                  <button
                    type="button"
                    disabled={isCreatingPeriod}
                    onClick={() => {
                      const targetMonth =
                        selectedProcessMonth ?? (selectedPeriod ? selectedPeriod.month : new Date().getMonth() + 1);
                      handleCreatePeriodInstant(activeYear, targetMonth);
                    }}
                    className="h-10 px-6 bg-[#0B2046] hover:bg-[#112d5e] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
                  >
                    {isCreatingPeriod ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>
                      สร้างรอบเงินเดือน{' '}
                      {THAI_MONTH_NAMES[
                        (selectedProcessMonth ?? (selectedPeriod ? selectedPeriod.month : new Date().getMonth() + 1)) - 1
                      ]}{' '}
                      {activeYear + 543}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <>

            {/* Warning Banner: พนักงานที่ยังไม่มีฐานเงินเดือน */}
            {zeroSalaryCount > 0 && selectedPeriod?.status !== 'CLOSED' && (
              <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-900 dark:text-amber-200">
                      พบพนักงาน {zeroSalaryCount} คนที่ยอดเงินเดือนเป็น ฿0.00 (ยังไม่มีฐานเงินเดือนเริ่มต้น)
                    </div>
                    <div className="text-amber-700 dark:text-amber-400 text-[11px] mt-0.5">
                      พนักงานเหล่านี้จะไม่มีรายการเงินเดือนสุทธิ หากต้องการกำหนดเงินเดือน สามารถไปที่แท็บ &ldquo;ข้อมูลเงินเดือนพนักงาน&rdquo; ได้
                    </div>
                  </div>
                </div>
                {canViewStructures && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('structures');
                      setStructureSubTab('employees');
                    }}
                    className="self-start sm:self-auto px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    จัดการฐานเงินเดือน →
                  </button>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 🟢 VIEW 1: HR VIEW (Pre-Payroll Verification)                  */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {processSubTab === 'HR' && !canAccessHrView && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  ไม่มีสิทธิ์เข้าถึงหน้าต่างฝ่ายบุคคล (HR)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  บทบาทของคุณได้รับสิทธิ์เฉพาะหน้าต่างฝ่ายการเงิน (Finance)
                </p>
                {canAccessFinanceView && (
                  <button
                    onClick={() => {
                      setProcessSubTab('FINANCE');
                      setViewMode('FINANCE');
                    }}
                    className="px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    ไปยังหน้าต่างฝ่ายการเงิน (Finance)
                  </button>
                )}
              </div>
            )}

            {processSubTab === 'HR' && canAccessHrView && (
              <div className="space-y-4">
                {/* Table: HR Data Input Verification */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
                  {/* Filter Toolbar */}
                  <div className="px-4 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 min-h-9">
                    <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ค้นหารหัส หรือชื่อพนักงาน..."
                          value={processSearchQuery}
                          onChange={(e) => {
                            setProcessSearchQuery(e.target.value);
                            setProcessPage(1);
                          }}
                          className="w-full h-9 pl-9 pr-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      <CustomSelect
                        value={processDeptFilter}
                        onChange={(e) => {
                          setProcessDeptFilter(String(e.target.value));
                          setProcessPage(1);
                        }}
                        placeholder="ทุกแผนก"
                        className="min-w-[150px]"
                        options={[
                          { value: 'ALL', label: 'ทุกแผนก' },
                          ...departments.map((d) => ({ value: d.departmentName, label: d.departmentName })),
                        ]}
                      />

                      {(processSearchQuery || processDeptFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setProcessSearchQuery('');
                            setProcessDeptFilter('ALL');
                            setProcessPage(1);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 cursor-pointer"
                        >
                          ล้างตัวกรอง
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                      <table className="table-standard text-xs w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 whitespace-nowrap">
                          <th className="py-3.5 px-5">พนักงาน</th>
                          <th className="py-3.5 px-5">แผนก</th>
                          <th className="py-3.5 px-5">วันลา</th>
                          <th className="py-3.5 px-5">สถานะข้อมูล</th>
                          <th className="py-3.5 px-5 text-center">ดูรายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {paginatedPayrolls.map((pr) => {
                          return (
                            <tr key={pr.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-5">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{pr.employeeName}</div>
                                <div className="font-mono text-slate-400 text-[11px]">{pr.employeeCode}</div>
                              </td>
                              <td className="py-4 px-5 text-slate-600 dark:text-slate-400">{pr.departmentName}</td>
                              <td className="py-4 px-5">
                                {pr.leaveDays && pr.leaveDays > 0 ? (
                                  <div>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{pr.leaveDays} วัน</span>
                                    {pr.leaveSummary && (
                                      <div className="text-[11px] text-slate-400">{pr.leaveSummary}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-4 px-5">
                                {pr.inputStatus === 'COMPLETE' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>ครบแล้ว</span>
                                  </span>
                                ) : pr.inputStatus === 'PENDING_SALARY' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200" title="ยังไม่ระบุฐานเงินเดือนในระบบ">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    <span>ยังไม่ระบุฐานเงินเดือน</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    <span>รอ HR ตรวจสอบ</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-5 text-center">
                                <button
                                  onClick={() => handleOpenDetailDrawer(pr)}
                                  title="ดูรายละเอียดการคำนวณ"
                                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                  <TablePagination
                    currentPage={safeProcessPage}
                    pageSize={processPageSize}
                    totalCount={totalProcessCount}
                    onPageChange={setProcessPage}
                    onPageSizeChange={(newSize) => {
                      setProcessPageSize(newSize);
                      setProcessPage(1);
                    }}
                    pageSizeOptions={[10, 20, 50, 100, 200]}
                    unitText="คน"
                  />
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 🟠 VIEW 2: FINANCE VIEW (Disbursement & Banking)              */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {processSubTab === 'FINANCE' && (
              <div className="space-y-4">
                {/* 4 Stat Cards for Finance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ยอดจ่ายรวม (Gross)</span>
                    <div className="text-2xl font-bold text-amber-700 mt-1">
                      ฿{totalGross.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">{totalEmployees} คน</span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ภาษี + ประกันสังคมที่ต้องนำส่ง</span>
                    <div className="text-2xl font-bold text-rose-600 mt-1">
                      ฿{taxAndSso.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      กำหนดนำส่ง {(() => {
                        if (!selectedPeriod) return '-';
                        const nextMonth = selectedPeriod.month === 12 ? 1 : selectedPeriod.month + 1;
                        const nextYear = selectedPeriod.month === 12 ? selectedPeriod.year + 1 : selectedPeriod.year;
                        const nextMonthName = THAI_MONTH_NAMES[nextMonth - 1];
                        return `7 ${nextMonthName} ${nextYear + 543}`;
                      })()}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ยอดโอนสุทธิ (Net Pay)</span>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                      ฿{totalNet.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      โอนวันที่ {formatThaiShortDate(selectedPeriod?.paymentDate)}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">สถานะการโอน</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {transferredCount} / {transferTotal}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {transferredCount === transferTotal ? 'สำเร็จครบทั้งหมด' : `${pendingTransferCount} รายการรอโอน`}
                    </span>
                  </div>
                </div>

                {/* Table: Finance Disbursement & Banking */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
                  {/* Filter Toolbar */}
                  <div className="px-4 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 min-h-9">
                    <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ค้นหารหัส หรือชื่อพนักงาน..."
                          value={processSearchQuery}
                          onChange={(e) => {
                            setProcessSearchQuery(e.target.value);
                            setProcessPage(1);
                          }}
                          className="w-full h-9 pl-9 pr-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      <CustomSelect
                        value={processDeptFilter}
                        onChange={(e) => {
                          setProcessDeptFilter(String(e.target.value));
                          setProcessPage(1);
                        }}
                        placeholder="ทุกแผนก"
                        className="min-w-[150px]"
                        options={[
                          { value: 'ALL', label: 'ทุกแผนก' },
                          ...departments.map((d) => ({ value: d.departmentName, label: d.departmentName })),
                        ]}
                      />

                      {(processSearchQuery || processDeptFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setProcessSearchQuery('');
                            setProcessDeptFilter('ALL');
                            setProcessPage(1);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 cursor-pointer"
                        >
                          ล้างตัวกรอง
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                      <table className="table-standard text-xs w-full min-w-[750px] text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 whitespace-nowrap">
                          <th className="py-3.5 px-5">พนักงาน</th>
                          <th className="py-3.5 px-5">บัญชีธนาคาร</th>
                          <th className="py-3.5 px-5 text-right">รายได้รวม</th>
                          <th className="py-3.5 px-5 text-right">รายการหัก</th>
                          <th className="py-3.5 px-5 text-right">เงินเดือนสุทธิ</th>
                          <th className="py-3.5 px-5">สถานะโอน</th>
                          <th className="py-3.5 px-5 text-center">ดูรายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {paginatedPayrolls.map((pr) => {
                          const hasGross = pr.totalGrossIncome != null && pr.totalGrossIncome > 0;
                          return (
                            <tr key={pr.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-5">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{pr.employeeName}</div>
                                <div className="font-mono text-slate-400 text-[11px]">{pr.employeeCode}</div>
                              </td>
                              <td className="py-4 px-5">
                                {pr.bankName && pr.accountNumber ? (
                                  <>
                                    <div className="font-medium text-slate-800 dark:text-slate-200">{pr.bankName}</div>
                                    <div className="text-[11px] font-mono text-slate-400">
                                      <MaskedDataViewer value={pr.accountNumber} type="bankAccount" />
                                    </div>
                                  </>
                                ) : (
                                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>ยังไม่มีบัญชีธนาคาร</span>
                                    </div>
                                  )}
                              </td>
                              <td className="py-4 px-5 text-right font-mono text-slate-700 dark:text-slate-300 font-medium">
                                {hasGross ? `฿${pr.totalGrossIncome!.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '-'}
                              </td>
                              <td className="py-4 px-5 text-right font-mono text-rose-600 font-medium">
                                {hasGross && pr.totalDeductionAmount != null
                                  ? `-฿${pr.totalDeductionAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
                                  : '-'}
                              </td>
                              <td className="py-4 px-5 text-right font-mono font-bold text-emerald-600 text-sm">
                                {hasGross && pr.netPayableSalary != null
                                  ? `฿${pr.netPayableSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                  : '-'}
                              </td>
                              <td className="py-4 px-5">
                                {pr.paymentStatus === 'TRANSFERRED' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>โอนแล้ว</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    <span>รอโอน</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-5 text-center">
                                <button
                                  onClick={() => handleOpenDetailDrawer(pr)}
                                  title="ดูรายละเอียดการคำนวณ"
                                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                  <TablePagination
                    currentPage={safeProcessPage}
                    pageSize={processPageSize}
                    totalCount={totalProcessCount}
                    onPageChange={setProcessPage}
                    onPageSizeChange={(newSize) => {
                      setProcessPageSize(newSize);
                      setProcessPage(1);
                    }}
                    pageSizeOptions={[10, 20, 50, 100, 200]}
                    unitText="คน"
                  />
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 🔵 VIEW 3: APPROVER VIEW (Executive Decision & Budget Summary) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {processSubTab === 'APPROVER' && (
              <div className="space-y-4">
                {/* 4 Stat Cards for Approver */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">งบประมาณเงินเดือนสุทธิรวม</span>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                      ฿{totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ภาระภาษีและประกันสังคม</span>
                    <div className="text-2xl font-bold text-rose-600 mt-1">
                      ฿{taxAndSso.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">ภ.ง.ด.1 + SSO รวม</span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">จำนวนพนักงานทั้งหมด</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {totalEmployees} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">คน</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">สถานะการตรวจทาน</span>
                    <div className="text-base font-bold text-indigo-700 mt-2">
                      {selectedPeriod?.status === 'FINANCE_VERIFIED' || selectedPeriod?.status === 'PENDING_APPROVAL'
                        ? 'รอ CEO อนุมัติ'
                        : selectedPeriod?.status === 'APPROVED'
                        ? 'อนุมัติเรียบร้อยแล้ว'
                        : selectedPeriod?.statusText}
                    </div>
                  </div>
                </div>


                {/* Table: Approver Overview */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
                  {/* Filter Toolbar */}
                  <div className="px-4 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 min-h-9">
                    <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ค้นหารหัส หรือชื่อพนักงาน..."
                          value={processSearchQuery}
                          onChange={(e) => {
                            setProcessSearchQuery(e.target.value);
                            setProcessPage(1);
                          }}
                          className="w-full h-9 pl-9 pr-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      <CustomSelect
                        value={processDeptFilter}
                        onChange={(e) => {
                          setProcessDeptFilter(String(e.target.value));
                          setProcessPage(1);
                        }}
                        placeholder="ทุกแผนก"
                        className="min-w-[150px]"
                        options={[
                          { value: 'ALL', label: 'ทุกแผนก' },
                          ...departments.map((d) => ({ value: d.departmentName, label: d.departmentName })),
                        ]}
                      />

                      {(processSearchQuery || processDeptFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setProcessSearchQuery('');
                            setProcessDeptFilter('ALL');
                            setProcessPage(1);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 cursor-pointer"
                        >
                          ล้างตัวกรอง
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                      <table className="table-standard text-xs w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 whitespace-nowrap">
                          <th className="py-3.5 px-5">รหัสพนักงาน</th>
                          <th className="py-3.5 px-5">ชื่อพนักงาน</th>
                          <th className="py-3.5 px-5">แผนก</th>
                          <th className="py-3.5 px-5 text-right">รายได้รวม</th>
                          <th className="py-3.5 px-5 text-right">รายการหัก</th>
                          <th className="py-3.5 px-5 text-right">เงินเดือนสุทธิ</th>
                          <th className="py-3.5 px-5 text-center">ดูรายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {paginatedPayrolls.map((pr) => (
                          <tr key={pr.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 px-5 font-mono font-semibold text-slate-900 dark:text-slate-100">{pr.employeeCode}</td>
                            <td className="py-4 px-5 font-semibold text-slate-900 dark:text-slate-100">{pr.employeeName}</td>
                            <td className="py-4 px-5 text-slate-600 dark:text-slate-400">{pr.departmentName}</td>
                            <td className="py-4 px-5 text-right font-mono text-slate-700 dark:text-slate-300 font-medium">
                              ฿{(pr.totalGrossIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </td>
                            <td className="py-4 px-5 text-right font-mono text-rose-600 font-medium">
                              -฿{(pr.totalDeductionAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </td>
                            <td className="py-4 px-5 text-right font-mono font-bold text-emerald-600">
                              ฿{(pr.netPayableSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-5 text-center">
                              <button
                                onClick={() => handleOpenDetailDrawer(pr)}
                                title="ดูรายละเอียด"
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                  <TablePagination
                    currentPage={safeProcessPage}
                    pageSize={processPageSize}
                    totalCount={totalProcessCount}
                    onPageChange={setProcessPage}
                    onPageSizeChange={(newSize) => {
                      setProcessPageSize(newSize);
                      setProcessPage(1);
                    }}
                    pageSizeOptions={[10, 20, 50, 100, 200]}
                    unitText="คน"
                  />
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 🟣 VIEW 4: BANK VIEW (โอนเงินธนาคาร & แนบสลิป & ปิดรอบ)        */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {processSubTab === 'BANK' && !canAccessBankView && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  ไม่มีสิทธิ์เข้าถึงขั้นตอนโอนเงินธนาคาร
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  ขั้นตอนการโอนเงินและแนบสลิปสงวนไว้สำหรับฝ่ายการเงิน (Finance) หรือผู้มีสิทธิ์โอนเงินธนาคารเท่านั้น
                </p>
                {canAccessHrView && (
                  <button
                    onClick={() => {
                      setProcessSubTab('HR');
                      setViewMode('HR');
                    }}
                    className="px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    กลับไปยังหน้าต่างฝ่ายบุคคล (HR)
                  </button>
                )}
              </div>
            )}

            {processSubTab === 'BANK' && canAccessBankView && (
              <div className="space-y-5">
                {/* บัญชีบริษัทที่ตัดจ่าย + เตือนบัญชีพนักงานที่รอยืนยัน */}
                {bankSummary && (
                  <div className="flex flex-wrap gap-3 text-xs">
                    {bankSummary.hasPayerAccount ? (
                      <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        ตัดจ่ายจากบัญชีบริษัท: <span className="font-semibold">{bankSummary.payerBankName}</span>{' '}
                        <span className="font-mono">{bankSummary.payerAccountNumber}</span>
                        {bankSummary.payerAccountName ? ` (${bankSummary.payerAccountName})` : ''}
                      </div>
                    ) : (
                      <div className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>ยังไม่ได้ตั้งบัญชีธนาคารหลักสำหรับจ่ายเงินเดือน (โครงสร้างองค์กร → บัญชีธนาคารบริษัท) — สร้างไฟล์ธนาคารไม่ได้</span>
                      </div>
                    )}
                    {(bankSummary.pendingBankChangeCount ?? 0) > 0 && (
                      <div className="px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300">
                        มีพนักงาน {bankSummary.pendingBankChangeCount} คนขอเปลี่ยนบัญชีที่ยังไม่ได้ยืนยัน — รอบนี้จะโอนเข้าบัญชีเดิม
                      </div>
                    )}
                  </div>
                )}

                {/* ── Header ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        ขั้นตอนที่ 4: โอนเงิน & ปิดรอบ
                      </div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <span>การจ่ายเงินเดือนและแนบสลิป</span>
                        {selectedPeriod && (
                          <span className="text-slate-400 font-normal">— {selectedPeriod.periodName}</span>
                        )}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        รอบ: {selectedPeriod ? `${formatThaiDateSlash(selectedPeriod.startDate)} ถึง ${formatThaiDateSlash(selectedPeriod.endDate)}` : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      {selectedPeriod?.status === 'PAID' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>จ่ายเงินเดือนเสร็จสิ้น</span>
                        </span>
                      )}
                      {selectedPeriod?.status === 'PROCESSING' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>กำลังดำเนินการจ่าย</span>
                        </span>
                      )}
                      {selectedPeriod?.status === 'APPROVED' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>CEO อนุมัติแล้ว</span>
                        </span>
                      )}
                      {selectedPeriod && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 inline-flex items-center gap-1.5">
                          <span className="text-slate-400">วิธีจ่าย:</span>
                          <span className="font-semibold">
                            {selectedPeriod.paymentMethod === 'DIRECT_TRANSFER'
                              ? 'โอนเองทีละคน'
                              : 'ส่งไฟล์ธนาคาร (Bank Batch)'}
                          </span>
                        </span>
                      )}
                      {selectedPeriod?.status === 'CLOSED' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ปิดรอบเงินเดือนเรียบร้อย</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">พนักงานที่มียอดโอน</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{transferList?.payableEmployees ?? transferList?.totalEmployees ?? 0} คน</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        (จากทั้งหมด {transferList?.totalPeriodEmployees ?? selectedPeriod?.employeeCount ?? 0} คนในรอบ)
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">โอนแล้ว</div>
                      <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{transferList?.transferredCount ?? selectedPeriod?.totalTransferredCount ?? 0} คน</div>
                      <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">แนบสลิป/บันทึกแล้ว</div>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-800/40">
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">รอโอน</div>
                      <div className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">{transferList?.pendingCount ?? Math.max(0, (transferList?.payableEmployees ?? transferList?.totalEmployees ?? selectedPeriod?.employeeCount ?? 0) - (transferList?.transferredCount ?? selectedPeriod?.totalTransferredCount ?? 0))} คน</div>
                      <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">รอดำเนินการโอน</div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-800/40">
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">รวมยอดทั้งหมด</div>
                      <div className="text-base font-bold text-blue-900 dark:text-blue-300 mt-0.5">
                        ฿{(transferList?.totalNetSalary ?? selectedPeriod?.totalNetSalary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>


                {/* ── PHASE 2a: BANK_BATCH SLIP & RECEIPT (Option 1: Compact Clean Bar) ── */}
                {selectedPeriod?.paymentMethod === 'BANK_BATCH' && selectedPeriod?.status !== 'CLOSED' && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-4">
                    {/* กรณีมีสลิปแล้ว (ทั้ง PAID และยังไม่ PAID) */}
                    {selectedPeriod?.hasBankReceipt && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/60">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">สลิป/ใบเสร็จการโอนเงินรวมของธนาคาร</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {selectedPeriod?.bankReceiptFileName || 'receipt.pdf'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleDownloadBankReceipt}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>ดาวน์โหลดสลิป</span>
                          </button>

                          {selectedPeriod?.status === 'PROCESSING_BANK' && isFinance && (
                            <button
                              type="button"
                              onClick={handleMarkPaid}
                              disabled={isConfirmingPayment}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                            >
                              {isConfirmingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              <span>ยืนยันการจ่ายเงิน (โอนสำเร็จ)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* กรณียังไม่มีสลิป และยังไม่ PAID */}
                    {!selectedPeriod?.hasBankReceipt && selectedPeriod?.status !== 'PAID' && (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              สลิป/ใบเสร็จการโอนเงินรวมของธนาคาร
                            </span>
                          </div>
                          {selectedPeriod?.status !== 'PROCESSING_BANK' && (
                            <div className="flex flex-col items-end gap-0.5">
                              {/* ต้องดาวน์โหลดไฟล์ธนาคารก่อน (backend ตรวจซ้ำ) */}
                              <button
                                type="button"
                                onClick={() => setConfirmPaymentModalOpen(true)}
                                disabled={selectedPeriod?.paymentMethod === 'BANK_BATCH' && !selectedPeriod?.bankFileGeneratedAt}
                                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>ยืนยันว่าธนาคารโอนเงินแล้ว</span>
                              </button>
                              {selectedPeriod?.paymentMethod === 'BANK_BATCH' && !selectedPeriod?.bankFileGeneratedAt && (
                                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                  ต้องกด &quot;↓ ไฟล์โอนเงินธนาคาร&quot; ก่อน จึงจะยืนยันการโอนได้
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {isFinance ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              onChange={e => setBankReceiptFile(e.target.files?.[0] || null)}
                              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0B2046] file:text-white hover:file:bg-[#112d5e] cursor-pointer"
                            />
                            {bankReceiptFile && (
                              <button
                                type="button"
                                onClick={() => handleUploadBankReceiptSubmit(true)}
                                disabled={isUploadingBankReceipt}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-all"
                              >
                                {isUploadingBankReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                <span>{isUploadingBankReceipt ? 'กำลังบันทึก...' : 'บันทึกสลิป & ยืนยันจ่ายเงิน'}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            รอฝ่ายการเงินอัปโหลดสลิป/ใบเสร็จยืนยันการโอนเงินรวมจากธนาคาร
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── รายการโอนเงินรายบุคคล (แสดงให้ตรวจสอบได้ทุกสถานะ) ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
                  {/* Header */}
                  <div className="px-4 pt-4 flex flex-wrap items-center justify-between gap-3 min-h-9">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        รายการโอนเงินรายบุคคล
                        <span className="ml-2 text-slate-400 font-normal text-xs">
                          {transferList?.transferredCount ?? 0}/{transferList?.payableEmployees ?? transferList?.totalEmployees ?? 0} คน โอนแล้ว
                        </span>
                      </h3>
                    </div>

                    {/* Action Buttons for Direct Transfer */}
                    {selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' && selectedPeriod?.status !== 'PAID' && (
                      <div className="flex items-center gap-2.5">
                        {/* Mark All Button */}
                        {(isFinance || isCEO || isAdmin) && (
                          <button
                            onClick={handleMarkAllTransferred}
                            disabled={isMarkingAllTransferred || transferList?.pendingCount === 0}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                            title="ทำเครื่องหมายว่าโอนเงินให้พนักงานทุกคนเรียบร้อยแล้วโดยไม่ต้องแนบสลิปทีละคน"
                          >
                            {isMarkingAllTransferred ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                            <span>ทำเครื่องหมายว่าโอนแล้วทุกคน</span>
                          </button>
                        )}

                        {/* Confirm Payment Button — (isFinance || isCEO || isAdmin) */}
                        {(isFinance || isCEO || isAdmin) && (
                          <button
                            onClick={() => setConfirmPaymentModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>ยืนยันการจ่ายเงินทั้งหมด</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Table */}
                  {isLoadingTransferList ? (
                    <div className="py-16 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-400 text-sm">กำลังโหลดรายการ...</span>
                    </div>
                  ) : (
                    <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                      <table className="table-standard w-full min-w-[750px] text-left border-collapse whitespace-nowrap">
                        <thead className="bg-[#0B2046] text-white font-semibold">
                          <tr className="whitespace-nowrap">
                            <th className="py-3 px-4 font-semibold">พนักงาน</th>
                            <th className="py-3 px-4 font-semibold">ธนาคาร / เลขบัญชี</th>
                            <th className="py-3 px-4 text-right font-semibold">ยอดโอน</th>
                            <th className="py-3 px-4 text-center font-semibold">Ref No.</th>
                            <th className="py-3 px-4 text-center font-semibold">สลิป</th>
                            <th className="py-3 px-4 text-center font-semibold">สถานะ</th>
                            {selectedPeriod?.status !== 'PAID' && (isCEO || isFinance || isAdmin) && (
                              <th className="py-3 px-4 text-center font-semibold">การดำเนินการ</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                          {!transferList || transferList.items.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-14 text-center text-slate-400">
                                ยังไม่มีรายการเงินเดือนในรอบนี้
                              </td>
                            </tr>
                          ) : (
                            transferList.items.map((item) => (
                              <tr key={item.payrollId} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/50 transition-colors">
                                {/* ชื่อพนักงาน */}
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900 dark:text-slate-100">{item.employeeName}</div>
                                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.employeeCode} · {item.departmentName}</div>
                                </td>
                                {/* Bank */}
                                <td className="py-3.5 px-4">
                                  {item.bankName ? (
                                    <>
                                      <div className="font-semibold text-slate-700 dark:text-slate-300">{item.bankName}</div>
                                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                                        <MaskedDataViewer value={item.accountNumber} type="bankAccount" />
                                      </div>
                                      {item.accountName && <div className="text-[11px] text-slate-400">{item.accountName}</div>}
                                    </>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400 font-medium text-[11px]">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                      <span>ไม่มีบัญชีธนาคาร</span>
                                    </span>
                                  )}
                                </td>
                                {/* ยอด */}
                                <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                                  ฿{item.netPayableSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                {/* Ref */}
                                <td className="py-3.5 px-4 text-center font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                                  {item.transferReference || '—'}
                                </td>
                                {/* Slip */}
                                <td className="py-3.5 px-4 text-center">
                                  {item.hasSlip ? (
                                    <button
                                      onClick={() => handleDownloadExistingSlip(item.payrollId, item.slipFileName || 'slip.jpg')}
                                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium text-[11px] cursor-pointer transition-colors max-w-[150px]"
                                      title={item.slipFileName || 'ดาวน์โหลด Slip'}
                                    >
                                      <Download className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{item.slipFileName || 'slip'}</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 text-[11px]">ยังไม่มีสลิป</span>
                                  )}
                                </td>
                                {/* Status Badge */}
                                <td className="py-3.5 px-4 text-center">
                                  {item.paymentStatus === 'TRANSFERRED' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                      <span>โอนแล้ว</span>
                                    </span>
                                  ) : item.paymentStatus === 'FAILED' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                                      <span>โอนไม่สำเร็จ</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                      <span>รอโอน</span>
                                    </span>
                                  )}
                                </td>
                                {/* Action */}
                                {selectedPeriod?.status !== 'PAID' && (isCEO || isFinance || isAdmin) && (
                                  <td className="py-3.5 px-4 text-center">
                                    {!item.accountNumber || !item.bankName ? (
                                      <span
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 cursor-not-allowed"
                                        title="ไม่สามารถโอนได้เนื่องจากไม่มีข้อมูลบัญชีธนาคาร"
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>รอข้อมูลบัญชี</span>
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenSlipModal(item)}
                                        disabled={isMarkingTransferred === item.payrollId}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer
                                          ${item.paymentStatus === 'TRANSFERRED'
                                            ? 'bg-slate-100 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                                            : 'bg-[#0B2046] hover:bg-[#112d5e] text-white shadow-xs'
                                          } disabled:opacity-50`}
                                      >
                                        {isMarkingTransferred === item.payrollId ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Upload className="w-3.5 h-3.5" />
                                        )}
                                        {item.paymentStatus === 'TRANSFERRED' ? (item.hasSlip ? 'อัปเดต Slip' : 'แนบ Slip ย้อนหลัง') : 'บันทึกโอนเงิน'}
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
              </>
            )}
          </div>
        );
      })()}

      {/* ── MODALS: Upload Slip & Confirm Payment (Available from Process Tab) ── */}
      {/* ── MODAL: Upload Slip + Mark Transferred ── */}
          {slipModalOpen && slipModalTarget && (
            <ModalShell className="z-50 bg-black/50 backdrop-blur-sm" innerClassName="items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-slate-500" />
                    <span>แนบสลิปการโอนเงิน</span>
                  </h3>
                  <button onClick={() => setSlipModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 cursor-pointer text-xl leading-none">×</button>
                </div>

                {/* Employee info */}
                <div className="bg-slate-50 rounded-xl p-3.5 text-sm">
                  <div className="font-bold text-slate-900 dark:text-slate-100">{slipModalTarget.employeeName}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{slipModalTarget.employeeCode} · {slipModalTarget.bankName} {slipModalTarget.accountNumber}</div>
                  <div className="text-emerald-700 font-bold mt-1">
                    ฿{slipModalTarget.netPayableSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Transfer Ref */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">เลข Reference (ไม่บังคับ)</label>
                  <input
                    type="text"
                    value={slipTransferRef}
                    onChange={e => setSlipTransferRef(e.target.value)}
                    placeholder="เช่น TH6706161234567890"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-mono"
                  />
                </div>

                {/* Slip Upload Zone */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      สลิปการโอนเงิน <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
                    </label>
                    {slipFile && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSlipFile(null); }}
                        className="text-[11px] text-rose-500 hover:text-rose-600 cursor-pointer"
                      >
                        นำไฟล์ออก
                      </button>
                    )}
                  </div>
                  <div
                    onDragOver={e => { e.preventDefault(); setSlipDragOver(true); }}
                    onDragLeave={() => setSlipDragOver(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setSlipDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleSlipFileChange(file);
                    }}
                    onClick={() => document.getElementById('slip-file-input')?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all overflow-hidden
                      ${slipDragOver ? 'border-[#0B2046] bg-blue-50' : slipFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}
                  >
                    {slipFile ? (
                      <div className="flex items-center gap-3 text-emerald-700 w-full min-w-0 px-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div className="text-left min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate" title={slipFile.name}>
                            {slipFile.name}
                          </div>
                          <div className="text-xs text-emerald-600 mt-0.5">
                            {(slipFile.size / 1024).toFixed(1)} KB · คลิกเพื่อเปลี่ยนไฟล์
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400">
                        <Upload className="w-7 h-7 mx-auto mb-2 text-slate-400" />
                        <div className="text-xs font-medium">ลาก & วาง หรือคลิกเพื่อเลือกไฟล์</div>
                        <div className="text-[11px] mt-1">JPG, PNG, WEBP, PDF · สูงสุด 10 MB (แนบหรือไม่แนบก็ได้)</div>
                      </div>
                    )}
                    <input
                      id="slip-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={e => handleSlipFileChange(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setSlipModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleMarkTransferred}
                    disabled={isMarkingTransferred !== null}
                    className="flex-1 px-4 py-2.5 bg-[#0B2046] hover:bg-[#112d5e] disabled:opacity-50 text-white rounded-xl text-sm font-bold cursor-pointer transition-all inline-flex items-center justify-center gap-2"
                  >
                    {isMarkingTransferred !== null ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>กำลังบันทึก...</span></>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /><span>บันทึกการโอน</span></>
                    )}
                  </button>
                </div>
              </div>
            </ModalShell>
          )}

          {/* ── MODAL: CEO Confirm Payment ── */}
          {confirmPaymentModalOpen && (
            <ModalShell className="z-50 bg-black/50 backdrop-blur-sm" innerClassName="items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedPeriod?.paymentMethod === 'BANK_BATCH' ? 'ยืนยันว่าธนาคารโอนเงินแล้ว' : 'ยืนยันการจ่ายเงินเดือน'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {selectedPeriod?.paymentMethod === 'BANK_BATCH'
                      ? 'ยืนยันว่าธนาคารได้โอนเงินเดือนตามไฟล์ Bank Batch เรียบร้อยแล้ว (สถานะจะเปลี่ยนเป็น ส่งโอนธนาคารแล้ว เพื่อให้ฝ่ายการเงินตรวจสลิป)'
                      : `ยืนยันว่าโอนเงินเดือนให้พนักงานครบ ${transferList?.totalEmployees} คน เรียบร้อยแล้ว`}
                  </p>
                </div>

                {isFuturePeriod(selectedPeriod) && (
                  <div className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2 leading-relaxed">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>แจ้งเตือน: รอบเงินเดือนนี้เป็นงวดล่วงหน้าในอนาคต (เกินเดือนปัจจุบัน) กรุณาตรวจสอบความถูกต้องอย่างละเอียดก่อนยืนยัน</span>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">รอบเงินเดือน</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedPeriod?.periodName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">วิธีการจ่าย</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedPeriod?.paymentMethodText ?? (selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' ? 'โอนเงินโดยตรง' : 'ส่งไฟล์ธนาคาร (Bank Batch)')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">จำนวนพนักงาน</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{transferList?.totalEmployees ?? selectedPeriod?.employeeCount} คน</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">รวมเงินที่จ่าย</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-base">
                      ฿{(transferList?.totalNetSalary ?? selectedPeriod?.totalNetSalary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">หมายเหตุ (ไม่บังคับ)</label>
                  <textarea
                    value={confirmPaymentNote}
                    onChange={e => setConfirmPaymentNote(e.target.value)}
                    placeholder="เช่น โอนเงินเดือนประจำเดือนกันยายน 2569..."
                    rows={2}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setConfirmPaymentModalOpen(false); setConfirmPaymentNote(''); }}
                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' ? handleConfirmPayment : handleConfirmBankTransfer}
                    disabled={isConfirmingPayment}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isConfirmingPayment ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>กำลังยืนยัน...</span></>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /><span>{selectedPeriod?.paymentMethod === 'BANK_BATCH' ? 'ยืนยันว่าธนาคารโอนเงินแล้ว' : 'ยืนยันการจ่ายเงิน'}</span></>
                    )}
                  </button>
                </div>
              </div>
            </ModalShell>
          )}


      {/* === TAB: ภาษี (ตารางขั้นบันได) — ประกันสังคมย้ายไปตั้งที่รายการ "เงินสมทบประกันสังคม" === */}
      {activeTab === 'tax-sso' && (
        <div className="space-y-6">
          {/* Top Header */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              อัตราภาษีเงินได้บุคคลธรรมดา
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              แบบขั้นบันได (ภ.ง.ด. 8 ขั้น) · ใช้คำนวณภาษีหัก ณ ที่จ่ายในการประมวลเงินเดือน
            </p>
          </div>

          {/* 4 Summary Stat Cards (Solid Panel Theme Colors matching previous tabs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: จำนวนขั้นภาษี (Solid Blue Panel) */}
            <div className="bg-blue-100/60 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/80 p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold">จำนวนขั้นภาษี</span>
                  <div className="text-2xl font-bold text-blue-950 dark:text-white tracking-tight">
                    {taxBrackets.length || 8}{' '}
                    <span className="text-sm font-normal text-blue-700 dark:text-blue-300">ขั้น</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-800/60 text-xs text-blue-700/80 dark:text-blue-300 font-medium">
                <span>คำนวณแบบขั้นบันได ภ.ง.ด.</span>
              </div>
            </div>

            {/* Card 2: เงินได้สุทธิที่ยกเว้นภาษี (Solid Emerald Panel) */}
            <div className="bg-emerald-100/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 p-5 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">เงินได้สุทธิที่ยกเว้นภาษี</span>
                  <div className="text-2xl font-bold text-emerald-950 dark:text-white tracking-tight font-mono">
                    ฿{(taxBrackets.find((b) => b.taxRate === 0)?.incomeTo ?? 150000).toLocaleString()}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-700/80 dark:text-emerald-300 font-medium">
                <span>อัตราภาษี 0% (ขั้นแรก)</span>
              </div>
            </div>

            {/* Card 3: อัตราสูงสุด (Solid Amber Panel) */}
            <div className="bg-amber-100/60 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/80 p-5 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">อัตราภาษีสูงสุด</span>
                  <div className="text-2xl font-bold text-amber-950 dark:text-white tracking-tight font-mono">
                    {(Math.max(0, ...taxBrackets.map((b) => b.taxRate)) * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/60 text-xs text-amber-700/80 dark:text-amber-300 font-medium">
                <span>เพดานอัตราภาษีสูงสุด</span>
              </div>
            </div>

            {/* Card 4: สถานะการใช้งาน (Solid Purple Panel) */}
            <div className="bg-purple-100/60 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/80 p-5 shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold">สถานะการใช้งาน</span>
                  <div className="text-2xl font-bold text-purple-950 dark:text-white tracking-tight font-mono">
                    {taxBrackets.filter((b) => (b.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length} / {taxBrackets.length || 8}{' '}
                    <span className="text-sm font-normal text-purple-700 dark:text-purple-300 font-sans">ขั้นใช้งาน</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-200/60 dark:border-purple-800/60 flex items-center justify-between text-xs text-purple-700/80 dark:text-purple-300 font-medium">
                <span>พร้อมคำนวณในระบบ</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-purple-200/80 dark:border-purple-800/80 shadow-2xs">
                  เปิดใช้งานครบ
                </span>
              </div>
            </div>
          </div>

          {/* Main Card: Tax Bracket Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-9">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ตารางอัตราภาษีรายขั้น
              </h2>

              <div className="flex items-center gap-2">
                {canEditTax ? (
                  <button
                    type="button"
                    onClick={() => setIsTaxModalOpen(true)}
                    className="h-9 inline-flex items-center gap-2 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไขอัตราภาษี</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                    <Lock className="w-3.5 h-3.5" />
                    สิทธิ์ดูอย่างเดียว
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="table-standard w-full min-w-[860px] text-left border-collapse text-xs whitespace-nowrap">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr className="whitespace-nowrap">
                    <th className="py-3 px-4 font-semibold">ขั้นเงินได้</th>
                    <th className="py-3 px-4 text-right font-semibold">เงินได้สุทธิตั้งแต่</th>
                    <th className="py-3 px-4 text-right font-semibold">ถึงเงินได้สุทธิ</th>
                    <th className="py-3 px-4 text-left pl-6 font-semibold">อัตราภาษี</th>
                    <th className="py-3 px-4 text-right font-semibold">ภาษีสะสมขั้นก่อนหน้า</th>
                    <th className="py-3 px-4 text-center font-semibold">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                  {taxBrackets.map((t, idx) => {
                    const stepNum = idx + 1;
                    // สีขั้นไล่จากฟ้าอ่อน → กรมท่า ตามลำดับขั้นจริง (จำนวนขั้นเท่าไรก็ได้ ขั้นสุดท้ายเข้มสุดเสมอ)
                    const shade = taxBrackets.length > 1 ? idx / (taxBrackets.length - 1) : 1;
                    const lightness = Math.round(90 - shade * 72); // 90% → 18%
                    const pillStyle: React.CSSProperties = {
                      backgroundColor: `hsl(220 ${Math.round(85 - shade * 15)}% ${lightness}%)`,
                      color: lightness > 62 ? '#1e3a8a' : '#ffffff',
                    };
                    // ความยาวหลอดเทียบกับอัตราสูงสุดในตาราง (เดิมเทียบ 35% ตายตัว — อัตราที่สูงกว่าเต็มหลอดเท่ากันหมด)
                    const maxRate = Math.max(0, ...taxBrackets.map((b) => b.taxRate));
                    const progressPercent = maxRate > 0 ? Math.min(100, Math.max(0, (t.taxRate / maxRate) * 100)) : 0;
                    const isExempt = t.taxRate === 0;
                    const titleText = isExempt
                      ? `ขั้นที่ ${stepNum} · ยกเว้นภาษี`
                      : `ขั้นที่ ${stepNum} · ภาษี ${(t.taxRate * 100).toFixed(0)}%`;
                    const subText =
                      t.incomeTo != null
                        ? `เงินได้สุทธิ ${t.incomeFrom.toLocaleString()} – ${t.incomeTo.toLocaleString()} บาท`
                        : `เงินได้สุทธิ ${t.incomeFrom.toLocaleString()} บาทขึ้นไป`;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0" style={pillStyle}>
                              {stepNum}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {titleText}
                              </div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                                {subText}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                          ฿{t.incomeFrom.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                          {t.incomeTo != null
                            ? `฿${t.incomeTo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : 'ขึ้นไป (ไม่จำกัด)'}
                        </td>
                        <td className="py-3 px-4 pl-6">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 font-bold text-blue-600 dark:text-blue-400 font-mono text-xs">
                              {(t.taxRate * 100).toFixed(0)}%
                            </span>
                            <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                          ฿{t.baseTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                              (t.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                (t.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            {(t.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ได้ใช้งาน'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    {/* Modals */}
      <SalaryStructureModal
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        onSuccess={() => {}}
        structure={selectedStructure}
        positions={positions}
        levels={levels}
        onSubmit={handleSaveStructure}
      />

      <PayrollItemModal
        isOpen={isPayrollItemModalOpen}
        onClose={() => setIsPayrollItemModalOpen(false)}
        item={selectedPayrollItem}
        allItems={payrollItems}
        taxBrackets={taxBrackets}
        ssoRates={ssoRates}
        canEditTaxSso={canEditTax || canEditSso}
        onEditSsoRate={(rate) => {
          setSelectedSsoRate(rate);
          setIsSsoModalOpen(true);
        }}
        onSaveSsoRate={async (payload, id) => {
          if (id) await salaryService.updateSocialSecurityRate(id, payload);
          else await salaryService.createSocialSecurityRate(payload);
          setSsoRates(await salaryService.getSocialSecurityRates());
        }}
        defaultType={itemsSubTab}
        onSubmit={handleSaveItem}
      />

      <TaxBracketModal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        brackets={taxBrackets}
        onSave={handleSaveTaxBrackets}
        onResetDefault={handleResetTaxBrackets}
        isLoading={isSavingTax}
      />

      <SocialSecurityRateModal
        isOpen={isSsoModalOpen}
        onClose={() => setIsSsoModalOpen(false)}
        rate={selectedSsoRate}
        onSave={handleSaveSsoRate}
        onResetDefault={handleResetSsoRates}
        isLoading={isSavingSso}
      />

      <AdjustSalaryModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        employee={selectedEmployeeForAdjust}
        onSubmit={handleSaveAdjustSalary}
      />

      <SalaryHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        employee={selectedEmployeeForHistory}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบโครงสร้างเงินเดือน"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบโครงสร้างเงินเดือนของ "${
          structureToDelete?.levelName || structureToDelete?.positionName || 'ระดับนี้'
        }" ออกจากระบบ?`}
        confirmText="ลบโครงสร้าง"
        cancelText="ยกเลิก"
        type="danger"
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={deleteItemConfirmOpen}
        onClose={() => setDeleteItemConfirmOpen(false)}
        onConfirm={handleConfirmDeleteItem}
        title="ยืนยันการลบรายการ"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบรายการ "${
          itemToDelete?.itemName || 'รายการนี้'
        }" ออกจากระบบ?`}
        confirmText="ลบรายการ"
        cancelText="ยกเลิก"
        type="danger"
        isLoading={isDeletingItem}
      />



      {/* Slide-Over Drawer: รายละเอียดสลิปเงินเดือนรายบุคคล (payroll_detail) */}
      <PayrollDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        record={selectedPayrollRecord}
        canEdit={canAccessHrView && (selectedPeriod?.status === 'DRAFT' || selectedPeriod?.status === 'REVIEW')}
        payrollItems={payrollItems}
        onChanged={() => {
          refreshSelectedPeriodPayrolls();
          // อาจมีหัวข้อรายการใหม่ที่เพิ่มระหว่างประมวลผล
          salaryService.getPayrollItems().then(setPayrollItems).catch(() => {});
        }}
      />

      {/* Confirm Modal: ไม่อนุมัติและส่งคืนรอบเงินเดือนให้ HR แก้ไข */}
      <ConfirmModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectPeriodStatus}
        title="ยืนยันไม่อนุมัติและส่งคืนรอบเงินเดือน?"
        message="รอบเงินเดือนนี้จะถูกส่งคืนให้ฝ่าย HR ทำการตรวจสอบและปรับแก้ไขข้อมูลใหม่ (สถานะจะเปลี่ยนกลับเป็น 'รอตรวจสอบ')"
        confirmText="ส่งคืนให้ HR แก้ไข"
        cancelText="ยกเลิก"
        type="danger"
      />


      {/* Confirm Modal: ลบรอบเงินเดือน (เฉพาะสถานะ DRAFT หรือ REVIEW) */}
      <ConfirmModal
        isOpen={deletePeriodConfirmOpen}
        onClose={() => setDeletePeriodConfirmOpen(false)}
        onConfirm={handleDeletePeriod}
        title="ยืนยันการลบรอบเงินเดือน?"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบ "${selectedPeriod?.periodName}" ออกจากระบบ? ข้อมูลเงินเดือน รายการคำนวณ และสลิปทั้งหมดของพนักงานในรอบนี้จะถูกลบทิ้งอย่างถาวร`}
        confirmText="ลบรอบเงินเดือน"
        cancelText="ยกเลิก"
        type="danger"
        isLoading={isDeletingPeriod}
      />

      {/* Modal: รายการรอบเงินเดือนทั้งหมด */}
      {isAllPeriodsModalOpen && (
        <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B2046]/10 text-[#0B2046] dark:text-blue-400 dark:bg-blue-900/30 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">รอบเงินเดือนทั้งหมด</h3>
              </div>
              <div className="flex items-center gap-2">
                {canAccessHrView && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAllPeriodsModalOpen(false);
                      handleCreatePeriodFromProcessTab();
                    }}
                    className="h-8.5 inline-flex items-center gap-1 px-3 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>สร้างรอบใหม่</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAllPeriodsModalOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Table of all periods */}
            <div className="overflow-y-auto p-6 space-y-4">
              {periods.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">ยังไม่มีรอบเงินเดือนในระบบ</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    คุณสามารถสร้างรอบการคำนวณเงินเดือนแรกได้ทันที
                  </p>
                  {canAccessHrView && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAllPeriodsModalOpen(false);
                        handleCreatePeriodFromProcessTab();
                      }}
                      className="px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>สร้างรอบเงินเดือนใหม่</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                  <table className="table-standard w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400">
                        <th className="py-3 px-4">รอบเงินเดือน</th>
                        <th className="py-3 px-4">ช่วงเวลาคำนวณ</th>
                        <th className="py-3 px-4">กำหนดวันจ่าย</th>
                        <th className="py-3 px-4 text-center">จำนวนพนักงาน</th>
                        <th className="py-3 px-4 text-right">ยอดรวมสุทธิ</th>
                        <th className="py-3 px-4 text-center">สถานะ</th>
                        <th className="py-3 px-4 text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                      {periods.map((p) => {
                        const isCurrent = selectedPeriod?.id === p.id;
                        const today = new Date();
                        const isCurrentMonthPeriod = p.year === today.getFullYear() && p.month === (today.getMonth() + 1);
                        return (
                          <tr
                            key={p.id}
                            className={`hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors ${
                              isCurrent ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px]">
                                  {p.periodName}
                                </span>
                                {isCurrentMonthPeriod && (
                                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                    ปัจจุบัน
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                ปี {p.year + 543} / เดือน {p.month}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {formatThaiDateSlash(p.startDate)} - {formatThaiDateSlash(p.endDate)}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {p.paymentDate ? formatThaiDateSlash(p.paymentDate) : '-'}
                            </td>
                            <td className="py-3 px-4 text-center font-semibold">
                              {p.employeeCount != null ? `${p.employeeCount} คน` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              {p.totalNetSalary != null ? `฿${p.totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  p.status === 'CLOSED'
                                    ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                    : p.status === 'PAID'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                    : p.status === 'APPROVED'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                    : p.status === 'SUBMITTED_TO_FINANCE' || p.status === 'FINANCE_VERIFIED'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                }`}
                              >
                                {p.statusText || p.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {canViewProcess && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handlePeriodChange(p.id);
                                      setActiveTab('process');
                                      setIsAllPeriodsModalOpen(false);
                                    }}
                                    className="px-2.5 py-1 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                                    title="เปิดดูและประมวลผลรอบนี้"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>เปิดดู</span>
                                  </button>
                                )}
                                {(p.status === 'DRAFT' || p.status === 'REVIEW') && canAccessHrView && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPeriod(p);
                                      setDeletePeriodConfirmOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="ลบรอบนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/80 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAllPeriodsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Modal: บันทึกโบนัสเข้าสู่งวดเงินเดือน (Apply Bonus to Payroll Period) */}
      {isApplyBonusModalOpen && (
        <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">บันทึกโบนัสเข้าสู่งวดเงินเดือน</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">นำยอดโบนัสที่จัดสรรไปรวมจ่ายกับเงินเดือนประจำรอบ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyBonusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl text-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>ระบบคำนวณภาษีและเงินได้สุทธิให้อัตโนมัติ</span>
                </div>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  ยอดโบนัสของพนักงานแต่ละคนจะถูกบันทึกเป็นรายการได้ <strong>"เงินโบนัส"</strong> ในงวดที่เลือก พร้อมทั้งคำนวณภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และปรับยอดเงินได้สุทธิให้อัตโนมัติทันที
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ใส่งวดเงินเดือนเป้าหมายที่ต้องการนำโบนัสไปรวมจ่าย:
                </label>
                <CustomSelect
                  value={selectedTargetPeriodId || ''}
                  onChange={(e) => setSelectedTargetPeriodId(parseInt(e.target.value) || null)}
                  numbered={false}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium cursor-pointer"
                >
                  <option value="">-- เลือกงวดเงินเดือน --</option>
                  {periods.filter((p) => p.status === 'DRAFT' || p.status === 'REVIEW').map((p) => {
                    const statusLabel = p.status === 'REVIEW' ? 'คำนวณแล้ว (รอตรวจสอบ)' : 'ร่าง';
                    return (
                      <option key={p.id} value={p.id}>
                        {p.periodName} - สถานะ: {statusLabel}
                      </option>
                    );
                  })}
                </CustomSelect>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  แสดงเฉพาะงวดที่ยังแก้ไขได้ (ร่าง / รอตรวจสอบ) — ถ้าโบนัสเดือนเดียวกับงวด ระบบจะดึงเข้างวดให้เองตอนกดคำนวณเงินเดือน
                  ปุ่มนี้ใช้เมื่อต้องการจ่ายโบนัสในงวดของเดือนอื่น หรือให้คำนวณงวดใหม่ทันที
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>รอบโบนัสที่จัดสรร:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{THAI_MONTH_NAMES[bonusMonth - 1]} พ.ศ. {bonusYear + 543}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>จำนวนพนักงานที่จะบันทึก:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{bonuses.length} คน</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>ยอดเงินโบนัสรวมที่จะนำส่ง:</span>
                  <span className="font-bold text-amber-900 dark:text-amber-400 font-mono text-sm">
                    ฿{bonuses.reduce((sum, b) => sum + bonusDisplayAmount(b), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsApplyBonusModalOpen(false)}
                  disabled={isApplyingBonus}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApplyBonusToPeriod}
                  disabled={isApplyingBonus || !selectedTargetPeriodId}
                  className="px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#112d5e] disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isApplyingBonus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isApplyingBonus ? 'กำลังบันทึกและคำนวณ...' : 'ยืนยันบันทึกเข้างวดเงินเดือน'}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

