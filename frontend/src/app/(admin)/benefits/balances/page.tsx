'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { benefitService } from '@/services/benefitService';
import { EmployeeBenefitOverview, BenefitUsageItem, BenefitClaim } from '@/types/benefit';
import { useToast } from '@/context/ToastContext';
import {
  Gift,
  Calendar,
  Search,
  ChevronsUpDown,
  ChevronRight,
  Sparkles,
  Users,
  Loader2,
  HeartPulse,
  Utensils,
  ShieldCheck,
  Receipt,
  History,
  X,
  Building2,
  Trash2,
} from 'lucide-react';

export default function EmployeeBenefitBalancesPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [overviewList, setOverviewList] = useState<EmployeeBenefitOverview[]>([]);
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState<Set<number>>(new Set());

  // Modal states for viewing claims history
  const [isClaimsHistoryOpen, setIsClaimsHistoryOpen] = useState(false);
  const [historyEmp, setHistoryEmp] = useState<EmployeeBenefitOverview | null>(null);
  const [historyBenefit, setHistoryBenefit] = useState<BenefitUsageItem | null>(null);
  const [empClaims, setEmpClaims] = useState<BenefitClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [deletingClaimId, setDeletingClaimId] = useState<number | null>(null);

  useEffect(() => {
    setBreadcrumb({
      section: 'การจัดการบุคคล',
      page: 'ยอดสวัสดิการพนักงาน',
    });
  }, [setBreadcrumb]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await benefitService.getEmployeesBenefitOverview({
        year: selectedYear,
        search: search.trim() || undefined,
      });
      setOverviewList(data);
    } catch (err: unknown) {
      console.error('Failed to load employee benefit balances:', err);
      toast.error('ไม่สามารถดึงข้อมูลยอดสวัสดิการพนักงานได้');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOverview();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchOverview]);

  // Accordion controls
  const toggleExpandEmployee = (employeeId: number) => {
    setExpandedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  const expandAllEmployees = () => {
    setExpandedEmployeeIds(new Set(overviewList.map((e) => e.employeeId)));
  };

  const collapseAllEmployees = () => {
    setExpandedEmployeeIds(new Set());
  };

  // Open claims history modal
  const handleOpenClaimsHistory = async (emp: EmployeeBenefitOverview, benefit?: BenefitUsageItem) => {
    setHistoryEmp(emp);
    setHistoryBenefit(benefit || null);
    setIsClaimsHistoryOpen(true);
    setLoadingClaims(true);
    try {
      const claims = await benefitService.getEmployeeClaims(
        emp.employeeId,
        selectedYear,
        benefit?.benefitItemId
      );
      setEmpClaims(claims);
    } catch (err) {
      console.error('Failed to load claims:', err);
      toast.error('ไม่สามารถดึงประวัติการเบิกได้');
    } finally {
      setLoadingClaims(false);
    }
  };

  const handleDeleteClaim = async (claimId: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิก/ลบรายการเบิกสวัสดิการนี้?')) return;
    setDeletingClaimId(claimId);
    try {
      await benefitService.deleteClaim(claimId);
      toast.success('ยกเลิกรายการเบิกสำเร็จ');
      if (historyEmp) {
        const claims = await benefitService.getEmployeeClaims(
          historyEmp.employeeId,
          selectedYear,
          historyBenefit?.benefitItemId
        );
        setEmpClaims(claims);
      }
      fetchOverview();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถลบรายการได้';
      toast.error(msg);
    } finally {
      setDeletingClaimId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HEALTH':
        return <HeartPulse className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
      case 'ALLOWANCE':
        return <Utensils className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'STATUTORY':
        return <ShieldCheck className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      default:
        return <Gift className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
    }
  };

  const getPayoutTypeBadge = (payoutType?: string) => {
    switch (payoutType) {
      case 'PAYROLL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            จ่ายในเงินเดือน
          </span>
        );
      case 'REIMBURSEMENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            ยื่นเบิกตามบิล / ใบเสร็จ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            ตามระเบียบบริษัท
          </span>
        );
    }
  };

  const totalBenefitItemsCount = useMemo(() => {
    return overviewList.reduce((acc, curr) => acc + curr.benefits.length, 0);
  }, [overviewList]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Header */}
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-[#0B2046] via-[#153468] to-[#1e448b] text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Gift className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold tracking-tight">ยอดสวัสดิการพนักงาน</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-cyan-200 border border-white/20">
                  HR Management
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                ตรวจสอบโควตาสิทธิประโยชน์ การใช้สิทธิ์ และบันทึกการเบิกจ่ายสวัสดิการของพนักงานแต่ละคน
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
        {/* Filter and Control Bar (Matching leave/page.tsx Tab 3) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Year Select */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400">ประจำปี:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-sm font-semibold text-gray-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200">
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
              <button
                onClick={expandAllEmployees}
                className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all flex items-center gap-1"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" /> ขยายทั้งหมด
              </button>
              <button
                onClick={collapseAllEmployees}
                className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all"
              >
                ยุบทั้งหมด
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" /> สิทธิ์และวงเงินคำนวณตามประเภทสัญญาจ้างงาน
            </div>
          </div>
        </div>

        {/* Subheader info count */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 px-1">
          <div className="flex items-center gap-1.5 font-medium">
            <Users className="w-4 h-4 text-gray-400" />
            <span>
              แสดงพนักงาน {overviewList.length} คน (ทั้งหมด {totalBenefitItemsCount} รายการสิทธิ์สวัสดิการ)
            </span>
          </div>
        </div>

        {/* Grouped Employees Accordion List */}
        {loading ? (
          <div className="py-20 text-center text-gray-400 dark:text-slate-500 border border-gray-100 dark:border-slate-800 rounded-2xl">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" /> กำลังโหลดยอดสวัสดิการพนักงาน...
            </div>
          </div>
        ) : overviewList.length === 0 ? (
          <div className="py-20 text-center text-gray-400 dark:text-slate-500 border border-gray-100 dark:border-slate-800 rounded-2xl text-sm">
            ไม่พบข้อมูลสวัสดิการสำหรับเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="space-y-3">
            {overviewList.map((emp) => {
              const isExpanded = expandedEmployeeIds.has(emp.employeeId);
              const initials = emp.employeeName ? emp.employeeName.trim().slice(0, 2) : 'EM';

              return (
                <div
                  key={emp.employeeId}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-white dark:bg-slate-800/90 border-blue-200 dark:border-blue-700/60 shadow-xs'
                      : 'bg-white dark:bg-slate-800/50 border-gray-100 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:shadow-2xs'
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
                        className={`p-1 rounded-lg text-gray-400 dark:text-slate-500 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90 text-blue-600 dark:text-blue-400' : ''
                        }`}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm shadow-xs shrink-0 border border-blue-100 dark:border-blue-900">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{emp.employeeName}</span>
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                            {emp.employeeCode}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                            {emp.employeeTypeName}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                          {emp.departmentName} · {emp.positionTitle}
                        </div>
                      </div>
                    </div>

                    {/* Summary Metrics */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 pl-11 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-gray-400 dark:text-slate-400 block">สิทธิ์ที่เปิด</span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700">
                          {emp.benefits.length} ประเภท
                        </span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-gray-400 dark:text-slate-400 block">สิทธิ์ปีนี้</span>
                        <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                          ฿{emp.totalQuota.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-gray-400 dark:text-slate-400 block">ใช้ไปรวม</span>
                        <span
                          className={`text-xs font-bold ${
                            emp.totalUsed > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-slate-400'
                          }`}
                        >
                          ฿{emp.totalUsed.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="text-left sm:text-right pr-2">
                        <span className="text-[11px] text-gray-400 dark:text-slate-400 block">คงเหลือรวม</span>
                        <span className="text-sm font-black text-blue-600 dark:text-cyan-400">
                          ฿{emp.totalRemaining.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Sub-Table */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50/70 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-700/60 animate-in fade-in duration-150">
                      <div className="overflow-x-auto rounded-xl border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800/90 border-b border-gray-100 dark:border-slate-700 font-semibold text-gray-500 dark:text-slate-400">
                              <th className="py-2.5 px-4">สิทธิประโยชน์ / สวัสดิการ</th>
                              <th className="py-2.5 px-3 text-center">รูปแบบจ่าย</th>
                              <th className="py-2.5 px-3 text-right">วงเงินโควตา</th>
                              <th className="py-2.5 px-3 text-right">ใช้ไป</th>
                              <th className="py-2.5 px-3 text-right font-bold text-gray-700 dark:text-slate-300">คงเหลือ</th>
                              <th className="py-2.5 px-3 text-center">สถานะสิทธิ์</th>
                              <th className="py-2.5 px-3 text-center">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                            {emp.benefits.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-6 text-center text-gray-400 dark:text-slate-500">
                                  ไม่มีสิทธิประโยชน์ที่ผูกกับสัญญาจ้างนี้
                                </td>
                              </tr>
                            ) : (
                              emp.benefits.map((b) => (
                                <tr key={b.benefitItemId} className="hover:bg-blue-50/30 dark:hover:bg-slate-700/40 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-700/60">
                                        {getCategoryIcon(b.category)}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-gray-800 dark:text-slate-200">{b.benefitName}</div>
                                        <div className="text-[11px] text-gray-400 dark:text-slate-400">{b.benefitCode}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {getPayoutTypeBadge(b.payoutType)}
                                  </td>
                                  <td className="py-3 px-3 text-right text-gray-600 dark:text-slate-300 font-medium">
                                    {b.quotaAmount > 0 ? (
                                      <>
                                        ฿{b.quotaAmount.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 block">
                                          /{b.frequency === 'YEARLY' ? 'ปี' : b.frequency === 'MONTHLY' ? 'เดือน' : 'ครั้ง'}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400 dark:text-slate-500">ตามระเบียบ</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                                    {b.usedAmount > 0 ? `฿${b.usedAmount.toLocaleString('th-TH', { minimumFractionDigits: 0 })}` : '-'}
                                  </td>
                                  <td className="py-3 px-3 text-right font-bold text-blue-600 dark:text-cyan-400 text-sm">
                                    {b.quotaAmount > 0 ? (
                                      `฿${b.remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 0 })}`
                                    ) : (
                                      <span className="text-gray-400 dark:text-slate-500 text-xs font-normal">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                        b.isMaxedOut
                                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                          : b.usedAmount > 0
                                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      }`}
                                    >
                                      {b.statusText}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenClaimsHistory(emp, b);
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                      title={`ดูประวัติการเบิกจ่าย (${b.benefitName})`}
                                    >
                                      <History className="w-4 h-4" />
                                    </button>
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
              );
            })}
          </div>
        )}
      </div>

      {/* Claims History Drawer/Modal */}
      {isClaimsHistoryOpen && historyEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm md:text-base">
                    ประวัติการเบิก{historyBenefit ? `: ${historyBenefit.benefitName}` : 'สวัสดิการ'} — {historyEmp.employeeName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    รหัส {historyEmp.employeeCode} · ประจำปี {selectedYear + 543}
                    {historyBenefit && (
                      <span className="ml-2 font-medium text-blue-600 dark:text-cyan-400">
                        ({historyBenefit.benefitCode})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsClaimsHistoryOpen(false);
                  setHistoryBenefit(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingClaims ? (
                <div className="py-12 text-center text-gray-400 dark:text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-xs">กำลังโหลดประวัติการเบิก...</p>
                </div>
              ) : empClaims.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
                  {historyBenefit
                    ? `ยังไม่มีประวัติการขอเบิกสวัสดิการ "${historyBenefit.benefitName}" ในปี ${selectedYear + 543}`
                    : `ยังไม่มีประวัติการขอเบิกสวัสดิการในปี ${selectedYear + 543}`}
                </div>
              ) : (
                <div className="space-y-3">
                  {empClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                            {claim.benefitName}
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                            {claim.category}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>
                            วันที่: {new Date(claim.claimDate).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          {claim.serviceProvider && <span>สถานพยาบาล/ผู้ให้บริการ: {claim.serviceProvider}</span>}
                          {claim.receiptNumber && <span>เลขที่ใบเสร็จ: {claim.receiptNumber}</span>}
                        </div>
                        {claim.remarks && (
                          <div className="text-xs text-gray-400 italic mt-0.5">หมายเหตุ: {claim.remarks}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-black text-rose-600 dark:text-rose-400 block">
                            ฿{claim.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            อนุมัติแล้ว
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteClaim(claim.id)}
                          disabled={deletingClaimId === claim.id}
                          className="p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="ยกเลิก/ลบรายการเบิกนี้"
                        >
                          {deletingClaimId === claim.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => {
                  setIsClaimsHistoryOpen(false);
                  setHistoryBenefit(null);
                }}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
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
