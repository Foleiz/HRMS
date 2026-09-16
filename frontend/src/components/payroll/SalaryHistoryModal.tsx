'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, History, TrendingUp, CheckCircle2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                ประวัติการปรับเงินเดือน: {employee.employeeName}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {employee.employeeCode} • {employee.departmentName || 'ไม่ระบุแผนก'} • {employee.positionName || 'ไม่ระบุตำแหน่ง'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>กำลังโหลดประวัติเงินเดือน...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <span>ยังไม่มีประวัติการปรับเงินเดือนในระบบ</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-4">สถานะ</th>
                      <th className="py-3 px-4 text-right">ฐานเงินเดือน</th>
                      <th className="py-3 px-4">ช่วงเวลาที่มีผล</th>
                      <th className="py-3 px-4">เหตุผล</th>
                      <th className="py-3 px-4">ผู้อนุมัติ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {history.map((h, idx) => {
                      const isCurrent = !h.effectiveTo;
                      return (
                        <tr
                          key={h.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            isCurrent ? 'bg-emerald-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                ปัจจุบัน
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">สิ้นสุดแล้ว</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                            ฿{h.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap font-mono">
                            {h.effectiveFrom} {h.effectiveTo ? `ถึง ${h.effectiveTo}` : 'เป็นต้นไป'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                            {h.reason || '-'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
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
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
