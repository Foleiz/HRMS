'use client';

import React, { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { LeaveBalance, LeaveBalanceAdjustmentPayload } from '@/types/leave';
import { Modal, ModalFooter, inputClass } from '@/components/ui';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center justify-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-primary" />
          <span>ปรับยอดวันลาพนักงาน</span>
        </span>
      }
      onSubmit={handleSubmit}
      size="sm"
      footer={
        <ModalFooter
          onCancel={onClose}
          submitText="ยืนยันการปรับยอด"
          cancelText="ยกเลิก"
          loading={loading}
        />
      }
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Employee & Leave Info Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-700/60">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">พนักงาน:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {balance.employeeName} ({balance.employeeCode})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">ประเภทการลา:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{balance.leaveTypeName}</span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">คงเหลือปัจจุบัน:</span>
            <span className="font-bold text-primary dark:text-blue-300">{currentRemaining} วัน</span>
          </div>
        </div>

        {/* Type of Adjustment: Add or Deduct */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            ประเภทการปรับยอด
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsDeduct(false)}
              className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                !isDeduct
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              + เพิ่มสิทธิ์วันลา
            </button>
            <button
              type="button"
              onClick={() => setIsDeduct(true)}
              className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                isDeduct
                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              - ลดสิทธิ์วันลา
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            จำนวนวัน {isDeduct ? '(ลดลง)' : '(เพิ่มขึ้น)'}
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            placeholder="เช่น 1 หรือ 2.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
            className={inputClass}
            required
          />
        </div>

        {/* Preview */}
        {numAmount > 0 && (
          <div className="p-3 bg-primary-soft/60 rounded-xl border border-primary/20 flex items-center justify-between text-xs text-primary font-medium">
            <span>ยอดใหม่หลังปรับ:</span>
            <span className="font-bold text-sm tabular-nums">{previewRemaining} วัน</span>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            เหตุผลการปรับยอด (หมายเหตุ)
          </label>
          <textarea
            rows={2}
            placeholder="เช่น ได้รับโควตาพิเศษจากโครงการ, แก้ไขข้อผิดพลาดปีก่อน"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>
    </Modal>
  );
};
