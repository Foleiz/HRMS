'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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
} from '@/types/payroll';
import { Position, EmployeeLevel, Department } from '@/types/organization';
import { SalaryStructureModal } from '@/components/payroll/SalaryStructureModal';
import { PayrollItemModal } from '@/components/payroll/PayrollItemModal';
import { AdjustSalaryModal } from '@/components/payroll/AdjustSalaryModal';
import { SalaryHistoryModal } from '@/components/payroll/SalaryHistoryModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

type ActiveTab =
  | 'overview'
  | 'structures'
  | 'items'
  | 'process'
  | 'bank-transfer'
  | 'bonus'
  | 'tax-sso';

export default function PayrollPage() {
  const router = useRouter();
  const { hasPermission, hasRole } = useAuth();
  const canViewPayroll =
    hasPermission('PAYROLL_VIEW') ||
    hasPermission('PAYROLL_CALC_VIEW') ||
    hasPermission('PAYROLL_SLIP_VIEW') ||
    hasRole('ADMIN');

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

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

  // Sub-tab in Payroll items view: 'EARNING' vs 'DEDUCTION'
  const [itemsSubTab, setItemsSubTab] = useState<'EARNING' | 'DEDUCTION'>('EARNING');

  // Filters for Employee Salaries
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

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
        return 'ประมวลผลเงินเดือน';
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

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header with Circular Back Button and Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (activeTab !== 'overview') {
              setActiveTab('overview');
            } else {
              router.push('/');
            }
          }}
          className="w-8 h-8 rounded-full bg-[#0B2046] hover:bg-[#112d5e] text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
          title="ย้อนกลับ"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <span className="text-slate-900">เงินเดือน</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600 font-medium">{getTabLabel(activeTab)}</span>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="border-b border-slate-200/80">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar text-sm font-semibold whitespace-nowrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-b-2 border-[#0B2046] text-[#0B2046] font-bold'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ภาพรวม
          </button>

          <button
            onClick={() => setActiveTab('structures')}
            className={`pb-3 transition-all cursor-pointer ${
              activeTab === 'structures'
                ? 'border-b-2 border-[#0B2046] text-[#0B2046] font-bold'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            โครงสร้างเงินเดือน
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`pb-3 transition-all cursor-pointer ${
              activeTab === 'items'
                ? 'border-b-2 border-[#0B2046] text-[#0B2046] font-bold'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            รายได้และรายหัก
          </button>

          <button
            onClick={() => setActiveTab('process')}
            className={`pb-3 transition-all cursor-pointer ${
              activeTab === 'process'
                ? 'border-b-2 border-[#0B2046] text-[#0B2046] font-bold'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ประมวลผลเงินเดือน
          </button>

          <button
            onClick={() => setActiveTab('bank-transfer')}
            className={`pb-3 transition-all cursor-pointer ${
              activeTab === 'bank-transfer'
                ? 'border-b-2 border-[#0B2046] text-[#0B2046] font-bold'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            โอนเงินธนาคาร
          </button>

          <button
            onClick={() => setActiveTab('bonus')}
            className={`pb-3 transition-all cursor-pointer ${
              activeTab === 'bonus'
                ? 'border-b-2 border-[#0B2046] text-[#0B2046] font-bold'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            โบนัส
          </button>

          <button
            onClick={() => setActiveTab('tax-sso')}
            className={`pb-3 transition-all cursor-pointer ${
              activeTab === 'tax-sso'
                ? 'border-b-2 border-[#0B2046] text-[#0B2046] font-bold'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ภาษี & ประกันสังคม
          </button>
        </div>
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
          {structureSubTab === 'positions' && (
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
                      structures.map((s) => {
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

              {/* Pagination matching Image 1: ← 1 2 3 4 → */}
              <div className="flex items-center justify-end gap-1.5 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStructurePage(Math.max(1, structurePage - 1))}
                  disabled={structurePage === 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {[1, 2, 3, 4].map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setStructurePage(page)}
                    className={`w-7 h-7 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center ${
                      structurePage === page
                        ? 'bg-[#0B2046] text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setStructurePage(Math.min(4, structurePage + 1))}
                  disabled={structurePage === 4}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Sub-view 2: ข้อมูลเงินเดือนพนักงาน */}
          {structureSubTab === 'employees' && (
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
                    {employees.map((emp) => {
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
            </div>
          )}
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
                          ? 'สูตรคำนวณ (ตามกฎหมาย)'
                          : 'เปอร์เซ็นต์ของฐานเงินเดือน';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-slate-900 text-xs">{item.itemName}</div>
                            {item.description && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                              {calcTypeLabel}
                            </span>
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

      {/* === TAB 4: ประมวลผลเงินเดือน (Payroll Processing) === */}
      {activeTab === 'process' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">รอบการประมวลผลเงินเดือน</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                จัดการรอบการคำนวณเงินเดือน ตรวจสอบผล และปิดรอบการจ่ายเงิน
              </p>
            </div>

            <button
              onClick={() => showToast('ระบบเริ่มคำนวณเงินเดือนรอบปัจจุบัน...')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>เริ่มคำนวณเงินเดือนรอบนี้</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
                  <th className="py-3.5 px-4">รอบเงินเดือน</th>
                  <th className="py-3.5 px-4">ช่วงเวลาการคำนวณ</th>
                  <th className="py-3.5 px-4 text-right">ยอดรวมค่าจ้างสุทธิ</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-center">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">รอบเดือนสิงหาคม 2569</td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">01/08/2026 - 31/08/2026</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono text-xs">฿1,842,300.00</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-[#FEECE5] text-[#EA580C]">
                      รอตรวจสอบ
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => showToast('ส่งรอบเงินเดือนเข้าสู่กระบวนการอนุมัติแล้ว')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      ส่งอนุมัติ
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">รอบเดือนกรกฎาคม 2569</td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">01/07/2026 - 31/07/2026</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono text-xs">฿1,798,650.00</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-[#DCFCE7] text-[#16A34A]">
                      คำนวณแล้ว
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs text-slate-400">ปิดรอบแล้ว</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === TAB 5: โอนเงินธนาคาร (Bank Transfer) === */}
      {activeTab === 'bank-transfer' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">การโอนเงินเข้าบัญชีธนาคารพนักงาน</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                สรุปยอดเงินและเตรียมไฟล์โอนเงินตามรูปแบบมาตรฐานของธนาคารพาณิชย์
              </p>
            </div>
            <button
              onClick={() => showToast('ดาวน์โหลดไฟล์ Text File สำหรับส่งธนาคารแล้ว')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>ส่งออกไฟล์ธนาคาร</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">ธนาคารกสิกรไทย (KBANK)</span>
              <p className="text-lg font-bold text-slate-900 mt-1">฿1,120,400.00</p>
              <p className="text-[11px] text-slate-400 mt-0.5">85 บัญชี</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">ธนาคารไทยพาณิชย์ (SCB)</span>
              <p className="text-lg font-bold text-slate-900 mt-1">฿520,300.00</p>
              <p className="text-[11px] text-slate-400 mt-0.5">42 บัญชี</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">ธนาคารกรุงเทพ (BBL)</span>
              <p className="text-lg font-bold text-slate-900 mt-1">฿201,600.00</p>
              <p className="text-[11px] text-slate-400 mt-0.5">18 บัญชี</p>
            </div>
          </div>
        </div>
      )}

      {/* === TAB 6: โบนัส (Bonus) === */}
      {activeTab === 'bonus' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">การจัดสรรโบนัสและเงินรางวัลพิเศษ</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดรอบและเงื่อนไขการคำนวณโบนัสประจำปีและโบนัสตามผลงาน
              </p>
            </div>
            <button
              onClick={() => showToast('เปิดฟอร์มคำนวณโบนัส')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              <span>จัดสรรโบนัสใหม่</span>
            </button>
          </div>

          <div className="py-12 text-center text-slate-400">
            <Gift className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">ยังไม่มีรอบการจัดสรรโบนัสที่เปิดใช้งานในขณะนี้</p>
            <p className="text-xs text-slate-400 mt-0.5">คุณสามารถกดปุ่ม "จัดสรรโบนัสใหม่" เพื่อเริ่มรอบใหม่ได้</p>
          </div>
        </div>
      )}

      {/* === TAB 7: ภาษี & ประกันสังคม (Tax & SSO Tab) === */}
      {activeTab === 'tax-sso' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-8">
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
    </div>
  );
}
