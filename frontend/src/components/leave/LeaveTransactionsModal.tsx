'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, History, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';
import { LeaveBalance, LeaveBalanceTransaction } from '@/types/leave';
import { leaveService } from '@/services/leaveService';

interface LeaveTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: LeaveBalance | null;
}

export const LeaveTransactionsModal: React.FC<LeaveTransactionsModalProps> = ({
  isOpen,
  onClose,
  balance,
}) => {
  const [transactions, setTransactions] = useState<LeaveBalanceTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && balance) {
      fetchTransactions();
    }
  }, [isOpen, balance]);

  const fetchTransactions = async () => {
    if (!balance) return;
    setLoading(true);
    try {
      const data = await leaveService.getLeaveBalanceTransactions(balance.id);
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !balance) return null;

  const getTransactionBadge = (type: string, amount: number) => {
    switch (type) {
      case 'ENTITLEMENT':
      case 'OPENING':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <PlusCircle className="w-3 h-3" /> สิทธิ์ประจำปี (+{amount})
          </span>
        );
      case 'CARRY_FORWARD':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3" /> ยอดยกมา (+{amount})
          </span>
        );
      case 'USED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <MinusCircle className="w-3 h-3" /> ลาหยุดงาน ({amount})
          </span>
        );
      case 'ADJUSTMENT':
        return amount >= 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PlusCircle className="w-3 h-3" /> ปรับเพิ่ม (+{amount})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
            <MinusCircle className="w-3 h-3" /> ปรับลด ({amount})
          </span>
        );
      case 'REVERSAL':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <RefreshCw className="w-3 h-3" /> คืนสิทธิ์ (+{amount})
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
            {type} ({amount})
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-semibold text-gray-800">ประวัติความเคลื่อนไหวยอดวันลา</h3>
              <p className="text-xs text-gray-500">
                {balance.employeeName} ({balance.employeeCode}) · {balance.leaveTypeName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Summary Box */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <div>
              <span className="text-[11px] text-gray-400 block">สิทธิ์ + ยกมา</span>
              <span className="text-sm font-bold text-gray-800">{balance.annualQuotaDays + balance.activeCarriedForwardDays} วัน</span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block">ใช้ไป</span>
              <span className="text-sm font-bold text-rose-600">{balance.usedDays} วัน</span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block">คงเหลือ</span>
              <span className="text-sm font-bold text-blue-600">{balance.netRemainingLeaveDays} วัน</span>
            </div>
          </div>

          {/* Timeline list */}
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดประวัติ...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              ยังไม่มีประวัติการทำรายการ
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50/70 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getTransactionBadge(tx.transactionType, tx.amount)}
                      <span className="text-xs text-gray-400">
                        {new Date(tx.createdAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {tx.note && <p className="text-xs text-gray-600 pl-1">{tx.note}</p>}
                    {tx.createdByEmployeeName && (
                      <p className="text-[11px] text-gray-400 pl-1">โดย: {tx.createdByEmployeeName}</p>
                    )}
                  </div>
                  <div className={`text-sm font-bold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} วัน
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
