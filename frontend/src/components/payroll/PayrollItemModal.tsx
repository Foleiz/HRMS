'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { PayrollItem } from '@/types/payroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: PayrollItem | null;
  defaultType: 'EARNING' | 'DEDUCTION';
  onSubmit: (payload: Partial<PayrollItem>, id?: number) => Promise<void>;
}

export const PayrollItemModal: React.FC<Props> = ({
  isOpen,
  onClose,
  item,
  defaultType,
  onSubmit,
}) => {
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<'EARNING' | 'DEDUCTION'>(defaultType);
  const [calculationType, setCalculationType] = useState<'FIXED' | 'FORMULA' | 'MANUAL'>('FIXED');
  const [formulaValue, setFormulaValue] = useState('');
  const [isTaxable, setIsTaxable] = useState(true);
  const [isSocialSecurityCalculated, setIsSocialSecurityCalculated] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setItemCode(item.itemCode || '');
      setItemName(item.itemName || '');
      setDescription(item.description || '');
      setItemType(item.itemType || defaultType);
      setCalculationType(item.calculationType || 'FIXED');
      setFormulaValue(item.formulaValue || '');
      setIsTaxable(item.isTaxable);
      setIsSocialSecurityCalculated(item.isSocialSecurityCalculated);
      setIsActive(item.status ? item.status.toUpperCase() === 'ACTIVE' : true);
    } else {
      setItemCode('');
      setItemName('');
      setDescription('');
      setItemType(defaultType);
      setCalculationType('FIXED');
      setFormulaValue('');
      setIsTaxable(true);
      setIsSocialSecurityCalculated(defaultType === 'EARNING');
      setIsActive(true);
    }
    setError(null);
  }, [item, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!item && !itemCode.trim()) {
      setError('กรุณาระบุรหัสรายการ');
      return;
    }
    if (!itemName.trim()) {
      setError('กรุณาระบุชื่อรายการ');
      return;
    }

    try {
      setLoading(true);
      const payload: Partial<PayrollItem> = {
        itemCode: itemCode.trim().toUpperCase(),
        itemName: itemName.trim(),
        description: description.trim() || null,
        itemType,
        calculationType,
        formulaValue: formulaValue.trim() || null,
        isTaxable,
        isSocialSecurityCalculated,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
      };

      await onSubmit(payload, item?.id);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const isEarning = itemType === 'EARNING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center">
          <h3 className="text-lg font-bold text-slate-900">
            {item
              ? `แก้ไข${isEarning ? 'รายการรายได้' : 'รายการรายหัก'}`
              : `เพิ่ม${isEarning ? 'รายการรายได้' : 'รายการรายหัก'}`}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Code (only when creating) */}
          {!item && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">รหัสรายการ (เช่น INC_BONUS)</label>
              <input
                type="text"
                required
                placeholder="เช่น INC_OTHER"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800 uppercase"
              />
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">ชื่อรายการ</label>
            <input
              type="text"
              required
              placeholder="เช่น เบี้ยเลี้ยงพิเศษ"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">คำอธิบายย่อ</label>
            <input
              type="text"
              placeholder="เช่น จ่ายตามที่ปฏิบัติงานนอกสถานที่"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800"
            />
          </div>

          {/* Calculation Type & Formula */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">ประเภทการคำนวณ</label>
              <select
                value={calculationType}
                onChange={(e) => setCalculationType(e.target.value as any)}
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800"
              >
                <option value="FIXED">จำนวนคงที่</option>
                <option value="FORMULA">สูตรคำนวณ</option>
                <option value="MANUAL">กำหนดเอง</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">ค่า / สูตร</label>
              <input
                type="text"
                placeholder="เช่น ตามสัญญาจ้าง หรือ 500 บาท"
                value={formulaValue}
                onChange={(e) => setFormulaValue(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Checkboxes: คิดภาษี & คิดประกันสังคม */}
          <div className="flex items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isTaxable}
                onChange={(e) => setIsTaxable(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>คิดภาษี</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isSocialSecurityCalculated}
                onChange={(e) => setIsSocialSecurityCalculated(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>คิดประกันสังคม</span>
            </label>
          </div>

          {/* เปิดการใช้งานรายการนี้ (Toggle Switch) */}
          <div className="flex items-center justify-between pt-2 pb-1 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-800">เปิดใช้งานรายการนี้</span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer text-center"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-medium shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึก'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
