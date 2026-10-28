'use client';

import { ModalShell, Button } from '@/components/ui';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, History, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { salaryService } from '@/services/salaryService';
import { EmployeeSalary, EmployeeSalaryOverview } from '@/types/payroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeSalaryOverview | null;
}

export const SalaryHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const [history, setHistory] = useState<EmployeeSalary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && employee) {
      loadHistory(employee.employeeId);
    }
  }, [isOpen, employee]);

  const loadHistory = async (empId: number) => {
    try {
      setLoading(true);
      const data = await salaryService.getEmployeeSalaryHistory(empId);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load salary history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <ModalShell className="z-50 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" innerClassName="items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-700/60 my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/30 text-primary dark:text-blue-300 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                ประวัติการปรับเงินเดือน: {employee.employeeName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {employee.employeeCode} • {employee.departmentName || 'ไม่ระบุแผนก'} • {employee.positionName || 'ไม่ระบุตำแหน่ง'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary dark:text-blue-400" />
              <span>กำลังโหลดประวัติเงินเดือน...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <span>ยังไม่มีประวัติการปรับเงินเดือนในระบบ</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                <table className="table-standard text-xs w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold whitespace-nowrap">
                      <th className="py-3 px-4 w-40 text-center">สถานะ</th>
                      <th className="py-3 px-4 w-36 text-right whitespace-nowrap">ฐานเงินเดือน</th>
                      <th className="py-3 px-4 w-56 whitespace-nowrap">ช่วงเวลาที่มีผล</th>
                      <th className="py-3 px-4">เหตุผลในการปรับ</th>
                      <th className="py-3 px-4 w-44 whitespace-nowrap">ผู้อนุมัติ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs text-slate-700 dark:text-slate-200">
                    {history.map((h) => {
                      // สถานะตามวันที่วันนี้: ยังไม่ถึงวันที่มีผล = รอปรับ / ครอบคลุมวันนี้ = ปัจจุบัน / ผ่านไปแล้ว = สิ้นสุด
                      const now = new Date();
                      const pad = (n: number) => String(n).padStart(2, '0');
                      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                      const isPending = h.effectiveFrom > today;
                      const isCurrent = !isPending && (!h.effectiveTo || h.effectiveTo >= today);
                      return (
                        <tr
                          key={h.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors ${
                            isCurrent ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : isPending ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 whitespace-nowrap">
                                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                รอปรับฐานเงินเดือน
                              </span>
                            ) : isCurrent ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                ปัจจุบัน
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 font-medium">
                                สิ้นสุดแล้ว
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            ฿{h.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
                            {h.effectiveFrom} {h.effectiveTo ? `ถึง ${h.effectiveTo}` : 'เป็นต้นไป'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            {h.reason || '-'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {h.approvedByName || '-'}
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

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/60 flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            ปิด
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};
