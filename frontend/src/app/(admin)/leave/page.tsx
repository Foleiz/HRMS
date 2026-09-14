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
  Clock,
} from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { organizationService } from '@/services/organizationService';
import {
  LeaveType,
  CreateLeaveTypePayload,
  UpdateLeaveTypePayload,
  LeavePolicy,
  CreateLeavePolicyPayload,
  UpdateLeavePolicyPayload,
  LeaveBalance,
  LeaveBalanceAdjustmentPayload,
} from '@/types/leave';
import { LeaveTypeModal } from '@/components/leave/LeaveTypeModal';
import { LeavePolicyModal } from '@/components/leave/LeavePolicyModal';
import { AdjustBalanceModal } from '@/components/leave/AdjustBalanceModal';
import { LeaveTransactionsModal } from '@/components/leave/LeaveTransactionsModal';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';

type ActiveTab = 'types' | 'policies' | 'balances';

export default function LeaveManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('types');

  // Master Data
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [employeeLevels, setEmployeeLevels] = useState<{ id: number; levelName: string }[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

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
      const [typesData, policiesData, levelsData] = await Promise.all([
        leaveService.getLeaveTypes(),
        leaveService.getLeavePolicies(),
        organizationService.getLevels(),
      ]);
      setLeaveTypes(typesData);
      setLeavePolicies(policiesData);
      setEmployeeLevels(levelsData);
      await fetchBalances(selectedYear);
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
    showToast('สร้างประเภทการลาสำเร็จ');
  };

  const handleSubmitUpdateType = async (id: number, payload: UpdateLeaveTypePayload) => {
    await leaveService.updateLeaveType(id, payload);
    const updated = await leaveService.getLeaveTypes();
    setLeaveTypes(updated);
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
          closeConfirm();
          showToast('ลบประเภทการลาเรียบร้อยแล้ว');
        } catch (err: any) {
          closeConfirm();
          showAlert('ไม่สามารถลบได้', err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาด', 'danger');
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
    showToast('เพิ่มสิทธิ์การลาสำเร็จ');
  };

  const handleSubmitUpdatePolicy = async (id: number, payload: UpdateLeavePolicyPayload) => {
    await leaveService.updateLeavePolicy(id, payload);
    const updated = await leaveService.getLeavePolicies();
    setLeavePolicies(updated);
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
              {activeTab === 'types' ? 'ประเภทการลา' : activeTab === 'policies' ? 'สิทธิ์การลา' : 'ยอดวันลาพนักงาน'}
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

        {/* Tab 3: ยอดวันลาพนักงาน (Employee Leave Balances) */}
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
              </div>

              {/* Initialize Balance Button */}
              <button
                onClick={handleInitializeYearBalance}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" /> จัดสรรยอดประจำปี {selectedYear + 543}
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-500">
                    <th className="py-3.5 px-5">พนักงาน</th>
                    <th className="py-3.5 px-4">ประเภทการลา</th>
                    <th className="py-3.5 px-4 text-center">สิทธิ์ปีนี้</th>
                    <th className="py-3.5 px-4 text-center">ยกมา</th>
                    <th className="py-3.5 px-4 text-center">ใช้ไป</th>
                    <th className="py-3.5 px-4 text-center">ปรับยอด</th>
                    <th className="py-3.5 px-4 text-center">คงเหลือ</th>
                    <th className="py-3.5 px-4 text-center">หมดอายุยกยอด</th>
                    <th className="py-3.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดยอดวันลา...
                        </div>
                      </td>
                    </tr>
                  ) : filteredBalances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        ไม่พบข้อมูลยอดวันลาสำหรับเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredBalances.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-semibold text-gray-800">{b.employeeName}</div>
                          <div className="text-xs text-gray-400">
                            {b.employeeCode} · {b.departmentName}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-medium text-gray-700">
                          {b.leaveTypeName}
                        </td>
                        <td className="py-4 px-4 text-center text-gray-700">
                          {b.annualQuotaDays} วัน
                        </td>
                        <td className="py-4 px-4 text-center text-gray-700">
                          {b.activeCarriedForwardDays} วัน
                        </td>
                        <td className="py-4 px-4 text-center font-semibold text-rose-600">
                          {b.usedDays} วัน
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`text-xs font-semibold ${
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
                        <td className="py-4 px-4 text-center font-bold text-blue-600">
                          {b.netRemainingLeaveDays} วัน
                        </td>
                        <td className="py-4 px-4 text-center text-xs text-gray-500">
                          {b.carryForwardExpiry
                            ? new Date(b.carryForwardExpiry).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenAdjustBalance(b)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="ปรับยอดวันลา"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenTransactions(b)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="ดูประวัติความเคลื่อนไหว"
                            >
                              <History className="w-4 h-4" />
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
