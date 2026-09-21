'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { PayrollRecord, PayrollDetailItem } from '@/types/payroll';
import { salaryService } from '@/services/salaryService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
}

export const PayrollDetailDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  record,
}) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PayrollDetailItem[]>([]);

  useEffect(() => {
    if (isOpen && record) {
      setLoading(true);
      salaryService
        .getPayrollDetails(record.id)
        .then((data) => setDetails(data))
        .catch((err) => {
          console.error('Failed to load payroll details:', err);
          setDetails([]);
        })
        .finally(() => setLoading(false));
    } else {
      setDetails([]);
    }
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const earnings = details.filter((d) => d.itemType === 'EARNING');
  const deductions = details.filter((d) => d.itemType === 'DEDUCTION');

  const totalGross = record.totalGrossIncome ?? earnings.reduce((sum, item) => sum + item.amount, 0);
  const totalDed = record.totalDeductionAmount ?? deductions.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const netSalary = record.netPayableSalary ?? (totalGross - totalDed);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-100 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">{record.employeeName}</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {record.employeeCode} · {record.departmentName} · payroll_detail
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs">กำลังโหลดรายละเอียด...</span>
            </div>
          ) : (
            <>
              {/* รายได้ (Earnings) */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 mb-2">รายได้</h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                  {earnings.length > 0 ? (
                    earnings.map((item) => (
                      <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-medium text-slate-800">{item.itemName}</div>
                          {item.subtext && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{item.subtext}</div>
                          )}
                        </div>
                        <div className="font-semibold text-slate-900 font-mono">
                          ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3.5 text-center text-xs text-slate-400">
                      {record.status === 'DRAFT' ? 'ยังไม่ได้ประมวลผล' : 'ไม่มีรายการรายได้'}
                    </div>
                  )}
                </div>
              </div>

              {/* รายการหัก (Deductions) */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 mb-2">รายการหัก</h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                  {deductions.length > 0 ? (
                    deductions.map((item) => {
                      const absAmount = Math.abs(item.amount);
                      return (
                        <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-medium text-slate-800">{item.itemName}</div>
                            {item.subtext && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{item.subtext}</div>
                            )}
                          </div>
                          <div className="font-semibold text-slate-900 font-mono">
                            ฿-{absAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3.5 text-center text-xs text-slate-400">
                      {record.status === 'DRAFT' ? 'ยังไม่ได้ประมวลผล' : 'ไม่มีรายการหัก'}
                    </div>
                  )}
                </div>
              </div>

              {/* เงินเดือนสุทธิ (net_salary) */}
              <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-white shadow-2xs">
                <span className="text-xs font-semibold text-slate-700">เงินเดือนสุทธิ (net_salary)</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {netSalary > 0
                    ? `฿${netSalary.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                    : '-'}
                </span>
              </div>


            </>
          )}
        </div>
      </div>
    </div>
  );
};
