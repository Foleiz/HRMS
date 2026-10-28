'use client';

import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  HelpCircle,
  ShieldAlert,
  Info
} from 'lucide-react';
import { TaxBracket, UpdateTaxBracketPayload } from '@/types/payroll';
import { Button } from '@/components/ui';

interface TaxBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  brackets: TaxBracket[];
  onSave: (updatedBrackets: UpdateTaxBracketPayload[]) => Promise<void>;
  onResetDefault: () => Promise<void>;
  isLoading?: boolean;
}

interface EditableBracket {
  id?: number;
  bracketName: string;
  incomeFrom: number;
  incomeTo: number | null;
  taxRatePercent: number; // in % (e.g. 5 for 5%)
  baseTaxAmount: number;
  status: string;
}

export const TaxBracketModal: React.FC<TaxBracketModalProps> = ({
  isOpen,
  onClose,
  brackets,
  onSave,
  onResetDefault,
  isLoading = false,
}) => {
  const [localBrackets, setLocalBrackets] = useState<EditableBracket[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  useEffect(() => {
    if (isOpen && brackets.length > 0) {
      setLocalBrackets(
        brackets.map((b) => ({
          id: b.id,
          bracketName: b.bracketName,
          incomeFrom: Number(b.incomeFrom),
          incomeTo: b.incomeTo != null ? Number(b.incomeTo) : null,
          taxRatePercent: Number(b.taxRate) <= 1.0 ? Number(b.taxRate) * 100 : Number(b.taxRate),
          baseTaxAmount: Number(b.baseTaxAmount),
          status: b.status || 'ACTIVE',
        }))
      );
    }
  }, [isOpen, brackets]);

  // คำนวณภาษีสะสมและตรวจสอบความถูกต้องแบบ Real-time
  useEffect(() => {
    if (localBrackets.length === 0) return;

    const errors: string[] = [];

    // ตรวจสอบขั้นแรก
    if (localBrackets[0].incomeFrom !== 0) {
      errors.push('ขั้นที่ 1 ต้องเริ่มต้นที่ 0 บาท');
    }

    let runningBaseTax = 0;
    const updated = [...localBrackets];
    let hasRecalculated = false;

    for (let i = 0; i < updated.length; i++) {
      const b = updated[i];

      // อัตราภาษี
      if (b.taxRatePercent < 0 || b.taxRatePercent > 100) {
        errors.push(`ขั้นที่ ${i + 1}: อัตราภาษีต้องอยู่ระหว่าง 0% ถึง 100%`);
      }

      if (i > 0 && b.taxRatePercent < updated[i - 1].taxRatePercent) {
        errors.push(`ขั้นที่ ${i + 1}: อัตราภาษีแบบขั้นบันไดต้องไม่น้อยกว่าขั้นก่อนหน้า`);
      }

      // ตรวจสอบ BaseTaxAmount
      if (i === 0) {
        if (b.baseTaxAmount !== 0) {
          b.baseTaxAmount = 0;
          hasRecalculated = true;
        }
      } else {
        const prev = updated[i - 1];
        if (prev.incomeTo != null) {
          const prevRange = prev.incomeTo - Math.floor(prev.incomeFrom);
          runningBaseTax += Math.round(prevRange * (prev.taxRatePercent / 100) * 100) / 100;
          if (b.baseTaxAmount !== runningBaseTax) {
            b.baseTaxAmount = runningBaseTax;
            hasRecalculated = true;
          }
        }
      }

      // ตรวจสอบความต่อเนื่องของช่วงเงินได้
      if (i < updated.length - 1) {
        if (b.incomeTo == null) {
          errors.push(`ขั้นที่ ${i + 1}: ต้องระบุเพดานเงินได้สูงสุด (เฉพาะขั้นสุดท้ายที่ไม่จำกัดเพดาน)`);
        } else if (b.incomeTo <= b.incomeFrom) {
          errors.push(`ขั้นที่ ${i + 1}: เงินได้สิ้นสุดต้องมากกว่าเงินได้เริ่มต้น`);
        }

        const next = updated[i + 1];
        if (next && b.incomeTo != null) {
          if (Math.floor(next.incomeFrom) !== Math.floor(b.incomeTo)) {
            errors.push(
              `ขั้นที่ ${i + 2} เริ่มต้น (฿${next.incomeFrom.toLocaleString()}) ไม่ต่อเนื่องกับขั้นที่ ${i + 1} สิ้นสุด (฿${b.incomeTo.toLocaleString()})`
            );
          }
        }
      }
    }

    if (hasRecalculated) {
      setLocalBrackets(updated);
    }
    setValidationErrors(errors);
  }, [localBrackets]);

  if (!isOpen) return null;

  const handleFieldChange = (index: number, field: keyof EditableBracket, value: any) => {
    setLocalBrackets((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      // ปรับชื่อขั้นให้อัตโนมัติถ้ามีการแก้ช่วงเงินได้หรือ %
      if (field === 'incomeFrom' || field === 'incomeTo' || field === 'taxRatePercent') {
        const item = copy[index];
        const fromStr = item.incomeFrom.toLocaleString();
        const toStr = item.incomeTo != null ? item.incomeTo.toLocaleString() : 'ขึ้นไป';
        const rateStr = item.taxRatePercent === 0 ? 'ยกเว้นภาษี' : `ภาษี ${item.taxRatePercent}%`;
        item.bracketName = `ขั้นที่ ${index + 1} (${fromStr} - ${toStr} บาท ${rateStr})`;
      }

      return copy;
    });
  };

  /** ตั้งชื่อขั้นใหม่ตามลำดับ/ช่วงเงินได้/อัตรา */
  const renameAll = (list: EditableBracket[]) =>
    list.map((item, i) => {
      const fromStr = item.incomeFrom.toLocaleString();
      const toStr = i === list.length - 1 || item.incomeTo == null ? 'ขึ้นไป' : item.incomeTo.toLocaleString();
      const rateStr = item.taxRatePercent === 0 ? 'ยกเว้นภาษี' : `ภาษี ${item.taxRatePercent}%`;
      return { ...item, incomeTo: i === list.length - 1 ? null : item.incomeTo, bracketName: `ขั้นที่ ${i + 1} (${fromStr} - ${toStr} บาท ${rateStr})` };
    });

  /** เพิ่มขั้นต่อท้าย: ขั้นสุดท้ายเดิมได้เพดาน แล้วขั้นใหม่เริ่มต่อจากเพดานนั้น */
  const handleAddBracket = () => {
    setLocalBrackets((prev) => {
      if (prev.length === 0) return renameAll([{ bracketName: '', incomeFrom: 0, incomeTo: null, taxRatePercent: 0, baseTaxAmount: 0, status: 'ACTIVE' }]);
      const last = prev[prev.length - 1];
      const cap = Math.max(last.incomeFrom, 0) + 1000000;
      const updated = [...prev.slice(0, -1), { ...last, incomeTo: cap }];
      updated.push({ bracketName: '', incomeFrom: cap, incomeTo: null, taxRatePercent: last.taxRatePercent, baseTaxAmount: 0, status: 'ACTIVE' });
      return renameAll(updated);
    });
  };

  /** ลบขั้น: ขั้นถัดไปเริ่มต่อจากขั้นก่อนหน้าแทน (ขั้นแรกลบไม่ได้) */
  const handleRemoveBracket = (index: number) => {
    setLocalBrackets((prev) => {
      if (index === 0 || prev.length <= 1) return prev;
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (index < next.length) next[index] = { ...next[index], incomeFrom: removed.incomeFrom };
      return renameAll(next);
    });
  };

  const handleSaveSubmit = async () => {
    if (validationErrors.length > 0) return;

    const payload: UpdateTaxBracketPayload[] = localBrackets.map((b) => ({
      bracketName: b.bracketName,
      incomeFrom: b.incomeFrom,
      incomeTo: b.incomeTo,
      taxRate: b.taxRatePercent / 100, // ส่งเป็น 0.05
      baseTaxAmount: b.baseTaxAmount,
      effectiveFrom: '2024-01-01',
      status: b.status,
    }));

    await onSave(payload);
    setShowConfirmSave(false);
    onClose();
  };

  const handleResetSubmit = async () => {
    await onResetDefault();
    setShowConfirmReset(false);
    onClose();
  };

  return (
    <ModalShell className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in" innerClassName="items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-100 dark:border-slate-700/60 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>จัดการโครงสร้างอัตราภาษีเงินได้บุคคลธรรมดา (ภ.ง.ด.)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold font-mono">
                  {localBrackets.length} ขั้นบันได
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Validation Errors List */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/80 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 space-y-0.5">
                <span className="font-semibold block">พบข้อผิดพลาดในโครงสร้างภาษี:</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Table of Brackets */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="table-standard w-full min-w-[650px] text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <th className="py-3 px-3 w-12 text-center">ขั้น</th>
                    <th className="py-3 px-3">ชื่อขั้นบันได</th>
                    <th className="py-3 px-3 text-right w-36">เงินได้สุทธิตั้งแต่ (฿)</th>
                    <th className="py-3 px-3 text-right w-36">ถึงเงินได้สุทธิ (฿)</th>
                    <th className="py-3 px-3 text-center w-28">อัตราภาษี (%)</th>
                    <th className="py-3 px-3 text-right w-32">ภาษีสะสม (฿)</th>
                    <th className="py-3 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {localBrackets.map((b, idx) => {
                    const isLast = idx === localBrackets.length - 1;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={b.bracketName}
                            onChange={(e) => handleFieldChange(idx, 'bracketName', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.01"
                            value={b.incomeFrom}
                            disabled={idx === 0} // ขั้นแรกบังคับ 0
                            onChange={(e) => handleFieldChange(idx, 'incomeFrom', parseFloat(e.target.value) || 0)}
                            className={`w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-right font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              idx === 0 ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                            }`}
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          {isLast ? (
                            <div className="py-1.5 px-2.5 bg-slate-100 rounded-lg text-slate-500 text-right font-medium italic">
                              ขึ้นไป (ไม่จำกัดเพดาน)
                            </div>
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              value={b.incomeTo ?? ''}
                              onChange={(e) =>
                                handleFieldChange(
                                  idx,
                                  'incomeTo',
                                  e.target.value === '' ? null : parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-right font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={b.taxRatePercent}
                              onChange={(e) =>
                                handleFieldChange(idx, 'taxRatePercent', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2.5 py-1.5 pr-6 rounded-lg border border-slate-200 text-xs text-center font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                            <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold">%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                          ฿{b.baseTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {idx > 0 && (
                            <button
                              type="button"
                              title="ลบขั้นนี้"
                              onClick={() => handleRemoveBracket(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={handleAddBracket}
              className="w-full py-2.5 border-t border-dashed border-slate-200 text-xs font-semibold text-primary dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มขั้น
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              ภาษีสะสมจะถูกคำนวณให้อัตโนมัติจากส่วนต่างเงินได้ในแต่ละขั้นและอัตราภาษี
            </span>
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-800 font-medium hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              รีเซ็ตเป็นค่ามาตรฐานสรรพากร (8 ขั้น)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            disabled={validationErrors.length > 0}
            loading={isLoading}
            onClick={() => setShowConfirmSave(true)}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            {isLoading ? 'กำลังบันทึก...' : 'บันทึกโครงสร้างภาษี'}
          </Button>
        </div>
      </div>

      {/* Confirmation Modal for Save */}
      {showConfirmSave && (
        <ModalShell className="z-60 bg-slate-900/40 backdrop-blur-2xs" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700/60 space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto dark:bg-blue-900/20 dark:text-blue-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">ยืนยันการเปลี่ยนแปลงโครงสร้างภาษี?</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                การเปลี่ยนแปลงนี้จะถูกนำไปใช้ในการคำนวณภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) ของพนักงานทุกคนในการประมวลผลเงินเดือนรอบถัดไป
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmSave(false)}
              >
                ย้อนกลับไปแก้ไข
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveSubmit}
              >
                ยืนยันและบันทึก
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Confirmation Modal for Reset */}
      {showConfirmReset && (
        <ModalShell className="z-60 bg-slate-900/40 backdrop-blur-2xs" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700/60 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto dark:bg-amber-900/20 dark:text-amber-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">คืนค่ามาตรฐานกรมสรรพากร (8 ขั้น)?</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                ระบบจะคืนค่าอัตราภาษีทั้ง 8 ขั้นบันได (0% - 35%) และช่วงเงินได้ให้ตรงตามประมวลรัษฎากรปัจจุบัน
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmReset(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleResetSubmit}
              >
                ยืนยันการคืนค่า
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </ModalShell>
  );
};
