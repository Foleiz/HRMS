'use client';

import React, { useState, useEffect } from 'react';
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
  Percent,
  CheckCircle,
  CheckCircle2,
  Loader2,
  Building2,
  Briefcase,
  Layers,
  FileSpreadsheet,
  Banknote,
  Gift,
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
  Landmark,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import { salaryService } from '@/services/salaryService';
import { organizationService } from '@/services/organizationService';
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
  EmployeeBonus,
  PayrollTransferList,
  PayrollTransferItem,
} from '@/types/payroll';
import { Position, EmployeeLevel, Department } from '@/types/organization';
import { SalaryStructureModal } from '@/components/payroll/SalaryStructureModal';
import { PayrollItemModal } from '@/components/payroll/PayrollItemModal';
import { AdjustSalaryModal } from '@/components/payroll/AdjustSalaryModal';
import { SalaryHistoryModal } from '@/components/payroll/SalaryHistoryModal';
import { PayrollDetailDrawer } from '@/components/payroll/PayrollDetailDrawer';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PayrollViewSwitcher, PayrollViewMode } from '@/components/payroll/PayrollViewSwitcher';

type ActiveTab =
  | 'overview'
  | 'structures'
  | 'items'
  | 'process'
  | 'bank-transfer'
  | 'bonus'
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
  pageSizeOptions = [5, 10, 20, 50],
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
    <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-white">
      {/* Left: Summary and Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-slate-500">
        <span>
          แสดง <strong className="font-semibold text-slate-800">{startIndex} - {endIndex}</strong> จากทั้งหมด{' '}
          <strong className="font-semibold text-slate-800">{totalCount}</strong> {unitText}
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
            className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer shadow-2xs transition-colors"
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
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="หน้าก่อนหน้า"
        >
          ←
        </button>

        {pageNumbers[0] > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="w-7 h-7 rounded-lg font-semibold flex items-center justify-center border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
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
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
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
              className="w-7 h-7 rounded-lg font-semibold flex items-center justify-center border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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

  const isCEO =
    user?.roles?.includes('CEO') ||
    user?.roles?.includes('ADMIN') ||
    user?.username?.toLowerCase().includes('ceo') ||
    user?.username?.toLowerCase().includes('approver') ||
    hasRole('CEO') ||
    hasRole('ADMIN');

  const isFinance =
    user?.roles?.some((r: string) => 
      r.toLowerCase().includes('finance') || 
      r.toLowerCase().includes('account') || 
      r.toUpperCase() === 'PAYROLL_ADMIN'
    ) ||
    user?.username?.toLowerCase().includes('finance') ||
    user?.username?.toLowerCase().includes('account') ||
    user?.roles?.includes('ADMIN') ||
    hasRole('ADMIN') ||
    hasRole('PAYROLL_ADMIN');

  const isHR =
    user?.roles?.some((r: string) => r.toLowerCase().includes('hr')) ||
    user?.username?.toLowerCase().includes('hr') ||
    hasRole('HR_MGR') ||
    hasRole('HR_ADMIN') ||
    user?.roles?.includes('ADMIN') ||
    hasRole('ADMIN');

  const { setBreadcrumb } = useBreadcrumb();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [viewMode, setViewMode] = useState<PayrollViewMode>('ALL');
  const [processSubTab, setProcessSubTab] = useState<'HR' | 'FINANCE' | 'APPROVER'>('HR');

  // Auto-detect role strictly from logged-in user profile
  const usernameLower = user?.username?.toLowerCase() || '';
  const userRolesList = user?.roles?.map((r: string) => r.toUpperCase()) || [];
  const isStrictFinanceUser =
    usernameLower.includes('finance') ||
    usernameLower.includes('account') ||
    userRolesList.some(r => r.includes('FINANCE') || r.includes('ACCOUNT'));
  const isStrictCeoUser =
    usernameLower.includes('ceo') ||
    usernameLower.includes('approver') ||
    (userRolesList.includes('CEO') && !userRolesList.includes('ADMIN'));
  const isStrictHrUser =
    usernameLower.includes('hr') ||
    userRolesList.some(r => r.includes('HR'));

  useEffect(() => {
    if (isStrictFinanceUser && !isStrictHrUser) {
      setProcessSubTab('FINANCE');
      setViewMode('FINANCE');
    } else if (isStrictCeoUser && !isStrictHrUser) {
      setProcessSubTab('APPROVER');
      setViewMode('ALL');
    } else if (isStrictHrUser && !isStrictFinanceUser) {
      setProcessSubTab('HR');
      setViewMode('HR');
    } else if (isStrictFinanceUser) {
      setProcessSubTab('FINANCE');
      setViewMode('FINANCE');
    } else if (isStrictCeoUser) {
      setProcessSubTab('APPROVER');
      setViewMode('ALL');
    } else {
      setProcessSubTab('HR');
      setViewMode('ALL');
    }
  }, [user?.username, isStrictHrUser, isStrictFinanceUser, isStrictCeoUser]);

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
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
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
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [isPeriodLoading, setIsPeriodLoading] = useState(false);
  const [selectedPayrollRecord, setSelectedPayrollRecord] = useState<PayrollRecord | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [processPage, setProcessPage] = useState<number>(1);
  const [processPageSize, setProcessPageSize] = useState<number>(10);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreatePeriodModalOpen, setIsCreatePeriodModalOpen] = useState(false);
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isPeriodNameCustom, setIsPeriodNameCustom] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState(() => ({
    year: 2026,
    month: 8,
    periodName: 'รอบเดือนสิงหาคม 2569',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    paymentDate: '2026-08-29',
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

  // Tab 6: Bonus state
  const [bonuses, setBonuses] = useState<EmployeeBonus[]>([]);
  const [bonusMultiplierInput, setBonusMultiplierInput] = useState<number>(1.5);
  const [isCalculatingBonus, setIsCalculatingBonus] = useState<boolean>(false);

  // Tab 7: Tax & SSO state
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
        const targetPeriod = periodsData.find((p) => p.year === 2026 && p.month === 9) || periodsData[0];
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

  // Dynamic fetch when switching to Bank Transfer, Tax/SSO, or Bonus tab
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
    } else if (activeTab === 'bonus') {
      loadBonuses(selectedPeriod.year);
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

  const loadBonuses = async (year?: number) => {
    try {
      const bonusData = await salaryService.getEmployeeBonuses(year || 2026);
      setBonuses(bonusData || []);
    } catch (err) {
      console.error('Failed to load bonuses:', err);
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
            showToast('🏦 อัปโหลดสลิปธนาคารและยืนยันรอบเงินเดือนเป็น PAID สำเร็จ!');
          } else {
            showToast('📄 อัปโหลดสลิป/ใบเสร็จธนาคารเรียบร้อยแล้ว (ขั้นตอนที่ 3 เสร็จสิ้น)');
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
      showToast('❌ ไม่อนุญาตให้กดยืนยัน: ต้องแนบสลิปหรือไฟล์ใบเสร็จของธนาคารก่อน');
      return;
    }
    setIsConfirmingPayment(true);
    try {
      const updated = await salaryService.updatePayrollPeriodStatus(selectedPeriod.id, 'PAID');
      setSelectedPeriod(updated);
      setPeriods(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      showToast('🎉 ยืนยันรอบเงินเดือนเข้าสู่สถานะ PAID เรียบร้อยแล้ว (ขั้นตอนที่ 4 เสร็จสิ้น)');
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
      showToast('📁 ดาวน์โหลดไฟล์ธนาคารสำเร็จ สถานะเปลี่ยนเป็น PROCESSING');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างไฟล์ธนาคาร');
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
      showToast('🏦 ยืนยันธนาคารโอนเงินเรียบร้อยแล้ว (ขั้นตอนที่ 2 เสร็จสิ้น -> รอดำเนินการขั้นตอนที่ 3: ฝ่ายการเงินตรวจสลิป/ใบเสร็จ)');
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

  // Handler: Calculate Employee Bonuses
  const handleCalculateBonusesSubmit = async () => {
    try {
      setIsCalculatingBonus(true);
      const targetYear = selectedPeriod?.year || 2026;
      const res = await salaryService.calculateEmployeeBonuses({
        year: targetYear,
        defaultMultiplier: bonusMultiplierInput,
      });
      setBonuses(res || []);
      showToast(`คำนวณและจัดสรรโบนัสประจำปี ${targetYear} (ตัวคูณ ${bonusMultiplierInput}x) สำเร็จ`);
    } catch (err) {
      console.error('Failed to calculate bonuses:', err);
      showToast('เกิดข้อผิดพลาดในการคำนวณโบนัส');
    } finally {
      setIsCalculatingBonus(false);
    }
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

  const handleCreatePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingPeriod) return;
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
      showToast(err?.message || err?.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างรอบเงินเดือน');
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
      case 'bonus':
        return 'โบนัส';
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
    ...(viewMode === 'ALL' || viewMode === 'HR' ? [{ id: 'bonus' as ActiveTab, label: 'โบนัส' }] : []),
    ...(viewMode === 'ALL' || viewMode === 'FINANCE' ? [{ id: 'tax-sso' as ActiveTab, label: 'ภาษี & ประกันสังคม' }] : []),
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200" onClick={() => setOpenActionMenuId(null)}>
      {/* Role & View Mode Switcher */}
      <PayrollViewSwitcher
        currentMode={viewMode}
        onModeChange={setViewMode}
        isHR={isHR}
        isFinance={isFinance}
        userRoles={user?.roles || []}
      />

      {/* Sub Navigation Bar - Standardized to Employee Module */}
      <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {visibleNavTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === t.id
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
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
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between relative hover:border-slate-200 transition-all">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">ยอดเงินเดือนรวมเดือนนี้</span>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  ฿{overview?.currentMonthTotal?.toLocaleString() || '1,842,300'}
                </div>
                <span className="text-xs text-slate-400">
                  {overview?.currentMonthPeriod || 'รอบ ส.ค. 2569'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl border-2 border-blue-400 bg-blue-50/50 text-blue-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Card 2: พนักงานที่คำนวณแล้ว */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between hover:border-slate-200 transition-all">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">พนักงานที่คำนวณแล้ว</span>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {overview ? `${overview.calculatedEmployeesCount}/${overview.totalEmployeesCount}` : '118/145'}
                </div>
                <span className="text-xs text-slate-400">
                  คิดเป็น {overview?.calculatedPercentage || 81}%
                </span>
              </div>

              <div className="w-9 h-9 rounded-xl bg-slate-100/90 text-slate-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>

            {/* Card 3: รอตรวจสอบ/อนุมัติ */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between hover:border-slate-200 transition-all">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">รอตรวจสอบ/อนุมัติ</span>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {overview ? `${overview.pendingApprovalCount} คน` : '27 คน'}
                </div>
                <span className="text-xs text-slate-400">ต้องดำเนินการก่อนปิดรอบ</span>
              </div>

              <div className="w-9 h-9 rounded-xl bg-slate-100/90 text-slate-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* Card 4: กำหนดปิดรอบถัดไป */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between hover:border-slate-200 transition-all">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">กำหนดปิดรอบถัดไป</span>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {overview?.nextClosingDate || '29 ส.ค. 2569'}
                </div>
                <span className="text-xs text-slate-400">
                  เหลืออีก {overview?.remainingDays != null ? overview.remainingDays : 2} วัน
                </span>
              </div>

              <div className="w-9 h-9 rounded-xl bg-slate-100/90 text-slate-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Section: รอบเงินเดือนล่าสุด */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900">รอบเงินเดือนล่าสุด</h2>
              <button
                onClick={() => setActiveTab('process')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span>ดูทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {(overview?.recentPeriods && overview.recentPeriods.length > 0
                ? overview.recentPeriods
                : [
                    {
                      periodName: 'รอบเดือนสิงหาคม 2569',
                      totalAmount: 1842300,
                      status: 'PENDING_REVIEW',
                      statusText: 'รอตรวจสอบ',
                    },
                    {
                      periodName: 'รอบเดือนกรกฎาคม 2569',
                      totalAmount: 1798650,
                      status: 'CALCULATED',
                      statusText: 'คำนวณแล้ว',
                    },
                    {
                      periodName: 'รอบเดือนมิถุนายน 2569',
                      totalAmount: 1776900,
                      status: 'CALCULATED',
                      statusText: 'คำนวณแล้ว',
                    },
                    {
                      periodName: 'รอบเดือนพฤษภาคม 2569',
                      totalAmount: 1742200,
                      status: 'CALCULATED',
                      statusText: 'คำนวณแล้ว',
                    },
                  ]
              ).map((p, idx) => (
                <div key={idx} className="py-4 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{p.periodName}</span>
                  <div className="flex items-center gap-8">
                    <span className="font-bold text-slate-900 font-mono">
                      ฿{p.totalAmount.toLocaleString()}
                    </span>
                    <span
                      className={`inline-flex items-center px-3.5 py-1 rounded-xl text-xs font-semibold min-w-[90px] justify-center ${
                        p.status === 'PENDING_REVIEW'
                          ? 'bg-[#FEECE5] text-[#EA580C] border border-[#FDBA74]/40'
                          : 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC]/40'
                      }`}
                    >
                      {p.statusText}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === TAB 2: โครงสร้างเงินเดือน (Salary Structure & Employees) - Matches media_1789453480755.png === */}
      {activeTab === 'structures' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
          {/* Header matching mockup: Title on left, "+ เพิ่ม" button on right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900">โครงสร้างเงินเดือน</h2>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setStructureSubTab('positions')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    structureSubTab === 'positions'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  กรอบโครงสร้าง ({structures.length})
                </button>
                <button
                  onClick={() => setStructureSubTab('employees')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    structureSubTab === 'employees'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
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
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
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
                        paginatedStructures.map((s) => {
                        const isStructureActive = s.status ? s.status.toUpperCase() === 'ACTIVE' : true;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 px-5 font-medium text-slate-800">
                              {s.levelName || s.positionName || 'ระดับปฏิบัติการ'}
                            </td>
                            <td className="py-4 px-5 font-medium text-slate-700">
                              ฿{s.minSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-5 font-medium text-slate-700">
                              ฿{s.maxSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-5 font-medium text-slate-700">
                              ฿{(s.positionAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-5">
                              {isStructureActive ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 font-medium">
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
                            <td className="py-4 px-5 text-right relative">
                              <div className="inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionMenuId(openActionMenuId === s.id ? null : s.id);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openActionMenuId === s.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20"
                                      onClick={() => setOpenActionMenuId(null)}
                                    />
                                    <div className="absolute right-0 mt-1 w-28 bg-white border border-slate-100 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in zoom-in-95">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          handleOpenEditStructure(s);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                                        <span>แก้ไข</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          setStructureToDelete(s);
                                          setDeleteConfirmOpen(true);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>ลบ</span>
                                      </button>
                                    </div>
                                  </>
                                )}
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
                  pageSizeOptions={[5, 10, 20, 50]}
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
                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
                      />
                    </div>

                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
                    >
                      <option value="">-- ทุกแผนก --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.departmentName}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleFilterEmployees}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      ค้นหา
                    </button>
                  </div>

                  <div className="text-xs text-slate-500">
                    แสดง <span className="font-bold text-slate-800">{employees.length}</span> คน
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
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
                              <div className="font-semibold text-slate-900">{emp.employeeName}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{emp.employeeCode}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-800 text-xs font-medium">
                                {emp.departmentName || 'ไม่ระบุแผนก'}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {emp.positionName || 'ไม่ระบุตำแหน่ง'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {hasSalary ? (
                                <span className="font-bold text-slate-900 font-mono text-xs">
                                  ฿{emp.currentSalary?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                                  ยังไม่ระบุ
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center text-xs text-slate-500 font-mono">
                              {emp.currentEffectiveFrom || '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              {emp.salaryStructureMin != null && emp.salaryStructureMax != null ? (
                                <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  ฿{emp.salaryStructureMin.toLocaleString()} - ฿{emp.salaryStructureMax.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
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
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                  pageSizeOptions={[5, 10, 20, 50]}
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
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              รายการรายได้
            </button>
            <button
              onClick={() => setItemsSubTab('DEDUCTION')}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                itemsSubTab === 'DEDUCTION'
                  ? 'bg-[#0B2046] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              รายการรายหัก
            </button>
          </div>

          {/* 2 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">รายการทั้งหมด</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {payrollItems.filter((i) => i.itemType === itemsSubTab).length} รายการ
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">เปิดใช้งานอยู่</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
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
                          case 'OT_STANDARD':
                            return { label: 'OT 1.5x / 3x กฎหมายแรงงาน', color: 'bg-amber-50 text-amber-800 border-amber-200' };
                          case 'PERCENT_SALES':
                            return { label: 'คอมมิชชั่น % ยอดขาย', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
                          case 'DILIGENT_ALLOWANCE':
                            return { label: 'เบี้ยขยัน (เงื่อนไขขาด/สาย)', color: 'bg-teal-50 text-teal-800 border-teal-200' };
                          case 'PRORATED_DAYS':
                            return { label: 'สัดส่วนวันทำงานจริง', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
                          case 'MANUAL_BONUS':
                            return { label: 'โบนัสพิเศษ / Incentive', color: 'bg-pink-50 text-pink-800 border-pink-200' };
                          case 'SSO_STANDARD':
                            return { label: 'ประกันสังคม 5% (สูงสุด 750)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
                          case 'TAX_STANDARD':
                            return { label: 'ภ.ง.ด. 91 ขั้นบันได 8 ขั้น', color: 'bg-rose-50 text-rose-700 border-rose-200' };
                          case 'LATE_ABSENT':
                            return { label: 'หักตามเวลาสาย/ขาดจริง', color: 'bg-orange-50 text-orange-800 border-orange-200' };
                          case 'PERCENT_SALARY':
                            return { label: 'PVD / % เงินเดือน', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                          case 'STAFF_LOAN':
                            return { label: 'หักเงินกู้ยืมสวัสดิการ', color: 'bg-slate-50 text-slate-700 border-slate-200' };
                          case 'CUSTOM_FORMULA':
                            return { label: 'สูตรกำหนดเอง', color: 'bg-slate-50 text-slate-700 border-slate-200' };
                          default:
                            return null;
                        }
                      };
                      const templateBadge = item.calculationType === 'FORMULA' ? getTemplateBadge(item.formulaTemplate) : null;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-slate-900 text-xs">{item.itemName}</div>
                            {item.description && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                item.calculationType === 'FORMULA'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : item.calculationType === 'FIXED'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {calcTypeLabel}
                              </span>
                              {templateBadge && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${templateBadge.color}`}>
                                  {templateBadge.label}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-xs text-slate-700 font-medium">
                            {item.formulaValue || '-'}
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
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 font-medium">
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
        const totalOtHours = payrolls.reduce((sum, p) => sum + (p.overtimeHours || 0), 0);
        const otCount = payrolls.filter(p => (p.overtimeHours || 0) > 0).length;

        const totalGross = payrolls.reduce((acc, p) => acc + (p.totalGrossIncome || 0), 0);
        const totalSso = payrolls.reduce((acc, p) => acc + Math.min((p.totalGrossIncome || 0) * 0.05, 750), 0);
        const totalTax = payrolls.reduce((acc, p) => acc + Math.max(0, (p.totalDeductionAmount || 0) - Math.min((p.totalGrossIncome || 0) * 0.05, 750)), 0);
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
            {/* ── TOP ROLE BANNER (Clean White Style - Auto by Logged-in User) ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">เงินเดือน / ประมวลเงินเดือน</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs font-bold text-slate-700">รอบเงินเดือน : {selectedPeriod?.periodName || 'งวดปัจจุบัน'}</span>
                  </div>
                  <h1 className="text-lg font-bold mt-1 text-slate-900 flex items-center gap-2">
                    {processSubTab === 'HR' && 'เตรียมข้อมูลก่อนคำนวณเงินเดือน'}
                    {processSubTab === 'FINANCE' && 'ตรวจสอบยอดและจ่ายเงินเดือน'}
                    {processSubTab === 'APPROVER' && 'สรุปภาพรวมและอนุมัติรอบเงินเดือน'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {processSubTab === 'HR' && 'มุมมองฝ่ายบุคคล: ตรวจสอบวันลา OT และรายการที่กระทบเงินเดือน ก่อนกดคำนวณส่งต่อให้ฝ่ายการเงิน'}
                    {processSubTab === 'FINANCE' && 'มุมมองฝ่ายการเงิน: ยืนยันยอดจ่ายสุทธิ นำส่งภาษี/ประกันสังคม และดาวน์โหลดไฟล์โอนเงินผ่านธนาคาร'}
                    {processSubTab === 'APPROVER' && 'มุมมองผู้อนุมัติ (CEO): ตรวจสอบความถูกต้องของยอดรวมและภาระภาษี ก่อนลงนามอนุมัติให้การเงินดำเนินการจ่าย'}
                  </p>
                </div>


              </div>

              {/* 4-Step Workflow Stepper (White Card Theme) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-4 mt-4 border-t border-slate-100">
                {[
                  { step: 1, title: '1. HR เตรียมข้อมูล & คำนวณ', desc: 'ตรวจวันลา/OT แล้วกดคำนวณ' },
                  { step: 2, title: '2. การเงินตรวจทาน & ขออนุมัติ', desc: 'ตรวจยอด Gross/Net ส่งขออนุมัติ' },
                  { step: 3, title: '3. CEO อนุมัติรอบเงินเดือน', desc: 'ผู้บริหารตรวจสอบและอนุมัติ' },
                  { step: 4, title: '4. โอนเงิน & ปิดรอบ', desc: 'ส่งไฟล์ธนาคารและแนบสลิป' },
                ].map((s) => {
                  const isDone = currentStep > s.step;
                  const isCurrent = currentStep === s.step;
                  return (
                    <div
                      key={s.step}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300/60 shadow-2xs'
                          : isDone
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-slate-50/60 border-slate-200/70 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isDone
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                              ? 'bg-amber-500 text-white animate-pulse'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isDone ? '✓' : s.step}
                        </span>
                        <span className={`text-xs font-bold ${isCurrent ? 'text-amber-900' : isDone ? 'text-emerald-800' : 'text-slate-600'}`}>
                          {s.title}
                        </span>
                      </div>
                      <p className={`text-[10px] mt-1 pl-7 ${isCurrent ? 'text-amber-700' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {s.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── SUB-HEADER BAR (Dropdown & Actions) ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    {periods.length > 0 ? (
                      <div className="relative inline-block">
                        <select
                          value={selectedPeriod?.id || ''}
                          onChange={(e) => handlePeriodChange(Number(e.target.value))}
                          className="appearance-none font-bold text-slate-900 text-sm bg-transparent pr-8 py-1 focus:outline-none cursor-pointer"
                        >
                          {periods.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.periodName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-1 text-slate-500 font-bold text-sm">
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
                            : 'bg-slate-200 text-slate-700'
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
                      <span className="text-slate-600 font-medium">
                        {selectedPeriod
                          ? (selectedPeriod.month === 8 && selectedPeriod.year === 2026
                              ? '1 ส.ค. 2569 - 31 ส.ค. 2569'
                              : `${selectedPeriod.startDate || '-'} - ${selectedPeriod.endDate || '-'}`)
                          : '-'}
                      </span>
                    </span>
                    <span>
                      วันจ่ายเงิน:{' '}
                      <span className="text-slate-600 font-medium">
                        {selectedPeriod?.paymentDate
                          ? (selectedPeriod.month === 8 && selectedPeriod.year === 2026 ? '29 ส.ค. 2569' : selectedPeriod.paymentDate)
                          : '-'}
                      </span>
                    </span>
                    <span>
                      พนักงานในรอบ:{' '}
                      <span className="text-slate-600 font-medium">{payrolls.length} คน</span>
                    </span>
                  </div>
                </div>

                {/* Top Action Buttons contextualized by View */}
                <div className="flex flex-wrap items-center gap-2">
                  {processSubTab === 'HR' && (
                    <>
                      <button
                        onClick={handleOpenCreatePeriodModal}
                        className="h-9 inline-flex items-center gap-1.5 px-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500" />
                        <span>สร้างรอบเงินเดือน</span>
                      </button>

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
                            <span>🔒 ส่งให้การเงิน (ต้องคำนวณก่อน)</span>
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

                      {selectedPeriod?.status === 'APPROVED' || selectedPeriod?.status === 'PAID' ? (
                        <>
                          <button
                            onClick={handleDownloadBankFile}
                            disabled={isExportingBankFile}
                            className="h-9 inline-flex items-center gap-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
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
                        </>
                      ) : (
                        <button
                          disabled
                          className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-semibold cursor-not-allowed opacity-80"
                          title="รอ CEO อนุมัติรอบเงินเดือนก่อนดาวน์โหลดไฟล์จ่ายเงิน"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>🔒 ไฟล์โอนเงินธนาคาร (รอ CEO อนุมัติ)</span>
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
                      ) : selectedPeriod?.status === 'APPROVED' || selectedPeriod?.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>CEO อนุมัติรอบนี้เรียบร้อยแล้ว</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
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
            {processSubTab === 'HR' && (
              <div className="space-y-4">
                {/* Title and Scope Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      สำหรับ HR
                    </div>
                    <h2 className="text-base font-bold text-slate-900">เตรียมข้อมูลก่อนคำนวณเงินเดือน</h2>
                    <p className="text-xs text-slate-500">
                      ตรวจสอบวันลา OT และรายการที่กระทบเงินเดือน ก่อนกดคำนวณส่งต่อให้ฝ่ายการเงิน
                    </p>
                  </div>
                </div>

                {/* 4 Stat Cards for HR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">พนักงานในรอบ</span>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">
                      {totalEmployees} <span className="text-sm font-normal text-slate-500">คน</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">ทุกแผนก</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">ข้อมูลยังไม่ครบ</span>
                    <div className={`text-2xl font-bold mt-1 ${pendingCheckCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {pendingCheckCount} <span className="text-sm font-normal text-slate-500">คน</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {pendingCheckCount > 0 ? 'รอ HR ตรวจสอบวันลา' : 'ข้อมูลพนักงานครบถ้วน'}
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">วันลารวมในรอบ</span>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">
                      {totalLeaveDays} <span className="text-sm font-normal text-slate-500">วัน</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">จากคำร้องลาที่ได้รับอนุมัติ</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">ชั่วโมง OT รวม</span>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">
                      {totalOtHours.toFixed(1)} <span className="text-sm font-normal text-slate-500">ชม.</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {otCount} คนมี OT ในรอบนี้
                    </span>
                  </div>
                </div>

                {/* Table: HR Data Input Verification */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">รายการพนักงานและข้อมูลนำเข้า</h3>
                    <span className="text-xs text-slate-400">คอลัมน์เน้นข้อมูลที่ HR ต้องตรวจสอบก่อนคำนวณ</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
                          <th className="py-3.5 px-5">พนักงาน</th>
                          <th className="py-3.5 px-5">แผนก</th>
                          <th className="py-3.5 px-5">วันลา</th>
                          <th className="py-3.5 px-5 text-center">OT (ชม.)</th>
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
                                <div className="font-semibold text-slate-900">{pr.employeeName}</div>
                                <div className="font-mono text-slate-400 text-[11px]">{pr.employeeCode}</div>
                              </td>
                              <td className="py-4 px-5 text-slate-600">{pr.departmentName}</td>
                              <td className="py-4 px-5">
                                {pr.leaveDays && pr.leaveDays > 0 ? (
                                  <div>
                                    <span className="font-semibold text-slate-900">{pr.leaveDays} วัน</span>
                                    {pr.leaveSummary && (
                                      <div className="text-[11px] text-slate-400">{pr.leaveSummary}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-4 px-5 text-center font-mono font-medium text-slate-700">
                                {pr.overtimeHours && pr.overtimeHours > 0 ? `${pr.overtimeHours.toFixed(1)}` : '-'}
                              </td>
                              <td className="py-4 px-5 text-slate-600">
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
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                    pageSizeOptions={[5, 10, 20, 50]}
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
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                      สำหรับฝ่ายการเงิน
                    </div>
                    <h2 className="text-base font-bold text-slate-900">ตรวจสอบยอดและจ่ายเงินเดือน</h2>
                    <p className="text-xs text-slate-500">
                      ยืนยันยอดจ่ายสุทธิ นำส่งภาษี/ประกันสังคม และดาวน์โหลดไฟล์โอนเงินผ่านธนาคาร
                    </p>
                  </div>
                </div>

                {/* 4 Stat Cards for Finance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">ยอดจ่ายรวม (Gross)</span>
                    <div className="text-2xl font-bold text-amber-700 mt-1">
                      ฿{totalGross.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">{totalEmployees} คน</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">ภาษี + ประกันสังคมที่ต้องนำส่ง</span>
                    <div className="text-2xl font-bold text-rose-600 mt-1">
                      ฿{taxAndSso.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">กำหนดนำส่ง 7 ก.ย. 2569</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">ยอดโอนสุทธิ (Net Pay)</span>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                      ฿{totalNet.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      โอนวันที่ {selectedPeriod?.paymentDate ? '29 ส.ค. 2569' : '-'}
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">สถานะการโอน</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {transferredCount} / {totalEmployees}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {transferredCount === totalEmployees ? 'สำเร็จครบทั้งหมด' : `${pendingTransferCount} รายการรอโอน`}
                    </span>
                  </div>
                </div>

                {/* Table: Finance Disbursement & Banking */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">รายการจ่ายเงินเดือน</h3>
                    <span className="text-xs text-slate-400">คอลัมน์เน้นตัวเลขและสถานะที่ใช้จ่ายจริง/นำส่งบัญชี</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
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
                                <div className="font-semibold text-slate-900">{pr.employeeName}</div>
                                <div className="font-mono text-slate-400 text-[11px]">{pr.employeeCode}</div>
                              </td>
                              <td className="py-4 px-5">
                                <div className="font-medium text-slate-800">{pr.bankName || 'ธนาคารกสิกรไทย'}</div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  {pr.accountNumber ? `xxx-x-x${pr.accountNumber.slice(-4)}-x` : 'xxx-x-x4821-x'}
                                </div>
                              </td>
                              <td className="py-4 px-5 text-right font-mono text-slate-700 font-medium">
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
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                    pageSizeOptions={[5, 10, 20, 50]}
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
                    <h2 className="text-base font-bold text-slate-900">สรุปภาพรวมและอนุมัติรอบเงินเดือน</h2>
                    <p className="text-xs text-slate-500">
                      ตรวจสอบภาพรวมงบประมาณเงินเดือนและภาระผูกพัน ก่อนลงนามอนุมัติให้การเงินดำเนินการจ่าย
                    </p>
                  </div>
                </div>

                {/* 4 Stat Cards for Approver */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">งบประมาณเงินเดือนสุทธิรวม</span>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                      ฿{totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">ยอดที่ต้องจ่ายจริง</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">ภาระภาษีและประกันสังคม</span>
                    <div className="text-2xl font-bold text-rose-600 mt-1">
                      ฿{taxAndSso.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">ภ.ง.ด.1 + SSO รวม</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">จำนวนพนักงานทั้งหมด</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {totalEmployees} <span className="text-sm font-normal text-slate-500">คน</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">ได้รับการคำนวณครบถ้วน</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">สถานะการตรวจทาน</span>
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
                <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">สรุปภาพรวมรายบุคคล</h3>
                    <span className="text-xs text-slate-400">สำหรับผู้บริหารตรวจสอบ</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
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
                            <td className="py-4 px-5 font-mono font-semibold text-slate-900">{pr.employeeCode}</td>
                            <td className="py-4 px-5 font-semibold text-slate-900">{pr.employeeName}</td>
                            <td className="py-4 px-5 text-slate-600">{pr.departmentName}</td>
                            <td className="py-4 px-5 text-right font-mono text-slate-700 font-medium">
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
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                    pageSizeOptions={[5, 10, 20, 50]}
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

          {/* ── Header ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  💳 การจ่ายเงินเดือน
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
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    ✅ จ่ายเงินเดือนเสร็จสิ้น
                  </span>
                )}
                {selectedPeriod?.status === 'PROCESSING' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                    ⏳ กำลังดำเนินการจ่าย
                  </span>
                )}
                {selectedPeriod?.status === 'APPROVED' && !selectedPeriod?.paymentMethod && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    🎯 อนุมัติแล้ว — รอเลือกวิธีการจ่าย
                  </span>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="text-[11px] text-slate-400 font-medium">พนักงานทั้งหมด</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{transferList?.totalEmployees ?? selectedPeriod?.employeeCount ?? 0} คน</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-[11px] text-emerald-600 font-medium">โอนแล้ว</div>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">{transferList?.transferredCount ?? selectedPeriod?.totalTransferredCount ?? 0} คน</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="text-[11px] text-amber-600 font-medium">รอโอน</div>
                <div className="text-lg font-bold text-amber-700 mt-0.5">{transferList?.pendingCount ?? Math.max(0, (selectedPeriod?.employeeCount ?? 0) - (selectedPeriod?.totalTransferredCount ?? 0))} คน</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-[11px] text-blue-600 font-medium">รวมยอดทั้งหมด</div>
                <div className="text-base font-bold text-blue-900 mt-0.5">
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
                    <div className="font-bold text-sm">🏦 ส่งไฟล์ธนาคาร</div>
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
                    <div className="font-bold text-sm">👤 CEO โอนเองทีละคน <span className="text-emerald-300 text-[11px]">(บริษัทนี้)</span></div>
                    <div className="text-xs text-blue-200 mt-1">CEO โอนเงินผ่าน Internet Banking ทีละคน แนบสลิปยืนยัน แล้ว Confirm ทั้งหมด</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── PHASE 2a: BANK_BATCH ── */}
          {selectedPeriod?.paymentMethod === 'BANK_BATCH' && selectedPeriod?.status !== 'CLOSED' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">วิธีการจ่าย: ส่งไฟล์ธนาคาร (Bank Batch)</h3>
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
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {done ? '✓' : step}
                    </div>
                    <div className={`text-xs font-bold ${done ? 'text-emerald-700' : 'text-slate-800'}`}>{title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>

              {/* Step 2 Confirmation Section */}
              {(selectedPeriod?.bankFileGeneratedAt || selectedPeriod?.status === 'PROCESSING' || selectedPeriod?.status === 'PROCESSING_BANK') && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200/80 flex items-center justify-between">
                    <span>📁 ไฟล์โอนเงินพร้อมใช้งาน</span>
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
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
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
                      <label className="block text-[11px] font-semibold text-slate-600">
                        อัปโหลดสลิป/ใบเสร็จยืนยันการโอนเงินรวมจากธนาคาร (PDF / JPG / PNG)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={e => setBankReceiptFile(e.target.files?.[0] || null)}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0B2046] file:text-white hover:file:bg-[#112d5e] cursor-pointer"
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
                            <span>🔒 ไม่อนุญาตให้กดยืนยัน (ต้องแนบสลิปหรือไฟล์ใบเสร็จของธนาคารก่อน)</span>
                          </button>
                        </div>
                      )}

                      {/* If receipt was already attached before, allow confirming to PAID */}
                      {selectedPeriod?.hasBankReceipt && !bankReceiptFile && selectedPeriod?.status === 'PROCESSING_BANK' && (
                        <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-slate-600">
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
                        className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลด</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600 mt-3">
                      <span>⏳ รอดำเนินการ: ฝ่ายการเงินตรวจสอบและแนบสลิปโอนเงินรวมของธนาคาร (ขั้นตอนที่ 3)</span>
                    </div>
                  )
                )
              )}

              {/* Status Banner when PAID for all roles */}
              {selectedPeriod?.status === 'PAID' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✅</span>
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 disabled:opacity-50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  {isGeneratingBankFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                  <span>{selectedPeriod?.bankFileGeneratedAt ? 'ดาวน์โหลดไฟล์อีกครั้ง' : 'ดาวน์โหลดไฟล์ธนาคาร'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── PHASE 2b: DIRECT_TRANSFER ── */}
          {selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
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
                    <span>🔒 ไม่สามารถ Confirm ได้ (สลิปยังไม่ครบ {transferList.pendingCount}/{transferList.totalEmployees} คน)</span>
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
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
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
                              <div className="font-bold text-slate-900">{item.employeeName}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.employeeCode} · {item.departmentName}</div>
                            </td>
                            {/* Bank */}
                            <td className="py-3.5 px-4">
                              {item.bankName ? (
                                <>
                                  <div className="font-semibold text-slate-700">{item.bankName}</div>
                                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">{item.accountNumber}</div>
                                  {item.accountName && <div className="text-[11px] text-slate-400">{item.accountName}</div>}
                                </>
                              ) : (
                                <span className="text-red-400 font-medium">⚠️ ไม่มีบัญชีธนาคาร</span>
                              )}
                            </td>
                            {/* ยอด */}
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                              ฿{item.netPayableSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            {/* Ref */}
                            <td className="py-3.5 px-4 text-center font-mono text-slate-500 text-[11px]">
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
                                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
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
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">📎 แนบสลิปการโอนเงิน</h3>
                  <button onClick={() => setSlipModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl leading-none">×</button>
                </div>

                {/* Employee info */}
                <div className="bg-slate-50 rounded-xl p-3.5 text-sm">
                  <div className="font-bold text-slate-900">{slipModalTarget.employeeName}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{slipModalTarget.employeeCode} · {slipModalTarget.bankName} {slipModalTarget.accountNumber}</div>
                  <div className="text-emerald-700 font-bold mt-1">
                    ฿{slipModalTarget.netPayableSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Transfer Ref */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">เลข Reference (ไม่บังคับ)</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                        <div className="text-2xl">✅</div>
                        <div className="text-left">
                          <div className="font-semibold text-sm">{slipFile.name}</div>
                          <div className="text-xs text-emerald-600">{(slipFile.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400">
                        <div className="text-2xl mb-2">📎</div>
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
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
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
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="text-center">
                  <div className="text-5xl mb-3">🔐</div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedPeriod?.paymentMethod === 'BANK_BATCH' ? 'ยืนยันว่าธนาคารโอนเงินแล้ว' : 'Confirm การจ่ายเงินเดือน'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedPeriod?.paymentMethod === 'BANK_BATCH'
                      ? 'ยืนยันว่าธนาคารได้โอนเงินเดือนตามไฟล์ Bank Batch เรียบร้อยแล้ว (สถานะจะเปลี่ยนเป็น PROCESSING_BANK เพื่อให้ฝ่ายการเงินตรวจสลิป)'
                      : `ยืนยันว่าโอนเงินเดือนให้พนักงานครบ ${transferList?.totalEmployees} คน พร้อมสลิปครบถ้วนแล้ว`}
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">รอบเงินเดือน</span>
                    <span className="font-semibold text-slate-900">{selectedPeriod?.periodName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">วิธีการจ่าย</span>
                    <span className="font-semibold text-slate-900">
                      {selectedPeriod?.paymentMethodText ?? (selectedPeriod?.paymentMethod === 'DIRECT_TRANSFER' ? 'CEO โอนเอง' : 'ส่งไฟล์ธนาคาร (Bank Batch)')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">จำนวนพนักงาน</span>
                    <span className="font-semibold text-slate-900">{transferList?.totalEmployees ?? selectedPeriod?.employeeCount} คน</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-500 font-medium">รวมเงินที่จ่าย</span>
                    <span className="font-bold text-emerald-700 text-base">
                      ฿{(transferList?.totalNetSalary ?? selectedPeriod?.totalNetSalary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">หมายเหตุ (ไม่บังคับ)</label>
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
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
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
      {/* === TAB 6: โบนัส (Bonus) === */}

      {activeTab === 'bonus' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-500" />
                  <span>การจัดสรรโบนัสและเงินรางวัลประจำปี (Annual Bonus Management)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  คำนวณและอนุมัติโบนัสประจำปีตามฐานเงินเดือนพนักงานและตัวคูณผลการปฏิบัติงาน
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span>ตัวคูณโบนัสฐาน:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={bonusMultiplierInput}
                    onChange={(e) => setBonusMultiplierInput(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                  <span>เท่า</span>
                </div>

                <button
                  onClick={handleCalculateBonusesSubmit}
                  disabled={isCalculatingBonus}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {isCalculatingBonus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Gift className="w-4 h-4" />
                  )}
                  <span>คำนวณและจัดสรรโบนัส</span>
                </button>
              </div>
            </div>

            {/* Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50">
                <span className="text-xs text-amber-800 font-semibold">ยอดรวมโบนัสที่จัดสรรทั้งหมด</span>
                <p className="text-xl font-bold text-amber-900 mt-1 font-mono">
                  ฿{bonuses.reduce((sum, b) => sum + b.bonusAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-semibold">จำนวนพนักงานที่ได้รับโบนัส</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{bonuses.length} คน</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-semibold">โบนัสเฉลี่ยต่อคน</span>
                <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
                  ฿{(bonuses.length > 0
                    ? bonuses.reduce((sum, b) => sum + b.bonusAmount, 0) / bonuses.length
                    : 0
                  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Bonus Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
                    <th className="py-3.5 px-4">รหัสพนักงาน</th>
                    <th className="py-3.5 px-4">ชื่อ-นามสกุล</th>
                    <th className="py-3.5 px-4">แผนก</th>
                    <th className="py-3.5 px-4">ตำแหน่ง</th>
                    <th className="py-3.5 px-4 text-right">เงินเดือนฐาน</th>
                    <th className="py-3.5 px-4 text-center">คะแนน KPI (5.0)</th>
                    <th className="py-3.5 px-4 text-center">ตัวคูณ (x)</th>
                    <th className="py-3.5 px-4 text-right font-bold">จำนวนเงินโบนัส (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {bonuses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        กดปุ่ม "คำนวณและจัดสรรโบนัส" เพื่อประมวลผลโบนัสตามเงินเดือนฐาน
                      </td>
                    </tr>
                  ) : (
                    bonuses.map((b) => (
                      <tr key={b.employeeId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">{b.employeeCode}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{b.employeeName}</td>
                        <td className="py-3 px-4 text-slate-600">{b.departmentName || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{b.positionName || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          ฿{b.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-blue-600">
                          {b.performanceScore ? b.performanceScore.toFixed(1) : '4.0'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-600">
                          {b.multiplier.toFixed(2)}x
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-amber-900 text-sm">
                          ฿{b.bonusAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === TAB 7: ภาษี & ประกันสังคม (Tax & SSO Tab) === */}
      {activeTab === 'tax-sso' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-8">
          {/* Header Actions for CSV Reports */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">สรุปรายงาน ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และ ประกันสังคม (สปส. 1-10)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
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
                <span className="text-[11px] text-slate-500 font-semibold">รายได้รวมพนักงานทั้งหมด</span>
                <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
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
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-700" />
                  <span>ตารางอัตราภาษีเงินได้บุคคลธรรมดาแบบขั้นบันได (ภ.ง.ด. 8 ขั้น)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  อัตราภาษีเงินได้สุทธิสะสมต่อปีตามประมวลรัษฎากรสำหรับคำนวณหักภาษี ณ ที่จ่าย (Withholding Tax)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
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
                      <td className="py-3 px-4 font-semibold text-slate-800">{t.bracketName}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                        ฿{t.incomeFrom.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                        {t.incomeTo != null
                          ? `฿${t.incomeTo.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : 'ขึ้นไป (ไม่จำกัด)'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-700">
                        {(t.taxRate * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
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
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-700" />
                  <span>เกณฑ์และอัตราเงินสมทบกองทุนประกันสังคม (Social Security Fund)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  อัตราเงินสมทบฝ่ายลูกจ้างและนายจ้าง พร้อมฐานเพดานค่าจ้างขั้นต่ำและสูงสุดตามกฎหมาย
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
                    <th className="py-3.5 px-4">ชื่อเกณฑ์</th>
                    <th className="py-3.5 px-4 text-center">สมทบฝ่ายผู้ประกันตน (%)</th>
                    <th className="py-3.5 px-4 text-center">สมทบฝ่ายนายจ้าง (%)</th>
                    <th className="py-3.5 px-4 text-right">ฐานค่าจ้างต่ำสุด</th>
                    <th className="py-3.5 px-4 text-right">เพดานค่าจ้างสูงสุด</th>
                    <th className="py-3.5 px-4 text-center">วันที่มีผล</th>
                    <th className="py-3.5 px-4 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {ssoRates.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">{s.rateName}</td>
                      <td className="py-3 px-4 text-center font-bold text-purple-700">
                        {(s.employeeContributionPercent * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-purple-700">
                        {(s.employerContributionPercent * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                        ฿{s.minWageBaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-900 font-semibold">
                        ฿{s.maxWageBaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-slate-500 font-mono">
                        {s.effectiveFrom}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
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
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">สร้างรอบเงินเดือนใหม่</h3>
              <button
                onClick={() => setIsCreatePeriodModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePeriodSubmit} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">ชื่อรอบเงินเดือน</label>
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 ระบบจะเปลี่ยนชื่อรอบและวันที่คำนวณให้อัตโนมัติตามเดือนและปีที่เลือก (สามารถพิมพ์แก้ไขชื่อได้ตามต้องการ)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ปี (ค.ศ.)</label>
                  <input
                    type="number"
                    required
                    value={newPeriodForm.year}
                    onChange={(e) => handleYearChange(parseInt(e.target.value) || 2026)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เดือน (1-12)</label>
                  <select
                    value={newPeriodForm.month}
                    onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium cursor-pointer"
                  >
                    {THAI_MONTH_NAMES.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1} - {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันเริ่มคำนวณ</label>
                  <input
                    type="date"
                    required
                    value={newPeriodForm.startDate}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันสิ้นสุดคำนวณ</label>
                  <input
                    type="date"
                    required
                    value={newPeriodForm.endDate}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">วันกำหนดจ่ายเงิน</label>
                <input
                  type="date"
                  value={newPeriodForm.paymentDate}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatePeriodModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold shadow-xs"
                >
                  สร้างรอบเงินเดือน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-Over Drawer: รายละเอียดสลิปเงินเดือนรายบุคคล (payroll_detail) */}
      <PayrollDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        record={selectedPayrollRecord}
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
    </div>
  );
}
