'use client';

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
  AlertTriangle,
  X,
  ArrowDownToLine,
  FileText,
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
import { AdjustSalaryModal } from '@/components/payroll/AdjustSalaryModal';
import { SalaryHistoryModal } from '@/components/payroll/SalaryHistoryModal';
import { PayrollDetailDrawer } from '@/components/payroll/PayrollDetailDrawer';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { confirmAction } from '@/lib/sweetalert';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { PayrollViewSwitcher, PayrollViewMode } from '@/components/payroll/PayrollViewSwitcher';
import { MaskedDataViewer } from '@/components/common/MaskedDataViewer';

type ActiveTab =
  | 'overview'
  | 'periods'
  | 'structures'
  | 'items'
  | 'bonus'
  | 'process'
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

/** รายการหลักที่ลบไม่ได้ (แก้ไข/ปิดใช้งานได้ตามปกติ): เงินเดือนพื้นฐาน, เงินประจำตำแหน่ง */
const UNDELETABLE_ITEM_CODES = ['INC_BASE', 'INC_POSITION'];

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
    if (tabParam && ['overview', 'periods', 'structures', 'items', 'bonus', 'process', 'tax-sso'].includes(tabParam)) {
      return tabParam;
    }
    return 'overview';
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
    } else if (tabParam && ['overview', 'periods', 'structures', 'items', 'bonus', 'process', 'tax-sso'].includes(tabParam)) {
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
  const [selectedYearFilter, setSelectedYearFilter] = useState<number>(() => new Date().getFullYear());
  const [periodsTabYearFilter, setPeriodsTabYearFilter] = useState<string>('ALL');
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
      if (isCEO || (canAccessApproverView && !canAccessHrView)) {
        setProcessSubTab('APPROVER');
        setViewMode('ALL');
      } else if (canAccessFinanceView && !canAccessHrView) {
        setProcessSubTab('FINANCE');
        setViewMode('FINANCE');
      } else if (canAccessApproverView) {
        setProcessSubTab('APPROVER');
        setViewMode('ALL');
      } else if (canAccessFinanceView) {
        setProcessSubTab('FINANCE');
        setViewMode('FINANCE');
      } else if (canAccessHrView) {
        setProcessSubTab('HR');
        setViewMode('HR');
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
    setIsPeriodNameCustom(false);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const defaults = getDefaultPeriodValues(currentYear, currentMonth);
    setNewPeriodForm({
      year: currentYear,
      month: currentMonth,
      periodName: defaults.periodName,
      startDate: defaults.startDate,
      endDate: defaults.endDate,
      paymentDate: defaults.paymentDate,
      claimCutoffDate: '',
    });
    setIsCreatePeriodModalOpen(true);
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
  const [expandedBonusPeriodKey, setExpandedBonusPeriodKey] = useState<string | null>(null);
  const [expandedBonuses, setExpandedBonuses] = useState<EmployeeBonus[]>([]);
  const [isExpandedBonusLoading, setIsExpandedBonusLoading] = useState<boolean>(false);
  const [expandedBonusSearchQuery, setExpandedBonusSearchQuery] = useState<string>('');
  const [bonusYear, setBonusYear] = useState<number>(2026);
  const [bonusMonth, setBonusMonth] = useState<number>(12);
  const [bonusMultiplierInput, setBonusMultiplierInput] = useState<number>(1.5);
  const [isCalculatingBonus, setIsCalculatingBonus] = useState<boolean>(false);
  const [isSavingBonus, setIsSavingBonus] = useState<boolean>(false);
  const [bonusSearchTerm, setBonusSearchTerm] = useState<string>('');
  const [bonusDeptFilter, setBonusDeptFilter] = useState<string>('ALL');
  const [bonusCurrentPage, setBonusCurrentPage] = useState<number>(1);
  const [bonusPageSize, setBonusPageSize] = useState<number>(10);
  const [isApplyBonusModalOpen, setIsApplyBonusModalOpen] = useState<boolean>(false);
  const [selectedTargetPeriodId, setSelectedTargetPeriodId] = useState<number | null>(null);
  const [isApplyingBonus, setIsApplyingBonus] = useState<boolean>(false);
  const [isSavingExpandedBonus, setIsSavingExpandedBonus] = useState<boolean>(false);

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

  // Dynamic fetch when switching to Bank Transfer or Tax/SSO tab
  useEffect(() => {
    if (!selectedPeriod) {
      setTransferList(null);
      setBankSummary(null);
      setTaxSsoSummary(null);
      return;
    }

    if (activeTab === 'bank-transfer' || (activeTab === 'process' && processSubTab === 'BANK')) {
      loadTransferList(selectedPeriod.id);
      loadBankTransfer(selectedPeriod.id, selectedBankFilter);
    } else if (activeTab === 'tax-sso') {
      loadTaxSsoSummary(selectedPeriod.id);
    }
  }, [activeTab, processSubTab, selectedPeriod, selectedBankFilter]);

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
    } catch (err) {
      console.error('Failed to load bonuses:', err);
    }
  };

  const handleToggleExpandBonusPeriod = async (year: number, month: number) => {
    const key = `${year}-${month}`;
    if (expandedBonusPeriodKey === key) {
      setExpandedBonusPeriodKey(null);
      setExpandedBonuses([]);
      setExpandedBonusSearchQuery('');
      return;
    }

    try {
      setExpandedBonusPeriodKey(key);
      setIsExpandedBonusLoading(true);
      setExpandedBonusSearchQuery('');
      const data = await salaryService.getEmployeeBonuses(year, month, true);
      // แสดงเฉพาะพนักงานที่บันทึกโบนัสในรอบนั้นจริง
      setExpandedBonuses(data || []);
    } catch (err) {
      console.error('Failed to load expanded bonuses:', err);
      setExpandedBonuses([]);
    } finally {
      setIsExpandedBonusLoading(false);
    }
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
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปโหลดสลิปธนาคาร');
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
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะเป็นโอนสำเร็จ (PAID)');
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

  const handleSetPaymentMethod = async (method: 'BANK_BATCH' | 'DIRECT_TRANSFER') => {
    if (!selectedPeriod) return;
    setIsSettingPaymentMethod(true);
    try {
      const updated = await salaryService.setPaymentMethod(selectedPeriod.id, { paymentMethod: method });
      setSelectedPeriod(updated);
      setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      await loadTransferList(selectedPeriod.id);
      showToast(`เลือกวิธีการจ่ายเงิน: ${method === 'BANK_BATCH' ? 'ส่งไฟล์ธนาคาร' : 'CEO โอนเอง'}`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการตั้งค่าวิธีการจ่ายเงิน');
    } finally {
      setIsSettingPaymentMethod(false);
    }
  };

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
    if (!selectedPeriod || !slipModalTarget || !slipFile) {
      showToast('กรุณาแนบสลิปการโอนเงิน');
      return;
    }
    setIsMarkingTransferred(slipModalTarget.payrollId);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:xxx/xxx;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(slipFile);
      });

      await salaryService.markTransferred(selectedPeriod.id, slipModalTarget.payrollId, {
        transferReference: slipTransferRef.trim() || undefined,
        slipFileName: slipFile.name,
        slipContentType: slipFile.type,
        slipBase64: base64,
      });

      setSlipModalOpen(false);
      setSlipFile(null);
      setSlipModalTarget(null);
      await loadTransferList(selectedPeriod.id);
      const updatedPeriod = await salaryService.getPayrollPeriodById(selectedPeriod.id);
      setSelectedPeriod(updatedPeriod);
      setPeriods(prev => prev.map(p => (p.id === updatedPeriod.id ? updatedPeriod : p)));
      showToast('✅ บันทึกการโอนเงินและสลิปสำเร็จ');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกการโอนเงิน');
    } finally {
      setIsMarkingTransferred(null);
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
      const blob = await salaryService.exportBankTransferFile(selectedPeriod.id, bankCode);
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
  const handleExportTaxSsoCsv = (type: 'PND1' | 'SSO') => {
    if (!taxSsoSummary || !taxSsoSummary.items || taxSsoSummary.items.length === 0) {
      showToast('ไม่มีข้อมูลสรุปภาษี/ประกันสังคมในรอบนี้');
      return;
    }

    let csvContent = '';
    if (type === 'PND1') {
      csvContent = 'ลำดับ,รหัสพนักงาน,ชื่อพนักงาน,เลขประจำตัวประชาชน,รายได้รวม (บาท),ภาษีหัก ณ ที่จ่าย (บาท)\n';
      taxSsoSummary.items.forEach((item, idx) => {
        const gross = item.totalGrossIncome ?? item.grossIncome ?? 0;
        const tax = item.withholdingTax ?? item.pnd1Tax ?? 0;
        csvContent += `${idx + 1},"${item.employeeCode}","${item.employeeName}","${item.citizenId || ''}",${gross},${tax}\n`;
      });
    } else {
      csvContent = 'ลำดับ,รหัสพนักงาน,ชื่อพนักงาน,เลขประจำตัวประชาชน,ฐานค่าจ้าง,สมทบฝ่ายผู้ประกันตน (5%),สมทบฝ่ายนายจ้าง (5%),รวมเงินสมทบ\n';
      taxSsoSummary.items.forEach((item, idx) => {
        const gross = item.totalGrossIncome ?? item.grossIncome ?? 0;
        const ssoEmp = item.ssoEmployeeContribution ?? item.ssoEmployee ?? 0;
        const ssoComp = item.ssoEmployerContribution ?? item.ssoEmployer ?? 0;
        const totalSso = ssoEmp + ssoComp;
        csvContent += `${idx + 1},"${item.employeeCode}","${item.employeeName}","${item.citizenId || ''}",${gross},${ssoEmp},${ssoComp},${totalSso}\n`;
      });
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'PND1' ? `PND1_Tax_Report_P${taxSsoSummary.periodId}.csv` : `SSO_1_10_Report_P${taxSsoSummary.periodId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast(`ส่งออกไฟล์รายงาน ${type === 'PND1' ? 'ภ.ง.ด.1' : 'สปส. 1-10'} สำเร็จเรียบร้อย`);
  };

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
  const handleCalculateBonusesSubmit = async () => {
    try {
      setIsCalculatingBonus(true);
      const res = await salaryService.calculateEmployeeBonuses({
        year: bonusYear,
        month: bonusMonth,
        defaultMultiplier: bonusMultiplierInput,
      });
      setBonuses(res || []);
      await loadBonusPeriods();
      showToast(`คำนวณและจัดสรรโบนัสประจำรอบ ${bonusMonth}/${bonusYear + 543} (ตัวคูณ ${bonusMultiplierInput} เท่า) สำเร็จ`);
    } catch (err: any) {
      console.error('Failed to calculate bonuses:', err);
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการคำนวณโบนัส');
    } finally {
      setIsCalculatingBonus(false);
    }
  };

  const handleBonusMultiplierChange = (employeeId: number, newMultiplier: number) => {
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
    setBonuses((prev) =>
      prev.map((b) => (b.employeeId === employeeId ? { ...b, note } : b))
    );
  };

  const handleSaveBonuses = async () => {
    if (bonuses.length === 0) {
      showToast('ไม่มีข้อมูลโบนัสสำหรับบันทึก');
      return;
    }
    try {
      setIsSavingBonus(true);
      const payload: SaveEmployeeBonusesPayload = {
        year: bonusYear,
        month: bonusMonth,
        calculationMode: 'MANUAL',
        items: bonuses.map((b) => ({
          employeeId: b.employeeId,
          bonusAmount: b.bonusAmount,
          multiplier: b.multiplier,
          note: b.note || undefined,
        })),
      };
      const saved = await salaryService.saveEmployeeBonuses(payload);
      setBonuses(saved || []);
      await loadBonusPeriods();
      showToast(`บันทึกการจัดสรรโบนัสรอบ ${bonusMonth}/${bonusYear + 543} สำเร็จ (${bonuses.length} รายการ - ระบบจะดึงไปคำนวณในรอบเงินเดือนให้อัตโนมัติ)`);
    } catch (err: any) {
      console.error('Failed to save bonuses:', err);
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโบนัส');
    } finally {
      setIsSavingBonus(false);
    }
  };

  const handleExpandedBonusMultiplierChange = (employeeId: number, newMultiplier: number) => {
    setExpandedBonuses((prev) =>
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

  const handleExpandedBonusAmountChange = (employeeId: number, newAmount: number) => {
    setExpandedBonuses((prev) =>
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

  const handleExpandedBonusNoteChange = (employeeId: number, note: string) => {
    setExpandedBonuses((prev) =>
      prev.map((b) => (b.employeeId === employeeId ? { ...b, note } : b))
    );
  };

  const handleSaveExpandedBonuses = async (year: number, month: number) => {
    if (expandedBonuses.length === 0) return;
    try {
      setIsSavingExpandedBonus(true);
      const payload: SaveEmployeeBonusesPayload = {
        year,
        month,
        calculationMode: 'MANUAL',
        items: expandedBonuses.map((b) => ({
          employeeId: b.employeeId,
          bonusAmount: b.bonusAmount,
          multiplier: b.multiplier,
          note: b.note || undefined,
        })),
      };
      await salaryService.saveEmployeeBonuses(payload);
      await loadBonusPeriods();
      const refreshed = await salaryService.getEmployeeBonuses(year, month, true);
      setExpandedBonuses(refreshed || []);
      if (bonusYear === year && bonusMonth === month) {
        loadBonuses(year, month);
      }
      const totalAmount = expandedBonuses.reduce((sum, b) => sum + (b.bonusAmount || 0), 0);
      showToast(`บันทึกการแก้ไขโบนัสรอบ ${THAI_MONTH_NAMES[month - 1] || month} ${year + 543} สำเร็จ (ยอดรวม ฿${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
    } catch (err: any) {
      console.error('Failed to save expanded bonuses:', err);
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกโบนัส');
    } finally {
      setIsSavingExpandedBonus(false);
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
    const matchingPeriod = periods.find((p) => p.year === bonusYear && p.month === bonusMonth);
    setSelectedTargetPeriodId(matchingPeriod ? matchingPeriod.id : (selectedPeriod?.id || (periods[0]?.id ?? null)));
    setIsApplyBonusModalOpen(true);
  };

  const handleConfirmApplyBonusToPeriod = async () => {
    if (!selectedTargetPeriodId) {
      showToast('กรุณาเลือกงวดเงินเดือนที่ต้องการนำโบนัสไปรวมจ่าย');
      return;
    }
    try {
      setIsApplyingBonus(true);
      await salaryService.saveEmployeeBonuses({
        year: bonusYear,
        month: bonusMonth,
        calculationMode: 'MANUAL',
        items: bonuses.map((b) => ({
          employeeId: b.employeeId,
          bonusAmount: b.bonusAmount,
          multiplier: b.multiplier,
          note: b.note || undefined,
        })),
      });

      const res = await salaryService.addBonusPayout(selectedTargetPeriodId, bonusYear, bonusMonth);
      const targetPeriod = periods.find((p) => p.id === selectedTargetPeriodId);
      showToast(`บันทึกโบนัสเข้าสู่งวด ${targetPeriod?.periodName || ''} สำเร็จ (${res.addedCount} คน รวม ฿${(res.addedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
      setIsApplyBonusModalOpen(false);

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
    const inYear = periods.filter((p) => p.year === targetYear).sort((a, b) => a.month - b.month);
    if (inYear.length > 0) {
      const target = inYear.find((p) => p.status !== 'CLOSED') || inYear[inYear.length - 1];
      handlePeriodChange(target.id);
    } else {
      setSelectedPeriod(null);
      setPayrolls([]);
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
    if (!selectedPeriod) return;
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
      nextStatus = 'CLOSED';
      actionToast = 'ปิดรอบเงินเดือนสำเร็จ';
    } else {
      return;
    }

    try {
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

      const updatedPeriods = await salaryService.getPayrollPeriods();
      setPeriods(updatedPeriods || []);
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
      const updatedPeriods = await salaryService.getPayrollPeriods();
      setPeriods(updatedPeriods || []);
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
      const [pRows, updatedPeriods] = await Promise.all([
        salaryService.getPayrollsByPeriod(selectedPeriod.id),
        salaryService.getPayrollPeriods(),
      ]);
      setPayrolls(pRows || []);
      setPeriods(updatedPeriods || []);
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
      const updatedPeriods = await salaryService.getPayrollPeriods();
      setPeriods(updatedPeriods || []);
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
        return 'โครงสร้างเงินเดือน';
      case 'items':
        return 'รายได้และรายหัก';
      case 'bonus':
        return 'โบนัส';
      case 'process':
        return 'ประมวลเงินเดือน';
      case 'bank-transfer':
        return 'โอนเงินธนาคาร';
      case 'tax-sso':
        return 'ภาษี & ประกันสังคม';
    }
  }

  // Filtered Payroll Items
  const filteredPayrollItems = payrollItems.filter((i) => i.itemType === itemsSubTab);

  // Dynamic subNavTabs based on user permissions
  const visibleNavTabs: { id: ActiveTab; label: string }[] = [
    ...(canViewOverview ? [{ id: 'overview' as ActiveTab, label: 'ภาพรวม' }] : []),
    ...(canViewPeriods ? [{ id: 'periods' as ActiveTab, label: 'รอบเงินเดือน' }] : []),
    ...(canViewStructures ? [{ id: 'structures' as ActiveTab, label: 'โครงสร้างเงินเดือน' }] : []),
    ...(canViewItems ? [{ id: 'items' as ActiveTab, label: 'รายได้และรายหัก' }] : []),
    ...(canViewBonus ? [{ id: 'bonus' as ActiveTab, label: 'โบนัส' }] : []),
    ...(canViewProcess ? [{ id: 'process' as ActiveTab, label: 'ประมวลเงินเดือน' }] : []),
    ...(canViewTaxSso ? [{ id: 'tax-sso' as ActiveTab, label: 'ภาษี & ประกันสังคม' }] : []),
  ];

  // Auto switch tab if current active tab is not in visible permitted tabs
  useEffect(() => {
    if (visibleNavTabs.length > 0 && !visibleNavTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleNavTabs[0].id);
    }
  }, [visibleNavTabs, activeTab]);

  // สถานะโบนัส (ไม่มีขั้นอนุมัติโบนัสแยก — อนุมัติรวมที่รอบเงินเดือน)
  const renderBonusStatusBadge = (b: EmployeeBonus) => {
    const periodLabel = b.payoutPeriodMonth && b.payoutPeriodYear
      ? ` ${THAI_MONTH_NAMES[b.payoutPeriodMonth - 1] || b.payoutPeriodMonth} ${b.payoutPeriodYear + 543}`
      : '';
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

      {/* === TAB 1: ภาพรวม (Overview) - Matches uploaded screenshot exactly === */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* 4 Summary Stat Cards in Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: ยอดเงินเดือนรวมเดือนนี้ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-xs hover:border-slate-200 dark:hover:border-slate-600 transition-all flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ยอดเงินเดือนรวมเดือนนี้</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {overview ? `฿${(overview.currentMonthTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-400 dark:text-slate-400">
                <span>{overview?.currentMonthPeriod || '-'}</span>
              </div>
            </div>

            {/* Card 2: พนักงานที่คำนวณแล้ว */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-xs hover:border-slate-200 dark:hover:border-slate-600 transition-all flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">พนักงานที่คำนวณแล้ว</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {overview ? `${overview.calculatedEmployeesCount}/${overview.totalEmployeesCount}` : '-'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100/90 dark:bg-slate-700/80 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400 dark:text-slate-400">
                <span>ความคืบหน้า</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  คิดเป็น {overview?.calculatedPercentage ?? 0}%
                </span>
              </div>
            </div>

            {/* Card 3: รอตรวจสอบ/อนุมัติ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-xs hover:border-slate-200 dark:hover:border-slate-600 transition-all flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">รอตรวจสอบ/อนุมัติ</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {overview ? `${overview.pendingApprovalCount} คน` : '-'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-400 dark:text-slate-400">
                <span>ต้องดำเนินการก่อนปิดรอบ</span>
              </div>
            </div>

            {/* Card 4: กำหนดปิดรอบถัดไป */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-xs hover:border-slate-200 dark:hover:border-slate-600 transition-all flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">กำหนดปิดรอบถัดไป</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {overview?.nextClosingDate || '-'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100/90 dark:bg-slate-700/80 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs flex items-center justify-between">
                <span className="text-slate-400">สถานะกำหนดการ</span>
                <span className={`font-semibold ${
                  overview?.remainingDays != null && overview.remainingDays < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : overview?.remainingDays === 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {overview?.remainingDays != null
                    ? overview.remainingDays < 0
                      ? `เลยกำหนด ${Math.abs(overview.remainingDays)} วัน`
                      : overview.remainingDays === 0
                      ? 'ครบกำหนดวันนี้'
                      : `เหลืออีก ${overview.remainingDays} วัน`
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: รอบเงินเดือนล่าสุด */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">รอบเงินเดือนล่าสุด</h2>
              {canViewPeriods && (
                <button
                  type="button"
                  onClick={() => setActiveTab('periods')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <span>ดูทั้งหมด</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(!overview?.recentPeriods || overview.recentPeriods.length === 0) ? (
              <div className="py-8 text-center">
                <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">ยังไม่มีรอบเงินเดือนในระบบ</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {overview.recentPeriods.map((p, idx) => {
                  const targetPeriod = periods.find(x => p.periodName.includes(x.periodName) || x.periodName.includes(p.periodName));
                  const canNavigate = canViewProcess || canViewPeriods;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (!canNavigate) return;
                        if (canViewProcess && targetPeriod) {
                          handlePeriodChange(targetPeriod.id);
                          setActiveTab('process');
                        } else if (canViewPeriods) {
                          setIsAllPeriodsModalOpen(true);
                        }
                      }}
                      className={`py-4 flex items-center justify-between text-sm px-2 rounded-xl transition-colors ${
                        canNavigate ? 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30 cursor-pointer group' : 'cursor-default'
                      }`}
                      title={canNavigate ? 'คลิกเพื่อเปิดดูรายละเอียดรอบนี้' : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-slate-800 dark:text-slate-200 ${canNavigate ? 'group-hover:text-[#0B2046] dark:group-hover:text-blue-400 transition-colors' : ''}`}>
                          {p.periodName}
                        </span>
                      </div>
                      <div className="flex items-center gap-8">
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          ฿{p.totalAmount.toLocaleString()}
                        </span>
                        <span
                          className={`inline-flex items-center px-3.5 py-1 rounded-xl text-xs font-semibold min-w-[90px] justify-center ${
                            p.status === 'PENDING_REVIEW' || p.status === 'REVIEW'
                              ? 'bg-[#FEECE5] text-[#EA580C] border border-[#FDBA74]/40 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : p.status === 'CLOSED'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                              : 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC]/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {p.statusText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
                  <table className="table-standard text-xs w-full min-w-[750px] text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 whitespace-nowrap">
                        <th className="py-3.5 px-4">รหัส / ชื่อพนักงาน</th>
                        <th className="py-3.5 px-4">แผนก / ตำแหน่ง</th>
                        <th className="py-3.5 px-4 text-right">ฐานเงินเดือนปัจจุบัน</th>
                        <th className="py-3.5 px-4 text-center">วันที่มีผล</th>
                        <th className="py-3.5 px-4">กรอบเงินเดือนอ้างอิง</th>
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
                            <td className="py-3.5 px-4 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {emp.currentEffectiveFrom || '-'}
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
              <button
                onClick={handleOpenCreateItem}
                className="h-9 inline-flex items-center gap-1.5 px-4 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-medium shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{itemsSubTab === 'EARNING' ? 'เพิ่มรายการรายได้' : 'เพิ่มรายการรายหัก'}</span>
              </button>
            )}
            </div>

            <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="table-standard text-xs w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    <th className="py-3.5 px-5">รายการ</th>
                    <th className="py-3.5 px-5">ประเภทการคำนวณ</th>
                    <th className="py-3.5 px-5">ค่า / สูตร</th>
                    <th className="py-3.5 px-5 text-center">คิดภาษี</th>
                    <th className="py-3.5 px-5 text-center">คิดประกันสังคม</th>
                    <th className="py-3.5 px-5">สถานะ</th>
                    <th className="py-3.5 px-5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPayrollItems
                    .map((item) => {
                      const isItemActive = item.status ? item.status.toUpperCase() === 'ACTIVE' : true;
                      const calcTypeLabel =
                        item.calculationType === 'FIXED'
                          ? 'จำนวนคงที่'
                          : item.calculationType === 'FORMULA'
                          ? 'สูตรคำนวณ'
                          : 'กำหนดเอง';

                      const getTemplateBadge = (tplCode?: string | null) => {
                        switch (tplCode) {
                          case 'BASE_SALARY':
                            return { label: 'ฐานเงินเดือน', color: 'bg-blue-50 text-blue-700 border-blue-200' };
                          case 'POSITION_ALLOWANCE':
                            return { label: 'ค่าตำแหน่งจากโครงสร้างเงินเดือน', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };

                          case 'PERCENT_SALES':
                            return { label: 'คอมมิชชั่น % ยอดขาย', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
                          case 'DILIGENT_ALLOWANCE':
                            return { label: 'เบี้ยขยัน (เงื่อนไขขาด/สาย/ลา)', color: 'bg-teal-50 text-teal-800 border-teal-200' };
                          case 'PRORATED_DAYS':
                            return { label: 'สัดส่วนวันทำงานจริง', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
                          case 'MANUAL_BONUS':
                            return { label: 'โบนัสพิเศษ / Incentive', color: 'bg-pink-50 text-pink-800 border-pink-200' };
                          case 'SSO_STANDARD':
                            return { label: 'ประกันสังคม 5% (สูงสุด 875)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
                          case 'TAX_STANDARD':
                            return { label: 'ภ.ง.ด. 91 ขั้นบันได 8 ขั้น', color: 'bg-rose-50 text-rose-700 border-rose-200' };
                          case 'LATE_ABSENT':
                            return { label: 'หักตามเวลาสาย/ขาดจริง', color: 'bg-orange-50 text-orange-800 border-orange-200' };
                          case 'PERCENT_SALARY':
                            return { label: 'PVD / % เงินเดือน', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                          case 'STAFF_LOAN':
                            return { label: 'หักเงินกู้ยืมสวัสดิการ', color: 'bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200' };
                          case 'CUSTOM_FORMULA':
                            return { label: 'สูตรกำหนดเอง', color: 'bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200' };
                          default:
                            return null;
                        }
                      };
                      const templateBadge = item.calculationType === 'FORMULA' ? getTemplateBadge(item.formulaTemplate) : null;

                      const fixedNumber = item.calculationType === 'FIXED' && item.formulaValue && !isNaN(Number(item.formulaValue))
                        ? Number(item.formulaValue)
                        : null;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{item.itemName}</div>
                            {item.description && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                            )}
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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              item.calculationType === 'FORMULA'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : item.calculationType === 'FIXED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {calcTypeLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            {item.calculationType === 'FORMULA' ? (
                              <div className="flex flex-col items-start gap-1">
                                {templateBadge && (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${templateBadge.color}`}>
                                    {templateBadge.label}
                                  </span>
                                )}
                                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                  {item.formulaValue || '-'}
                                </span>
                              </div>
                            ) : item.calculationType === 'FIXED' ? (
                              <div className="flex items-center gap-1.5">
                                {fixedNumber !== null ? (
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                                    ฿{fixedNumber.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                    {item.formulaValue || '-'}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-normal">(ยอดคงที่)</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                                {item.formulaValue || 'กำหนดตามจริงรายงวด'}
                              </span>
                            )}
                          </td>
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
                          <td className="py-3.5 px-5">
                            {isItemActive ? (
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
                          <td className="py-3.5 px-5 text-center">
                            {canEditItem ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditItem(item)}
                                  title="แก้ไข"
                                  className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {!UNDELETABLE_ITEM_CODES.includes(item.itemCode) && (
                                  <button
                                    onClick={() => {
                                      setItemToDelete(item);
                                      setDeleteItemConfirmOpen(true);
                                    }}
                                    title="ลบ"
                                    className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
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

      {/* === TAB: รอบเงินเดือน (Payroll Periods List) === */}
      {activeTab === 'periods' && (() => {
        const availableYears = Array.from(
          new Set([new Date().getFullYear(), ...periods.map((p) => p.year).filter(Boolean)])
        ).sort((a, b) => b - a);

        const filteredPeriodsTabRows = periodsTabYearFilter === 'ALL'
          ? periods
          : periods.filter((p) => p.year === Number(periodsTabYearFilter));

        const totalPeriodsCount = filteredPeriodsTabRows.length;
        const totalPeriodsPages = Math.max(1, Math.ceil(totalPeriodsCount / periodsTabPageSize));
        const safePeriodsPage = Math.min(Math.max(1, periodsTabPage), totalPeriodsPages);
        const startPeriodsIdx = (safePeriodsPage - 1) * periodsTabPageSize;
        const paginatedPeriodsTabRows = filteredPeriodsTabRows.slice(startPeriodsIdx, startPeriodsIdx + periodsTabPageSize);

        return (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
              {/* Toolbar — ตำแหน่ง/ความสูงเดียวกับแท็บอื่น */}
              <div className="flex flex-wrap items-center justify-end gap-3 px-4 pt-4 min-h-9">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="w-36">
                    <CustomSelect
                      value={periodsTabYearFilter}
                      onChange={(e) => {
                        setPeriodsTabYearFilter(String(e.target.value));
                        setPeriodsTabPage(1);
                      }}
                      numbered={false}
                      className="w-full"
                      title="กรองตามปี"
                    >
                      <option value="ALL">ปีทั้งหมด</option>
                      {availableYears.map((y) => (
                        <option key={y} value={String(y)}>ปี {y + 543}</option>
                      ))}
                    </CustomSelect>
                  </div>
                  {canAccessHrView && (
                    <button
                      type="button"
                      onClick={handleOpenCreatePeriodModal}
                      className="h-9 inline-flex items-center gap-1.5 px-4 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>สร้างรอบเงินเดือน</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Table Content */}
              <div className="p-4">
                {filteredPeriodsTabRows.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center mb-3">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">ไม่พบรอบเงินเดือนตามตัวกรอง</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      คุณสามารถเปลี่ยนตัวกรองปี หรือสร้างรอบการคำนวณเงินเดือนใหม่ได้ทันที
                    </p>
                    {canAccessHrView && (
                      <button
                        type="button"
                        onClick={handleOpenCreatePeriodModal}
                        className="px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>สร้างรอบเงินเดือนใหม่</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
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
                          {paginatedPeriodsTabRows.map((p) => {
                          const isCurrent = selectedPeriod?.id === p.id;
                          const today = new Date();
                          const isCurrentMonthPeriod = p.year === today.getFullYear() && p.month === (today.getMonth() + 1);
                          return (
                            <React.Fragment key={p.id}>
                              <tr
                              key={p.id}
                              className={`hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors ${
                                isCurrent ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                              }`}
                            >
                              <td className="py-3.5 px-4">
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
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {formatThaiDateSlash(p.startDate)} - {formatThaiDateSlash(p.endDate)}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {p.paymentDate ? formatThaiDateSlash(p.paymentDate) : '-'}
                              </td>
                              <td className="py-3.5 px-4 text-center font-semibold whitespace-nowrap">
                                {p.employeeCount != null ? `${p.employeeCount} คน` : '-'}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {p.totalNetSalary != null ? `฿${p.totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
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
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleExpandPeriod(p.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                      expandedPeriodId === p.id
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-[#0B2046] hover:bg-[#112d5e] text-white'
                                    }`}
                                    title={expandedPeriodId === p.id ? 'ปิดการแสดงข้อมูล' : 'เปิดดูข้อมูลเงินเดือนของรอบนี้'}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{expandedPeriodId === p.id ? 'ซ่อน' : 'เปิดดู'}</span>
                                  </button>
                                  {p.status !== 'CLOSED' && canAccessHrView && (
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
                            {/* Expanded Row: ข้อมูลรายการเงินเดือนในรอบนี้ */}
                            {expandedPeriodId === p.id && (
                              <tr key={`expanded-${p.id}`} className="bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                                <td colSpan={7} className="p-4 sm:p-6">
                                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
                                    {/* Expanded Header */}
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/80">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                                          <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <span>รายการเงินเดือน: {p.periodName}</span>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                              {expandedPayrolls.length} รายการ
                                            </span>
                                          </h4>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="relative">
                                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                          <input
                                            type="text"
                                            value={expandedSearchQuery}
                                            onChange={(e) => setExpandedSearchQuery(e.target.value)}
                                            placeholder="ค้นหาชื่อหรือรหัสพนักงาน..."
                                            className="h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-60"
                                          />
                                        </div>
                                        {canViewProcess && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handlePeriodChange(p.id);
                                              setActiveTab('process');
                                            }}
                                            className="h-8 inline-flex items-center gap-1 px-3 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                            title="ไปที่หน้าประมวลผลเงินเดือนรอบนี้"
                                          >
                                            <span>ไปที่หน้าประมวลผล</span>
                                            <ArrowRight className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Expanded Body */}
                                    {isExpandedLoading ? (
                                      <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                                        <span className="text-xs">กำลังโหลดข้อมูลรายการเงินเดือน...</span>
                                      </div>
                                    ) : expandedPayrolls.length === 0 ? (
                                      <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                                        ยังไม่มีข้อมูลพนักงานที่คำนวณในรอบนี้
                                      </div>
                                    ) : (
                                      <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto max-h-[380px] overflow-y-auto">
                                        <table className="table-standard w-full text-left border-collapse text-xs">
                                          <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-xs z-10">
                                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                                              <th className="py-2.5 px-4">พนักงาน</th>
                                              <th className="py-2.5 px-4">แผนก</th>
                                              <th className="py-2.5 px-4 text-right">รายได้รวม</th>
                                              <th className="py-2.5 px-4 text-right">รายการหัก</th>
                                              <th className="py-2.5 px-4 text-right">เงินเดือนสุทธิ</th>
                                              <th className="py-2.5 px-4 text-center">สถานะ</th>
                                              <th className="py-2.5 px-4 text-center">ดูสลิป/รายละเอียด</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                                            {expandedPayrolls
                                              .filter((pr) => {
                                                if (!expandedSearchQuery.trim()) return true;
                                                const q = expandedSearchQuery.toLowerCase();
                                                return (
                                                  (pr.employeeName && pr.employeeName.toLowerCase().includes(q)) ||
                                                  (pr.employeeCode && pr.employeeCode.toLowerCase().includes(q)) ||
                                                  (pr.departmentName && pr.departmentName.toLowerCase().includes(q))
                                                );
                                              })
                                              .map((pr) => {
                                                const gross = pr.totalGrossIncome ?? 0;
                                                const deductions = pr.totalDeductionAmount ?? 0;
                                                const net = pr.netPayableSalary ?? (gross - deductions);
                                                return (
                                                  <tr key={pr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="py-2.5 px-4 whitespace-nowrap">
                                                      <div className="font-semibold text-slate-900 dark:text-slate-100">{pr.employeeName}</div>
                                                      <div className="font-mono text-slate-400 text-[10px]">{pr.employeeCode}</div>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                      {pr.departmentName || '-'}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap text-emerald-600 dark:text-emerald-400 font-semibold">
                                                      ฿{gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap text-rose-600 dark:text-rose-400">
                                                      ฿{deductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                                                      ฿{net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                      <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                          pr.status === 'TRANSFERRED' || pr.status === 'PAID'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                                            : pr.status === 'CALCULATED'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                        }`}
                                                      >
                                                        {pr.status === 'TRANSFERRED' || pr.status === 'PAID'
                                                          ? 'โอนแล้ว'
                                                          : pr.status === 'CALCULATED'
                                                          ? 'คำนวณแล้ว'
                                                          : 'รอคำนวณ'}
                                                      </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                      <button
                                                        type="button"
                                                        onClick={() => handleOpenDetailDrawer(pr)}
                                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                                                        title="ดูรายละเอียดสลิปเงินเดือน"
                                                      >
                                                        <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                        <span>รายละเอียด</span>
                                                      </button>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredPeriodsTabRows.length > 0 && (
              <TablePagination
                currentPage={safePeriodsPage}
                pageSize={periodsTabPageSize}
                totalCount={totalPeriodsCount}
                onPageChange={setPeriodsTabPage}
                onPageSizeChange={(newSize) => {
                  setPeriodsTabPageSize(newSize);
                  setPeriodsTabPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100, 200]}
                unitText="รอบ"
              />
            )}
          </div>
        </div>
      );
    })()}

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
              {bonusPills}

              {/* Compact Toolbar: Month, Year, Search, Dept, Multiplier & Actions */}
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 min-h-9">
                {/* Left: Controls & Filters */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
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
                      buttonClassName="font-bold text-slate-800 dark:text-slate-100 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300 h-9"
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
                      buttonClassName="font-bold text-slate-800 dark:text-slate-100 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300 h-9"
                    >
                      {[2024, 2025, 2026, 2027].map((yr) => (
                        <option key={yr} value={yr}>
                          ปี {yr + 543}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>

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
                      className="w-full h-9 pl-9 pr-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200"
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

                  {/* Base Multiplier & Calculate Button */}
                  {canCalculateBonus && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 h-9 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">คูณ:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={bonusMultiplierInput}
                        onChange={(e) => setBonusMultiplierInput(parseFloat(e.target.value) || 0)}
                        className="w-12 text-center font-mono font-bold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCalculateBonusesSubmit}
                        disabled={isCalculatingBonus}
                        className="h-7 px-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="คำนวณและจัดสรรโบนัส"
                      >
                        {isCalculatingBonus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>คำนวณ</span>
                      </button>
                    </div>
                  )}

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
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {canEditBonus && (
                    <button
                      type="button"
                      onClick={handleSaveBonuses}
                      disabled={bonuses.length === 0 || isSavingBonus}
                      className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSavingBonus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>บันทึก</span>
                    </button>
                  )}

                  {canApproveBonus && (
                    <button
                      type="button"
                      onClick={handleOpenApplyBonusModal}
                      disabled={bonuses.length === 0}
                      className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-[#0B2046] hover:bg-[#112d5e] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5 text-blue-200" />
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
                                    ? 'กดปุ่ม "คำนวณและจัดสรรโบนัส" เพื่อประมวลผลโบนัสตามฐานเงินเดือน'
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
                                <td className="py-3 px-3.5 text-right font-mono text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
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
                                        className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg text-center font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                                      />
                                      <span className="text-[11px] text-slate-400 font-semibold">x</span>
                                    </div>
                                  ) : (
                                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{b.multiplier}x</span>
                                  )}
                                </td>
                                {/* Bonus Amount */}
                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                  {canEditBonus && b.status !== 'PAID' ? (
                                    <div className="inline-flex items-center justify-end gap-1">
                                      <span className="text-slate-400 text-xs">฿</span>
                                      <input
                                        type="number"
                                        step="100"
                                        min="0"
                                        value={b.bonusAmount}
                                        onChange={(e) => handleBonusAmountChange(b.employeeId, parseFloat(e.target.value))}
                                        className="w-28 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-lg text-right font-mono font-bold text-amber-900 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                                      />
                                    </div>
                                  ) : (
                                    <span className="font-mono font-bold text-amber-900 dark:text-amber-400">
                                      ฿{(b.bonusAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </td>
                                {/* Status */}
                                <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                  {renderBonusStatusBadge(b)}
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
                              const isExpanded = expandedBonusPeriodKey === rowKey;

                              return (
                                <React.Fragment key={rowKey}>
                                  <tr
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
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        ปี พ.ศ. {bp.year + 543} / เดือน {THAI_MONTH_NAMES[bp.month - 1] || bp.month}
                                      </span>
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
                                        onClick={() => handleToggleExpandBonusPeriod(bp.year, bp.month)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs ${
                                          isExpanded
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                            : 'bg-[#0B2046] hover:bg-[#112d5e] text-white'
                                        }`}
                                        title={isExpanded ? 'ปิดการแสดงข้อมูล' : 'เปิดดูข้อมูลโบนัสรายบุคคลของรอบนี้'}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>{isExpanded ? 'ซ่อน' : 'เปิดดู'}</span>
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Expanded Row: ข้อมูลพนักงานและยอดโบนัสที่ได้รับในรอบนี้ */}
                                  {isExpanded && (
                                    <tr className="bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                                      <td colSpan={7} className="p-4 sm:p-6">
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
                                          {/* Expanded Header */}
                                          {(() => {
                                            const currentExpandedSum = expandedBonuses.reduce((sum, b) => sum + (b.bonusAmount || 0), 0);
                                            const currentExpandedAvgMult = expandedBonuses.length > 0
                                              ? Math.round((expandedBonuses.reduce((sum, b) => sum + (b.multiplier || 0), 0) / expandedBonuses.length) * 100) / 100
                                              : 0;
                                            const hasEditableInExpanded = expandedBonuses.some((b) => b.status !== 'PAID');
                                            const inPayrollCountInExpanded = expandedBonuses.filter((b) => b.status === 'IN_PAYROLL' || b.status === 'PAID').length;

                                            return (
                                              <>
                                                <div className="p-4 border-b border-slate-100 dark:border-slate-700/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/80">
                                                  <div className="flex flex-wrap items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                                                      <Users className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                                                        <span>รายการโบนัสรายบุคคล: {bp.periodName}</span>
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                          {expandedBonuses.length} รายการ
                                                        </span>
                                                      </h4>
                                                    </div>

                                                    {/* Live Summary Pills */}
                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                      <span className="px-2.5 py-1 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 font-mono font-bold">
                                                        ยอดรวม: ฿{currentExpandedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                      </span>
                                                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[11px] font-semibold">
                                                        ตัวคูณเฉลี่ย: {currentExpandedAvgMult}x
                                                      </span>
                                                      <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                                                        เข้างวดแล้ว: {inPayrollCountInExpanded} / {expandedBonuses.length} คน
                                                      </span>
                                                    </div>
                                                  </div>

                                                  {/* Expanded Action Buttons */}
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <div className="relative">
                                                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                                      <input
                                                        type="text"
                                                        value={expandedBonusSearchQuery}
                                                        onChange={(e) => setExpandedBonusSearchQuery(e.target.value)}
                                                        placeholder="ค้นหาชื่อหรือรหัส..."
                                                        className="h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
                                                      />
                                                    </div>

                                                    {canEditBonus && hasEditableInExpanded && (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleSaveExpandedBonuses(bp.year, bp.month)}
                                                        disabled={isSavingExpandedBonus}
                                                        className="h-8 inline-flex items-center gap-1 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                                                        title="บันทึกยอดโบนัสที่แก้ไข"
                                                      >
                                                        {isSavingExpandedBonus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                        <span>{isSavingExpandedBonus ? 'กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}</span>
                                                      </button>
                                                    )}

                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setBonusYear(bp.year);
                                                        setBonusMonth(bp.month);
                                                        loadBonuses(bp.year, bp.month);
                                                        setBonusSubTab('CALCULATE');
                                                      }}
                                                      className="h-8 inline-flex items-center gap-1 px-3 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                                      title="ไปที่หน้าคำนวณและปรับแก้โบนัสรอบนี้"
                                                    >
                                                      <span>ไปที่หน้าคำนวณรอบนี้</span>
                                                      <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Expanded Body */}
                                                {isExpandedBonusLoading ? (
                                                  <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                                                    <span className="text-xs">กำลังโหลดข้อมูลโบนัสรายบุคคล...</span>
                                                  </div>
                                                ) : expandedBonuses.length === 0 ? (
                                                  <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                                                    ยังไม่มีข้อมูลพนักงานที่ได้รับโบนัสในรอบนี้
                                                  </div>
                                                ) : (
                                                  <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto max-h-[380px] overflow-y-auto">
                                                    <table className="table-standard w-full text-left border-collapse text-xs">
                                                      <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-xs z-10">
                                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                                                          <th className="py-2.5 px-4">พนักงาน</th>
                                                          <th className="py-2.5 px-4">แผนก / ตำแหน่ง</th>
                                                          <th className="py-2.5 px-4 text-right">ฐานเงินเดือน</th>
                                                          <th className="py-2.5 px-4 text-center">ตัวคูณ (เท่า)</th>
                                                          <th className="py-2.5 px-4 text-right font-bold">ยอดโบนัส (บาท)</th>
                                                          <th className="py-2.5 px-4 text-center">สถานะ</th>
                                                          <th className="py-2.5 px-4">หมายเหตุ</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                                                        {expandedBonuses
                                                          .filter((b) => {
                                                            if (!expandedBonusSearchQuery.trim()) return true;
                                                            const q = expandedBonusSearchQuery.toLowerCase();
                                                            return (
                                                              (b.employeeName && b.employeeName.toLowerCase().includes(q)) ||
                                                              (b.employeeCode && b.employeeCode.toLowerCase().includes(q)) ||
                                                              (b.departmentName && b.departmentName.toLowerCase().includes(q)) ||
                                                              (b.positionName && b.positionName.toLowerCase().includes(q))
                                                            );
                                                          })
                                                          .map((b) => {
                                                            const isRowEditable = canEditBonus && b.status !== 'PAID';

                                                            return (
                                                              <tr key={b.employeeId} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
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
                                                                  {isRowEditable ? (
                                                                    <div className="inline-flex items-center justify-center gap-1">
                                                                      <input
                                                                        type="number"
                                                                        step="0.05"
                                                                        min="0"
                                                                        max="100"
                                                                        value={b.multiplier}
                                                                        onChange={(e) => handleExpandedBonusMultiplierChange(b.employeeId, parseFloat(e.target.value))}
                                                                        className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg text-center font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                                                                      />
                                                                      <span className="text-[11px] text-slate-400 font-semibold">x</span>
                                                                    </div>
                                                                  ) : (
                                                                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{b.multiplier}x</span>
                                                                  )}
                                                                </td>
                                                                {/* Bonus Amount */}
                                                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                                                  {isRowEditable ? (
                                                                    <div className="inline-flex items-center justify-end gap-1">
                                                                      <span className="text-slate-400 text-xs">฿</span>
                                                                      <input
                                                                        type="number"
                                                                        step="100"
                                                                        min="0"
                                                                        value={b.bonusAmount}
                                                                        onChange={(e) => handleExpandedBonusAmountChange(b.employeeId, parseFloat(e.target.value))}
                                                                        className="w-28 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-lg text-right font-mono font-bold text-amber-900 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                                                                      />
                                                                    </div>
                                                                  ) : (
                                                                    <span className="font-mono font-bold text-amber-900 dark:text-amber-400">
                                                                      ฿{(b.bonusAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                  )}
                                                                </td>
                                                                {/* Status */}
                                                                <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                                  {renderBonusStatusBadge(b)}
                                                                </td>
                                                                {/* Note */}
                                                                <td className="py-2 px-3 whitespace-nowrap">
                                                                  {isRowEditable ? (
                                                                    <input
                                                                      type="text"
                                                                      placeholder="หมายเหตุ..."
                                                                      value={b.note || ''}
                                                                      onChange={(e) => handleExpandedBonusNoteChange(b.employeeId, e.target.value)}
                                                                      className="w-36 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                  ) : (
                                                                    <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                                                                      {b.note || '-'}
                                                                    </span>
                                                                  )}
                                                                </td>
                                                              </tr>
                                                            );
                                                          })}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
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
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
        );
      })()}

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

        return (
          <div className="space-y-4">
            {/* ── TOP PERIOD SELECTOR & ACTIONS BAR (จัดเรียง 2 ชั้นเป็นระเบียบ) ── */}
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

                  {/* 1. ตัวเลือกรอบเดือน (เลือกเดือนก่อน) */}
                  <div className="relative inline-block">
                    {periodsInSelectedYear.length > 0 ? (
                      <CustomSelect
                        value={selectedPeriod?.id || periodsInSelectedYear[0].id}
                        onChange={(e) => handlePeriodChange(Number(e.target.value))}
                        numbered={false}
                        size="sm"
                        className="min-w-[130px] sm:min-w-[150px]"
                        buttonClassName="font-bold text-slate-800 dark:text-slate-100 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        title="เลือกรอบเดือน"
                      >
                        {periodsInSelectedYear.map((p) => (
                          <option key={p.id} value={p.id} className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">
                            {THAI_MONTH_NAMES[p.month - 1] || p.periodName} {p.status === 'CLOSED' ? '(ปิดรอบแล้ว)' : ''}
                          </option>
                        ))}
                      </CustomSelect>
                    ) : (
                      <div className="px-3 py-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>ไม่มีรอบในเดือนนี้</span>
                      </div>
                    )}
                  </div>

                  {/* 2. ตัวเลือกปี พ.ศ. (เลือกปีตามหลัง) */}
                  <div className="relative inline-block">
                    <CustomSelect
                      value={activeYear}
                      onChange={(e) => handleYearFilterChange(Number(e.target.value))}
                      numbered={false}
                      size="sm"
                      className="w-28 sm:w-32"
                      buttonClassName="font-bold text-slate-800 dark:text-slate-100 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      title="เลือกปีรอบเงินเดือน"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y} className="text-slate-900 dark:text-slate-100 dark:bg-slate-800">
                          ปี {y + 543}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>

                  {/* สถานะรอบ */}
                  {selectedPeriod && (
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
                  )}
                  {isFuturePeriod(selectedPeriod) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      งวดล่วงหน้า (อนาคต)
                    </span>
                  )}
                  {(!isAdmin && [canAccessHrView, canAccessFinanceView, canAccessApproverView, canAccessBankView].filter(Boolean).length <= 1) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                      {processSubTab === 'HR' && 'ฝ่ายบุคคล (HR)'}
                      {processSubTab === 'FINANCE' && 'ฝ่ายการเงิน (Finance)'}
                      {processSubTab === 'APPROVER' && 'ผู้บริหาร (CEO / Approver)'}
                      {processSubTab === 'BANK' && 'โอนเงินธนาคาร (Bank Transfer)'}
                    </span>
                  )}
                </div>

                {/* Right: Period Management CRUD Buttons (สร้างรอบ / ลบรอบ) */}
                {processSubTab === 'HR' && canAccessHrView && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleOpenCreatePeriodModal}
                      className="h-9 inline-flex items-center gap-1.5 px-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>สร้างรอบเงินเดือน</span>
                    </button>

                    {(selectedPeriod?.status === 'REVIEW' || selectedPeriod?.status === 'DRAFT') && (
                      <button
                        onClick={() => setDeletePeriodConfirmOpen(true)}
                        disabled={!selectedPeriod || isDeletingPeriod}
                        className="h-9 inline-flex items-center gap-1.5 px-3 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                        title="ลบรอบเงินเดือนนี้ออกจากระบบ"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>ลบรอบเงินเดือน</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── TIER 2: Period Info Badges (Left) & Workflow Actions (Right) ── */}
              <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-700/60 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                {/* Left: Structured Info Pill Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* ช่วงเงินเดือน */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>ช่วงเงินเดือน:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {selectedPeriod
                        ? `${formatThaiShortDate(selectedPeriod.startDate)} - ${formatThaiShortDate(selectedPeriod.endDate)}`
                        : '-'}
                    </span>
                  </div>

                  {/* วันจ่ายเงิน */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                    <Banknote className="w-3.5 h-3.5 text-slate-400" />
                    <span>วันจ่ายเงิน:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatThaiShortDate(selectedPeriod?.paymentDate)}
                    </span>
                  </div>

                  {/* ตัดรอบเงินเบิก */}
                  {selectedPeriod && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>ตัดรอบเงินเบิก:</span>
                      {claimCutoffEditing ? (
                        <div className="inline-flex items-center gap-1.5">
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
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {selectedPeriod.effectiveClaimCutoffDate ? formatThaiShortDate(selectedPeriod.effectiveClaimCutoffDate) : '-'}
                            {!selectedPeriod.claimCutoffDate && ' (วันจ่ายเงิน)'}
                          </span>
                          {(isHR || isAdmin) && !['APPROVED', 'PROCESSING', 'PAID', 'CLOSED'].includes(selectedPeriod.status) && (
                            <button
                              type="button"
                              onClick={() => {
                                setClaimCutoffDraft(selectedPeriod.claimCutoffDate || selectedPeriod.effectiveClaimCutoffDate || '');
                                setClaimCutoffEditing(true);
                              }}
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              แก้ไข
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* พนักงานในรอบ */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>พนักงานในรอบ:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{payrolls.length} คน</span>
                  </div>

                  {/* โบนัสประจำรอบ (ถ้ามี - ดึงคำนวณอัตโนมัติ) */}
                  {(() => {
                    const currentPeriodBonus = bonusPeriods.find(
                      (bp) => bp.year === selectedPeriod?.year && bp.month === selectedPeriod?.month
                    );
                    if (!currentPeriodBonus || currentPeriodBonus.totalBonusAmount <= 0) return null;
                    return (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300">
                        <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>โบนัสประจำรอบ:</span>
                        <span className="font-semibold font-mono">
                          ฿{currentPeriodBonus.totalBonusAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal">
                          ({currentPeriodBonus.totalEmployees || currentPeriodBonus.approvedCount || 0} คน • รวมอัตโนมัติ)
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Right: Contextual Workflow Actions (คำนวณ, ส่งการเงิน, อนุมัติ ฯลฯ) */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {processSubTab === 'HR' && canAccessHrView && (
                    <>
                      {/* คำนวณเงินเดือน (ดึงโบนัสอัตโนมัติ) */}
                      <button
                        onClick={handleCalculatePayroll}
                        disabled={
                          isCalculating ||
                          !selectedPeriod ||
                          (selectedPeriod?.status !== 'DRAFT' && selectedPeriod?.status !== 'REVIEW')
                        }
                        className="h-9 inline-flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isCalculating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Scale className="w-3.5 h-3.5" />
                        )}
                        <span>{isCalculating ? 'กำลังคำนวณ...' : 'คำนวณเงินเดือน'}</span>
                      </button>

                      {/* ส่งให้ฝ่ายการเงิน */}
                      {(selectedPeriod?.status === 'REVIEW' || selectedPeriod?.status === 'DRAFT') && (
                        payrolls.length > 0 && payrolls.some(p => p.status === 'CALCULATED' || (p.netPayableSalary != null && p.netPayableSalary > 0)) ? (
                          <button
                            onClick={handleSubmitToFinance}
                            className="h-9 inline-flex items-center gap-1.5 px-4 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>ส่งให้ฝ่ายการเงินตรวจสอบ</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-not-allowed opacity-80"
                            title="กรุณากดคำนวณเงินเดือนก่อนส่งการเงิน"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>ส่งให้การเงิน (ต้องคำนวณก่อน)</span>
                          </button>
                        )
                      )}
                    </>
                  )}

                  {processSubTab === 'FINANCE' && (
                    <>
                      {selectedPeriod?.status === 'SUBMITTED_TO_FINANCE' && (
                        <button
                          onClick={handleVerifyByFinance}
                          className="h-9 inline-flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>การเงินยืนยันความถูกต้อง (ส่งขออนุมัติจาก CEO)</span>
                        </button>
                      )}

                      {selectedPeriod?.status === 'APPROVED' || selectedPeriod?.status === 'PAID' || selectedPeriod?.status === 'CLOSED' ? (
                        <>
                          <button
                            onClick={handleDownloadBankFile}
                            disabled={isExportingBankFile}
                            className="h-9 inline-flex items-center gap-1.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            <span>{isExportingBankFile ? 'กำลังสร้างไฟล์...' : '↓ ไฟล์โอนเงินธนาคาร'}</span>
                          </button>

                          {selectedPeriod?.status === 'APPROVED' && (
                            <button
                              onClick={handleAdvancePeriodStatus}
                              className="h-9 inline-flex items-center gap-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>บันทึกว่าจ่ายแล้ว</span>
                            </button>
                          )}

                          {selectedPeriod?.status === 'PAID' && (
                            <button
                              onClick={handleAdvancePeriodStatus}
                              className="h-9 inline-flex items-center gap-2 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>ปิดรอบเงินเดือน</span>
                            </button>
                          )}

                          {selectedPeriod?.status === 'CLOSED' && (
                            <span className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ปิดรอบเงินเดือนเรียบร้อยแล้ว</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <button
                          disabled
                          className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-not-allowed opacity-80"
                          title="รอ CEO อนุมัติรอบเงินเดือนก่อนดาวน์โหลดไฟล์จ่ายเงิน"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>ไฟล์โอนเงินธนาคาร (รอ CEO อนุมัติ)</span>
                        </button>
                      )}
                    </>
                  )}

                  {processSubTab === 'APPROVER' && (
                    <>
                      {(selectedPeriod?.status === 'FINANCE_VERIFIED' || selectedPeriod?.status === 'PENDING_APPROVAL') ? (
                        <>
                          <button
                            onClick={() => setIsRejectModalOpen(true)}
                            className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>ไม่อนุมัติ (ส่งคืน HR)</span>
                          </button>

                          <button
                            onClick={handleAdvancePeriodStatus}
                            className="h-9 inline-flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>อนุมัติรอบเงินเดือน</span>
                          </button>
                        </>
                      ) : selectedPeriod?.status === 'APPROVED' || selectedPeriod?.status === 'PAID' || selectedPeriod?.status === 'CLOSED' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{selectedPeriod?.status === 'CLOSED' ? 'ปิดรอบเงินเดือนสมบูรณ์แล้ว' : 'CEO อนุมัติรอบนี้เรียบร้อยแล้ว'}</span>
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
                        onClick={handleDownloadBankFile}
                        disabled={isExportingBankFile || (selectedPeriod?.status !== 'APPROVED' && selectedPeriod?.status !== 'PAID' && selectedPeriod?.status !== 'CLOSED')}
                        className="h-9 inline-flex items-center gap-1.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isExportingBankFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
                        <span>{isExportingBankFile ? 'กำลังสร้างไฟล์...' : '↓ ไฟล์โอนเงินธนาคาร'}</span>
                      </button>

                      {selectedPeriod?.status === 'APPROVED' && (isFinance || isAdmin || isCEO) && (
                        <button
                          onClick={handleAdvancePeriodStatus}
                          className="h-9 inline-flex items-center gap-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>บันทึกว่าจ่ายแล้ว</span>
                        </button>
                      )}

                      {selectedPeriod?.status === 'PAID' && (isFinance || isAdmin || isCEO) && (
                        <button
                          onClick={handleAdvancePeriodStatus}
                          className="h-9 inline-flex items-center gap-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>ปิดรอบเงินเดือน</span>
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
                </div>
              </div>
            </div>

            {/* ── TOP ROLE BANNER (Workflow Stepper & Role Switcher) ── */}
            {(isAdmin || [canAccessHrView, canAccessFinanceView, canAccessApproverView, canAccessBankView].filter(Boolean).length > 1) && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">ขั้นตอนการดำเนินงาน</span>
                    <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{selectedPeriod?.periodName || 'งวดปัจจุบัน'}</span>
                  </div>

                  {/* View Switcher based on Permissions / Role */}
                  {(isAdmin || [canAccessHrView, canAccessFinanceView, canAccessApproverView, canAccessBankView].filter(Boolean).length > 1) && (
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                      {canAccessHrView && (
                        <button
                          type="button"
                          onClick={() => {
                            setProcessSubTab('HR');
                            setViewMode('HR');
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            processSubTab === 'HR'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>ฝ่ายบุคคล (HR)</span>
                        </button>
                      )}
                      {canAccessFinanceView && (
                        <button
                          type="button"
                          onClick={() => {
                            setProcessSubTab('FINANCE');
                            setViewMode('FINANCE');
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            processSubTab === 'FINANCE'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ฝ่ายการเงิน (Finance)</span>
                        </button>
                      )}
                      {canAccessApproverView && (
                        <button
                          type="button"
                          onClick={() => {
                            setProcessSubTab('APPROVER');
                            setViewMode('ALL');
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            processSubTab === 'APPROVER'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>ผู้บริหาร / Admin</span>
                        </button>
                      )}
                      {canAccessBankView && (
                        <button
                          type="button"
                          onClick={() => {
                            setProcessSubTab('BANK');
                            setViewMode('FINANCE');
                            if (selectedPeriod) {
                              loadTransferList(selectedPeriod.id);
                              loadBankTransfer(selectedPeriod.id, selectedBankFilter);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            processSubTab === 'BANK'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Wallet className="w-3.5 h-3.5 text-amber-600" />
                          <span>โอนเงิน (Bank Transfer)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                </div>
            )}

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
                {/* Title and Scope Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      สำหรับ HR
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">เตรียมข้อมูลก่อนคำนวณเงินเดือน</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ตรวจสอบวันลาและรายการที่กระทบเงินเดือน ก่อนกดคำนวณส่งต่อให้ฝ่ายการเงิน
                    </p>
                  </div>
                </div>

                {/* 3 Stat Cards for HR */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">พนักงานในรอบ</span>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">
                      {totalEmployees} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">คน</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">ทุกแผนก</span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ข้อมูลยังไม่ครบ</span>
                    <div className={`text-2xl font-bold mt-1 ${pendingCheckCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {pendingCheckCount} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">คน</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {pendingCheckCount > 0 ? 'รอ HR ตรวจสอบวันลา' : 'ข้อมูลพนักงานครบถ้วน'}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">วันลารวมในรอบ</span>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">
                      {totalLeaveDays} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">วัน</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">จากคำร้องลาที่ได้รับอนุมัติ</span>
                  </div>
                </div>

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
                          <th className="py-3.5 px-5">รายการปรับ/สวัสดิการ</th>
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
                              <td className="py-4 px-5 text-slate-600 dark:text-slate-400">
                                {pr.adjustmentsSummary || '-'}
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
                {/* Title and Scope Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">ตรวจสอบยอดและจ่ายเงินเดือน</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ยืนยันยอดจ่ายสุทธิ นำส่งภาษี/ประกันสังคม และดาวน์โหลดไฟล์โอนเงินผ่านธนาคาร
                    </p>
                  </div>
                </div>

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
                                  <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">⚠️ ยังไม่มีบัญชีธนาคาร</div>
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
                {/* Title and Scope Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                      สำหรับผู้อนุมัติ (CEO / Executive)
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">สรุปภาพรวมและอนุมัติรอบเงินเดือน</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ตรวจสอบภาพรวมงบประมาณเงินเดือนและภาระผูกพัน ก่อนลงนามอนุมัติให้การเงินดำเนินการจ่าย
                    </p>
                  </div>
                </div>

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
                        ? 'รอ CEO อนุมัติ ⏳'
                        : selectedPeriod?.status === 'APPROVED'
                        ? 'อนุมัติเรียบร้อยแล้ว ✅'
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
                      <div className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
                        ⚠️ ยังไม่ได้ตั้งบัญชีธนาคารหลักสำหรับจ่ายเงินเดือน (โครงสร้างองค์กร → บัญชีธนาคารบริษัท) — สร้างไฟล์ธนาคารไม่ได้
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
                      {selectedPeriod?.status === 'APPROVED' && !selectedPeriod?.paymentMethod && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>อนุมัติแล้ว — รอเลือกวิธีการจ่าย</span>
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

                {/* ── PHASE 1: เลือกวิธีการจ่ายเงิน (เมื่อ APPROVED และยังไม่ได้เลือก) ── */}
                {selectedPeriod?.status === 'APPROVED' && !selectedPeriod?.paymentMethod && (
                  <div className="bg-gradient-to-br from-[#0B2046] to-[#1a3a7a] rounded-2xl p-6 text-white shadow-lg">
                    <h3 className="text-base font-bold mb-1">เลือกวิธีการจ่ายเงินเดือน</h3>
                    <p className="text-xs text-blue-200 mb-5">CEO อนุมัติรอบเงินเดือนแล้ว กรุณาเลือกวิธีการจ่ายเงิน</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Model 1: Bank Batch */}
                      <button
                        onClick={() => handleSetPaymentMethod('BANK_BATCH')}
                        disabled={isSettingPaymentMethod}
                        className="flex flex-col items-start gap-3 p-5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition-all cursor-pointer disabled:opacity-60 text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-400/30 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">ส่งไฟล์ธนาคาร (Bank Batch)</div>
                          <div className="text-xs text-blue-200 mt-1">ดาวน์โหลดไฟล์ .CSV ส่งให้ธนาคาร ธนาคารจะโอนเงินให้พนักงานอัตโนมัติ (สำหรับบริษัทขนาดใหญ่)</div>
                        </div>
                      </button>
                      {/* Model 2: Direct Transfer */}
                      <button
                        onClick={() => handleSetPaymentMethod('DIRECT_TRANSFER')}
                        disabled={isSettingPaymentMethod}
                        className="flex flex-col items-start gap-3 p-5 bg-white/10 hover:bg-white/20 border-2 border-emerald-400/50 rounded-2xl transition-all cursor-pointer disabled:opacity-60 text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-400/30 flex items-center justify-center">
                          <Banknote className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">โอนเองทีละคน</div>
                          <div className="text-xs text-blue-200 mt-1">โอนเงินผ่าน Internet Banking ทีละคน แนบสลิปยืนยัน แล้วยืนยันการจ่ายเงินทั้งหมด</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── PHASE 2a: BANK_BATCH ── */}
                {selectedPeriod?.paymentMethod === 'BANK_BATCH' && selectedPeriod?.status !== 'CLOSED' && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">วิธีการจ่าย: ส่งไฟล์ธนาคาร (Bank Batch)</h3>
                    </div>

                    {/* Steps for Flow 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {[
                        {
                          step: '1',
                          title: 'ดาวน์โหลดไฟล์',
                          desc: 'ผู้อนุมัติตรวจสอบและดาวน์โหลดไฟล์ .CSV สำหรับส่งธนาคาร',
                          done: !!selectedPeriod?.bankFileGeneratedAt || selectedPeriod?.status === 'PROCESSING' || selectedPeriod?.status === 'PROCESSING_BANK' || selectedPeriod?.status === 'PAID' || selectedPeriod?.status === 'CLOSED',
                        },
                        {
                          step: '2',
                          title: 'ธนาคารโอนเงิน',
                          desc: 'ธนาคารทำการโอนเงินตามไฟล์ Bank Batch (กดยืนยันเมื่อโอนแล้ว)',
                          done: selectedPeriod?.status === 'PROCESSING_BANK' || selectedPeriod?.status === 'PAID' || selectedPeriod?.status === 'CLOSED',
                        },
                        {
                          step: '3',
                          title: 'การเงินตรวจสลิป',
                          desc: 'ฝ่ายการเงินรับสลิป/ใบเสร็จรวมจากธนาคาร แนบยืนยันยอดและปิดรอบ',
                          done: selectedPeriod?.status === 'PAID' || selectedPeriod?.status === 'CLOSED' || (!!selectedPeriod?.hasBankReceipt && selectedPeriod?.status === 'PROCESSING_BANK'),
                        },
                        {
                          step: '4',
                          title: 'HR รับแจ้งสถานะ',
                          desc: 'HR รับแจ้งสถานะโอนสำเร็จ (PAID) อัตโนมัติ',
                          done: selectedPeriod?.status === 'PAID' || selectedPeriod?.status === 'CLOSED',
                        },
                      ].map(({ step, title, desc, done }) => (
                        <div key={step} className={`p-4 rounded-xl border transition-all ${done ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                            {done ? '✓' : step}
                          </div>
                          <div className={`text-xs font-bold ${done ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>{title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
                        </div>
                      ))}
                    </div>

                    {/* Step 2 Confirmation Section */}
                    {(selectedPeriod?.bankFileGeneratedAt || selectedPeriod?.status === 'PROCESSING' || selectedPeriod?.status === 'PROCESSING_BANK') && (
                      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 rounded-xl px-4 py-2.5 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                            <span>ไฟล์โอนเงินพร้อมใช้งาน</span>
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
                            selectedPeriod?.status === 'PROCESSING_BANK'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                              : selectedPeriod?.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                          }`}>
                            สถานะ: {selectedPeriod?.status === 'PROCESSING_BANK' ? 'ส่งโอนธนาคารแล้ว (รอการเงินตรวจสลิป)' : selectedPeriod?.statusText || selectedPeriod?.status}
                          </span>
                        </div>

                        {selectedPeriod?.status !== 'PAID' && selectedPeriod?.status !== 'PROCESSING_BANK' && (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl space-y-2">
                            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>ขั้นตอนที่ 2: ยืนยันว่าธนาคารโอนเงินแล้ว</span>
                            </div>
                            <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                              1. นำไฟล์ .CSV ที่ดาวน์โหลดไปอัปโหลดเข้าระบบธนาคาร (Corporate iBanking)<br />
                              2. เมื่อธนาคารโอนเงินให้พนักงานเสร็จเรียบร้อยแล้ว ให้กดปุ่ม <strong>"ยืนยันว่าธนาคารโอนเงินแล้ว"</strong> ด้านล่างนี้เพื่อบันทึกสถานะและส่งต่อให้ฝ่ายการเงินตรวจสลิป
                            </p>
                            <div className="pt-2">
                              <button
                                onClick={() => setConfirmPaymentModalOpen(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-102"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>ยืนยันว่าธนาคารโอนเงินแล้ว</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedPeriod?.status === 'PROCESSING_BANK' && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 rounded-2xl space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 text-xs">
                              <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>ขั้นตอนที่ 2 สำเร็จ: ธนาคารโอนเงินเรียบร้อยแล้ว</span>
                            </div>
                            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                              ระบบได้รับการยืนยันการโอนเงินจากธนาคารแล้ว ขั้นตอนถัดไปคือ <strong>ขั้นตอนที่ 3: ฝ่ายการเงินตรวจสลิป</strong> โดยฝ่ายการเงินจะแนบไฟล์ใบเสร็จ/สลิปรวมของธนาคาร และยืนยันการจ่ายเงิน (PAID) เพื่อให้ระบบแจ้งสถานะไปยังฝ่ายบุคคล (HR) ในขั้นตอนที่ 4
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Finance Corporate Bank Receipt Upload Zone (Step 3) */}
                    {isFinance ? (
                      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 space-y-3 mt-3">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>ขั้นตอนที่ 3: สลิป/ใบเสร็จการโอนเงินรวมของธนาคาร (สำหรับฝ่ายการเงิน/บัญชี)</span>
                          </div>
                          {selectedPeriod?.hasBankReceipt && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                                ✓ แนบสลิปธนาคารแล้ว: {selectedPeriod?.bankReceiptFileName || 'receipt.pdf'}
                              </span>
                              <button
                                onClick={handleDownloadBankReceipt}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>ดาวน์โหลด</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {selectedPeriod?.status !== 'PAID' && (
                          <div className="space-y-3">
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              อัปโหลดสลิป/ใบเสร็จยืนยันการโอนเงินรวมจากธนาคาร (PDF / JPG / PNG)
                            </label>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              onChange={e => setBankReceiptFile(e.target.files?.[0] || null)}
                              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0B2046] file:text-white hover:file:bg-[#112d5e] cursor-pointer"
                            />
                            {bankReceiptFile ? (
                              <div className="pt-2 flex justify-end">
                                <button
                                  onClick={() => handleUploadBankReceiptSubmit(true)}
                                  disabled={isUploadingBankReceipt}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md"
                                >
                                  {isUploadingBankReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                  <span>บันทึกสลิปธนาคาร & ยืนยันการจ่ายเงิน (โอนสำเร็จ)</span>
                                </button>
                              </div>
                            ) : !selectedPeriod?.hasBankReceipt && (
                              <div className="pt-2 flex justify-end">
                                <button
                                  disabled
                                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-not-allowed opacity-80"
                                >
                                  <Lock className="w-4 h-4 text-slate-400" />
                                  <span>ไม่อนุญาตให้กดยืนยัน (ต้องแนบสลิปหรือไฟล์ใบเสร็จของธนาคารก่อน)</span>
                                </button>
                              </div>
                            )}

                            {selectedPeriod?.hasBankReceipt && !bankReceiptFile && selectedPeriod?.status === 'PROCESSING_BANK' && (
                              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                  แนบสลิปธนาคารเรียบร้อยแล้ว กดปุ่มเพื่อยืนยันการจ่ายเงินและปรับสถานะรอบเงินเดือนเป็นโอนสำเร็จ (PAID)
                                </span>
                                <button
                                  onClick={handleMarkPaid}
                                  disabled={isConfirmingPayment}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                                >
                                  {isConfirmingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                  <span>ยืนยันการจ่ายเงิน (เปลี่ยนสถานะเป็นโอนสำเร็จ)</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      !isFinance && selectedPeriod?.status !== 'PAID' && (
                        selectedPeriod?.hasBankReceipt ? (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 mt-3">
                            <span>✓ ฝ่ายการเงินได้แนบสลิป/ใบเสร็จของธนาคารแล้ว ({selectedPeriod?.bankReceiptFileName || 'receipt'})</span>
                            <button
                              onClick={handleDownloadBankReceipt}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-lg text-xs font-medium cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>ดาวน์โหลด</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-3">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>รอดำเนินการ: ฝ่ายการเงินตรวจสอบและแนบสลิปโอนเงินรวมของธนาคาร (ขั้นตอนที่ 3)</span>
                            </span>
                          </div>
                        )
                      )
                    )}

                    {/* Status Banner when PAID */}
                    {selectedPeriod?.status === 'PAID' && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 mt-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-emerald-900 dark:text-emerald-300">ธนาคารโอนเงินให้พนักงานเสร็จเรียบร้อยแล้ว (สถานะ: โอนสำเร็จ)</div>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">ฝ่ายการเงินตรวจสอบสลิปและปิดยอดแล้ว — ระบบแจ้งสถานะไปยังฝ่ายบุคคล (HR) เรียบร้อยแล้ว</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[11px] shrink-0">สถานะ: โอนสำเร็จ (PAID)</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={handleGenerateAndDownloadBankFile}
                        disabled={isGeneratingBankFile || selectedPeriod?.status === 'PAID'}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:text-slate-300 disabled:opacity-50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        {isGeneratingBankFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                        <span>{selectedPeriod?.bankFileGeneratedAt ? 'ดาวน์โหลดไฟล์อีกครั้ง' : 'ดาวน์โหลดไฟล์ธนาคาร'}</span>
                      </button>
                    </div>
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

                    {/* Confirm Button — only when all transferred and (isCEO || isAdmin) and DIRECT_TRANSFER */}
                    {selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' && (isCEO || isAdmin) && transferList?.canConfirmPayment && selectedPeriod?.status !== 'PAID' && (
                      <button
                        onClick={() => setConfirmPaymentModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer animate-pulse"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>ยืนยันการจ่ายเงินทั้งหมด</span>
                      </button>
                    )}

                    {selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' && (isCEO || isAdmin) && !transferList?.canConfirmPayment && transferList && transferList.totalEmployees > 0 && selectedPeriod?.status !== 'PAID' && (
                      <button
                        disabled
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold cursor-not-allowed opacity-80"
                      >
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>ไม่สามารถยืนยันได้ (สลิปยังไม่ครบ {transferList.pendingCount}/{transferList.totalEmployees} คน)</span>
                      </button>
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
                      <table className="w-full min-w-[750px] text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                            <th className="py-3 px-4">พนักงาน</th>
                            <th className="py-3 px-4">ธนาคาร / เลขบัญชี</th>
                            <th className="py-3 px-4 text-right">ยอดโอน</th>
                            <th className="py-3 px-4 text-center">Ref No.</th>
                            <th className="py-3 px-4 text-center">สลิป</th>
                            <th className="py-3 px-4 text-center">สถานะ</th>
                            {selectedPeriod?.status !== 'PAID' && (isCEO || isFinance || isAdmin) && (
                              <th className="py-3 px-4 text-center">การดำเนินการ</th>
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
                                    <span className="text-red-400 font-medium">⚠️ ไม่มีบัญชีธนาคาร</span>
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
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                      ✓ โอนแล้ว
                                    </span>
                                  ) : item.paymentStatus === 'FAILED' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                                      ✗ โอนไม่สำเร็จ
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                      ⏳ รอโอน
                                    </span>
                                  )}
                                </td>
                                {/* Action */}
                                {selectedPeriod?.status !== 'PAID' && (isCEO || isFinance || isAdmin) && (
                                  <td className="py-3.5 px-4 text-center">
                                    {!item.accountNumber || !item.bankName ? (
                                      <span
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-red-50 text-red-600 border border-red-200 cursor-not-allowed"
                                        title="ไม่สามารถโอนได้เนื่องจากไม่มีข้อมูลบัญชีธนาคาร"
                                      >
                                        ⚠️ รอข้อมูลบัญชี
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
                                        {item.paymentStatus === 'TRANSFERRED' ? 'อัปเดต Slip' : 'โอนแล้ว + แนบ Slip'}
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
          </div>
        );
      })()}

      {/* ── MODALS: Upload Slip & Confirm Payment (Available from Process Tab) ── */}
      {/* ── MODAL: Upload Slip + Mark Transferred ── */}
          {slipModalOpen && slipModalTarget && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    สลิปการโอนเงิน <span className="text-rose-500">*</span>
                  </label>
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
                        <div className="text-[11px] mt-1">JPG, PNG, WEBP, PDF · สูงสุด 10 MB</div>
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
                    disabled={!slipFile || isMarkingTransferred !== null}
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
            </div>
          )}

          {/* ── MODAL: CEO Confirm Payment ── */}
          {confirmPaymentModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
                      : `ยืนยันว่าโอนเงินเดือนให้พนักงานครบ ${transferList?.totalEmployees} คน พร้อมสลิปครบถ้วนแล้ว`}
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
                      {selectedPeriod?.paymentMethodText ?? (selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' ? 'CEO โอนเอง' : 'ส่งไฟล์ธนาคาร (Bank Batch)')}
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

                {selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' && !transferList?.canConfirmPayment && (
                  <div className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2 leading-relaxed">
                    <Lock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>ไม่อนุญาตให้กดโอนเงินเรียบร้อยหรือเปลี่ยนสถานะจนกว่าจะโอนเงินและแนบสลิปครบทุกคน (ยังขาดสลิปอีก {transferList?.pendingCount} คน)</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setConfirmPaymentModalOpen(false); setConfirmPaymentNote(''); }}
                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' ? handleConfirmPayment : handleConfirmBankTransfer}
                    disabled={isConfirmingPayment || (selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' && !transferList?.canConfirmPayment)}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isConfirmingPayment ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>กำลังยืนยัน...</span></>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /><span>{selectedPeriod?.paymentMethod === 'BANK_BATCH' ? 'ยืนยันว่าธนาคารโอนเงินแล้ว' : 'CEO ยืนยันการจ่ายเงิน'}</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* === TAB 7: ภาษี & ประกันสังคม (Tax & SSO Tab) === */}
      {activeTab === 'tax-sso' && (
        <div className="space-y-4">
          {/* Card 2: Section 1: Tax Brackets */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-9">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>ตารางอัตราภาษีเงินได้บุคคลธรรมดาแบบขั้นบันได (ภ.ง.ด. 8 ขั้น)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                อัตราภาษีเงินได้สุทธิสะสมต่อปีตามประมวลรัษฎากรสำหรับคำนวณหักภาษี ณ ที่จ่าย (Withholding Tax)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                  type="button"
                  onClick={() => handleExportTaxSsoCsv('PND1')}
                  className="h-9 inline-flex items-center gap-2 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออก ภ.ง.ด.1 (CSV)</span>
                </button>

                {canEditTax ? (
                  <button
                    type="button"
                    onClick={() => setIsTaxModalOpen(true)}
                    className="h-9 inline-flex items-center gap-2 px-3.5 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/70 transition-all shadow-2xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไขอัตราภาษี</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                    <Lock className="w-3.5 h-3.5" />
                    สิทธิ์ดูอย่างเดียว
                  </span>
                )}</div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="table-standard text-xs w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  <th className="py-3.5 px-4">ขั้นบันไดภาษี</th>
                  <th className="py-3.5 px-4 text-right">เงินได้สุทธิตั้งแต่</th>
                  <th className="py-3.5 px-4 text-right">ถึงเงินได้สุทธิ</th>
                  <th className="py-3.5 px-4 text-center">อัตราภาษี (%)</th>
                  <th className="py-3.5 px-4 text-right">ภาษีสะสมขั้นก่อนหน้า</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                {taxBrackets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{t.bracketName}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                      ฿{t.incomeFrom.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                      {t.incomeTo != null
                        ? `฿${t.incomeTo.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : 'ขึ้นไป (ไม่จำกัด)'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-700 dark:text-blue-400">
                      {(t.taxRate * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                      ฿{t.baseTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 3: Section 2: Social Security Rates */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-9">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                <span>เกณฑ์และอัตราเงินสมทบกองทุนประกันสังคม (Social Security Fund)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                อัตราเงินสมทบฝ่ายลูกจ้างและนายจ้าง พร้อมฐานเพดานค่าจ้างขั้นต่ำและสูงสุดตามกฎหมาย
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                  type="button"
                  onClick={() => handleExportTaxSsoCsv('SSO')}
                  className="h-9 inline-flex items-center gap-2 px-3.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออก สปส. 1-10 (CSV)</span>
                </button>

                {canEditSso ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSsoRate(ssoRates.find(s => s.status === 'ACTIVE') || ssoRates[0] || null);
                      setIsSsoModalOpen(true);
                    }}
                    className="h-9 inline-flex items-center gap-2 px-3.5 rounded-xl border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100/70 transition-all shadow-2xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไขอัตราประกันสังคม</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                    <Lock className="w-3.5 h-3.5" />
                    สิทธิ์ดูอย่างเดียว
                  </span>
                )}</div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="table-standard text-xs w-full min-w-[800px] text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  <th className="py-3.5 px-4">ชื่อเกณฑ์</th>
                  <th className="py-3.5 px-4 text-center">สมทบฝ่ายผู้ประกันตน (%)</th>
                  <th className="py-3.5 px-4 text-center">สมทบฝ่ายนายจ้าง (%)</th>
                  <th className="py-3.5 px-4 text-right">ฐานค่าจ้างต่ำสุด</th>
                  <th className="py-3.5 px-4 text-right">เพดานค่าจ้างสูงสุด</th>
                  <th className="py-3.5 px-4 text-center">วันที่มีผล</th>
                  <th className="py-3.5 px-6 text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                {ssoRates.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{s.rateName}</td>
                    <td className="py-3 px-4 text-center font-bold text-purple-700 dark:text-purple-400">
                      {(s.employeeContributionPercent * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-purple-700 dark:text-purple-400">
                      {(s.employerContributionPercent * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                      ฿{s.minWageBaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-900 dark:text-slate-100 font-semibold">
                      ฿{s.maxWageBaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {s.effectiveFrom}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
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

      {/* Modal: Create Payroll Period */}
      {isCreatePeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/80 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">สร้างรอบเงินเดือนใหม่</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">กำหนดงวดการจ่ายและช่วงเวลาคำนวณประจำรอบ</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePeriodModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body & Form */}
            <form onSubmit={handleCreatePeriodSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">ชื่อรอบเงินเดือน <span className="text-rose-500">*</span></label>
                    {isPeriodNameCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsPeriodNameCustom(false);
                          const defaults = getDefaultPeriodValues(newPeriodForm.year, newPeriodForm.month);
                          setNewPeriodForm(prev => ({ ...prev, periodName: defaults.periodName }));
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        ↺ ใช้ชื่อตามระบบ
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={newPeriodForm.periodName}
                    onChange={(e) => {
                      setIsPeriodNameCustom(true);
                      setNewPeriodForm({ ...newPeriodForm, periodName: e.target.value });
                    }}
                    placeholder="เช่น รอบเดือนสิงหาคม 2569"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>ตั้งชื่อรอบและวันที่ให้อัตโนมัติตามเดือน/ปี แก้ชื่อได้</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">เดือน</label>
                    <CustomSelect
                      value={newPeriodForm.month}
                      onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium cursor-pointer"
                    >
                      {THAI_MONTH_NAMES.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ปี (พ.ศ.) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      value={newPeriodForm.year ? newPeriodForm.year + 543 : ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!val) {
                          handleYearChange(new Date().getFullYear());
                        } else if (val > 2400) {
                          handleYearChange(val - 543);
                        } else {
                          handleYearChange(val);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium"
                    />
                  </div>
                </div>

                {/* Real-time Duplicate Period Warning Banner (Compact) */}
                {(() => {
                  const duplicate = periods.find(
                    p => p.year === newPeriodForm.year && p.month === newPeriodForm.month
                  );
                  if (!duplicate) return null;
                  return (
                    <div className="p-2.5 px-3 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs text-amber-900 dark:text-amber-200">
                        รอบเดือน <strong>{THAI_MONTH_NAMES[newPeriodForm.month - 1]} {newPeriodForm.year + 543}</strong> มีอยู่ในระบบแล้ว ({duplicate.status})
                      </span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">วันเริ่มคำนวณ</label>
                    <ThaiDatePicker
                      value={newPeriodForm.startDate}
                      onChange={(val) => setNewPeriodForm({ ...newPeriodForm, startDate: val })}
                      placeholder="เลือกวันเริ่มคำนวณ"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">วันสิ้นสุดคำนวณ</label>
                    <ThaiDatePicker
                      min={newPeriodForm.startDate || undefined}
                      value={newPeriodForm.endDate}
                      onChange={(val) => setNewPeriodForm({ ...newPeriodForm, endDate: val })}
                      placeholder="เลือกวันสิ้นสุดคำนวณ"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">วันกำหนดจ่ายเงิน</label>
                  <ThaiDatePicker
                    value={newPeriodForm.paymentDate}
                    onChange={(val) => setNewPeriodForm({ ...newPeriodForm, paymentDate: val })}
                    placeholder="เลือกวันกำหนดจ่ายเงิน"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">วันตัดรอบเงินเบิกสวัสดิการ</label>
                  <ThaiDatePicker
                    value={newPeriodForm.claimCutoffDate}
                    max={newPeriodForm.paymentDate || newPeriodForm.endDate || undefined}
                    onChange={(val) => setNewPeriodForm({ ...newPeriodForm, claimCutoffDate: val })}
                    placeholder="เลือกวันตัดรอบเงินเบิกสวัสดิการ"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    คำขอเบิกที่อนุมัติไม่เกินวันนี้จะจ่ายในรอบนี้ ที่อนุมัติหลังจากนั้นไปรอบถัดไป · เว้นว่าง = ใช้วันกำหนดจ่ายเงิน
                  </p>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/80 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsCreatePeriodModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 text-xs font-medium cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                {(() => {
                  const isDup = periods.some(
                    p => p.year === newPeriodForm.year && p.month === newPeriodForm.month
                  );
                  return (
                    <button
                      type="submit"
                      disabled={isCreatingPeriod}
                      className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 transition-all ${
                        isDup
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-[#0B2046] hover:bg-[#112d5e]'
                      }`}
                      title={isDup ? 'รอบนี้มีอยู่ในระบบแล้ว (คลิกเพื่อดูการแจ้งเตือน)' : undefined}
                    >
                      {isCreatingPeriod && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isCreatingPeriod ? 'กำลังสร้าง...' : isDup ? 'ตรวจสอบรอบซ้ำ' : 'สร้างรอบเงินเดือน'}</span>
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Popup: แจ้งเตือนเมื่อรอบเงินเดือนมีอยู่ในระบบแล้ว */}
      <ConfirmModal
        isOpen={isDuplicatePeriodAlertOpen}
        onClose={() => setIsDuplicatePeriodAlertOpen(false)}
        onConfirm={() => {
          if (duplicatePeriodTarget) {
            setSelectedPeriod(duplicatePeriodTarget);
            setIsCreatePeriodModalOpen(false);
            setIsDuplicatePeriodAlertOpen(false);
            showToast(`สลับไปยัง ${duplicatePeriodTarget.periodName} เรียบร้อยแล้ว`);
          } else {
            setIsDuplicatePeriodAlertOpen(false);
          }
        }}
        type="warning"
        title="รอบเงินเดือนนี้มีอยู่ในระบบแล้ว"
        message={`รอบเงินเดือนประจำเดือน ${
          THAI_MONTH_NAMES[newPeriodForm.month - 1]
        } ${newPeriodForm.year + 543} (${newPeriodForm.periodName}) มีบันทึกอยู่ในระบบแล้ว ${
          duplicatePeriodTarget ? `\n(สถานะปัจจุบัน: ${duplicatePeriodTarget.status})` : ''
        }\n\nระบบไม่อนุญาตให้สร้างรอบเงินเดือนในเดือนและปีเดียวกันซ้ำได้ คุณต้องการเปิดดูรอบเงินเดือนนี้ หรือแก้ไขเดือนในแบบฟอร์ม?`}
        confirmText="ไปยังรอบเงินเดือนนี้"
        cancelText="แก้ไขเดือนในฟอร์ม"
        zIndexClassName="z-[70]"
      />

      {/* Slide-Over Drawer: รายละเอียดสลิปเงินเดือนรายบุคคล (payroll_detail) */}
      <PayrollDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        record={selectedPayrollRecord}
        canEdit={canAccessHrView && (selectedPeriod?.status === 'DRAFT' || selectedPeriod?.status === 'REVIEW')}
        payrollItems={payrollItems}
        onChanged={refreshSelectedPeriodPayrolls}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
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
                      handleOpenCreatePeriodModal();
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
                        handleOpenCreatePeriodModal();
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
                                {p.status !== 'CLOSED' && canAccessHrView && (
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
        </div>
      )}

      {/* Modal: บันทึกโบนัสเข้าสู่งวดเงินเดือน (Apply Bonus to Payroll Period) */}
      {isApplyBonusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                  {periods.map((p) => {
                    const statusLabel =
                      p.status === 'PAID'
                        ? 'จ่ายแล้ว'
                        : p.status === 'LOCKED'
                        ? 'ปิดงวดแล้ว'
                        : p.status === 'CALCULATED'
                        ? 'คำนวณแล้ว'
                        : 'ร่าง';
                    return (
                      <option key={p.id} value={p.id}>
                        {p.periodName} - สถานะ: {statusLabel}
                      </option>
                    );
                  })}
                </CustomSelect>
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
                    ฿{bonuses.reduce((sum, b) => sum + (b.bonusAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        </div>
      )}
    </div>
  );
}

