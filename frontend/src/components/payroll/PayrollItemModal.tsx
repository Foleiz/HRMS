'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Info, Calculator } from 'lucide-react';
import { PayrollItem } from '@/types/payroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: PayrollItem | null;
  defaultType: 'EARNING' | 'DEDUCTION';
  onSubmit: (payload: Partial<PayrollItem>, id?: number) => Promise<void>;
}

export interface FormulaTemplateOption {
  code: string;
  name: string;
  category: 'EARNING' | 'DEDUCTION' | 'BOTH';
  defaultValue: string;
  defaultTaxable: boolean;
  defaultSocialSecurity: boolean;
  parameterLabel: string;
  parameterPlaceholder: string;
  hint: string;
}

export const FORMULA_TEMPLATES: FormulaTemplateOption[] = [
  // Earnings
  {
    code: 'BASE_SALARY',
    name: 'เงินเดือนพื้นฐาน (Base Salary)',
    category: 'EARNING',
    defaultValue: 'ตามสัญญาจ้างพนักงาน',
    defaultTaxable: true,
    defaultSocialSecurity: true,
    parameterLabel: 'เกณฑ์อ้างอิงฐานเงินเดือน',
    parameterPlaceholder: 'เช่น ตามสัญญาจ้าง หรือ อัตราโครงสร้างเงินเดือน',
    hint: 'ระบบดึงฐานเงินเดือนประจำของพนักงานแต่ละคนจากข้อมูลสัญญาจ้าง',
  },
  {
    code: 'POSITION_ALLOWANCE',
    name: 'เงินประจำตำแหน่ง / ค่าวิชาชีพ (Position Allowance)',
    category: 'EARNING',
    defaultValue: 'ตามโครงสร้างเงินเดือนตำแหน่ง',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'เกณฑ์อ้างอิงตำแหน่ง',
    parameterPlaceholder: 'เช่น ตามระดับตำแหน่ง หรือ อัตราคงที่',
    hint: 'ระบบดึงจากตารางโครงสร้างเงินเดือนตามตำแหน่งและระดับพนักงาน',
  },
  {
    code: 'OT_STANDARD',
    name: 'ค่าล่วงเวลา (Overtime - OT 1.5x / 3x)',
    category: 'EARNING',
    defaultValue: 'ตาม พ.ร.บ. คุ้มครองแรงงาน (1.5x วันทำงาน / 3x วันหยุด)',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'เรทตัวคูณ / เกณฑ์ OT',
    parameterPlaceholder: 'เช่น วันทำงาน 1.5 เท่า, วันหยุด 3 เท่า',
    hint: 'ระบบคำนวณอัตโนมัติจากชั่วโมง OT ในระบบ Time Tracking: (เงินเดือน/30/8) x ชม. x ตัวคูณ',
  },
  {
    code: 'PERCENT_SALES',
    name: 'ค่าคอมมิชชั่นตามยอดขาย (Commission %)',
    category: 'EARNING',
    defaultValue: '3% จากยอดขายสุทธิ',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'อัตราเปอร์เซ็นต์ / เงื่อนไขยอดขาย',
    parameterPlaceholder: 'เช่น 3% หรือ 5% จากยอดขายสุทธิ',
    hint: 'ระบบคำนวณตามเปอร์เซ็นต์ของยอดขายที่พนักงานทำได้ในรอบเดือน',
  },
  {
    code: 'DILIGENT_ALLOWANCE',
    name: 'เบี้ยขยัน (Diligent Allowance)',
    category: 'EARNING',
    defaultValue: '1,000 บาท (เงื่อนไข: ขาด=0, สาย<=1 ครั้ง)',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'จำนวนเงินและเงื่อนไข',
    parameterPlaceholder: 'เช่น 1,000 บาท เมื่อไม่ขาด ไม่สายเกิน 1 ครั้ง',
    hint: 'ระบบตรวจสอบข้อมูลการลงเวลาทำงาน หากไม่ขาดงานและไม่สายเกินเกณฑ์จะได้รับยอดนี้',
  },
  {
    code: 'PRORATED_DAYS',
    name: 'คิดตามสัดส่วนวันทำงานจริง (Prorated Days)',
    category: 'EARNING',
    defaultValue: '(เงินเดือน / 30) x จำนวนวันทำงานจริง',
    defaultTaxable: true,
    defaultSocialSecurity: true,
    parameterLabel: 'สูตรสัดส่วนวัน',
    parameterPlaceholder: 'เช่น (เงินเดือน / วันในเดือน) x วันทำงานจริง',
    hint: 'ระบบคำนวณเฉลี่ยตามวันทำงานจริง สำหรับพนักงานเริ่มงานใหม่หรือลาออกระหว่างรอบ',
  },
  {
    code: 'MANUAL_BONUS',
    name: 'โบนัสพิเศษ / เงินรางวัลผลงาน (Bonus & Incentive)',
    category: 'EARNING',
    defaultValue: 'ตามการอนุมัติรายบุคคล',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'จำนวนเงินหรือตัวคูณเดือน',
    parameterPlaceholder: 'เช่น 1.5 เดือน หรือ ระบุเป็นรายคน',
    hint: 'กำหนดตามผลการประเมินงานหรือนโยบายโบนัสประจำปีของบริษัท',
  },

  // Deductions
  {
    code: 'SSO_STANDARD',
    name: 'เงินสมทบประกันสังคม (Social Security Fund)',
    category: 'DEDUCTION',
    defaultValue: '5% สูงสุดไม่เกิน 750 บาท/เดือน',
    defaultTaxable: false,
    defaultSocialSecurity: false,
    parameterLabel: 'อัตราสมทบและเพดาน',
    parameterPlaceholder: 'เช่น 5% ฐานค่าจ้าง 1,650 - 15,000 บาท',
    hint: 'คำนวณ 5% จากฐานค่าจ้างตามกฎหมายแรงงาน (ขั้นต่ำ 1,650 สูงสุด 15,000 บ.) หักสูงสุด 750 บ./เดือน',
  },
  {
    code: 'TAX_STANDARD',
    name: 'ภาษีเงินได้บุคคลธรรมดา (ภ.ง.ด. 91 ขั้นบันได 8 ขั้น)',
    category: 'DEDUCTION',
    defaultValue: 'ภ.ง.ด. 91 ขั้นบันได 8 ขั้น (0% - 35%)',
    defaultTaxable: false,
    defaultSocialSecurity: false,
    parameterLabel: 'เกณฑ์ภาษีเงินได้',
    parameterPlaceholder: 'คำนวณสะสมต่อปีตามประมวลรัษฎากร',
    hint: 'ระบบคำนวณภาษีหัก ณ ที่จ่ายสะสมแบบขั้นบันได 8 ขั้น โดยหักค่าใช้จ่ายและค่าลดหย่อนอัตโนมัติ',
  },
  {
    code: 'LATE_ABSENT',
    name: 'หักมาสาย / ขาดงาน (Late & Absent Deduction)',
    category: 'DEDUCTION',
    defaultValue: 'หักตามจริง (ฐานเงินเดือน / 30 / 8 x ชม.สาย)',
    defaultTaxable: false,
    defaultSocialSecurity: false,
    parameterLabel: 'เกณฑ์การหักเงินมาสาย/ขาดงาน',
    parameterPlaceholder: 'เช่น หักนาทีละ 2 บาท หรือ หักรายชั่วโมงตามฐานเงินเดือน',
    hint: 'ระบบดึงเวลานาที/ชั่วโมงที่สายจาก Time Tracking มาคำนวณหักตามอัตราค่าจ้างต่อชั่วโมง',
  },
  {
    code: 'PERCENT_SALARY',
    name: 'กองทุนสำรองเลี้ยงชีพ (PVD) / % เงินเดือน',
    category: 'BOTH',
    defaultValue: '5% ของฐานเงินเดือน',
    defaultTaxable: false,
    defaultSocialSecurity: false,
    parameterLabel: 'อัตราเปอร์เซ็นต์ (%)',
    parameterPlaceholder: 'เช่น 3%, 5%, หรือ 7%',
    hint: 'หักเงินสะสมเข้ากองทุนสำรองเลี้ยงชีพ (PVD) หรือรายการหักคำนวณเป็น % จากฐานเงินเดือน',
  },
  {
    code: 'STAFF_LOAN',
    name: 'หักชำระเงินกู้ยืมพนักงาน (Staff Loan / Advance)',
    category: 'DEDUCTION',
    defaultValue: 'หักตามงวดสัญญาเงินกู้ยืม',
    defaultTaxable: false,
    defaultSocialSecurity: false,
    parameterLabel: 'งวดชำระ / เงื่อนไข',
    parameterPlaceholder: 'เช่น หักงวดละ 2,000 บาท จนครบสัญญา',
    hint: 'ระบบหักตามยอดงวดที่กำหนดไว้ในสัญญาเงินกู้สวัสดิการพนักงานจนกว่าจะครบยอด',
  },
  {
    code: 'CUSTOM_FORMULA',
    name: 'สูตรหรือเกณฑ์กำหนดเอง (Custom Formula)',
    category: 'BOTH',
    defaultValue: '',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'ระบุสูตรหรือเงื่อนไข',
    parameterPlaceholder: 'เช่น 2% ของยอดกำไร หรือ 500 บาท/โครงการ',
    hint: 'ระบุเงื่อนไขหรือตัวแปรคำนวณเฉพาะกิจตามนโยบายองค์กร',
  },
];

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
  const [formulaTemplate, setFormulaTemplate] = useState<string>('');
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
      const t = item.itemType || defaultType;
      setItemType(t);
      const calcType = item.calculationType || 'FIXED';
      setCalculationType(calcType);
      setFormulaTemplate(item.formulaTemplate || '');
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
      setFormulaTemplate('');
      setFormulaValue('');
      setIsTaxable(true);
      setIsSocialSecurityCalculated(defaultType === 'EARNING');
      setIsActive(true);
    }
    setError(null);
  }, [item, defaultType, isOpen]);

  if (!isOpen) return null;

  // Filter templates for current item type
  const availableTemplates = FORMULA_TEMPLATES.filter(
    (tpl) => tpl.category === itemType || tpl.category === 'BOTH'
  );

  const selectedTemplate = FORMULA_TEMPLATES.find((t) => t.code === formulaTemplate);

  const handleCalculationTypeChange = (newType: 'FIXED' | 'FORMULA' | 'MANUAL') => {
    setCalculationType(newType);
    if (newType === 'FORMULA') {
      if (!formulaTemplate) {
        const defaultTpl = itemType === 'EARNING' ? 'OT_STANDARD' : 'SSO_STANDARD';
        setFormulaTemplate(defaultTpl);
        const tplObj = FORMULA_TEMPLATES.find((t) => t.code === defaultTpl);
        if (tplObj) {
          if (!formulaValue) setFormulaValue(tplObj.defaultValue);
          setIsTaxable(tplObj.defaultTaxable);
          setIsSocialSecurityCalculated(tplObj.defaultSocialSecurity);
        }
      }
    }
  };

  const handleTemplateChange = (newTplCode: string) => {
    setFormulaTemplate(newTplCode);
    const tplObj = FORMULA_TEMPLATES.find((t) => t.code === newTplCode);
    if (tplObj) {
      setFormulaValue(tplObj.defaultValue);
      setIsTaxable(tplObj.defaultTaxable);
      setIsSocialSecurityCalculated(tplObj.defaultSocialSecurity);
    }
  };

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
        formulaTemplate: calculationType === 'FORMULA' ? (formulaTemplate || 'CUSTOM_FORMULA') : null,
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
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

          {/* Calculation Type */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ประเภทการคำนวณ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'FIXED', label: 'จำนวนคงที่' },
                { id: 'FORMULA', label: 'สูตรคำนวณ' },
                { id: 'MANUAL', label: 'กำหนดเอง' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleCalculationTypeChange(opt.id as any)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all cursor-pointer text-center ${
                    calculationType === opt.id
                      ? 'bg-[#0B2046] text-white border-[#0B2046] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* If FORMULA is chosen: Show Formula Template selector and Hint */}
          {calculationType === 'FORMULA' ? (
            <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-blue-700" />
                  <span>รูปแบบสูตรมาตรฐานของระบบ (Formula Template)</span>
                </label>
                <select
                  value={formulaTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-900 font-medium"
                >
                  {availableTemplates.map((tpl) => (
                    <option key={tpl.code} value={tpl.code}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <div className="p-2.5 bg-blue-50/80 border border-blue-200/70 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-700 mt-0.5 shrink-0" />
                  <span>{selectedTemplate.hint}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {selectedTemplate?.parameterLabel || 'ค่าตัวแปร / ตัวคูณ / อัตรา'}
                </label>
                <input
                  type="text"
                  placeholder={selectedTemplate?.parameterPlaceholder || 'เช่น 5% หรือ 1,000 บาท'}
                  value={formulaValue}
                  onChange={(e) => setFormulaValue(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  HR สามารถระบุค่าตัวแปร/เกณฑ์อ้างอิง ระบบจะคำนวณตามตรรกะของสูตรที่เลือกอัตโนมัติ
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {calculationType === 'FIXED' ? 'จำนวนเงินคงที่ (บาท)' : 'เกณฑ์การคิด / บันทึกช่วยจำ'}
              </label>
              <input
                type="text"
                placeholder={
                  calculationType === 'FIXED'
                    ? 'เช่น 500 หรือ ตามสัญญาจ้าง'
                    : 'เช่น กำหนดเป็นรายครั้ง หรือ ตามยอดจริงที่เกิดขึ้น'
                }
                value={formulaValue}
                onChange={(e) => setFormulaValue(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                ระบุเกณฑ์หรือตัวเลขสำหรับอ้างอิงและแสดงบนสลิปเงินเดือน
              </span>
            </div>
          )}

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
