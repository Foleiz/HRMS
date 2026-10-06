'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import { salaryService } from '@/services/salaryService';
import { organizationService } from '@/services/organizationService';
import { CustomSelect } from '@/components/ui/CustomSelect';
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
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { PayrollViewSwitcher, PayrollViewMode } from '@/components/payroll/PayrollViewSwitcher';
import { MaskedDataViewer } from '@/components/common/MaskedDataViewer';

type ActiveTab =
  | 'overview'
  | 'structures'
  | 'items'
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
          <select
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
          </select>
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

export default function PayrollPage() {
  const router = useRouter();
  const { user, hasPermission, hasRole } = useAuth();
  const canViewPayroll =
    hasPermission('PAYROLL_VIEW') ||
    hasPermission('PAYROLL_CALC_VIEW') ||
    hasPermission('PAYROLL_SLIP_VIEW') ||
    hasRole('ADMIN');

  // บทบาทในหน้าเงินเดือน — ใช้ชุดรหัสสิทธิ์เดียวกับ backend (PayrollAccess.cs) ไม่ดูจากชื่อบทบาทหรือชื่อผู้ใช้
  const isAdmin = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const PAYROLL_HR_PERMS = ['PAYROLL_CALC_CREATE', 'PAYROLL_CALC_EDIT', 'PAYROLL_HR_CREATE', 'PAYROLL_HR_EDIT'];
  const PAYROLL_FINANCE_PERMS = [
    'PAYROLL_FINANCE_CREATE', 'PAYROLL_FINANCE_EDIT', 'PAYROLL_FINANCE_APPROVE',
    'PAYROLL_BANK_CREATE', 'PAYROLL_BANK_EDIT', 'PAYROLL_TAX_EDIT', 'PAYROLL_TAX_MANAGE',
  ];
  const PAYROLL_APPROVER_PERMS = ['APPROVAL_PAYROLL_APPROVE', 'PAYROLL_ADMIN_APPROVE', 'PAYROLL_CALC_APPROVE', 'PAYROLL_APPROVE'];
  const hasHrPayrollPerm = PAYROLL_HR_PERMS.some((p) => hasPermission(p));
  const hasFinancePayrollPerm = PAYROLL_FINANCE_PERMS.some((p) => hasPermission(p));
  const hasApproverPayrollPerm = PAYROLL_APPROVER_PERMS.some((p) => hasPermission(p));

  // ปุ่มดำเนินการ: ตามสิทธิ์ทำงาน (ตรงกับ backend)
  const isCEO = isAdmin || hasApproverPayrollPerm;
  const isFinance = isAdmin || hasFinancePayrollPerm;
  const isHR = isAdmin || hasHrPayrollPerm;

  // มุมมอง (แท็บ HR / การเงิน / ผู้บริหาร): ใช้สิทธิ์ดูแบบแยก (PAYROLL_*_VIEW) ถ้าบทบาทตั้งไว้
  // ถ้าบทบาทยังไม่ได้ตั้งสิทธิ์ดูแบบแยก → ใช้สิทธิ์ทำงานของหน้าที่นั้นแทน (ไม่เดาจากชื่อบทบาท/ชื่อผู้ใช้)
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

  const canEditTax =
    hasPermission('PAYROLL_TAX_EDIT') ||
    hasPermission('PAYROLL_TAX_MANAGE') ||
    hasRole('ADMIN') ||
    hasRole('PAYROLL_ADMIN') ||
    hasRole('SYSTEM_SUPER');

  const canEditSso =
    canEditTax ||
    isFinance ||
    hasRole('ADMIN') ||
    hasRole('PAYROLL_ADMIN') ||
    hasRole('SYSTEM_SUPER') ||
    hasPermission('PAYROLL_TAX_EDIT') ||
    hasPermission('PAYROLL_TAX_MANAGE');

  const { setBreadcrumb } = useBreadcrumb();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [viewMode, setViewMode] = useState<PayrollViewMode>('ALL');
  const [processSubTab, setProcessSubTab] = useState<'HR' | 'FINANCE' | 'APPROVER'>('HR');

  useEffect(() => {
    if (canAccessFinanceView && !canAccessHrView) {
      setProcessSubTab('FINANCE');
      setViewMode('FINANCE');
    } else if (canAccessApproverView && !canAccessHrView && !canAccessFinanceView) {
      setProcessSubTab('APPROVER');
      setViewMode('ALL');
    } else if (canAccessHrView) {
      setProcessSubTab('HR');
      setViewMode('HR');
    } else if (canAccessFinanceView) {
      setProcessSubTab('FINANCE');
      setViewMode('FINANCE');
    } else if (canAccessApproverView) {
      setProcessSubTab('APPROVER');
      setViewMode('ALL');
    }
  }, [canAccessHrView, canAccessFinanceView, canAccessApproverView]);

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sub-tab in Structure view: 'positions' vs 'employees'
  const [structureSubTab, setStructureSubTab] = useState<'positions' | 'employees'>('positions');
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

  // Auto-align process subtab when period status changes to match the active workflow stage
  useEffect(() => {
    if (selectedPeriod?.status === 'SUBMITTED_TO_FINANCE') {
      if (canAccessFinanceView) {
        setProcessSubTab('FINANCE');
      }
    } else if (selectedPeriod?.status === 'FINANCE_VERIFIED' || selectedPeriod?.status === 'PENDING_APPROVAL') {
      if (canAccessApproverView) {
        setProcessSubTab('APPROVER');
      }
    }
  }, [selectedPeriod?.id, selectedPeriod?.status, canAccessFinanceView, canAccessApproverView]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [isPeriodLoading, setIsPeriodLoading] = useState(false);
  const [selectedPayrollRecord, setSelectedPayrollRecord] = useState<PayrollRecord | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [processPage, setProcessPage] = useState<number>(1);
  const [processPageSize, setProcessPageSize] = useState<number>(10);
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
  const [newPeriodForm, setNewPeriodForm] = useState(() => ({
    year: 2026,
    month: 8,
    periodName: 'รอบเดือนสิงหาคม 2569',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    paymentDate: '2026-08-29',
    claimCutoffDate: '',
  }));

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
    const defaults = getDefaultPeriodValues(2026, 8);
    setNewPeriodForm({
      year: 2026,
      month: 8,
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
      ] = await Promise.all([
        salaryService.getOverview().catch(() => null),
        salaryService.getStructures().catch(() => []),
        salaryService.getTaxBrackets().catch(() => []),
        salaryService.getSocialSecurityRates().catch(() => []),
        salaryService.getEmployeesOverview().catch(() => []),
        salaryService.getPayrollItems().catch(() => []),
        organizationService.getPositions().catch(() => []),
        organizationService.getLevels().catch(() => []),
        organizationService.getDepartments().catch(() => []),
        salaryService.getPayrollPeriods().catch(() => []),
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

      if (periodsData && periodsData.length > 0) {
        const today = new Date();
        const targetPeriod =
          periodsData.find((p) => p.year === today.getFullYear() && p.month === today.getMonth() + 1) || periodsData[0];
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Dynamic fetch when switching to Bank Transfer or Tax/SSO tab
  useEffect(() => {
    if (!selectedPeriod) {
      setTransferList(null);
      setBankSummary(null);
      setTaxSsoSummary(null);
      return;
    }

    if (activeTab === 'bank-transfer') {
      loadTransferList(selectedPeriod.id);
      loadBankTransfer(selectedPeriod.id, selectedBankFilter);
    } else if (activeTab === 'tax-sso') {
      loadTaxSsoSummary(selectedPeriod.id);
    }
  }, [activeTab, selectedPeriod]);

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
            showToast('อัปโหลดสลิปธนาคารและยืนยันรอบเงินเดือนเป็น PAID สำเร็จ!');
          } else {
            showToast('อัปโหลดสลิป/ใบเสร็จธนาคารเรียบร้อยแล้ว (ขั้นตอนที่ 3 เสร็จสิ้น)');
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
    setIsConfirmingPayment(true);
    try {
      const updated = await salaryService.updatePayrollPeriodStatus(selectedPeriod.id, 'PAID');
      setSelectedPeriod(updated);
      setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      showToast('ยืนยันรอบเงินเดือนเข้าสู่สถานะ PAID เรียบร้อยแล้ว (ขั้นตอนที่ 4 เสร็จสิ้น)');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะเป็น PAID');
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
      showToast('ยืนยันการจ่ายเงินสำเร็จ รอบเงินเดือนเปลี่ยนเป็นสถานะ PAID เรียบร้อยแล้ว');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการ Confirm การจ่ายเงิน');
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
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการ Confirm Bank Transfer');
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
    } catch (err) {
      console.error('Failed to download bank transfer file:', err);
      showToast('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์โอนเงิน');
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
      nextStatus = 'APPROVED';
      actionToast = 'CEO อนุมัติรอบเงินเดือนเรียบร้อยแล้ว (สถานะ: อนุมัติแล้ว)';
    } else if (selectedPeriod.status === 'APPROVED' || selectedPeriod.status === 'PROCESSING') {
      if (selectedPeriod.paymentMethod === 'DIRECT_TRANSFER' || !selectedPeriod.paymentMethod) {
        setActiveTab('bank-transfer');
        showToast('กรุณาไปที่แท็บ "โอนเงินธนาคาร" เพื่อโอนเงินและแนบสลิปให้ครบทุกคนก่อนยืนยันจ่ายเงิน');
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
    try {
      setIsCalculating(true);
      const updatedPayrolls = await salaryService.calculatePayrollPeriod(selectedPeriod.id);
      setPayrolls(updatedPayrolls || []);
      const updatedPeriods = await salaryService.getPayrollPeriods();
      setPeriods(updatedPeriods || []);
      const current = updatedPeriods.find((p) => p.id === selectedPeriod.id);
      if (current) setSelectedPeriod(current);
      showToast('คำนวณเงินเดือนประจำรอบสำเร็จแล้ว');
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
      const parts = [`เพิ่มโบนัส ${result.addedCount} คน รวม ฿${(result.addedAmount || 0).toLocaleString()}`];
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
  const getTabLabel = (tab: ActiveTab) => {
    switch (tab) {
      case 'overview':
        return 'ภาพรวม';
      case 'structures':
        return 'โครงสร้างเงินเดือน';
      case 'items':
        return 'รายได้และรายหัก';
      case 'process':
        return 'ประมวลเงินเดือน';
      case 'bank-transfer':
        return 'โอนเงินธนาคาร';
      case 'tax-sso':
        return 'ภาษี & ประกันสังคม';
    }
  };

  // Filtered Payroll Items
  const filteredPayrollItems = payrollItems.filter((i) => i.itemType === itemsSubTab);

  // Dynamic subNavTabs based on viewMode
  const visibleNavTabs: { id: ActiveTab; label: string }[] = [
    { id: 'overview', label: 'ภาพรวม' },
    ...(viewMode === 'ALL' || viewMode === 'HR' ? [{ id: 'structures' as ActiveTab, label: 'โครงสร้างเงินเดือน' }] : []),
    ...(viewMode === 'ALL' || viewMode === 'HR' ? [{ id: 'items' as ActiveTab, label: 'รายได้และรายหัก' }] : []),
    { id: 'process', label: 'ประมวลเงินเดือน' },
    ...(viewMode === 'ALL' || viewMode === 'FINANCE' ? [{ id: 'bank-transfer' as ActiveTab, label: 'โอนเงินธนาคาร' }] : []),
    ...(viewMode === 'ALL' || viewMode === 'FINANCE' ? [{ id: 'tax-sso' as ActiveTab, label: 'ภาษี & ประกันสังคม' }] : []),
  ];

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

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* === TAB 1: ภาพรวม (Overview) - Matches uploaded screenshot exactly === */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* 4 Stacked Full-Width Status Cards */}
          <div className="space-y-3">
            {/* Card 1: ยอดเงินเดือนรวมเดือนนี้ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-xs flex items-center justify-between relative hover:border-slate-200 transition-all">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ยอดเงินเดือนรวมเดือนนี้</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  ฿{overview?.currentMonthTotal?.toLocaleString() || '1,842,300'}
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-400">
                  {overview?.currentMonthPeriod || 'รอบ ส.ค. 2569'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl border-2 border-blue-400 bg-blue-50/50 text-blue-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-400 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Card 2: พนักงานที่คำนวณแล้ว */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-xs flex items-center justify-between hover:border-slate-200 transition-all">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">พนักงานที่คำนวณแล้ว</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {overview ? `${overview.calculatedEmployeesCount}/${overview.totalEmployeesCount}` : '118/145'}
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-400">
                  คิดเป็น {overview?.calculatedPercentage || 81}%
                </span>
              </div>

              <div className="w-9 h-9 rounded-xl bg-slate-100/90 dark:bg-slate-700/80 text-slate-400 dark:text-slate-300 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>

            {/* Card 3: รอตรวจสอบ/อนุมัติ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-xs flex items-center justify-between hover:border-slate-200 transition-all">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">รอตรวจสอบ/อนุมัติ</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {overview ? `${overview.pendingApprovalCount} คน` : '27 คน'}
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-400">ต้องดำเนินการก่อนปิดรอบ</span>
              </div>

              <div className="w-9 h-9 rounded-xl bg-slate-100/90 dark:bg-slate-700/80 text-slate-400 dark:text-slate-300 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* Card 4: กำหนดปิดรอบถัดไป */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-xs flex items-center justify-between hover:border-slate-200 transition-all">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">กำหนดปิดรอบถัดไป</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {overview?.nextClosingDate || '29 ส.ค. 2569'}
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-400">
                  เหลืออีก {overview?.remainingDays != null ? overview.remainingDays : 2} วัน
                </span>
              </div>

              <div className="w-9 h-9 rounded-xl bg-slate-100/90 dark:bg-slate-700/80 text-slate-400 dark:text-slate-300 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Section: รอบเงินเดือนล่าสุด */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">รอบเงินเดือนล่าสุด</h2>
              <button
                type="button"
                onClick={() => setIsAllPeriodsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span>ดูทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {(!overview?.recentPeriods || overview.recentPeriods.length === 0) ? (
              <div className="py-8 text-center">
                <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">ยังไม่มีรอบเงินเดือนในระบบ</p>
                {canAccessHrView && (
                  <button
                    type="button"
                    onClick={handleOpenCreatePeriodModal}
                    className="mt-3 px-3.5 py-1.5 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>สร้างรอบเงินเดือนแรก</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {overview.recentPeriods.map((p, idx) => {
                  const targetPeriod = periods.find(x => p.periodName.includes(x.periodName) || x.periodName.includes(p.periodName));
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (targetPeriod) {
                          handlePeriodChange(targetPeriod.id);
                          setActiveTab('process');
                        } else {
                          setIsAllPeriodsModalOpen(true);
                        }
                      }}
                      className="py-4 flex items-center justify-between text-sm hover:bg-slate-50/50 dark:hover:bg-slate-700/30 px-2 rounded-xl transition-colors cursor-pointer group"
                      title="คลิกเพื่อเปิดดูรายละเอียดรอบนี้"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#0B2046] dark:group-hover:text-blue-400 transition-colors">
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

      {/* === TAB 2: โครงสร้างเงินเดือน (Salary Structure & Employees) - Matches media_1789453480755.png === */}
      {activeTab === 'structures' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs p-6 space-y-4">
          {/* Header matching mockup: Title on left, "+ เพิ่ม" button on right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">โครงสร้างเงินเดือน</h2>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setStructureSubTab('positions')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    structureSubTab === 'positions'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  กรอบโครงสร้าง ({structures.length})
                </button>
                <button
                  onClick={() => setStructureSubTab('employees')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    structureSubTab === 'employees'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  ฐานเงินเดือนพนักงาน ({employees.length})
                </button>
              </div>
            </div>

            {structureSubTab === 'positions' && (
              <button
                onClick={handleOpenCreateStructure}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
              >
                <span>เพิ่ม</span>
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>

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
                  <table className="w-full min-w-[650px] text-left border-collapse whitespace-nowrap">
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
                            onDoubleClick={() => handleOpenEditStructure(s)}
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:max-w-xs">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ค้นหารหัส หรือชื่อพนักงาน..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleFilterEmployees()}
                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <CustomSelect
                      value={selectedDeptId}
                      onChange={(val) => setSelectedDeptId(val)}
                      placeholder="ทุกแผนก"
                      className="min-w-[150px]"
                      options={[
                        { value: '', label: 'ทุกแผนก' },
                        ...departments.map((d) => ({ value: String(d.id), label: d.departmentName })),
                      ]}
                    />

                    <button
                      onClick={handleFilterEmployees}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      ค้นหา
                    </button>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    แสดง <span className="font-bold text-slate-800 dark:text-slate-200">{employees.length}</span> คน
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full min-w-[750px] text-left border-collapse whitespace-nowrap">
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
                                <button
                                  onClick={() => handleOpenAdjustSalary(emp)}
                                  className="px-3 py-1.5 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                >
                                  {hasSalary ? 'ปรับเงินเดือน' : 'กำหนดเงินเดือน'}
                                </button>
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
      )}

      {/* === TAB 3: รายได้และรายหัก (Earnings & Deductions) - Matches media_1789453524860.png === */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Top Pill Switcher: รายการรายได้ / รายการรายหัก */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setItemsSubTab('EARNING')}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                itemsSubTab === 'EARNING'
                  ? 'bg-[#0B2046] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              รายการรายได้
            </button>
            <button
              onClick={() => setItemsSubTab('DEDUCTION')}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                itemsSubTab === 'DEDUCTION'
                  ? 'bg-[#0B2046] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              รายการรายหัก
            </button>
          </div>

          {/* 2 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">รายการทั้งหมด</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {payrollItems.filter((i) => i.itemType === itemsSubTab).length} รายการ
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">เปิดใช้งานอยู่</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {
                  payrollItems.filter(
                    (i) =>
                      i.itemType === itemsSubTab &&
                      (i.status ? i.status.toUpperCase() === 'ACTIVE' : true)
                  ).length
                }{' '}
                รายการ
              </div>
            </div>
          </div>

          {/* Action Button: "+ เพิ่มรายการรายได้" / "+ เพิ่มรายการรายหัก" */}
          <div className="flex justify-end">
            <button
              onClick={handleOpenCreateItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-medium shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{itemsSubTab === 'EARNING' ? 'เพิ่มรายการรายได้' : 'เพิ่มรายการรายหัก'}</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
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
                  {payrollItems
                    .filter((i) => i.itemType === itemsSubTab)
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
                            return { label: 'ฐานเงินเดือนสัญญาจ้าง', color: 'bg-blue-50 text-blue-700 border-blue-200' };
                          case 'POSITION_ALLOWANCE':
                            return { label: 'เงินประจำตำแหน่ง', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };

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
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditItem(item)}
                                title="แก้ไข"
                                className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
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
                            </div>
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
        const transferredCount = payrolls.filter(p => p.paymentStatus === 'TRANSFERRED').length;
        const pendingTransferCount = totalEmployees - transferredCount;

        const totalProcessCount = payrolls.length;
        const totalProcessPages = Math.max(1, Math.ceil(totalProcessCount / processPageSize));
        const safeProcessPage = Math.min(Math.max(1, processPage), totalProcessPages);
        const startProcessIdx = (safeProcessPage - 1) * processPageSize;
        const paginatedPayrolls = payrolls.slice(startProcessIdx, startProcessIdx + processPageSize);

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
            {/* ── TOP ROLE BANNER (Visible to Admin or users with multiple view permissions) ── */}
            {(isAdmin || [canAccessHrView, canAccessFinanceView, canAccessApproverView].filter(Boolean).length > 1) && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">เงินเดือน / ประมวลเงินเดือน</span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">รอบเงินเดือน : {selectedPeriod?.periodName || 'งวดปัจจุบัน'}</span>
                    </div>
                    <h1 className="text-lg font-bold mt-1 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {processSubTab === 'HR' && 'เตรียมข้อมูลก่อนคำนวณเงินเดือน'}
                      {processSubTab === 'FINANCE' && 'ตรวจสอบยอดและจ่ายเงินเดือน'}
                      {processSubTab === 'APPROVER' && 'สรุปภาพรวมและอนุมัติรอบเงินเดือน'}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {processSubTab === 'HR' && 'มุมมองฝ่ายบุคคล: ตรวจสอบวันลาและรายการที่กระทบเงินเดือน ก่อนกดคำนวณส่งต่อให้ฝ่ายการเงิน'}
                      {processSubTab === 'FINANCE' && 'มุมมองฝ่ายการเงิน: ยืนยันยอดจ่ายสุทธิ นำส่งภาษี/ประกันสังคม และดาวน์โหลดไฟล์โอนเงินผ่านธนาคาร'}
                      {processSubTab === 'APPROVER' && 'มุมมองผู้อนุมัติ (CEO): ตรวจสอบความถูกต้องของยอดรวมและภาระภาษี ก่อนลงนามอนุมัติให้การเงินดำเนินการจ่าย'}
                    </p>
                  </div>

                  {/* View Switcher based on Permissions / Role */}
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
                  </div>
                </div>

                {/* 4-Step Workflow Stepper (Clickable Interactive Tabs) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-4 mt-4 border-t border-slate-100">
                  {[
                    { step: 1, tabKey: 'HR' as const, title: '1. HR เตรียมข้อมูล & คำนวณ', desc: 'ตรวจวันลาและรายการ แล้วกดคำนวณ' },
                    { step: 2, tabKey: 'FINANCE' as const, title: '2. การเงินตรวจทาน & ขออนุมัติ', desc: 'ตรวจยอด Gross/Net ส่งขออนุมัติ' },
                    { step: 3, tabKey: 'APPROVER' as const, title: '3. CEO อนุมัติรอบเงินเดือน', desc: 'ผู้บริหารตรวจสอบและอนุมัติ' },
                    { step: 4, tabKey: 'BANK' as const, title: '4. โอนเงิน & ปิดรอบ', desc: 'ส่งไฟล์ธนาคารและแนบสลิป' },
                  ].map((s) => {
                    const isDone = currentStep > s.step;
                    const isPeriodCurrent = currentStep === s.step;
                    const isViewing = s.tabKey === 'BANK' ? false : processSubTab === s.tabKey;
                    return (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => {
                          if (s.tabKey === 'BANK') {
                            setActiveTab('bank-transfer');
                          } else {
                            if (s.tabKey === 'HR' && !canAccessHrView) {
                              showToast('คุณไม่มีสิทธิ์เข้าถึงหน้าต่างฝ่ายบุคคล (HR)');
                              return;
                            }
                            if (s.tabKey === 'FINANCE' && !canAccessFinanceView) {
                              showToast('คุณไม่มีสิทธิ์เข้าถึงหน้าต่างฝ่ายการเงิน (Finance)');
                              return;
                            }
                            if (s.tabKey === 'APPROVER' && !canAccessApproverView) {
                              showToast('คุณไม่มีสิทธิ์เข้าถึงหน้าต่างผู้บริหาร / Admin');
                              return;
                            }
                            setProcessSubTab(s.tabKey);
                            setViewMode(s.tabKey === 'APPROVER' ? 'ALL' : s.tabKey);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isViewing
                            ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/50 shadow-xs'
                            : isPeriodCurrent
                            ? 'bg-amber-50/40 border-amber-300 shadow-2xs hover:bg-amber-50/70'
                            : isDone
                            ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50/90'
                            : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isDone
                                  ? 'bg-emerald-500 text-white'
                                  : isPeriodCurrent
                                  ? 'bg-amber-500 text-white animate-pulse'
                                  : isViewing
                                  ? 'bg-[#0B2046] text-white'
                                  : 'bg-slate-200 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {isDone ? '✓' : s.step}
                            </span>
                            <span className={`text-xs font-bold ${isViewing ? 'text-amber-950 font-bold' : isPeriodCurrent ? 'text-amber-900' : isDone ? 'text-emerald-800' : 'text-slate-600 dark:text-slate-400'}`}>
                              {s.title}
                            </span>
                          </div>
                          {isViewing && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                              กำลังดู
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] mt-1 pl-7 ${isViewing ? 'text-amber-800' : isPeriodCurrent ? 'text-amber-700' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {s.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SUB-HEADER BAR (Dropdown & Actions) ── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-2xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  {(!isAdmin && [canAccessHrView, canAccessFinanceView, canAccessApproverView].filter(Boolean).length <= 1) && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">เงินเดือน / ประมวลเงินเดือน</span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                          {processSubTab === 'HR' && 'ฝ่ายบุคคล (HR)'}
                          {processSubTab === 'FINANCE' && 'ฝ่ายการเงิน (Finance)'}
                          {processSubTab === 'APPROVER' && 'ผู้บริหาร (CEO / Approver)'}
                        </span>
                      </div>
                      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {processSubTab === 'HR' && 'เตรียมข้อมูลก่อนคำนวณเงินเดือน'}
                        {processSubTab === 'FINANCE' && 'ตรวจสอบยอดและจ่ายเงินเดือน'}
                        {processSubTab === 'APPROVER' && 'สรุปภาพรวมและอนุมัติรอบเงินเดือน'}
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {processSubTab === 'HR' && 'ตรวจสอบวันลาและรายการที่กระทบเงินเดือน ก่อนกดคำนวณส่งต่อให้ฝ่ายการเงิน'}
                        {processSubTab === 'FINANCE' && 'ยืนยันยอดจ่ายสุทธิ นำส่งภาษี/ประกันสังคม และจัดการการจ่ายเงินเดือน'}
                        {processSubTab === 'APPROVER' && 'ตรวจสอบความถูกต้องของยอดรวมและภาระภาษี ก่อนลงนามอนุมัติรอบเงินเดือน'}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {periods.length > 0 ? (
                      <>
                        <div className="relative inline-block">
                          <select
                            value={selectedPeriod?.id || ''}
                            onChange={(e) => handlePeriodChange(Number(e.target.value))}
                            className="appearance-none font-bold text-slate-900 dark:text-slate-100 text-sm bg-transparent pr-8 py-1 focus:outline-none cursor-pointer"
                          >
                            {periods.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.periodName}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAllPeriodsModalOpen(true)}
                          className="h-7 px-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="ดูรอบเงินเดือนทั้งหมด"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>ดูรอบทั้งหมด</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 py-1 text-slate-500 dark:text-slate-400 font-bold text-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>ยังไม่มีรอบเงินเดือนในระบบ</span>
                      </div>
                    )}

                    {selectedPeriod && (
                      <span
                        className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold ${
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
                          : selectedPeriod.status === 'PAID'
                          ? 'จ่ายเงินแล้ว'
                          : selectedPeriod.status === 'CLOSED'
                          ? 'ปิดรอบแล้ว'
                          : selectedPeriod.statusText}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 mt-2 text-xs text-slate-400">
                    <span>
                      ช่วงเงินเดือน:{' '}
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {selectedPeriod
                          ? (selectedPeriod.month === 8 && selectedPeriod.year === 2026
                              ? '1 ส.ค. 2569 - 31 ส.ค. 2569'
                              : `${selectedPeriod.startDate || '-'} - ${selectedPeriod.endDate || '-'}`)
                          : '-'}
                      </span>
                    </span>
                    <span>
                      วันจ่ายเงิน:{' '}
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {selectedPeriod?.paymentDate
                          ? (selectedPeriod.month === 8 && selectedPeriod.year === 2026 ? '29 ส.ค. 2569' : selectedPeriod.paymentDate)
                          : '-'}
                      </span>
                    </span>
                    {selectedPeriod && (
                      <span className="inline-flex items-center gap-1.5">
                        ตัดรอบเงินเบิก:{' '}
                        {claimCutoffEditing ? (
                          <>
                            <input
                              type="date"
                              value={claimCutoffDraft}
                              max={selectedPeriod.paymentDate || selectedPeriod.endDate}
                              onChange={(e) => setClaimCutoffDraft(e.target.value)}
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
                          </>
                        ) : (
                          <>
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                              {selectedPeriod.effectiveClaimCutoffDate || '-'}
                              {!selectedPeriod.claimCutoffDate && ' (วันจ่ายเงิน)'}
                            </span>
                            {(isHR || isAdmin) && !['APPROVED', 'PROCESSING', 'PAID', 'CLOSED'].includes(selectedPeriod.status) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setClaimCutoffDraft(selectedPeriod.claimCutoffDate || selectedPeriod.effectiveClaimCutoffDate || '');
                                  setClaimCutoffEditing(true);
                                }}
                                className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                แก้ไข
                              </button>
                            )}
                          </>
                        )}
                      </span>
                    )}
                    <span>
                      พนักงานในรอบ:{' '}
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{payrolls.length} คน</span>
                    </span>
                  </div>
                </div>

                {/* Top Action Buttons contextualized by View */}
                <div className="flex flex-wrap items-center gap-2">
                  {processSubTab === 'HR' && canAccessHrView && (
                    <>
                      <button
                        onClick={handleOpenCreatePeriodModal}
                        className="h-9 inline-flex items-center gap-1.5 px-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>สร้างรอบเงินเดือน</span>
                      </button>

                      {(selectedPeriod?.status === 'REVIEW' || selectedPeriod?.status === 'DRAFT') && (
                        <button
                          onClick={() => setDeletePeriodConfirmOpen(true)}
                          disabled={!selectedPeriod || isDeletingPeriod}
                          className="h-9 inline-flex items-center gap-1.5 px-3 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                          title="ลบรอบเงินเดือนนี้ออกจากระบบ"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>ลบรอบเงินเดือน</span>
                        </button>
                      )}

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

                      {(selectedPeriod?.status === 'REVIEW' || selectedPeriod?.status === 'DRAFT') && canAccessHrView && (
                        <div className="h-9 inline-flex items-center border border-amber-200 rounded-xl overflow-hidden shadow-2xs">
                          <select
                            value={effectiveBonusYear}
                            onChange={(e) => setBonusPayoutYear(Number(e.target.value))}
                            disabled={isAddingBonus}
                            className="h-full px-2 text-xs bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-r border-amber-200 dark:border-amber-800"
                            title="ปีของโบนัสที่อนุมัติแล้ว"
                          >
                            {[defaultBonusYear - 1, defaultBonusYear, defaultBonusYear + 1].map((y) => (
                              <option key={y} value={y}>โบนัสปี {y + 543}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleAddBonusPayout}
                            disabled={isAddingBonus || !selectedPeriod}
                            className="h-full inline-flex items-center gap-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="ดึงโบนัสที่อนุมัติแล้วเข้ามาจ่ายในรอบนี้ (ไม่จ่ายซ้ำ)"
                          >
                            {isAddingBonus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                            <span>ดึงโบนัสเข้ารอบนี้</span>
                          </button>
                        </div>
                      )}

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
                            className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-semibold cursor-not-allowed opacity-80"
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
                            className="h-9 inline-flex items-center gap-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
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
                            <span className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 text-slate-600 dark:text-slate-400 border border-slate-200 rounded-xl text-xs font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ปิดรอบเงินเดือนเรียบร้อยแล้ว</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <button
                          disabled
                          className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-semibold cursor-not-allowed opacity-80"
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
                            className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
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
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{selectedPeriod?.status === 'CLOSED' ? 'ปิดรอบเงินเดือนสมบูรณ์แล้ว' : 'CEO อนุมัติรอบนี้เรียบร้อยแล้ว'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500 dark:text-slate-400 border border-slate-200">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>ยังไม่ถึงขั้นตอนการอนุมัติ (รอ HR และการเงิน)</span>
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

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
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">รายการพนักงานและข้อมูลนำเข้า</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-400">คอลัมน์เน้นข้อมูลที่ HR ต้องตรวจสอบก่อนคำนวณ</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
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
                    <span className="text-[11px] text-slate-400 mt-1 block">กำหนดนำส่ง 7 ก.ย. 2569</span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ยอดโอนสุทธิ (Net Pay)</span>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                      ฿{totalNet.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      โอนวันที่ {selectedPeriod?.paymentDate ? '29 ส.ค. 2569' : '-'}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">สถานะการโอน</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {transferredCount} / {totalEmployees}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {transferredCount === totalEmployees ? 'สำเร็จครบทั้งหมด' : `${pendingTransferCount} รายการรอโอน`}
                    </span>
                  </div>
                </div>

                {/* Table: Finance Disbursement & Banking */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">รายการจ่ายเงินเดือน</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-400">คอลัมน์เน้นตัวเลขและสถานะที่ใช้จ่ายจริง/นำส่งบัญชี</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[750px] text-left border-collapse whitespace-nowrap">
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
                    <span className="text-[11px] text-slate-400 mt-1 block">ยอดที่ต้องจ่ายจริง</span>
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
                    <span className="text-[11px] text-slate-400 mt-1 block">ได้รับการคำนวณครบถ้วน</span>
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
                    <span className="text-[11px] text-slate-400 mt-1 block">ผ่านการตรวจจากฝ่ายการเงินแล้ว</span>
                  </div>
                </div>


                {/* Table: Approver Overview */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">สรุปภาพรวมรายบุคคล</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-400">สำหรับผู้บริหารตรวจสอบ</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
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
          </div>
        );
      })()}

      {/* === TAB 5: โอนเงินธนาคาร (Payment Workflow) === */}
      {activeTab === 'bank-transfer' && (
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
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <span>การจ่ายเงินเดือน</span>
                  {selectedPeriod && (
                    <span className="text-slate-400 font-normal">— {selectedPeriod.periodName}</span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  รอบ: {selectedPeriod?.startDate} ถึง {selectedPeriod?.endDate}
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
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">พนักงานทั้งหมด</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{transferList?.totalEmployees ?? selectedPeriod?.employeeCount ?? 0} คน</div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">โอนแล้ว</div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{transferList?.transferredCount ?? selectedPeriod?.totalTransferredCount ?? 0} คน</div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-800/40">
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">รอโอน</div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">{transferList?.pendingCount ?? Math.max(0, (selectedPeriod?.employeeCount ?? 0) - (selectedPeriod?.totalTransferredCount ?? 0))} คน</div>
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
                    <div className="font-bold text-sm">CEO โอนเองทีละคน <span className="text-emerald-300 text-[11px]">(บริษัทนี้)</span></div>
                    <div className="text-xs text-blue-200 mt-1">CEO โอนเงินผ่าน Internet Banking ทีละคน แนบสลิปยืนยัน แล้ว Confirm ทั้งหมด</div>
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
                  <div key={step} className={`p-4 rounded-xl border transition-all ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600 dark:text-slate-400'}`}>
                      {done ? '✓' : step}
                    </div>
                    <div className={`text-xs font-bold ${done ? 'text-emerald-700' : 'text-slate-800 dark:text-slate-200'}`}>{title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>

              {/* Step 2 Confirmation Section */}
              {(selectedPeriod?.bankFileGeneratedAt || selectedPeriod?.status === 'PROCESSING' || selectedPeriod?.status === 'PROCESSING_BANK') && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200/80 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                      <span>ไฟล์โอนเงินพร้อมใช้งาน</span>
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
                      selectedPeriod?.status === 'PROCESSING_BANK'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedPeriod?.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      สถานะ: {selectedPeriod?.status === 'PROCESSING_BANK' ? 'ส่งโอนธนาคารแล้ว (PROCESSING_BANK)' : selectedPeriod?.statusText || selectedPeriod?.status}
                    </span>
                  </div>

                  {selectedPeriod?.status !== 'PAID' && selectedPeriod?.status !== 'PROCESSING_BANK' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>ขั้นตอนที่ 2: ยืนยันว่าธนาคารโอนเงินแล้ว</span>
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed">
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
                    <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-2xl space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-blue-900 text-xs">
                        <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>ขั้นตอนที่ 2 สำเร็จ: ธนาคารโอนเงินเรียบร้อยแล้ว</span>
                      </div>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        ระบบได้รับการยืนยันการโอนเงินจากธนาคารแล้ว ขั้นตอนถัดไปคือ <strong>ขั้นตอนที่ 3: ฝ่ายการเงินตรวจสลิป</strong> โดยฝ่ายการเงินจะแนบไฟล์ใบเสร็จ/สลิปรวมของธนาคาร และยืนยันการจ่ายเงิน (PAID) เพื่อให้ระบบแจ้งสถานะไปยังฝ่ายบุคคล (HR) ในขั้นตอนที่ 4
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Finance Corporate Bank Receipt Upload Zone (Step 3) */}
              {isFinance ? (
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>ขั้นตอนที่ 3: สลิป/ใบเสร็จการโอนเงินรวมของธนาคาร (สำหรับฝ่ายการเงิน/บัญชี)</span>
                    </div>
                    {selectedPeriod?.hasBankReceipt && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
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
                            <span>บันทึกสลิปธนาคาร & ยืนยันการจ่ายเงิน (PAID)</span>
                          </button>
                        </div>
                      ) : !selectedPeriod?.hasBankReceipt && (
                        <div className="pt-2 flex justify-end">
                          <button
                            disabled
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold cursor-not-allowed opacity-80"
                          >
                            <Lock className="w-4 h-4 text-slate-400" />
                            <span>ไม่อนุญาตให้กดยืนยัน (ต้องแนบสลิปหรือไฟล์ใบเสร็จของธนาคารก่อน)</span>
                          </button>
                        </div>
                      )}

                      {/* If receipt was already attached before, allow confirming to PAID */}
                      {selectedPeriod?.hasBankReceipt && !bankReceiptFile && selectedPeriod?.status === 'PROCESSING_BANK' && (
                        <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            แนบสลิปธนาคารเรียบร้อยแล้ว กดปุ่มเพื่อยืนยันการจ่ายเงินและปรับสถานะรอบเงินเดือนเป็น PAID
                          </span>
                          <button
                            onClick={handleMarkPaid}
                            disabled={isConfirmingPayment}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                          >
                            {isConfirmingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            <span>ยืนยันการจ่ายเงิน (เปลี่ยนสถานะเป็น PAID)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                !isFinance && selectedPeriod?.status !== 'PAID' && (
                  selectedPeriod?.hasBankReceipt ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-800 mt-3">
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

              {/* Status Banner when PAID for all roles */}
              {selectedPeriod?.status === 'PAID' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 mt-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-900">ธนาคารโอนเงินให้พนักงานเสร็จเรียบร้อยแล้ว (สถานะ: PAID)</div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">ฝ่ายการเงินตรวจสอบสลิปและปิดยอดแล้ว — ระบบแจ้งสถานะไปยังฝ่ายบุคคล (HR) เรียบร้อยแล้ว</div>
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

          {/* ── PHASE 2b: DIRECT_TRANSFER ── */}
          {selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    รายการโอนเงินรายบุคคล
                    <span className="ml-2 text-slate-400 font-normal text-xs">
                      {transferList?.transferredCount ?? 0}/{transferList?.totalEmployees ?? 0} คน โอนแล้ว
                    </span>
                  </h3>
                </div>

                {/* Confirm Button — only when all transferred and CEO */}
                {isCEO && transferList?.canConfirmPayment && selectedPeriod?.status !== 'PAID' && (
                  <button
                    onClick={() => setConfirmPaymentModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer animate-pulse"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>CEO Confirm การจ่ายเงิน</span>
                  </button>
                )}

                {isCEO && !transferList?.canConfirmPayment && transferList && transferList.totalEmployees > 0 && selectedPeriod?.status !== 'PAID' && (
                  <button
                    disabled
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold cursor-not-allowed opacity-80"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>ไม่สามารถ Confirm ได้ (สลิปยังไม่ครบ {transferList.pendingCount}/{transferList.totalEmployees} คน)</span>
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
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[750px] text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        <th className="py-3 px-4">พนักงาน</th>
                        <th className="py-3 px-4">ธนาคาร / เลขบัญชี</th>
                        <th className="py-3 px-4 text-right">ยอดโอน</th>
                        <th className="py-3 px-4 text-center">Ref No.</th>
                        <th className="py-3 px-4 text-center">สลิป</th>
                        <th className="py-3 px-4 text-center">สถานะ</th>
                        {selectedPeriod?.status !== 'PAID' && isCEO && (
                          <th className="py-3 px-4 text-center">การดำเนินการ</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {!transferList || transferList.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-14 text-center text-slate-400">
                            ยังไม่มีรายการเงินเดือนในรอบนี้
                          </td>
                        </tr>
                      ) : (
                        transferList.items.map((item) => (
                          <tr key={item.payrollId} className="hover:bg-slate-50/50 transition-colors">
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
                                  className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium text-[11px] cursor-pointer transition-colors"
                                  title="ดาวน์โหลด Slip"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>{item.slipFileName || 'slip'}</span>
                                </button>
                              ) : (
                                <span className="text-slate-300 text-[11px]">ยังไม่มีสลิป</span>
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
                            {selectedPeriod?.status !== 'PAID' && isCEO && (
                              <td className="py-3.5 px-4 text-center">
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
          )}



          {/* ── No Period Selected ── */}
          {!selectedPeriod && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">กรุณาเลือกรอบเงินเดือนก่อน</p>
              <button
                onClick={() => setActiveTab('process')}
                className="mt-3 px-4 py-2 bg-[#0B2046] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                ไปที่แท็บประมวลผล
              </button>
            </div>
          )}

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
                    สลิปการโอนเงิน <span className="text-red-500">*</span>
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
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
                      ${slipDragOver ? 'border-[#0B2046] bg-blue-50' : slipFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}
                  >
                    {slipFile ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-700">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div className="text-left">
                          <div className="font-semibold text-sm">{slipFile.name}</div>
                          <div className="text-xs text-emerald-600">{(slipFile.size / 1024).toFixed(1)} KB</div>
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
                    {selectedPeriod?.paymentMethod === 'BANK_BATCH' ? 'ยืนยันว่าธนาคารโอนเงินแล้ว' : 'Confirm การจ่ายเงินเดือน'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {selectedPeriod?.paymentMethod === 'BANK_BATCH'
                      ? 'ยืนยันว่าธนาคารได้โอนเงินเดือนตามไฟล์ Bank Batch เรียบร้อยแล้ว (สถานะจะเปลี่ยนเป็น PROCESSING_BANK เพื่อให้ฝ่ายการเงินตรวจสลิป)'
                      : `ยืนยันว่าโอนเงินเดือนให้พนักงานครบ ${transferList?.totalEmployees} คน พร้อมสลิปครบถ้วนแล้ว`}
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
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
                  <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">รวมเงินที่จ่าย</span>
                    <span className="font-bold text-emerald-700 text-base">
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
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' && !transferList?.canConfirmPayment && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 leading-relaxed">
                    <Lock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>ไม่อนุญาตให้กดโอนเงินเรียบร้อยหรือเปลี่ยนสถานะจนกว่าจะโอนเงินและแนบสลิปครบทุกคน (ยังขาดสลิปอีก {transferList?.pendingCount} คน)</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setConfirmPaymentModalOpen(false); setConfirmPaymentNote(''); }}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' ? handleConfirmPayment : handleConfirmBankTransfer}
                    disabled={isConfirmingPayment || (selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' && !transferList?.canConfirmPayment)}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all inline-flex items-center justify-center gap-2"
                  >
                    {isConfirmingPayment ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>กำลังยืนยัน...</span></>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /><span>{selectedPeriod?.paymentMethod === 'BANK_BATCH' ? 'ยืนยันว่าธนาคารโอนเงินแล้ว' : 'CEO Confirm'}</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* === TAB 7: ภาษี & ประกันสังคม (Tax & SSO Tab) === */}
      {activeTab === 'tax-sso' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-8">
          {/* Header Actions for CSV Reports */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">สรุปรายงาน ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และ ประกันสังคม (สปส. 1-10)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                รอบเงินเดือน: {taxSsoSummary?.periodName || selectedPeriod?.periodName || 'กันยายน 2569'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportTaxSsoCsv('PND1')}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>ส่งออก ภ.ง.ด.1 (CSV)</span>
              </button>

              <button
                onClick={() => handleExportTaxSsoCsv('SSO')}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>ส่งออก สปส. 1-10 (CSV)</span>
              </button>
            </div>
          </div>

          {/* Tax & SSO Summary KPI Cards */}
          {taxSsoSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">รายได้รวมพนักงานทั้งหมด</span>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  ฿{(taxSsoSummary.totalGrossIncome ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                <span className="text-[11px] text-blue-700 font-semibold">ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1)</span>
                <p className="text-lg font-bold text-blue-900 mt-1 font-mono">
                  ฿{(taxSsoSummary.totalWithholdingTax ?? taxSsoSummary.totalPnd1Tax ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40">
                <span className="text-[11px] text-purple-700 font-semibold">ประกันสังคม (ฝ่ายลูกจ้าง 5%)</span>
                <p className="text-lg font-bold text-purple-900 mt-1 font-mono">
                  ฿{(taxSsoSummary.totalSsoEmployee ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40">
                <span className="text-[11px] text-purple-700 font-semibold font-mono">รวมนำส่งประกันสังคม (ลูกจ้าง + นายจ้าง)</span>
                <p className="text-lg font-bold text-purple-900 mt-1 font-mono">
                  ฿{(taxSsoSummary.totalSsoCombined ?? ((taxSsoSummary.totalSsoEmployee ?? 0) + (taxSsoSummary.totalSsoEmployer ?? 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
          {/* Section 1: Tax Brackets */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-700" />
                  <span>ตารางอัตราภาษีเงินได้บุคคลธรรมดาแบบขั้นบันได (ภ.ง.ด. 8 ขั้น)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  อัตราภาษีเงินได้สุทธิสะสมต่อปีตามประมวลรัษฎากรสำหรับคำนวณหักภาษี ณ ที่จ่าย (Withholding Tax)
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canEditTax ? (
                  <button
                    type="button"
                    onClick={() => setIsTaxModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-blue-200 text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 transition-all shadow-2xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไขอัตราภาษี</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 dark:text-slate-400 border border-slate-200">
                    <Lock className="w-3 h-3" />
                    สิทธิ์ดูอย่างเดียว
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    <th className="py-3.5 px-4">ขั้นบันไดภาษี</th>
                    <th className="py-3.5 px-4 text-right">เงินได้สุทธิตั้งแต่</th>
                    <th className="py-3.5 px-4 text-right">ถึงเงินได้สุทธิ</th>
                    <th className="py-3.5 px-4 text-center">อัตราภาษี (%)</th>
                    <th className="py-3.5 px-4 text-right">ภาษีสะสมขั้นก่อนหน้า</th>
                    <th className="py-3.5 px-4 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {taxBrackets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{t.bracketName}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                        ฿{t.incomeFrom.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                        {t.incomeTo != null
                          ? `฿${t.incomeTo.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : 'ขึ้นไป (ไม่จำกัด)'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-700">
                        {(t.taxRate * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                        ฿{t.baseTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Social Security Rates */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-700" />
                  <span>เกณฑ์และอัตราเงินสมทบกองทุนประกันสังคม (Social Security Fund)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  อัตราเงินสมทบฝ่ายลูกจ้างและนายจ้าง พร้อมฐานเพดานค่าจ้างขั้นต่ำและสูงสุดตามกฎหมาย
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canEditSso ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSsoRate(ssoRates.find(s => s.status === 'ACTIVE') || ssoRates[0] || null);
                      setIsSsoModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-purple-200 text-xs font-bold text-purple-700 bg-purple-50/70 hover:bg-purple-100/70 transition-all shadow-2xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไขอัตราประกันสังคม</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 dark:text-slate-400 border border-slate-200">
                    <Lock className="w-3 h-3" />
                    สิทธิ์ดูอย่างเดียว
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full min-w-[800px] text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    <th className="py-3.5 px-4">ชื่อเกณฑ์</th>
                    <th className="py-3.5 px-4 text-center">สมทบฝ่ายผู้ประกันตน (%)</th>
                    <th className="py-3.5 px-4 text-center">สมทบฝ่ายนายจ้าง (%)</th>
                    <th className="py-3.5 px-4 text-right">ฐานค่าจ้างต่ำสุด</th>
                    <th className="py-3.5 px-4 text-right">เพดานค่าจ้างสูงสุด</th>
                    <th className="py-3.5 px-4 text-center">วันที่มีผล</th>
                    <th className="py-3.5 px-4 text-center">สถานะ</th>
                    <th className="py-3.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {ssoRates.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{s.rateName}</td>
                      <td className="py-3 px-4 text-center font-bold text-purple-700">
                        {(s.employeeContributionPercent * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-purple-700">
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
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {canEditSso ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEditSsoRate(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                            title="แก้ไขเกณฑ์นี้"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>แก้ไข</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">สร้างรอบเงินเดือนใหม่</h3>
              <button
                onClick={() => setIsCreatePeriodModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePeriodSubmit} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">ชื่อรอบเงินเดือน</label>
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
                  <span>ระบบจะเปลี่ยนชื่อรอบและวันที่คำนวณให้อัตโนมัติตามเดือนและปีที่เลือก (สามารถพิมพ์แก้ไขชื่อได้ตามต้องการ)</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ปี (ค.ศ.)</label>
                  <input
                    type="number"
                    required
                    value={newPeriodForm.year}
                    onChange={(e) => handleYearChange(parseInt(e.target.value) || 2026)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">เดือน (1-12)</label>
                  <select
                    value={newPeriodForm.month}
                    onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium cursor-pointer"
                  >
                    {THAI_MONTH_NAMES.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1} - {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real-time Duplicate Period Warning Banner */}
              {(() => {
                const duplicate = periods.find(
                  p => p.year === newPeriodForm.year && p.month === newPeriodForm.month
                );
                if (!duplicate) return null;
                return (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl flex items-start gap-3 animate-in fade-in duration-150">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-amber-900 text-xs">
                        รอบเงินเดือนประจำเดือน {THAI_MONTH_NAMES[newPeriodForm.month - 1]} {newPeriodForm.year + 543} มีอยู่ในระบบแล้ว!
                      </div>
                      <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                        รอบนี้มีบันทึกอยู่ในระบบแล้ว (สถานะปัจจุบัน:{' '}
                        <span className="font-bold px-1.5 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                          {duplicate.status}
                        </span>
                        ) ระบบไม่อนุญาตให้สร้างงวดเดือนเดียวกันซ้ำได้
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPeriod(duplicate);
                          setIsCreatePeriodModalOpen(false);
                          showToast(`สลับไปยัง ${duplicate.periodName} เรียบร้อยแล้ว`);
                        }}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>เปิดดูรอบเงินเดือนนี้ทันที</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">วันเริ่มคำนวณ</label>
                  <input
                    type="date"
                    required
                    value={newPeriodForm.startDate}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">วันสิ้นสุดคำนวณ</label>
                  <input
                    type="date"
                    required
                    value={newPeriodForm.endDate}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">วันกำหนดจ่ายเงิน</label>
                <input
                  type="date"
                  value={newPeriodForm.paymentDate}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">วันตัดรอบเงินเบิกสวัสดิการ</label>
                <input
                  type="date"
                  value={newPeriodForm.claimCutoffDate}
                  max={newPeriodForm.paymentDate || newPeriodForm.endDate || undefined}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, claimCutoffDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  คำขอเบิกที่อนุมัติไม่เกินวันนี้จะจ่ายในรอบนี้ ที่อนุมัติหลังจากนั้นไปรอบถัดไป · เว้นว่าง = ใช้วันกำหนดจ่ายเงิน
                </p>
              </div>

              {/* Attendance Data Integration Info */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-blue-900">
                    ข้อมูลเวลาเข้างานสำหรับการประมวลผล (Attendance Integration)
                  </div>
                  <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                    ระบบจะเชื่อมโยงข้อมูลเวลาเข้างานและสถิติขาด/ลา/มาสายที่อัปโหลดผ่านไฟล์ Excel ในช่วงวันที่{' '}
                    <span className="font-bold">{newPeriodForm.startDate || '-'}</span> ถึง{' '}
                    <span className="font-bold">{newPeriodForm.endDate || '-'}</span> มาใช้คำนวณเบี้ยขยันและรายการหักโดยอัตโนมัติ
                  </p>
                  <Link
                    href="/attendance/daily?tab=import"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-semibold mt-1"
                  >
                    <span>อัปโหลดหรือระบุรอบไฟล์บันทึกเวลาที่นี่</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatePeriodModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-medium"
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
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">รอบเงินเดือนทั้งหมด</h3>
                    <span className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                      ทั้งหมด {periods.length} รอบ
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    รายการรอบระยะเวลาการคำนวณและจ่ายเงินเดือนทั้งหมดในระบบ
                  </p>
                </div>
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
                  <table className="w-full text-left border-collapse text-xs">
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
                                {isCurrent && (
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
                              {p.startDate} ถึง {p.endDate}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {p.paymentDate || '-'}
                            </td>
                            <td className="py-3 px-4 text-center font-semibold">
                              {p.employeeCount != null ? `${p.employeeCount} คน` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              {p.totalNetSalary != null ? `฿${p.totalNetSalary.toLocaleString()}` : '-'}
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
    </div>
  );
}

