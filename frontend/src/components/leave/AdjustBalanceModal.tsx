'use client';

import React, { useState } from 'react';
import { X, Loader2, ArrowRightLeft } from 'lucide-react';
import { LeaveBalance, LeaveBalanceAdjustmentPayload } from '@/types/leave';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  balance: LeaveBalance | null;
  onSubmit: (data: LeaveBalanceAdjustmentPayload) => Promise<void>;
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  balance,
  onSubmit,
}) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [isDeduct, setIsDeduct] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !balance) return null;

  const currentRemaining = balance.netRemainingLeaveDays;
  const numAmount = amount === '' ? 0 : Number(amount);
  const finalAmount = isDeduct ? -Math.abs(numAmount) : Math.abs(numAmount);
  const previewRemaining = currentRemaining + finalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setError('กรุณาระบุจำนวนวันที่ต้องการปรับยอด (มากกว่า 0)');
      return;
    }
    if (!reason.trim()) {
      setError('กรุณาระบุเหตุผลหรือหมายเหตุในการปรับยอด');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        leaveBalanceId: balance.id,
        amount: finalAmount,
        reason: reason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการปรับยอด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-800">ปรับยอดวันลาพนักงาน</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Employee & Leave Info Card */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">พนักงาน:</span>
              <span className="font-semibold text-gray-800">{balance.employeeName} ({balance.employeeCode})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ประเภทการลา:</span>
              <span className="font-medium text-gray-800">{balance.leaveTypeName}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-gray-500">คงเหลือปัจจุบัน:</span>
              <span className="font-bold text-blue-600">{currentRemaining} วัน</span>
            </div>
          </div>

          {/* Type of Adjustment: Add or Deduct */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">ประเภทการปรับยอด</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsDeduct(false)}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                  !isDeduct
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                + เพิ่มสิทธิ์วันลา
              </button>
              <button
                type="button"
                onClick={() => setIsDeduct(true)}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                  isDeduct
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                - ลดสิทธิ์วันลา
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              จำนวนวัน {isDeduct ? '(ลดลง)' : '(เพิ่มขึ้น)'}
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              placeholder="เช่น 1 หรือ 2.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Preview */}
          {numAmount > 0 && (
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs text-blue-800 font-medium">
              <span>ยอดใหม่หลังปรับ:</span>
              <span className="font-bold text-sm">{previewRemaining} วัน</span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              เหตุผลการปรับยอด (หมายเหตุ)
            </label>
            <textarea
              rows={2}
              placeholder="เช่น ได้รับโควตาพิเศษจากโครงการ, แก้ไขข้อผิดพลาดปีก่อน"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              ยืนยันการปรับยอด
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
