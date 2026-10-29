'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Wallet,
  Users,
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import { PayrollPeriod, PayrollRecord } from '@/types/payroll';
import { salaryService } from '@/services/salaryService';
import { TablePagination } from '@/components/ui/TablePagination';

interface PayrollPeriodDetailModalProps {
  period: PayrollPeriod | null;
  isOpen: boolean;
  onClose: () => void;
  onGoToProcess?: (periodId: number) => void;
  canViewProcess?: boolean;
}

export const PayrollPeriodDetailModal: React.FC<PayrollPeriodDetailModalProps> = ({
  period,
  isOpen,
  onClose,
  onGoToProcess,
  canViewProcess = true,
}) => {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (isOpen && period) {
      setSearchQuery('');
      setPage(1);
      setLoading(true);
      salaryService
        .getPayrollsByPeriod(period.id)
        .then((res) => {
          setPayrolls(res || []);
        })
        .catch((err) => {
          console.error('Failed to load payroll details for period:', err);
          setPayrolls([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setPayrolls([]);
    }
  }, [isOpen, period]);

  // Format date dd/mm/yyyy (พ.ศ.)
  const formatDateSlash = (iso?: string | null) => {
    if (!iso) return '-';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return iso;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}`;
  };

  // Status badge styling
  const renderStatusBadge = (status?: string, statusText?: string) => {
    let badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    if (status === 'CLOSED') {
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
    } else if (status === 'PAID') {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    } else if (status === 'APPROVED') {
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    } else if (status === 'SUBMITTED_TO_FINANCE' || status === 'FINANCE_VERIFIED') {
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}>
        {statusText || status || '-'}
      </span>
    );
  };

  // Aggregated totals
  const totalGross = useMemo(() => {
    return payrolls.reduce((sum, p) => sum + (p.totalGrossIncome || 0), 0);
  }, [payrolls]);

  const totalDeductions = useMemo(() => {
    return payrolls.reduce((sum, p) => sum + (p.totalDeductionAmount || 0), 0);
  }, [payrolls]);

  const totalSso = useMemo(() => {
    return payrolls.reduce((sum, p) => sum + (p.ssoAmount || 0), 0);
  }, [payrolls]);

  const totalTax = useMemo(() => {
    return payrolls.reduce((sum, p) => sum + (p.taxAmount || 0), 0);
  }, [payrolls]);

  const filteredPayrolls = useMemo(() => {
    if (!searchQuery.trim()) return payrolls;
    const q = searchQuery.toLowerCase().trim();
    return payrolls.filter(
      (p) =>
        p.employeeCode?.toLowerCase().includes(q) ||
        p.employeeName?.toLowerCase().includes(q) ||
        p.departmentName?.toLowerCase().includes(q)
    );
  }, [payrolls, searchQuery]);

  const totalCount = filteredPayrolls.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedPayrolls = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredPayrolls.slice(start, start + pageSize);
  }, [filteredPayrolls, safePage, pageSize]);

  if (!isOpen || !period) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-100 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#0B2046] dark:text-blue-300 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {period.periodName}
                </h3>
                {renderStatusBadge(period.status, period.statusText)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ปี {period.year + 543} เดือนที่ {period.month} • รหัสรอบ #{period.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
          {/* Metadata Bar */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 dark:text-slate-500">ช่วงเวลาคำนวณ:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {formatDateSlash(period.startDate)} - {formatDateSlash(period.endDate)}
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 dark:text-slate-500">กำหนดวันจ่ายเงิน:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {formatDateSlash(period.paymentDate)}
                </span>
              </div>
              {period.claimCutoffDate && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500">ตัดรอบเอกสาร/เคลม:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {formatDateSlash(period.claimCutoffDate)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                <span className="text-[11px] font-semibold">ยอดรวมสุทธิ</span>
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                ฿{(period.totalNetSalary ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">จ่ายจริงสุทธิ</span>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                <span className="text-[11px] font-semibold">เงินได้/ฐานเงินเดือน</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                ฿{totalGross.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">รวมรายได้ทั้งหมด</span>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
                <span className="text-[11px] font-semibold">รายการหักรวม</span>
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                ฿{totalDeductions.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80">หักขาด/ลา/สาย/อื่นๆ</span>
            </div>

            <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                <span className="text-[11px] font-semibold">จำนวนพนักงาน</span>
                <Users className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {period.employeeCount ?? payrolls.length} <span className="text-xs font-normal text-slate-500">คน</span>
              </div>
              <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80">ในรอบเงินเดือนนี้</span>
            </div>
          </div>

          {/* Social Security & Tax Summary Chips */}
          {(totalSso > 0 || totalTax > 0) && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {totalSso > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                  <span className="font-medium">ประกันสังคมรวม:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                    ฿{totalSso.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {totalTax > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                  <span className="font-medium">ภาษีหัก ณ ที่จ่ายรวม:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                    ฿{totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Employees Table Header & Search */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  รายชื่อพนักงานในรอบนี้ ({filteredPayrolls.length} คน)
                </h4>
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหารหัส, ชื่อ หรือแผนก..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0B2046]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0B2046] dark:text-blue-400" />
                  <span className="text-xs font-medium">กำลังโหลดข้อมูลเงินเดือน...</span>
                </div>
              ) : filteredPayrolls.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {searchQuery ? 'ไม่พบพนักงานตามคำค้นหา' : 'ยังไม่มีข้อมูลการคำนวณเงินเดือนในรอบนี้'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {period.status === 'DRAFT'
                      ? 'รอบนี้ยังเป็นร่าง คุณสามารถไปที่หน้าประมวลผลเพื่อกดคำนวณเงินเดือน'
                      : ''}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 px-3 min-w-[85px] whitespace-nowrap">รหัส</th>
                        <th className="py-2.5 px-3 min-w-[200px] whitespace-nowrap">พนักงาน</th>
                        <th className="py-2.5 px-3 min-w-[110px] text-right whitespace-nowrap">เงินได้รวม</th>
                        <th className="py-2.5 px-3 min-w-[100px] text-right whitespace-nowrap">รายการหัก</th>
                        <th className="py-2.5 px-3 min-w-[95px] text-right whitespace-nowrap">ประกันสังคม</th>
                        <th className="py-2.5 px-3 min-w-[85px] text-right whitespace-nowrap">ภาษี</th>
                        <th className="py-2.5 px-3 min-w-[110px] text-right font-bold whitespace-nowrap">ยอดสุทธิ</th>
                        <th className="py-2.5 px-3 min-w-[90px] text-center whitespace-nowrap">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                      {paginatedPayrolls.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {p.employeeCode}
                          </td>
                          <td className="py-2.5 px-3 min-w-[200px] whitespace-nowrap">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {p.employeeName}
                            </div>
                            <span className="text-[11px] text-slate-400 block whitespace-nowrap">
                              {p.departmentName || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                            ฿{(p.totalGrossIncome ?? 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">
                            ฿{(p.totalDeductionAmount ?? 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            ฿{(p.ssoAmount ?? 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            ฿{(p.taxAmount ?? 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            ฿{(p.netPayableSalary ?? 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${
                                p.paymentStatus === 'TRANSFERRED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : p.status === 'CALCULATED'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {p.paymentStatusText || p.statusText || p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredPayrolls.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 p-2.5">
                  <TablePagination
                    total={totalCount}
                    page={safePage}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(newSize: number) => {
                      setPageSize(newSize);
                      setPage(1);
                    }}
                    pageSizeOptions={[10, 20, 50]}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div>
            {canViewProcess && onGoToProcess && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToProcess(period.id);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                <span>ไปที่หน้าประมวลผลเงินเดือน</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
