'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EmployeeBenefitUsageSummary, BenefitClaim, BenefitUsageItem } from '@/types/benefit';
import { benefitService } from '@/services/benefitService';
import { RecordBenefitClaimModal } from './RecordBenefitClaimModal';
import { useToast } from '@/context/ToastContext';
import {
  Gift,
  ShieldCheck,
  HeartPulse,
  Utensils,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Building2,
  Trash2,
  Loader2,
  TrendingUp,
  Percent,
  Wallet,
  Coins,
  History,
  Clock,
  XCircle,
  Ban,
  Paperclip,
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

function paymentStatusLabel(c: BenefitClaim): string {
  switch (c.paymentStatus) {
    case 'UNPAID':
      return 'รอสรุปรอบเงินเดือน';
    case 'IN_PAYROLL':
      return c.payrollPeriodYear && c.payrollPeriodMonth
        ? `อยู่ในรอบ ${c.payrollPeriodMonth}/${c.payrollPeriodYear + 543}`
        : 'อยู่ในรอบเงินเดือน';
    case 'PAID':
      return c.payrollPeriodYear && c.payrollPeriodMonth
        ? `จ่ายแล้ว (รอบ ${c.payrollPeriodMonth}/${c.payrollPeriodYear + 543})`
        : 'จ่ายแล้ว';
    case 'NOT_APPLICABLE':
      return 'ไม่มีการจ่ายเงิน';
    default:
      return '';
  }
}

function formatThaiShortDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}

