'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowRightLeft,
  History,
  Search,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ban,
  Download,
  Clock,
  ChevronRight,
  ChevronDown,
  Users,
  ChevronsUpDown,
} from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { organizationService } from '@/services/organizationService';
import { employeeService } from '@/services/employeeService';
import {
  LeaveType,
  CreateLeaveTypePayload,
  UpdateLeaveTypePayload,
  LeavePolicy,
  CreateLeavePolicyPayload,
  UpdateLeavePolicyPayload,
  LeaveBalance,
  LeaveBalanceAdjustmentPayload,
  LeaveRequest,
  LeaveStats,
  CreateLeaveRequestPayload,
} from '@/types/leave';
import { Employee } from '@/types/employee';
import { LeaveTypeModal } from '@/components/leave/LeaveTypeModal';
import { LeavePolicyModal } from '@/components/leave/LeavePolicyModal';
import { AdjustBalanceModal } from '@/components/leave/AdjustBalanceModal';
import { LeaveTransactionsModal } from '@/components/leave/LeaveTransactionsModal';
import { LeaveRequestModal } from '@/components/leave/LeaveRequestModal';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';

type ActiveTab = 'types' | 'policies' | 'balances' | 'requests';

export default function LeaveManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('types');

  // Master Data
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [employeeLevels, setEmployeeLevels] = useState<{ id: number; levelName: string }[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveStats, setLeaveStats] = useState<LeaveStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  // Modal ยื่นคำขอลา
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Filters for Balances Tab
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [balanceSearch, setBalanceSearch] = useState<string>('');

  // Modals state
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<LeaveType | null>(null);

  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyToEdit, setPolicyToEdit] = useState<LeavePolicy | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [balanceToAdjust, setBalanceToAdjust] = useState<LeaveBalance | null>(null);

  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const [balanceForTransactions, setBalanceForTransactions] = useState<LeaveBalance | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Custom Confirm & Alert Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmType;
    singleButton?: boolean;
    isLoading?: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmType;
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmConfig({
      isOpen: true,
      singleButton: false,
      isLoading: false,
      ...options,
    });
  };

  const showAlert = (title: string, message: string, type: ConfirmType = 'info') => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      type,
      singleButton: true,
      confirmText: 'รับทราบ',
      onConfirm: () => setConfirmConfig((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const closeConfirm = () => {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
  };

  // Initial load
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch balances when year changes
  useEffect(() => {
    if (activeTab === 'balances') {
      fetchBalances(selectedYear);
    }
  }, [selectedYear, activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [typesData, policiesData, levelsData, employeesData] = await Promise.all([
        leaveService.getLeaveTypes(),
        leaveService.getLeavePolicies(),
        organizationService.getLevels(),
        employeeService.getAll(),
      ]);
      setLeaveTypes(typesData);
      setLeavePolicies(policiesData);
      setEmployeeLevels(levelsData);
      setEmployees(employeesData);
      await fetchBalances(selectedYear);
      await fetchLeaveRequests();
    } catch (err) {
      console.error('Failed to load leave data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async (year: number) => {
    try {
      const balancesData = await leaveService.getLeaveBalances({ year });
      setLeaveBalances(balancesData);
    } catch (err) {
      console.error('Failed to load balances', err);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const [requestsData, statsData] = await Promise.all([
        leaveService.getLeaveRequests({ pageSize: 100 }),
        leaveService.getLeaveStats(),
      ]);
      setLeaveRequests(requestsData);
      setLeaveStats(statsData);
    } catch (err) {
      console.error('Failed to load leave requests', err);
    }
  };

  // === Handlers: Leave Types ===
  const handleOpenCreateType = () => {
    setTypeToEdit(null);
    setIsTypeModalOpen(true);
  };

  const handleOpenEditType = (type: LeaveType) => {
    setTypeToEdit(type);
    setIsTypeModalOpen(true);
  };

  const handleSubmitCreateType = async (payload: CreateLeaveTypePayload) => {
    await leaveService.createLeaveType(payload);
    const updated = await leaveService.getLeaveTypes();
    setLeaveTypes(updated);
    await fetchBalances(selectedYear);
    showToast('สร้างประเภทการลาสำเร็จ และเพิ่มยอดวันลาให้กับพนักงานทุกคนเรียบร้อยแล้ว');
  };

  const handleSubmitUpdateType = async (id: number, payload: UpdateLeaveTypePayload) => {
    await leaveService.updateLeaveType(id, payload);
    const updated = await leaveService.getLeaveTypes();
    setLeaveTypes(updated);
    await fetchBalances(selectedYear);
    showToast('อัพเดตประเภทการลาสำเร็จ');
  };

  const handleDeleteType = (type: LeaveType) => {
    showConfirm({
      title: 'ยืนยันการลบประเภทการลา?',
      message: `คุณต้องการลบหรือระงับประเภทการลา "${type.leaveName}" (${type.leaveCode}) หรือไม่?\nข้อมูลหรือสิทธิ์ที่เกี่ยวข้องจะถูกปรับเป็นไม่ใช้งาน`,
      type: 'danger',
      confirmText: 'ลบประเภทการลา',
      onConfirm: async () => {
        try {
          await leaveService.deleteLeaveType(type.id);
          const updated = await leaveService.getLeaveTypes();
          setLeaveTypes(updated);
          await fetchBalances(selectedYear);
          closeConfirm();
          showToast('ลบประเภทการลาสำเร็จ');
        } catch (err: any) {
          closeConfirm();
          showAlert('ไม่สามารถลบได้', err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการลบประเภทการลา', 'danger');
        }
      },
    });
  };

  // === Handlers: Leave Policies ===
  const handleOpenCreatePolicy = () => {
    setPolicyToEdit(null);
    setIsPolicyModalOpen(true);
  };

  const handleOpenEditPolicy = (policy: LeavePolicy) => {
    setPolicyToEdit(policy);
    setIsPolicyModalOpen(true);
  };

  const handleSubmitCreatePolicy = async (payload: CreateLeavePolicyPayload) => {
    await leaveService.createLeavePolicy(payload);
    const updated = await leaveService.getLeavePolicies();
    setLeavePolicies(updated);
    await fetchBalances(selectedYear);
    showToast('เพิ่มสิทธิ์การลาสำเร็จ');
  };

  const handleSubmitUpdatePolicy = async (id: number, payload: UpdateLeavePolicyPayload) => {
    await leaveService.updateLeavePolicy(id, payload);
    const updated = await leaveService.getLeavePolicies();
    setLeavePolicies(updated);
    await fetchBalances(selectedYear);
    showToast('อัพเดตสิทธิ์การลาสำเร็จ');
  };

  const handleDeletePolicy = (policy: LeavePolicy) => {
    showConfirm({
      title: 'ยืนยันการลบสิทธิ์การลา?',
      message: `คุณต้องการลบนโยบายสิทธิ์การลาสำหรับ "${policy.leaveTypeName}" (${policy.employeeLevelName || 'ทุกระดับ'}) หรือไม่?`,
      type: 'danger',
      confirmText: 'ลบนโยบาย',
      onConfirm: async () => {
        try {
          await leaveService.deleteLeavePolicy(policy.id);
          const updated = await leaveService.getLeavePolicies();
          setLeavePolicies(updated);
          closeConfirm();
          showToast('ลบสิทธิ์การลาเรียบร้อยแล้ว');
        } catch (err: any) {
          closeConfirm();
          showAlert('ไม่สามารถลบได้', err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาด', 'danger');
        }
      },
    });
  };

  // === Handlers: Leave Balances ===
  const handleOpenAdjustBalance = (balance: LeaveBalance) => {
    setBalanceToAdjust(balance);
    setIsAdjustModalOpen(true);
  };

  const handleOpenTransactions = (balance: LeaveBalance) => {
    setBalanceForTransactions(balance);
    setIsTransactionsModalOpen(true);
  };

  const handleSubmitAdjustment = async (payload: LeaveBalanceAdjustmentPayload) => {
    await leaveService.adjustLeaveBalance(payload);
    await fetchBalances(selectedYear);
    showToast('ปรับยอดวันลาสำเร็จ');
  };

  const handleInitializeYearBalance = () => {
    const thaiYear = selectedYear + 543;
    showConfirm({
      title: `จัดสรรโควตาวันลาประจำปี ${thaiYear} (${selectedYear})?`,
      message: `ระบบจะคำนวณสิทธิ์ตามนโยบายให้พนักงานทุกคนที่ยังไม่มียอดของปีนี้\nพร้อมคำนวณยอดยกมาจากปีก่อนหน้าตามเงื่อนไขที่ระบุไว้ในนโยบาย`,
      type: 'question',
      confirmText: 'เริ่มจัดสรรโควตา',
      onConfirm: async () => {
        try {
          const result = await leaveService.initializeYearBalance({ targetYear: selectedYear });
          await fetchBalances(selectedYear);
          closeConfirm();
          showToast(result.message);
        } catch (err: any) {
          closeConfirm();
          showAlert('ไม่สามารถจัดสรรได้', err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการจัดสรรยอด', 'danger');
        }
      },
    });
  };

  // === Handlers: Leave Requests ===
  const handleOpenRequestModal = () => {
    setIsRequestModalOpen(true);
  };

  const handleSubmitLeaveRequest = async (payload: CreateLeaveRequestPayload) => {
    await leaveService.createLeaveRequest(payload);
    await fetchLeaveRequests();
    await fetchBalances(selectedYear);
    showToast('ยื่นคำขอลาสำเร็จ รอการอนุมัติ');
  };

  const handleApproveRequest = (request: LeaveRequest) => {
    showConfirm({
      title: 'ยืนยันการอนุมัติคำขอลา?',
      message: `อนุมัติคำขอลาเลขที่ ${request.requestNo} ของ ${request.employeeName} (${request.leaveDays} วัน) หรือไม่?`,
      type: 'success',
      confirmText: 'อนุมัติ',
      onConfirm: async () => {
        try {
          await leaveService.approveLeaveRequest(request.id);
          await fetchLeaveRequests();
          await fetchBalances(selectedYear);
          closeConfirm();
          showToast('อนุมัติคำขอลาสำเร็จ');
        } catch (err: any) {
          closeConfirm();
          showAlert('ไม่สามารถอนุมัติได้', err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาด', 'danger');
        }
      },
    });
  };

  const handleRejectRequest = (request: LeaveRequest) => {
    showConfirm({
      title: 'ยืนยันการปฏิเสธคำขอลา?',
      message: `ปฏิเสธคำขอลาเลขที่ ${request.requestNo} ของ ${request.employeeName} หรือไม่?`,
      type: 'danger',
      confirmText: 'ปฏิเสธคำขอ',
      onConfirm: async () => {
        try {
          await leaveService.rejectLeaveRequest(request.id);
          await fetchLeaveRequests();
          closeConfirm();
          showToast('ปฏิเสธคำขอลาเรียบร้อยแล้ว');
        } catch (err: any) {
          closeConfirm();
          showAlert('ไม่สามารถปฏิเสธได้', err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาด', 'danger');
        }
      },
    });
  };

  const handleCancelRequest = (request: LeaveRequest) => {
    showConfirm({
      title: 'ยืนยันการยกเลิกคำขอลา?',
      message: `ยกเลิกคำขอลาเลขที่ ${request.requestNo} หรือไม่?${
        request.status === 'APPROVED' ? '\nระบบจะคืนวันลาที่ถูกหักไปให้อัตโนมัติ' : ''
      }`,
      type: 'warning',
      confirmText: 'ยกเลิกคำขอ',
      onConfirm: async () => {
        try {
          await leaveService.cancelLeaveRequest(request.id);
          await fetchLeaveRequests();
          await fetchBalances(selectedYear);
          closeConfirm();
          showToast('ยกเลิกคำขอลาเรียบร้อยแล้ว');
        } catch (err: any) {
          closeConfirm();
          showAlert('ไม่สามารถยกเลิกได้', err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาด', 'danger');
        }
      },
    });
  };

  const handleDownloadDocument = async (request: LeaveRequest, docId: number, fileName?: string | null) => {
    try {
      await leaveService.downloadDocument(request.id, docId, fileName);
    } catch (err: any) {
      showAlert('ไม่สามารถดาวน์โหลดได้', err?.message || 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์แนบ', 'danger');
    }
  };

  const leaveStatusDisplay = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'รออนุมัติ', className: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'APPROVED':
        return { label: 'อนุมัติแล้ว', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'REJECTED':
        return { label: 'ปฏิเสธ', className: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'CANCELLED':
        return { label: 'ยกเลิกแล้ว', className: 'bg-gray-100 text-gray-500 border-gray-200' };
      default:
        return { label: status, className: 'bg-gray-50 text-gray-600 border-gray-200' };
    }
  };

  // Filtered balances
  const filteredBalances = useMemo(() => {
    if (!balanceSearch.trim()) return leaveBalances;
    const q = balanceSearch.toLowerCase().trim();
    return leaveBalances.filter(
      (b) =>
        b.employeeName.toLowerCase().includes(q) ||
        b.employeeCode.toLowerCase().includes(q) ||
        b.departmentName.toLowerCase().includes(q) ||
        b.leaveTypeName.toLowerCase().includes(q)
    );
  }, [leaveBalances, balanceSearch]);

  // Group balances by Employee for expandable accordion view
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState<Set<number>>(new Set());

  const toggleExpandEmployee = (empId: number) => {
    setExpandedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const expandAllEmployees = () => {
    setExpandedEmployeeIds(new Set(groupedEmployees.map((g) => g.employeeId)));
  };

  const collapseAllEmployees = () => {
    setExpandedEmployeeIds(new Set());
  };

  const groupedEmployees = useMemo(() => {
    const map = new Map<number, {
      employeeId: number;
      employeeCode: string;
      employeeName: string;
      departmentName: string;
      positionTitle: string;
      totalQuota: number;
      totalCarried: number;
      totalUsed: number;
      totalAdjusted: number;
      totalRemaining: number;
      balances: LeaveBalance[];
    }>();

    for (const b of filteredBalances) {
      if (!map.has(b.employeeId)) {
        map.set(b.employeeId, {
          employeeId: b.employeeId,
          employeeCode: b.employeeCode,
          employeeName: b.employeeName,
          departmentName: b.departmentName,
          positionTitle: b.positionTitle,
          totalQuota: 0,
          totalCarried: 0,
          totalUsed: 0,
          totalAdjusted: 0,
          totalRemaining: 0,
          balances: [],
        });
      }
      const group = map.get(b.employeeId)!;
      group.totalQuota += b.annualQuotaDays;
      group.totalCarried += b.activeCarriedForwardDays;
      group.totalUsed += b.usedDays;
      group.totalAdjusted += b.adjustedDays;
      group.totalRemaining += b.netRemainingLeaveDays;
      group.balances.push(b);
    }

    return Array.from(map.values());
  }, [filteredBalances]);

  const quotaUnitDisplay = (unit: string) => {
    switch (unit) {
      case 'HOUR':
        return 'ชั่วโมง';
      case 'MONTH':
        return 'เดือน';
      case 'DAY':
      default:
        return 'วัน';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span>การลา</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {activeTab === 'types'
                ? 'ประเภทการลา'
                : activeTab === 'policies'
                ? 'สิทธิ์การลา'
                : activeTab === 'balances'
                ? 'ยอดวันลาพนักงาน'
                : 'คำขอลา'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">การจัดการวันลาและสิทธิ์</h1>
        </div>
      </div>

      {/* Main Card with Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-4 gap-8">
          <button
            onClick={() => setActiveTab('types')}
            className={`pb-4 text-sm font-medium transition-all relative ${
              activeTab === 'types'
                ? 'text-blue-600 font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            ประเภทการลา
            {activeTab === 'types' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`pb-4 text-sm font-medium transition-all relative ${
              activeTab === 'policies'
                ? 'text-blue-600 font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            สิทธิ์การลา
            {activeTab === 'policies' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-4 text-sm font-medium transition-all relative ${
              activeTab === 'balances'
                ? 'text-blue-600 font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            ยอดวันลาพนักงาน
            {activeTab === 'balances' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-4 text-sm font-medium transition-all relative ${
              activeTab === 'requests'
                ? 'text-blue-600 font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            คำขอลา
            {activeTab === 'requests' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: ประเภทการลา (Leave Types) */}
        {activeTab === 'types' && (
          <div className="p-6">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">ประเภทการลา</h2>
              <button
                onClick={handleOpenCreateType}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> เพิ่มประเภทการลา
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-500">
                    <th className="py-3.5 px-5">ประเภทการลา</th>
                    <th className="py-3.5 px-4 text-center">หน่วยนับ</th>
                    <th className="py-3.5 px-4 text-center">รับค่าจ้าง</th>
                    <th className="py-3.5 px-4">เอกสารที่ต้องแนบ</th>
                    <th className="py-3.5 px-4 text-center">สถานะ</th>
                    <th className="py-3.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูลประเภทการลา...
                        </div>
                      </td>
                    </tr>
                  ) : leaveTypes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        ยังไม่มีประเภทการลาในระบบ
                      </td>
                    </tr>
                  ) : (
                    leaveTypes.map((type) => (
                      <tr key={type.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-semibold text-gray-800">{type.leaveName}</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">{type.leaveCode}</div>
                        </td>
                        <td className="py-4 px-4 text-center text-gray-600">
                          {quotaUnitDisplay(type.quotaUnit)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              type.isPaidLeave
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {type.isPaidLeave ? 'ใช่' : 'ไม่ใช่'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {type.documentDescription || '-'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                              type.status === 'ACTIVE' ? 'text-emerald-600' : 'text-gray-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                type.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'
                              }`}
                            />
                            {type.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditType(type)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteType(type)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: สิทธิ์การลา (Leave Policies) */}
        {activeTab === 'policies' && (
          <div className="p-6">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">สิทธิ์การลา</h2>
              <button
                onClick={handleOpenCreatePolicy}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> เพิ่มสิทธิ์การลา
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-500">
                    <th className="py-3.5 px-5">ประเภทการลา</th>
                    <th className="py-3.5 px-4">ใช้กับ</th>
                    <th className="py-3.5 px-4 text-center">สิทธิ์/ปี</th>
                    <th className="py-3.5 px-4 text-center">ทำงานครบ</th>
                    <th className="py-3.5 px-4 text-center">ยื่นล่วงหน้า</th>
                    <th className="py-3.5 px-4 text-center">แนบเอกสาร</th>
                    <th className="py-3.5 px-4">ยกยอด</th>
                    <th className="py-3.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูลสิทธิ์การลา...
                        </div>
                      </td>
                    </tr>
                  ) : leavePolicies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        ยังไม่มีนโยบายสิทธิ์การลาในระบบ
                      </td>
                    </tr>
                  ) : (
                    leavePolicies.map((policy) => (
                      <tr key={policy.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-5">
                          <span className="font-semibold text-gray-800">{policy.leaveTypeName}</span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {policy.employeeLevelName || 'ทุกระดับ'}
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-gray-900">
                          {policy.entitlementDays} วัน
                        </td>
                        <td className="py-4 px-4 text-center text-gray-600">
                          {policy.minimumServiceDays > 0 ? `${policy.minimumServiceDays} วัน` : 'ไม่กำหนด'}
                        </td>
                        <td className="py-4 px-4 text-center text-gray-600">
                          {policy.advanceRequestDays > 0 ? `${policy.advanceRequestDays} วัน` : 'ไม่กำหนด'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {policy.isDocumentRequired ? (
                            <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs font-medium border border-amber-200">
                              ใช่ {policy.documentRequiredAfterDays !== null ? `(≥${policy.documentRequiredAfterDays} วัน)` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">ไม่ต้อง</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {policy.isCarryForwardAllowed ? (
                            <span className="text-blue-700 font-medium text-xs">
                              สูงสุด {policy.carryForwardMaxMonths || policy.entitlementDays} วัน · หมดอายุ {policy.carryForwardExpiryMonths ? `${policy.carryForwardExpiryMonths * 30} วัน` : '-'}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">ไม่ยกยอด</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditPolicy(policy)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePolicy(policy)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: ยอดวันลาพนักงาน (Employee Leave Balances - Grouped Expandable Accordion) */}
        {activeTab === 'balances' && (
          <div className="p-6 space-y-5">
            {/* Filter & Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Year Select */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">ประจำปี:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none cursor-pointer"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y + 543} ({y})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Box */}
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, รหัส, แผนก..."
                    value={balanceSearch}
                    onChange={(e) => setBalanceSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Expand / Collapse All */}
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                  <button
                    onClick={expandAllEmployees}
                    className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-white transition-all flex items-center gap-1"
                  >
                    <ChevronsUpDown className="w-3.5 h-3.5" /> ขยายทั้งหมด
                  </button>
                  <button
                    onClick={collapseAllEmployees}
                    className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-white transition-all"
                  >
                    ยุบทั้งหมด
                  </button>
                </div>
              </div>

              {/* Initialize Balance Button */}
              <button
                onClick={handleInitializeYearBalance}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" /> จัดสรรยอดประจำปี {selectedYear + 543}
              </button>
            </div>

            {/* Subheader info count */}
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <div className="flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4 text-gray-400" />
                <span>
                  แสดงพนักงาน {groupedEmployees.length} คน (ทั้งหมด {filteredBalances.length} รายการสิทธิ์วันลา)
                </span>
              </div>
            </div>

            {/* Grouped Employees Accordion List */}
            {loading ? (
              <div className="py-16 text-center text-gray-400 border border-gray-100 rounded-2xl">
                <div className="inline-flex items-center gap-2 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดยอดวันลา...
                </div>
              </div>
            ) : groupedEmployees.length === 0 ? (
              <div className="py-16 text-center text-gray-400 border border-gray-100 rounded-2xl text-sm">
                ไม่พบข้อมูลยอดวันลาสำหรับเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="space-y-3">
                {groupedEmployees.map((emp) => {
                  const isExpanded = expandedEmployeeIds.has(emp.employeeId);
                  const initials = emp.employeeName ? emp.employeeName.trim().slice(0, 2) : 'EM';

                  return (
                    <div
                      key={emp.employeeId}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isExpanded
                          ? 'bg-white border-blue-200 shadow-sm'
                          : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Master Row Header */}
                      <div
                        onClick={() => toggleExpandEmployee(emp.employeeId)}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        {/* Employee Details */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className={`p-1 rounded-lg text-gray-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-blue-600' : ''
                            }`}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">{emp.employeeName}</span>
                              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {emp.employeeCode}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {emp.departmentName} · {emp.positionTitle}
                            </div>
                          </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pl-11 sm:pl-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[11px] text-gray-400 block">สิทธิ์ที่เปิด</span>
                            <span className="text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                              {emp.balances.length} ประเภท
                            </span>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-[11px] text-gray-400 block">สิทธิ์ปีนี้</span>
                            <span className="text-xs font-bold text-gray-800">{emp.totalQuota} วัน</span>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-[11px] text-gray-400 block">ใช้ไปรวม</span>
                            <span className={`text-xs font-bold ${emp.totalUsed > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                              {emp.totalUsed} วัน
                            </span>
                          </div>
                          <div className="text-left sm:text-right pr-2">
                            <span className="text-[11px] text-gray-400 block">คงเหลือรวม</span>
                            <span className="text-sm font-black text-blue-600">{emp.totalRemaining} วัน</span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Sub-Table */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-slate-50/70 border-t border-gray-100 animate-in fade-in duration-150">
                          <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-xs">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 font-semibold text-gray-500">
                                  <th className="py-2.5 px-4">ประเภทการลา</th>
                                  <th className="py-2.5 px-3 text-center">สิทธิ์ปีนี้</th>
                                  <th className="py-2.5 px-3 text-center">ยกมา</th>
                                  <th className="py-2.5 px-3 text-center">ใช้ไป</th>
                                  <th className="py-2.5 px-3 text-center">ปรับยอด</th>
                                  <th className="py-2.5 px-3 text-center font-bold text-gray-700">คงเหลือ</th>
                                  <th className="py-2.5 px-3 text-center">หมดอายุยกยอด</th>
                                  <th className="py-2.5 px-3 text-center">จัดการ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {emp.balances.map((b) => (
                                  <tr key={b.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="py-3 px-4">
                                      <span className="font-semibold text-gray-800">{b.leaveTypeName}</span>
                                    </td>
                                    <td className="py-3 px-3 text-center text-gray-600">{b.annualQuotaDays} วัน</td>
                                    <td className="py-3 px-3 text-center text-gray-600">{b.activeCarriedForwardDays} วัน</td>
                                    <td className="py-3 px-3 text-center font-bold text-rose-600">{b.usedDays} วัน</td>
                                    <td className="py-3 px-3 text-center">
                                      <span
                                        className={`font-semibold ${
                                          b.adjustedDays > 0
                                            ? 'text-emerald-600'
                                            : b.adjustedDays < 0
                                            ? 'text-rose-600'
                                            : 'text-gray-400'
                                        }`}
                                      >
                                        {b.adjustedDays > 0 ? `+${b.adjustedDays}` : b.adjustedDays} วัน
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-bold text-blue-600 text-sm">
                                      {b.netRemainingLeaveDays} วัน
                                    </td>
                                    <td className="py-3 px-3 text-center text-gray-400">
                                      {b.carryForwardExpiry
                                        ? new Date(b.carryForwardExpiry).toLocaleDateString('th-TH', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                          })
                                        : '-'}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenAdjustBalance(b);
                                          }}
                                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                          title="ปรับยอดวันลา"
                                        >
                                          <ArrowRightLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenTransactions(b);
                                          }}
                                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                          title="ดูประวัติความเคลื่อนไหว"
                                        >
                                          <History className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* Tab 4: คำขอลา (Leave Requests) */}
        {activeTab === 'requests' && (
          <div className="p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-700 font-medium mb-1">รออนุมัติ</p>
                <p className="text-2xl font-bold text-amber-800">{leaveStats?.pendingRequestsCount ?? 0}</p>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-xs text-emerald-700 font-medium mb-1">อนุมัติเดือนนี้</p>
                <p className="text-2xl font-bold text-emerald-800">{leaveStats?.approvedThisMonthCount ?? 0}</p>
              </div>
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                <p className="text-xs text-rose-700 font-medium mb-1">ปฏิเสธเดือนนี้</p>
                <p className="text-2xl font-bold text-rose-800">{leaveStats?.rejectedThisMonthCount ?? 0}</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-700 font-medium mb-1">รวมวันลาเดือนนี้</p>
                <p className="text-2xl font-bold text-blue-800">{leaveStats?.totalLeaveDaysThisMonth ?? 0} วัน</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">รายการคำขอลา</h2>
              <button
                onClick={handleOpenRequestModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> ยื่นคำขอลา
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-500">
                    <th className="py-3 px-3 whitespace-nowrap">เลขที่คำขอ</th>
                    <th className="py-3 px-3 whitespace-nowrap">พนักงาน</th>
                    <th className="py-3 px-3 whitespace-nowrap">แผนก</th>
                    <th className="py-3 px-3 whitespace-nowrap">ประเภทการลา</th>
                    <th className="py-3 px-3 whitespace-nowrap">ช่วงวันที่</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">จำนวนวัน</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">เอกสารแนบ</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">สถานะ</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-gray-400">
                        ยังไม่มีคำขอลาในระบบ
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((r) => {
                      const statusInfo = leaveStatusDisplay(r.status);
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap font-medium text-gray-800">{r.requestNo}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="text-gray-800">{r.employeeName}</div>
                            <div className="text-xs text-gray-400">{r.employeeCode}</div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-gray-500">{r.departmentName}</td>
                          <td className="py-3 px-3 whitespace-nowrap text-gray-700">{r.leaveTypeName}</td>
                          <td className="py-3 px-3 whitespace-nowrap text-gray-500">
                            {new Date(r.startDatetime).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
                            })}
                            {' - '}
                            {new Date(r.endDatetime).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap text-gray-700">{r.leaveDays}</td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {r.documents && r.documents.length > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                {r.documents.map((d) => (
                                  <button
                                    key={d.id}
                                    onClick={() => handleDownloadDocument(r, d.id, d.fileName)}
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                    title={d.fileName || 'ดาวน์โหลดไฟล์แนบ'}
                                  >
                                    <Download className="w-3.5 h-3.5" /> ไฟล์แนบ
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.className}`}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {r.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleApproveRequest(r)}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="อนุมัติ"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(r)}
                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="ปฏิเสธ"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                                <button
                                  onClick={() => handleCancelRequest(r)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="ยกเลิกคำขอ"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
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
          </div>
        )}
      </div>

      {/* Modals */}
      <LeaveTypeModal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        onSuccess={() => {}}
        leaveTypeToEdit={typeToEdit}
        onSubmitCreate={handleSubmitCreateType}
        onSubmitUpdate={handleSubmitUpdateType}
      />

      <LeavePolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        onSuccess={() => {}}
        policyToEdit={policyToEdit}
        leaveTypes={leaveTypes}
        employeeLevels={employeeLevels}
        onSubmitCreate={handleSubmitCreatePolicy}
        onSubmitUpdate={handleSubmitUpdatePolicy}
      />

      <AdjustBalanceModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onSuccess={() => {}}
        balance={balanceToAdjust}
        onSubmit={handleSubmitAdjustment}
      />

      <LeaveTransactionsModal
        isOpen={isTransactionsModalOpen}
        onClose={() => setIsTransactionsModalOpen(false)}
        balance={balanceForTransactions}
      />

      <LeaveRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        employees={employees}
        leaveTypes={leaveTypes.filter((t) => t.status === 'ACTIVE')}
        leavePolicies={leavePolicies}
        onSubmit={handleSubmitLeaveRequest}
      />

      {/* Modern Custom Confirm & Alert Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
        singleButton={confirmConfig.singleButton}
        isLoading={confirmConfig.isLoading}
      />
    </div>
  );
}
