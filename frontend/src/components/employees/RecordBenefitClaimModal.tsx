'use client';

import React, { useState } from 'react';
import { BenefitUsageItem, CreateBenefitClaimPayload } from '@/types/benefit';
import { benefitService } from '@/services/benefitService';
import { useToast } from '@/context/ToastContext';
import { X, Receipt, Building2, Calendar, FileText, AlertCircle, CheckCircle2, Loader2, Sparkles, Paperclip } from 'lucide-react';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });

const extractErrorMessage = (err: unknown, fallback: string) => {
  const e = err as { response?: { data?: { message?: string; errors?: string[] } }; message?: string };
  return e?.response?.data?.errors?.[0] || e?.response?.data?.message || e?.message || fallback;
};

interface RecordBenefitClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId: number;
  employeeName: string;
  benefits: BenefitUsageItem[];
  preSelectedBenefitId?: number | null;
  /** hr = ฝ่ายบุคคลบันทึกให้ (อนุมัติทันที) / self = พนักงานยื่นเบิกเอง (เข้าสายการอนุมัติ) */
  mode?: 'hr' | 'self';
}

export const RecordBenefitClaimModal: React.FC<RecordBenefitClaimModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employeeId,
  employeeName,
  benefits,
  preSelectedBenefitId,
  mode = 'hr',
}) => {
  const isSelf = mode === 'self';
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter claimable benefits (typically HEALTH, WELLNESS, ALLOWANCE, etc. with quota or active)
  // สวัสดิการที่จ่ายผ่านเงินเดือนอัตโนมัติ/ตามกฎหมาย ไม่ต้องยื่นเบิก
  const claimableBenefits = benefits.filter(
    (b) =>
      (b.frequency === 'YEARLY' || b.quotaAmount > 0 || b.category === 'HEALTH') &&
      (!isSelf || (b.category !== 'ALLOWANCE' && b.category !== 'STATUTORY'))
  );

  const [selectedBenefitId, setSelectedBenefitId] = useState<number>(
    preSelectedBenefitId || claimableBenefits[0]?.benefitItemId || 0
  );
  const [amount, setAmount] = useState<string>('');
  const [claimDate, setClaimDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Find currently selected benefit item to display live quota check
  const activeBenefit = benefits.find((b) => b.benefitItemId === Number(selectedBenefitId));

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('กรุณากรอกจำนวนเงินที่ถูกต้อง (มากกว่า 0 บาท)');
      return;
    }

    if (!selectedBenefitId) {
      setErrorMsg('กรุณาเลือกประเภทสวัสดิการ');
      return;
    }

    if (activeBenefit && activeBenefit.quotaAmount > 0) {
      if (numAmount > activeBenefit.remainingAmount) {
        setErrorMsg(
          `ยอดเงินที่ระบุ (${numAmount.toLocaleString()} บ.) เกินวงเงินโควตาคงเหลือ (${activeBenefit.remainingAmount.toLocaleString()} บ.)`
        );
        return;
      }
    }

    const needsReceipt = isSelf && activeBenefit?.payoutType === 'REIMBURSEMENT';
    if (needsReceipt && !file) {
      setErrorMsg('กรุณาแนบใบเสร็จ/หลักฐานการชำระเงิน');
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      setErrorMsg('ไฟล์แนบต้องมีขนาดไม่เกิน 5 MB');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (isSelf) {
        await benefitService.submitClaimRequest({
          benefitItemId: Number(selectedBenefitId),
          claimDate,
          amount: numAmount,
          receiptNumber: receiptNumber.trim() || undefined,
          serviceProvider: serviceProvider.trim() || undefined,
          remarks: remarks.trim() || undefined,
          fileName: file?.name,
          fileData: file ? await readAsDataUrl(file) : undefined,
        });
        toast.success('ยื่นเบิกสวัสดิการเรียบร้อยแล้ว รอการอนุมัติ');
        onSuccess();
        onClose();
        return;
      }

      const payload: CreateBenefitClaimPayload = {
        employeeId,
        benefitItemId: Number(selectedBenefitId),
        claimYear: new Date(claimDate).getFullYear(),
        claimDate,
        amount: numAmount,
        receiptNumber: receiptNumber.trim() || undefined,
        serviceProvider: serviceProvider.trim() || undefined,
        remarks: remarks.trim() || undefined,
      };

      await benefitService.createClaim(payload);
      toast.success('บันทึกการใช้สิทธิ์สวัสดิการเรียบร้อยแล้ว');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'เกิดข้อผิดพลาดในการบันทึกรายการ');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {isSelf ? 'ยื่นเบิกสวัสดิการ' : 'บันทึกการใช้สิทธิ์ / เบิกสวัสดิการ'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                พนักงาน: {employeeName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* สวัสดิการที่ต้องการใช้สิทธิ์ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ประเภทสวัสดิการ <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedBenefitId}
              onChange={(e) => setSelectedBenefitId(Number(e.target.value))}
              required
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046] dark:focus:ring-blue-500"
            >
              <option value="">-- กรุณาเลือกสวัสดิการ --</option>
              {claimableBenefits.map((b) => (
                <option key={b.benefitItemId} value={b.benefitItemId}>
                  {b.benefitName} {b.quotaAmount > 0 ? `(คงเหลือ ${b.remainingAmount.toLocaleString()} บ.)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Live Quota Balance Banner */}
          {activeBenefit && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">วงเงินโควตาต่อปี</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {activeBenefit.quotaAmount > 0 ? `${activeBenefit.quotaAmount.toLocaleString()} บ.` : 'ตามจริง'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">ใช้ไปแล้ว</p>
                <p className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {activeBenefit.usedAmount.toLocaleString()} บ.
                </p>
                {!!activeBenefit.pendingAmount && activeBenefit.pendingAmount > 0 && (
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">
                    + รออนุมัติ {activeBenefit.pendingAmount.toLocaleString()} บ.
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">โควตาคงเหลือ</p>
                <p className={`font-bold font-mono ${activeBenefit.remainingAmount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {activeBenefit.quotaAmount > 0 ? `${activeBenefit.remainingAmount.toLocaleString()} บ.` : 'ไม่จำกัด'}
                </p>
              </div>
            </div>
          )}

          {/* จำนวนเงินที่ใช้สิทธิ์ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              จำนวนเงินที่ใช้สิทธิ์ / เบิกจ่าย (บาท) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full text-xs pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2046] dark:focus:ring-blue-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                บาท
              </span>
            </div>
          </div>

          {/* วันที่ใช้สิทธิ์ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              วันที่ใช้สิทธิ์ / วันที่ตามใบเสร็จ <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={claimDate}
              onChange={(e) => setClaimDate(e.target.value)}
              required
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046] dark:focus:ring-blue-500"
            />
          </div>

          {/* เลขที่ใบเสร็จ / ใบแจ้งหนี้ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              เลขที่ใบเสร็จ / เลขที่อ้างอิง
            </label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="เช่น RCP-2026-0012"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046] dark:focus:ring-blue-500"
            />
          </div>

          {/* สถานพยาบาล / ผู้ให้บริการ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              สถานพยาบาล / คลินิก / ผู้ให้บริการ
            </label>
            <input
              type="text"
              value={serviceProvider}
              onChange={(e) => setServiceProvider(e.target.value)}
              placeholder="เช่น รพ.กรุงเทพ, คลินิกทันตกรรมสยาม"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046] dark:focus:ring-blue-500"
            />
          </div>

          {/* หมายเหตุ / รายละเอียด */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              หมายเหตุ / อาการ / รายละเอียดการรักษา
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="เช่น ขูดหินปูนและอุดฟัน 1 ซี่"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046] dark:focus:ring-blue-500 resize-none"
            />
          </div>

          {/* ใบเสร็จ / หลักฐาน (เฉพาะพนักงานยื่นเอง) */}
          {isSelf && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                แนบใบเสร็จ / หลักฐาน
                {activeBenefit?.payoutType === 'REIMBURSEMENT' && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 file:text-xs file:font-medium cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">รูปภาพหรือ PDF ไม่เกิน 5 MB</p>
            </div>
          )}

          {isSelf && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl px-3 py-2">
              คำขอจะส่งเข้าสายการอนุมัติ ยอดที่ยื่นจะถูกกันวงเงินไว้ และนับเป็นยอดใช้สิทธิ์เมื่ออนุมัติครบ
            </p>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0B2046] dark:bg-blue-600 hover:bg-[#153468] dark:hover:bg-blue-500 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSelf ? 'ยื่นเบิก' : 'บันทึกการใช้สิทธิ์'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