const CLAIM_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  APPROVED: {
    label: 'อนุมัติแล้ว',
    className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  PENDING: {
    label: 'รออนุมัติ',
    className: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  REJECTED: {
    label: 'ไม่อนุมัติ',
    className: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  CANCELLED: {
    label: 'ยกเลิกแล้ว',
    className: 'bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  },
};

interface EmployeeBenefitsUsageTabProps {
  employeeId: number;
  employeeName: string;
  /** hr = ฝ่ายบุคคลบันทึก/ลบรายการ / self = พนักงานยื่นเบิกเองผ่านสายการอนุมัติ */
  mode?: 'hr' | 'self';
}

export const EmployeeBenefitsUsageTab: React.FC<EmployeeBenefitsUsageTabProps> = ({
  employeeId,
  employeeName,
  mode = 'hr',
}) => {
  const isSelf = mode === 'self';
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EmployeeBenefitUsageSummary | null>(null);
  const [claims, setClaims] = useState<BenefitClaim[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBenefitForClaim, setSelectedBenefitForClaim] = useState<number | null>(null);
  const [deletingClaimId, setDeletingClaimId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumData, claimsData] = await Promise.all([
        benefitService.getEmployeeUsageSummary(employeeId, selectedYear),
        benefitService.getEmployeeClaims(employeeId, selectedYear),
      ]);
      setSummary(sumData);
      setClaims(claimsData);
    } catch (err: unknown) {
      console.error('Error fetching benefit usage:', err);
      toast.error('ไม่สามารถดึงข้อมูลการใช้สวัสดิการได้');
    } finally {
      setLoading(false);
    }
  }, [employeeId, selectedYear, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteClaim = async (claimId: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิก/ลบรายการเบิกสวัสดิการนี้?')) return;
    setDeletingClaimId(claimId);
    try {
      await benefitService.deleteClaim(claimId);
      toast.success('ยกเลิกรายการเบิกสวัสดิการสำเร็จ');
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถลบรายการได้';
      toast.error(msg);
    } finally {
      setDeletingClaimId(null);
    }
  };

  const handleCancelRequest = async (claimId: number) => {
    if (!confirm('ยกเลิกคำขอเบิกสวัสดิการนี้ใช่หรือไม่?')) return;
    setDeletingClaimId(claimId);
    try {
      await benefitService.cancelClaimRequest(claimId);
      toast.success('ยกเลิกคำขอเบิกแล้ว');
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'ไม่สามารถยกเลิกคำขอได้');
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B2046] dark:text-cyan-400 mb-2" />
        <p className="text-xs font-medium">กำลังโหลดข้อมูลสวัสดิการและการใช้สิทธิ์...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls: Filter Year & Record Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#0B2046] dark:text-cyan-400" />
            ระบบติดตามการใช้สิทธิ์และโควตาสวัสดิการ
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ตรวจสอบยอดการใช้สิทธิ์ วงเงินคงเหลือ และสถานะการเบิกจ่ายสวัสดิการรายบุคคล
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">ปีงบประมาณ:</span>
            <CustomSelect
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold focus:outline-none cursor-pointer"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y} className="dark:bg-slate-800">
                  พ.ศ. {y + 543}
                </option>
              ))}
            </CustomSelect>
          </div>

          {/* Record Claim Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedBenefitForClaim(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#0B2046] dark:bg-blue-600 hover:bg-[#153468] dark:hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSelf ? 'ยื่นเบิกสวัสดิการ' : 'บันทึกการใช้สิทธิ์'}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: วงเงินโควตารวม */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">วงเงินโควตารวมต่อปี</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                {summary.totalQuotaAmount.toLocaleString()} <span className="text-xs font-normal text-slate-400">บาท</span>
              </p>
            </div>
          </div>

          {/* Card 2: ใช้ไปแล้วรวม */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">ใช้สิทธิ์ไปแล้วรวม</p>
              <p className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">
                {summary.totalUsedAmount.toLocaleString()} <span className="text-xs font-normal text-slate-400">บาท</span>
              </p>
            </div>
          </div>

          {/* Card 3: คงเหลือที่ใช้ได้ */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">โควตาคงเหลือที่ใช้ได้</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {summary.totalRemainingAmount.toLocaleString()} <span className="text-xs font-normal text-slate-400">บาท</span>
              </p>
            </div>
          </div>

          {/* Card 4: อัตราการใช้สิทธิ์ */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">อัตราการใช้งานโควตา</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                {summary.overallUsagePercent}%{' '}
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  ({summary.maxedOutBenefitsCount} สิทธิ์เต็มแล้ว)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Section: Quota & Usage Progress Bars per Benefit Item */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <span>รายการโควตาสวัสดิการและความคืบหน้า</span>
            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
              ({summary?.benefits?.length || 0} รายการที่ได้รับสิทธิ์)
            </span>
          </h4>
        </div>

        {summary?.benefits && summary.benefits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {summary.benefits.map((b) => {
              const hasQuota = b.quotaAmount > 0;
              const isYearly = b.frequency === 'YEARLY';
              const percent = b.usagePercentage;

              // Color determination
              let progressColor = 'bg-emerald-500';
              let badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
              if (b.isMaxedOut) {
                progressColor = 'bg-rose-500';
                badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
              } else if (percent >= 70) {
                progressColor = 'bg-amber-500';
                badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
              } else if (b.usedAmount === 0 && hasQuota) {
                badgeColor = 'bg-slate-50 text-slate-600 dark:bg-slate-900/60 dark:text-slate-400 border-slate-200 dark:border-slate-700';
              }

              return (
                <div
                  key={b.benefitItemId}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        {getCategoryIcon(b.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                            {b.benefitName}
                          </h5>
                          {b.isDocumentRequired && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              📎 บังคับแนบเอกสาร
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {b.category === 'HEALTH'
                            ? 'สวัสดิการสุขภาพ'
                            : b.category === 'ALLOWANCE'
                            ? 'เงินช่วยเหลือ / เบี้ยเลี้ยง'
                            : b.category === 'STATUTORY'
                            ? 'สิทธิตามกฎหมายแรงงาน'
                            : 'สวัสดิการพนักงาน'}
                          {b.frequency === 'YEARLY' ? ' (โควตารายปี)' : b.frequency === 'DAILY' ? ' (จ่ายรายวัน)' : ' (จ่ายรายเดือน)'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${badgeColor}`}>
                      {b.statusText}
                    </span>
                  </div>

                  {/* Progress & Numbers */}
                  {hasQuota ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          ใช้ไป {b.usedAmount.toLocaleString()} บ. / {b.quotaAmount.toLocaleString()} บ.
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {percent}%
                        </span>
                      </div>

                      {/* Progress Bar Track */}
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>

                      {/* Remaining / Claims Count */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-400 dark:text-slate-500">
                          {b.claimCount > 0 ? `บันทึกแล้ว ${b.claimCount} ครั้ง` : 'ยังไม่มีประวัติการเบิก'}
                          {!!b.pendingAmount && b.pendingAmount > 0 && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              • รออนุมัติ {b.pendingAmount.toLocaleString()} บ.
                            </span>
                          )}
                        </span>
                        <span className={`font-semibold ${b.remainingAmount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          คงเหลือ {b.remainingAmount.toLocaleString()} บ.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {b.category === 'ALLOWANCE'
                          ? 'คำนวณและจ่ายผ่านรอบเงินเดือน Payroll'
                          : 'ได้รับสิทธิ์ตามระเบียบบริษัทและกฎหมายแรงงาน'}
                      </span>
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        ตามสิทธิ์
                      </span>
                    </div>
                  )}

                  {/* Action Button: Quick Record Claim */}
                  {(hasQuota || isYearly) && (!isSelf || (b.category !== 'ALLOWANCE' && b.category !== 'STATUTORY')) && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {b.lastClaimDate ? `ใช้ล่าสุดเมื่อ: ${formatThaiShortDate(b.lastClaimDate)}` : 'ยังไม่เคยใช้สิทธิ์ในปีนี้'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBenefitForClaim(b.benefitItemId);
                          setIsModalOpen(true);
                        }}
                        disabled={b.isMaxedOut || (hasQuota && b.remainingAmount <= 0)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                          b.isMaxedOut || (hasQuota && b.remainingAmount <= 0)
                            ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                            : 'text-[#0B2046] dark:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>
                          {b.isMaxedOut || (hasQuota && b.remainingAmount <= 0)
                            ? 'โควตาเต็ม'
                            : isSelf
                            ? 'ยื่นเบิก'
                            : 'บันทึกเบิก'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <Gift className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ยังไม่มีข้อมูลการผูกสิทธิประโยชน์สำหรับประเภทพนักงานนี้
            </p>
          </div>
        )}
      </div>

      {/* Claims History Log Section */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>ประวัติการเบิกจ่ายและใช้สิทธิ์สวัสดิการ ({claims.length} รายการ)</span>
          </h4>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-hidden">
          {claims.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/70 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                    <th className="py-3 px-4">วันที่ใช้สิทธิ์</th>
                    <th className="py-3 px-4">รายการสวัสดิการ</th>
                    <th className="py-3 px-4">สถานพยาบาล / ผู้ให้บริการ</th>
                    <th className="py-3 px-4">เลขที่ใบเสร็จ</th>
                    <th className="py-3 px-4">รายละเอียด / หมายเหตุ</th>
                    <th className="py-3 px-4 text-right">จำนวนเงิน</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {claims.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatThaiShortDate(c.claimDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {c.benefitName}
                        </span>
                        {c.requestNo && (
                          <span className="block text-[10px] font-mono text-slate-400">{c.requestNo}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {c.serviceProvider || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        <div>{c.receiptNumber || '-'}</div>
                        {c.attachmentFileName && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-sans">
                            <Paperclip className="w-3 h-3 shrink-0" />
                            {c.attachmentUrl ? (
                              <a
                                href={c.attachmentUrl}
                                download={c.attachmentFileName}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline truncate max-w-[120px]"
                                title={c.attachmentFileName}
                              >
                                {c.attachmentFileName}
                              </a>
                            ) : (
                              <span className="truncate max-w-[120px]" title={c.attachmentFileName}>
                                {c.attachmentFileName}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {c.remarks || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(() => {
                          const badge = CLAIM_STATUS_BADGE[c.status] ?? CLAIM_STATUS_BADGE.APPROVED;
                          const Icon =
                            c.status === 'PENDING' ? Clock : c.status === 'REJECTED' ? XCircle : c.status === 'CANCELLED' ? Ban : CheckCircle2;
                          return (
                            <span
                              title={c.status === 'REJECTED' && c.rejectReason ? `เหตุผล: ${c.rejectReason}` : undefined}
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badge.className}`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{badge.label}</span>
                            </span>
                          );
                        })()}
                        {c.status === 'REJECTED' && c.rejectReason && (
                          <span className="block mt-0.5 text-[10px] text-rose-500 max-w-[10rem] mx-auto truncate" title={c.rejectReason}>
                            {c.rejectReason}
                          </span>
                        )}
                        {c.status === 'APPROVED' && c.paymentStatus && (
                          <span className="block mt-1 text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {paymentStatusLabel(c)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isSelf ? (
                          c.status === 'PENDING' && c.isSelfRequest ? (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(c.id)}
                              disabled={deletingClaimId === c.id}
                              className="px-2 py-1 rounded-md text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="ยกเลิกคำขอเบิก"
                            >
                              {deletingClaimId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ยกเลิก'}
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )
                        ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteClaim(c.id)}
                          disabled={deletingClaimId === c.id}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="ยกเลิก/ลบรายการนี้"
                        >
                          {deletingClaimId === c.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>ยังไม่มีประวัติการเบิกหรือใช้สิทธิ์สวัสดิการในปี {selectedYear}</p>
            </div>
          )}
        </div>
      </div>

      {/* Record Claim Modal */}
      {summary && (
        <RecordBenefitClaimModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
          employeeId={employeeId}
          employeeName={employeeName}
          benefits={summary.benefits}
          preSelectedBenefitId={selectedBenefitForClaim}
          mode={mode}
        />
      )}
    </div>
  );
};
