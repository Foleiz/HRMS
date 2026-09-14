'use client';

import React, { useState } from 'react';
import { X, FileText, Calendar, CheckCircle2, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { EmploymentContract } from '@/types/contract';

interface ContractDetailModalProps {
  contract: EmploymentContract | null;
  isOpen: boolean;
  onClose: () => void;
  onTerminate: (id: number, reason: string) => Promise<void>;
}

export default function ContractDetailModal({
  contract,
  isOpen,
  onClose,
  onTerminate,
}: ContractDetailModalProps) {
  const [showTerminateForm, setShowTerminateForm] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !contract) return null;

  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminateReason) return;
    try {
      setIsSubmitting(true);
      await onTerminate(contract.id, terminateReason);
      setShowTerminateForm(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B2046] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">รายละเอียดสัญญาจ้าง</h3>
              <p className="text-xs text-slate-500">รหัสสัญญา #{contract.id}</p>
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
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 text-xs block">ชื่อพนักงาน</span>
              <span className="font-semibold text-slate-800">{contract.employeeName}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">รหัสพนักงาน</span>
              <span className="font-semibold text-slate-800">{contract.employeeCode}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">แผนก / ตำแหน่ง</span>
              <span className="text-slate-700">{contract.departmentName || '-'} / {contract.positionTitle || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">ประเภทสัญญา</span>
              <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs inline-block">
                {contract.contractTypeDisplay}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">วันที่เริ่มสัญญา</span>
              <span className="text-slate-700 font-medium">{contract.startDateDisplay}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">สิ้นสุด / ครบทดลองงาน</span>
              <span className="text-slate-700 font-medium">{contract.effectiveEndDateDisplay || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">สถานะสัญญา</span>
              <span className="flex items-center gap-1.5 font-medium text-xs mt-0.5">
                {contract.status === 'ACTIVE' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-emerald-700">ใช้งาน</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-slate-600">{contract.statusDisplay}</span>
                  </>
                )}
              </span>
            </div>
            {contract.terminationDate && (
              <div>
                <span className="text-slate-400 text-xs block">วันที่สิ้นสุดจริง</span>
                <span className="text-rose-600 font-medium">{contract.terminationReason || 'สิ้นสุดสัญญา'}</span>
              </div>
            )}
          </div>

          {/* Form สิ้นสุดสัญญา */}
          {showTerminateForm ? (
            <form onSubmit={handleTerminateSubmit} className="border border-rose-200 bg-rose-50/50 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                ยืนยันการสิ้นสุด/บอกเลิกสัญญาจ้าง
              </h4>
              <div>
                <label className="block text-xs text-slate-700 font-medium mb-1">เหตุผลในการสิ้นสุดสัญญา *</label>
                <input
                  type="text"
                  value={terminateReason}
                  onChange={(e) => setTerminateReason(e.target.value)}
                  placeholder="เช่น สิ้นสุดระยะเวลาตามสัญญา, ลาออก, ไม่ผ่านการทดลองงาน"
                  required
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTerminateForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-200 rounded-lg hover:bg-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs text-white bg-rose-600 rounded-lg hover:bg-rose-700 font-medium flex items-center gap-1"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  ยืนยันสิ้นสุดสัญญา
                </button>
              </div>
            </form>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
          {contract.status === 'ACTIVE' && !showTerminateForm ? (
            <button
              type="button"
              onClick={() => setShowTerminateForm(true)}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
            >
              สิ้นสุด / บอกเลิกสัญญา
            </button>
          ) : (
            <div></div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
