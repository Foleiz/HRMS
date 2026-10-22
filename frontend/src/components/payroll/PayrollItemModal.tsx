'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Calculator, Lock, Sparkles } from 'lucide-react';
import { PayrollItem, SocialSecurityRate, TaxBracket, UpdateSocialSecurityRatePayload } from '@/types/payroll';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { getAutoPullSource } from './autoPullItems';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  FormulaParamsEditor,
  FormulaParams,
  PARAM_TEMPLATES,
  parseFormulaParams,
  serializeFormulaParams,
  validateFormulaParams,
  withCommas,
  cleanNumber,
} from './FormulaParamsEditor';
import { ActiveToggleRow } from '@/components/ui/ToggleSwitch';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, Input, NumberInput } from '@/components/ui/Input';
import { OptionCheckCard, TAX_OPTION_TEXT, SSO_OPTION_TEXT } from '@/components/ui/OptionCheckCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: PayrollItem | null;
  /** รายการทั้งหมด — ใช้สลับไปแก้รายการของระบบเมื่อเลือกสูตรของระบบ */
  allItems?: PayrollItem[];
  /** ตั้งค่าภาษี/ประกันสังคม (ย้ายมาจากแท็บภาษี & ประกันสังคม) */
  taxBrackets?: TaxBracket[];
  ssoRates?: SocialSecurityRate[];
  canEditTaxSso?: boolean;
  /** null = เพิ่มอัตราใหม่ */
  onEditSsoRate?: (rate: SocialSecurityRate | null) => void;
  /** บันทึกอัตราประกันสังคมที่แก้ในหน้าต่างนี้ (id = แก้อัตราเดิม, ไม่มี id = เพิ่มอัตราใหม่) */
  onSaveSsoRate?: (payload: UpdateSocialSecurityRatePayload, id?: number) => Promise<void>;
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

/** สูตรที่ระบบคำนวณได้จริง และเลือกใช้กับรายการใหม่ได้ */
export const FORMULA_TEMPLATES: FormulaTemplateOption[] = [
  {
    code: 'DILIGENT_ALLOWANCE',
    name: 'เบี้ยขยัน',
    category: 'EARNING',
    defaultValue: '1,000 บาท (ขาด=0, สาย<=1 ครั้ง, ลา<=0 วัน)',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'จำนวนเงินและเงื่อนไข',
    parameterPlaceholder: 'เช่น 1,000 บาท (ขาด=0, สาย<=1 ครั้ง, ลา<=0 วัน)',
    hint: 'จ่ายเมื่อมีข้อมูลลงเวลาของเดือนนั้น ไม่ขาดงาน และมาสาย/ลาไม่เกินจำนวนที่กำหนด',
  },
  {
    code: 'LATE_ABSENT',
    name: 'หักมาสาย / ขาดงาน',
    category: 'DEDUCTION',
    defaultValue: 'หักตามอัตราค่าจ้าง (สาย: เงินเดือน/30/8 ต่อชม., ขาดงาน: เงินเดือน/30 ต่อวัน)',
    defaultTaxable: false,
    defaultSocialSecurity: false,
    parameterLabel: 'เกณฑ์การหักเงินมาสาย/ขาดงาน',
    parameterPlaceholder: 'เช่น หักนาทีละ 2 บาท หรือ หักรายชั่วโมงตามฐานเงินเดือน',
    hint: 'ใช้นาทีมาสายและวันขาดงานจากสรุปเวลารายเดือน (เมนูลงเวลา) ยอดหักรวมไม่เกินเงินเดือน',
  },
  {
    code: 'PERCENT_SALARY',
    name: 'กองทุนสำรองเลี้ยงชีพ / % เงินเดือน',
    category: 'BOTH',
    defaultValue: '5% ของฐานเงินเดือน',
    defaultTaxable: false,
    defaultSocialSecurity: false,
    parameterLabel: 'อัตราเปอร์เซ็นต์ (%)',
    parameterPlaceholder: 'เช่น 3%, 5%, หรือ 7%',
    hint: 'คิดเป็น % ของเงินเดือน ถ้าเป็นรายการหักชื่อ "กองทุนสำรองเลี้ยงชีพ" (รหัสมี PVD) ระบบหักเฉพาะประเภทพนักงานที่มีสิทธิ์กองทุน และนำไปลดหย่อนภาษีให้',
  },
];

/** รายการของระบบ (เงินเดือน / ประกันสังคม / ภาษี / คอมมิชชั่น): ระบบสร้างและคำนวณเอง แสดงเมื่อเปิดดูรายการนั้นเท่านั้น */
export const SYSTEM_FORMULA_TEMPLATES: FormulaTemplateOption[] = [
  {
    code: 'PERCENT_SALES',
    name: 'ค่าคอมมิชชั่นตามยอดขาย',
    category: 'EARNING',
    defaultValue: 'ดึงยอดอัตโนมัติจากแท็บค่าคอมมิชชั่น',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'แหล่งข้อมูลค่าคอมมิชชั่น',
    parameterPlaceholder: 'ดึงจากแท็บค่าคอมมิชชั่น',
    hint: 'ระบบดึงยอดค่าคอมมิชชั่นที่กดยืนยัน (CONFIRMED) ในแท็บค่าคอมมิชชั่นของรอบเดือนนั้นเข้าสลิปเงินเดือนให้อัตโนมัติ',
  },
  {
    code: 'POSITION_ALLOWANCE',
    name: 'เงินประจำตำแหน่ง / ค่าวิชาชีพ',
    category: 'EARNING',
    defaultValue: 'ค่าตำแหน่งตามโครงสร้างเงินเดือน',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'เกณฑ์อ้างอิงตำแหน่ง',
    parameterPlaceholder: 'เช่น ตามระดับตำแหน่ง หรือ อัตราคงที่',
    hint: 'ระบบดึงช่อง "ค่าตำแหน่ง" ในกรอบโครงสร้างเงินเดือนตามตำแหน่ง/ระดับของพนักงาน แล้วจ่ายทุกเดือนให้อัตโนมัติ (คิดตามสัดส่วนวันเมื่อเข้าใหม่/ลาออกระหว่างเดือน) — ตั้งยอดที่เมนูโครงสร้างเงินเดือน หน้านี้ตั้งแค่การคิดภาษี/ประกันสังคม และปิดใช้งานได้',
  },
  {
    code: 'BASE_SALARY',
    name: 'เงินเดือนพื้นฐาน',
    category: 'EARNING',
    defaultValue: 'ตามสัญญาจ้างพนักงาน',
    defaultTaxable: true,
    defaultSocialSecurity: true,
    parameterLabel: 'เกณฑ์อ้างอิงฐานเงินเดือน',
    parameterPlaceholder: 'เช่น ตามสัญญาจ้าง หรือ อัตราโครงสร้างเงินเดือน',
    hint: 'ระบบใช้ฐานเงินเดือนที่มีผลในรอบนั้น (ตั้งที่ปุ่มปรับเงินเดือนของพนักงาน) ส่วนสัญญาจ้างใช้แค่วันเริ่ม/สิ้นสุดงาน เพื่อคิดตามสัดส่วนวันเมื่อเข้าใหม่หรือลาออกระหว่างเดือน',
  },
  {
    code: 'SSO_STANDARD',
    name: 'เงินสมทบประกันสังคม',
    category: 'DEDUCTION',
    defaultValue: '5% สูงสุดไม่เกิน 875 บาท/เดือน',
    defaultTaxable: false,
    defaultSocialSecurity: false,
    parameterLabel: 'อัตราสมทบและเพดาน',
    parameterPlaceholder: 'เช่น 5% ฐานค่าจ้าง 1,650 - 17,500 บาท',
    hint: 'คิดจากค่าจ้างที่ติ๊ก "คิดประกันสังคม" ตามอัตราที่มีผลในงวดนั้น (จัดการอัตราได้ที่ด้านล่าง)',
  },
  {
    code: 'OVERTIME',
    name: 'ค่าล่วงเวลา (OT)',
    category: 'EARNING',
    defaultValue: '1.5 เท่าของค่าจ้างต่อชั่วโมง (เงินเดือน ÷ 30 วัน ÷ 8 ชม.)',
    defaultTaxable: true,
    defaultSocialSecurity: true,
    parameterLabel: 'ตัวคูณและตัวหาร',
    parameterPlaceholder: '',
    hint: 'ใช้ชั่วโมง OT จากสรุปเวลารายเดือน (เมนูลงเวลา) เฉพาะประเภทพนักงานที่มีสิทธิ์ OT',
  },
  {
    code: 'UNPAID_LEAVE',
    name: 'หักวันลาไม่รับค่าจ้าง',
    category: 'DEDUCTION',
    defaultValue: 'หักวันละ เงินเดือน ÷ 30 วัน',
    defaultTaxable: true,
    defaultSocialSecurity: true,
    parameterLabel: 'ตัวหารวัน',
    parameterPlaceholder: '',
    hint: 'ใช้วันลาประเภทไม่รับค่าจ้างที่อนุมัติแล้วในรอบนั้น ยอดหักรวมไม่เกินเงินเดือน',
  },
  {
    code: 'TAX_STANDARD',
    name: 'ภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.1 ขั้นบันได)',
    category: 'DEDUCTION',
    defaultValue: 'ภ.ง.ด.1 ขั้นบันได (ค่าใช้จ่าย 50% ไม่เกิน 100,000 บาท, ลดหย่อนส่วนตัว 60,000 บาท)',
    defaultTaxable: false,
    defaultSocialSecurity: false,
    parameterLabel: 'เกณฑ์ภาษีเงินได้',
    parameterPlaceholder: 'คำนวณสะสมต่อปีตามประมวลรัษฎากร',
    hint: 'ระบบคำนวณภาษีหัก ณ ที่จ่ายสะสมแบบขั้นบันได 8 ขั้น โดยหักค่าใช้จ่ายและค่าลดหย่อนอัตโนมัติ',
  },
];

/**
 * สูตรที่เลิกใช้ (ระบบไม่ได้คำนวณให้): ไม่ให้เลือกในรายการใหม่ แสดงชื่อเมื่อเปิดรายการเดิม
 * - คิดตามสัดส่วน (เงินเดือนคิดสัดส่วนให้อัตโนมัติแล้ว) / หักเงินกู้ / โบนัส (มีเมนูโบนัส) / สูตรกำหนดเอง
 */
export const LEGACY_FORMULA_TEMPLATES: FormulaTemplateOption[] = [
  {
    code: 'PRORATED_DAYS',
    name: 'คิดตามสัดส่วนวันทำงานจริง',
    category: 'EARNING',
    defaultValue: '(เงินเดือน / 30) x จำนวนวันทำงานจริง',
    defaultTaxable: true,
    defaultSocialSecurity: true,
    parameterLabel: 'สูตรสัดส่วนวัน',
    parameterPlaceholder: 'เช่น (เงินเดือน / วันในเดือน) x วันทำงานจริง',
    hint: 'ระบบคำนวณเฉลี่ยตามวันทำงานจริง สำหรับพนักงานเริ่มงานใหม่หรือลาออกระหว่างรอบ',
  },
  {
    code: 'STAFF_LOAN',
    name: 'หักชำระเงินกู้ยืมพนักงาน',
    category: 'DEDUCTION',
    defaultValue: 'หักตามงวดสัญญาเงินกู้ยืม',
    defaultTaxable: false,
    defaultSocialSecurity: false,
    parameterLabel: 'งวดชำระ / เงื่อนไข',
    parameterPlaceholder: 'เช่น หักงวดละ 2,000 บาท จนครบสัญญา',
    hint: 'ระบบหักตามยอดงวดที่กำหนดไว้ในสัญญาเงินกู้สวัสดิการพนักงานจนกว่าจะครบยอด',
  },
  {
    code: 'MANUAL_BONUS',
    name: 'โบนัสพิเศษ / เงินรางวัลผลงาน',
    category: 'EARNING',
    defaultValue: 'ตามการอนุมัติรายบุคคล',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'จำนวนเงินหรือตัวคูณเดือน',
    parameterPlaceholder: 'เช่น 1.5 เดือน หรือ ระบุเป็นรายคน',
    hint: 'กำหนดตามผลการประเมินงานหรือนโยบายโบนัสประจำปีของบริษัท',
  },
  {
    code: 'CUSTOM_FORMULA',
    name: 'สูตรหรือเกณฑ์กำหนดเอง',
    category: 'BOTH',
    defaultValue: '',
    defaultTaxable: true,
    defaultSocialSecurity: false,
    parameterLabel: 'ระบุสูตรหรือเงื่อนไข',
    parameterPlaceholder: 'เช่น 2% ของยอดกำไร หรือ 500 บาท/โครงการ',
    hint: 'ระบุเงื่อนไขหรือตัวแปรคำนวณเฉพาะกิจตามนโยบายองค์กร',
  },
];

/** สูตรของระบบ → รายการของระบบที่ใช้สูตรนั้น (มีได้รายการเดียว — เลือกแล้วสลับไปแก้รายการนั้น) */
const SYSTEM_TEMPLATE_ITEM: Record<string, string> = {
  SSO_STANDARD: 'DED_SSO',
  TAX_STANDARD: 'DED_TAX',
  OVERTIME: 'INC_OT',
  UNPAID_LEAVE: 'DED_UNPAID_LEAVE',
};

export const PayrollItemModal: React.FC<Props> = ({
  isOpen,
  onClose,
  item: itemProp,
  allItems = [],
  taxBrackets = [],
  ssoRates = [],
  canEditTaxSso = false,
  onEditSsoRate,
  onSaveSsoRate,
  defaultType,
  onSubmit,
}) => {
  // เลือกสูตรของระบบ → สลับไปแก้รายการของระบบนั้นในหน้าต่างเดิม (ไม่สร้างรายการซ้ำ)
  const [redirect, setRedirect] = useState<{ base: PayrollItem | null; target: PayrollItem } | null>(null);
  const item = redirect && redirect.base === itemProp && isOpen ? redirect.target : itemProp;
  const isRedirected = item !== itemProp;
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<'EARNING' | 'DEDUCTION'>(defaultType);
  const [calculationType, setCalculationType] = useState<'FIXED' | 'FORMULA' | 'MANUAL'>('FIXED');
  const [formulaTemplate, setFormulaTemplate] = useState<string>('');
  const [formulaValue, setFormulaValue] = useState('');
  /** จำนวนเงินเริ่มต้นของรายการกำหนดเอง (ตัวเลขล้วน) */
  const [amountText, setAmountText] = useState('');
  const [params, setParams] = useState<FormulaParams>(() => parseFormulaParams('', ''));
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
      // รายการที่ไม่ใช่สูตร = แบบกำหนดเอง (ชื่อ + จำนวนเงิน)
      setCalculationType(item.calculationType === 'FORMULA' ? 'FORMULA' : 'MANUAL');
      const amt = (item.formulaValue || '').replace(/,/g, '').trim();
      setAmountText(/^\d+(\.\d+)?$/.test(amt) ? amt : '');
      // รายการของระบบที่ยังไม่มีรหัสสูตร → ระบุสูตรให้ เพื่อให้แก้ค่าตัวแปรได้
      const inferredTpl =
        item.formulaTemplate ||
        (item.itemCode === 'DED_UNPAID_LEAVE' ? 'UNPAID_LEAVE' : item.itemCode === 'INC_OT' ? 'OVERTIME' : '');
      setFormulaTemplate(inferredTpl);
      setFormulaValue(item.formulaValue || '');
      setParams(parseFormulaParams(inferredTpl.toUpperCase(), item.formulaValue));
      setIsTaxable(item.isTaxable);
      setIsSocialSecurityCalculated(item.isSocialSecurityCalculated);
      setIsActive(item.status ? item.status.toUpperCase() === 'ACTIVE' : true);
    } else {
      setItemCode('');
      setItemName('');
      setDescription('');
      setItemType(defaultType);
      setCalculationType('MANUAL');
      setFormulaTemplate('');
      setFormulaValue('');
      setAmountText('');
      setIsTaxable(defaultType === 'EARNING');
      setIsSocialSecurityCalculated(false);
      setIsActive(true);
    }
    setError(null);
  }, [item, defaultType, isOpen]);

  // ===== ประกันสังคม: แก้อัตราในหน้าต่างนี้ได้เลย =====
  const [ssoEmp, setSsoEmp] = useState('');
  const [ssoEr, setSsoEr] = useState('');
  const [ssoMin, setSsoMin] = useState('');
  const [ssoMax, setSsoMax] = useState('');
  const [ssoFrom, setSsoFrom] = useState('');
  const [showSsoHistory, setShowSsoHistory] = useState(false);
  const ssoCurrent = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const sorted = [...ssoRates].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    return (
      sorted.find((r) => r.status === 'ACTIVE' && r.effectiveFrom <= today && (!r.effectiveTo || r.effectiveTo >= today)) ??
      sorted.find((r) => r.status === 'ACTIVE') ??
      null
    );
  })();
  useEffect(() => {
    if (!isOpen) return;
    const pct = (v: number) => String(v <= 1 ? Math.round(v * 10000) / 100 : v);
    setShowSsoHistory(false);
    // วันที่มีผลเริ่มต้น = วันของอัตราที่ใช้อยู่ (ไม่เปลี่ยนวัน = แก้อัตราเดิม, เลือกวันใหม่ = สร้างอัตราใหม่)
    setSsoFrom(ssoCurrent?.effectiveFrom ?? '');
    setSsoEmp(ssoCurrent ? pct(ssoCurrent.employeeContributionPercent) : '5');
    setSsoEr(ssoCurrent ? pct(ssoCurrent.employerContributionPercent) : '5');
    setSsoMin(ssoCurrent ? String(ssoCurrent.minWageBaseAmount) : '1650');
    setSsoMax(ssoCurrent ? String(ssoCurrent.maxWageBaseAmount) : '17500');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.id, ssoCurrent?.id]);


  if (!isOpen) return null;

  const linkedBenefits = item?.linkedBenefitNames ?? [];
  const isBonusItem = item?.itemCode === 'INC_BONUS';
  const isCommissionItem = item?.itemCode === 'INC_COMMISSION';
  /** เฉพาะโบนัสและค่าคอมมิชชั่นเท่านั้นที่ใช้โหมด "ดึงยอดอัตโนมัติ" และถูกล็อกไม่ให้เปลี่ยนประเภทการคำนวณ */
  const autoPull = getAutoPullSource(item?.itemCode);
  /** รายการที่ดึงข้อมูลอัตโนมัติจากเมนูอื่น (เงินเดือน / ค่าตำแหน่ง / โบนัส / ค่าคอมมิชชั่น) */
  const isAutoPullModuleItem = Boolean(autoPull);

  // Filter templates for current item type
  const templateCode = (formulaTemplate || '').toUpperCase();
  const systemTemplate = SYSTEM_FORMULA_TEMPLATES.find((t) => t.code === templateCode);
  const legacyTemplate = LEGACY_FORMULA_TEMPLATES.find((t) => t.code === templateCode);
  /** รายการของระบบ: เปลี่ยนสูตรไม่ได้ */
  const isSystemFormula = !!systemTemplate;
  /** รายการของระบบที่ต้องคำนวณเสมอ (ปิดใช้งานแล้วเงินเดือน/ภาษี/ประกันสังคม/OT จะผิด) — ค่าตำแหน่งปิดได้ */
  const lockActive = isSystemFormula && templateCode !== 'POSITION_ALLOWANCE';
  const wasInactive = item?.status ? item.status.toUpperCase() !== 'ACTIVE' : false;
  const thaiDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const typeLabel = (c: string) => (c === 'EARNING' ? 'รายได้' : 'รายหัก');
  const selectedTemplate = FORMULA_TEMPLATES.find((t) => t.code === templateCode) ?? systemTemplate ?? legacyTemplate;
  const hasParams = !isAutoPullModuleItem && PARAM_TEMPLATES.includes(templateCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!itemName.trim()) {
      setError('กรุณาระบุชื่อรายการ');
      return;
    }

    const isCustom = !isAutoPullModuleItem && calculationType !== 'FORMULA';
    if (isCustom && !(Number(amountText) > 0)) {
      setError('กรุณาระบุจำนวนเงินมากกว่า 0');
      return;
    }
    let finalFormulaValue = isCustom ? amountText : formulaValue.trim();
    if (!isAutoPullModuleItem && calculationType === 'FORMULA') {
      if (!formulaTemplate) {
        setError('กรุณาเลือกรูปแบบสูตร');
        return;
      }
      if (hasParams) {
        const paramError = validateFormulaParams(templateCode, params);
        if (paramError) {
          setError(paramError);
          return;
        }
        finalFormulaValue = serializeFormulaParams(templateCode, params);
      }
      if (templateCode === 'SSO_STANDARD') {
        const emp = Number(ssoEmp), er = Number(ssoEr), mn = Number(ssoMin), mx = Number(ssoMax);
        if (!(emp > 0 && emp <= 100) || !(er > 0 && er <= 100)) {
          setError('อัตราเงินสมทบต้องอยู่ระหว่าง 0–100%');
          return;
        }
        if (!(mn > 0) || !(mx >= mn)) {
          setError('ฐานค่าจ้างสูงสุดต้องมากกว่าหรือเท่ากับฐานต่ำสุด');
          return;
        }
        if (!ssoFrom) {
          setError('กรุณาเลือกวันที่มีผล');
          return;
        }
        if (ssoCurrent && ssoFrom < ssoCurrent.effectiveFrom) {
          setError('วันที่มีผลต้องไม่ก่อนวันที่ของอัตราที่ใช้อยู่ (ถ้าแก้ตัวเลขที่กรอกผิด ให้คงวันที่เดิม)');
          return;
        }
        const isNewRate = !ssoCurrent || ssoFrom !== ssoCurrent.effectiveFrom;
        const changed =
          isNewRate ||
          Math.abs(pctOf(ssoCurrent!.employeeContributionPercent) - emp) > 0.0001 ||
          Math.abs(pctOf(ssoCurrent!.employerContributionPercent) - er) > 0.0001 ||
          ssoCurrent!.minWageBaseAmount !== mn ||
          ssoCurrent!.maxWageBaseAmount !== mx;
        if (changed && canEditTaxSso && onSaveSsoRate) {
          try {
            setLoading(true);
            await onSaveSsoRate(
              {
                rateName: isNewRate ? `อัตราประกันสังคม มีผล ${ssoFrom}` : ssoCurrent!.rateName,
                employeeContributionPercent: emp / 100,
                employerContributionPercent: er / 100,
                minWageBaseAmount: mn,
                maxWageBaseAmount: mx,
                effectiveFrom: ssoFrom,
                effectiveTo: isNewRate ? null : ssoCurrent!.effectiveTo ?? null,
                status: 'ACTIVE',
              },
              isNewRate ? undefined : ssoCurrent!.id,
            );
          } catch (err: any) {
            setLoading(false);
            setError(err?.response?.data?.message || err?.message || 'บันทึกอัตราประกันสังคมไม่สำเร็จ');
            return;
          }
        }
        finalFormulaValue = `${emp}% ฐานค่าจ้าง ${mn.toLocaleString()} - ${mx.toLocaleString()} บาท (หักสูงสุด ${((mx * emp) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} บาท/เดือน)`;
      }
    }

    try {
      setLoading(true);
      const keepOriginal = isAutoPullModuleItem && !isBonusItem && !isCommissionItem; // เงินเดือน / ค่าตำแหน่ง
      const effectiveCalcType = keepOriginal
        ? item!.calculationType
        : isAutoPullModuleItem
        ? (isCommissionItem ? 'FORMULA' : 'MANUAL')
        : calculationType;
      const effectiveFormulaTemplate = keepOriginal
        ? item!.formulaTemplate ?? null
        : isAutoPullModuleItem
        ? (isCommissionItem ? 'PERCENT_SALES' : null)
        : (calculationType === 'FORMULA' ? (formulaTemplate || null) : null);
      const effectiveFormulaValue = keepOriginal
        ? item!.formulaValue ?? null
        : isAutoPullModuleItem
        ? (isCommissionItem ? 'ดึงยอดอัตโนมัติจากแท็บค่าคอมมิชชั่น' : 'ดึงยอดอัตโนมัติจากแท็บโบนัส')
        : (finalFormulaValue || null);

      const payload: Partial<PayrollItem> = {
        itemCode: itemCode.trim().toUpperCase(),
        itemName: itemName.trim(),
        description: description.trim() || null,
        itemType,
        calculationType: effectiveCalcType,
        formulaTemplate: effectiveFormulaTemplate,
        formulaValue: effectiveFormulaValue,
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
  /** รายได้ของระบบ: ค่าภาษี/ประกันสังคมกำหนดตามกฎหมาย แก้ไม่ได้ */
  const flagsLocked = !!item && (isAutoPullModuleItem || isSystemFormula);
  /** รายการหักที่เป็นค่าลดหย่อน (ประกันสังคม / กองทุนสำรองเลี้ยงชีพ) */
  const isAllowanceItem =
    !isEarning &&
    (itemCode === 'DED_SSO' || /PVD|PROVIDENT/i.test(itemCode) || itemName.includes('สำรองเลี้ยงชีพ'));

  // ===== ภาษี / ประกันสังคม (ตั้งค่าที่นี่แทนแท็บภาษี & ประกันสังคมเดิม) =====
  const pctOf = (v: number) => (v <= 1 ? v * 100 : v);
  const todayIso = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();
  const sortedSso = [...ssoRates].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const currentSso =
    sortedSso.find((r) => r.status === 'ACTIVE' && r.effectiveFrom <= todayIso && (!r.effectiveTo || r.effectiveTo >= todayIso)) ??
    sortedSso.find((r) => r.status === 'ACTIVE') ??
    null;
  const sortedBrackets = [...taxBrackets].filter((b) => b.status === 'ACTIVE').sort((a, b) => a.incomeFrom - b.incomeFrom);
  const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const ssoFormulaText = (r: SocialSecurityRate) =>
    `${pctOf(r.employeeContributionPercent)}% ฐานค่าจ้าง ${money(r.minWageBaseAmount)} - ${money(r.maxWageBaseAmount)} บาท (หักสูงสุด ${money(
      (r.maxWageBaseAmount * pctOf(r.employeeContributionPercent)) / 100,
    )} บาท/เดือน)`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        isRedirected
          ? `แก้ไขรายการของระบบ: ${item?.itemName ?? ''}`
          : item
          ? `แก้ไข${isEarning ? 'รายการรายได้' : 'รายการรายหัก'}`
          : `เพิ่ม${isEarning ? 'รายการรายได้' : 'รายการรายหัก'}`
      }
      subtitle={
        isRedirected ? (
          <>
            สูตรนี้ใช้ได้กับรายการของระบบเท่านั้น — แก้ค่าแล้วกดบันทึกจะอัปเดตรายการนี้ (ไม่สร้างรายการใหม่){' '}
            <button type="button" onClick={() => setRedirect(null)} className="font-semibold text-primary dark:text-blue-300 underline cursor-pointer">
              กลับ
            </button>
          </>
        ) : undefined
      }
      footer={<ModalFooter onCancel={onClose} loading={loading} />}
    >
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

          {/* Item Name */}
          <FormField label="ชื่อรายการ" required>
            <Input type="text" required placeholder="เช่น เบี้ยเลี้ยงพิเศษ" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </FormField>

          {isAutoPullModuleItem ? (
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-900 dark:text-teal-200">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>ดึงจาก: {autoPull?.source}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-teal-800 dark:text-teal-300">{autoPull?.hint}</p>
            </div>
          ) : null}

          {/* If FORMULA is chosen (and not locked auto-pull): Show Formula Template selector and clean Summary Card */}
          {!isAutoPullModuleItem && (calculationType === 'FORMULA' ? (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Calculator className="w-3.5 h-3.5 text-blue-700" />
                <span>สูตร: {selectedTemplate?.name ?? formulaTemplate}</span>
                {isSystemFormula && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                    <Lock className="w-3 h-3" />
                    ระบบคำนวณให้
                  </span>
                )}
              </div>

              {selectedTemplate && templateCode !== 'SSO_STANDARD' && (
                <div className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5 shadow-2xs">
                  {hasParams ? (
                    <FormulaParamsEditor template={templateCode} params={params} onChange={setParams} />
                  ) : (
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">เกณฑ์ / สูตรคำนวณ:</span>
                      <span className="font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 text-right">
                        {formulaValue || selectedTemplate.defaultValue || '-'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ประกันสังคม: อัตราตามช่วงวันที่มีผล (แทนแท็บภาษี & ประกันสังคม) */}
              {templateCode === 'SSO_STANDARD' && (() => {
                const emp = Number(ssoEmp) || 0;
                const er = Number(ssoEr) || 0;
                const mx = Number(ssoMax) || 0;
                const mn = Number(ssoMin) || 0;
                const ro = !canEditTaxSso;
                const field = (label: string, value: string, setter: (v: string) => void, unit: string, prefix?: string) => (
                  <FormField label={label}>
                    <NumberInput value={value} onChange={setter} prefix={prefix} suffix={unit} disabled={ro} />
                  </FormField>
                );
                return (
                  <div className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                    <span className="block text-[11px] font-semibold text-slate-800 dark:text-slate-200">อัตราเงินสมทบ</span>

                    <div className="grid grid-cols-2 gap-2">
                      {field('ลูกจ้างสมทบ', ssoEmp, setSsoEmp, '%')}
                      {field('นายจ้างสมทบ', ssoEr, setSsoEr, '%')}
                      {field('ฐานค่าจ้างต่ำสุด', ssoMin, setSsoMin, 'บาท', '฿')}
                      {field('ฐานค่าจ้างสูงสุด', ssoMax, setSsoMax, 'บาท', '฿')}
                    </div>

                    {(() => {
                      const isNewRate = !ssoCurrent || (!!ssoFrom && ssoFrom !== ssoCurrent.effectiveFrom);
                      return (
                        <label className="block">
                          <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">มีผลตั้งแต่วันที่</span>
                          <ThaiDatePicker
                            value={ssoFrom}
                            onChange={setSsoFrom}
                            placeholder="เลือกวันที่มีผล"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium"
                          />
                          <span className={`block mt-1 text-[10px] ${isNewRate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                            {!ssoCurrent
                              ? 'จะสร้างอัตราแรกของระบบ'
                              : isNewRate
                              ? `จะสร้างอัตราใหม่ — งวดก่อน ${ssoFrom ? thaiDate(ssoFrom) : '...'} ยังใช้อัตราเดิม`
                              : 'วันที่เดิม — บันทึกแล้วจะแก้อัตราที่ใช้อยู่ (ใช้กรณีกรอกตัวเลขผิด) ถ้ากฎหมายเปลี่ยนให้เลือกวันที่มีผลใหม่'}
                          </span>
                        </label>
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="px-2.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                        หักลูกจ้างสูงสุด <span className="font-bold">{((mx * emp) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> บาท/เดือน
                      </div>
                      <div className="px-2.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                        ขั้นต่ำ <span className="font-bold">{((mn * emp) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> บาท · นายจ้างสูงสุด{' '}
                        <span className="font-bold">{((mx * er) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> บาท
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      งวดที่ยังเป็นร่างจะใช้อัตรานี้เมื่อคำนวณใหม่ งวดที่ปิดแล้วไม่เปลี่ยน
                    </p>

                    {sortedSso.length > 1 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => setShowSsoHistory((v) => !v)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showSsoHistory ? 'ซ่อนประวัติอัตรา' : `ดูประวัติอัตรา (${sortedSso.length})`}
                        </button>
                        {showSsoHistory && (
                          <div className="mt-2 space-y-1">
                            {sortedSso.map((r) => (
                              <div key={r.id} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                                <span>มีผล {thaiDate(r.effectiveFrom)}</span>
                                <span>
                                  {pctOf(r.employeeContributionPercent)}% · ฐาน {money(r.minWageBaseAmount)}–{money(r.maxWageBaseAmount)}
                                  {r.id === ssoCurrent?.id && <span className="ml-1.5 text-emerald-600 font-semibold">ใช้อยู่</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ภาษี: ตารางอัตราขั้นบันได (แทนแท็บภาษี & ประกันสังคม) */}
              {templateCode === 'TAX_STANDARD' && (
                <div className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">อัตราภาษีขั้นบันได (เงินได้สุทธิต่อปี)</span>
                    <span className="text-[10px] text-slate-400">แก้ขั้นบันไดได้ที่แท็บ "ภาษี"</span>
                  </div>
                  {sortedBrackets.length === 0 ? (
                    <p className="text-[11px] text-slate-400">ยังไม่มีขั้นบันไดในระบบ</p>
                  ) : (
                    <div className="rounded-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                      <table className="w-full text-[11px]">
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {sortedBrackets.map((b) => (
                            <tr key={b.id}>
                              <td className="px-2.5 py-1.5 text-slate-700 dark:text-slate-300">
                                {money(b.incomeFrom)} – {b.incomeTo != null ? money(b.incomeTo) : 'ขึ้นไป'}
                              </td>
                              <td className="px-2.5 py-1.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                                {pctOf(b.taxRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <FormField label="จำนวนเงิน (บาท)" required hint="ยอดเริ่มต้นเมื่อเพิ่มรายการนี้ให้พนักงานตอนประมวลเงินเดือน (แก้ยอดรายคนได้)">
              <NumberInput value={amountText} onChange={setAmountText} prefix="฿" placeholder="500" />
            </FormField>
          ))}

          {/* ภาษี / ประกันสังคม
              - รายได้ที่ HR เพิ่มเอง: เลือกได้
              - รายได้ของระบบ (ดึงข้อมูลจากระบบ / สูตรของระบบ): แสดงแต่แก้ไม่ได้
              - รายการหักแบบสูตร: แสดงผลต่อฐานภาษี/ประกันสังคม/ค่าลดหย่อน แต่แก้ไม่ได้
              - รายการหักที่ HR เพิ่มเอง: ไม่ลดฐานเสมอ จึงไม่แสดง */}
          {isEarning ? (
            <div className="space-y-2 pt-1">
              {flagsLocked && <p className="text-[11px] text-slate-400">ระบบกำหนดตามกฎหมาย แก้ไขไม่ได้</p>}
              <OptionCheckCard checked={isTaxable} onChange={setIsTaxable} disabled={flagsLocked} {...TAX_OPTION_TEXT} />
              <OptionCheckCard checked={isSocialSecurityCalculated} onChange={setIsSocialSecurityCalculated} disabled={flagsLocked} {...SSO_OPTION_TEXT} />
            </div>
          ) : calculationType === 'FORMULA' ? (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-slate-400">ระบบกำหนดตามกฎหมาย แก้ไขไม่ได้</p>
              <OptionCheckCard
                checked={isTaxable && !isAllowanceItem}
                onChange={() => {}}
                disabled
                title="ลดฐานภาษี"
                description="นำยอดที่หักไปลดเงินได้ที่ต้องเสียภาษี (ค่าจ้างที่ไม่ได้รับจริง)"
              />
              <OptionCheckCard
                checked={isSocialSecurityCalculated && !isAllowanceItem}
                onChange={() => {}}
                disabled
                title="ลดฐานประกันสังคม"
                description="นำยอดที่หักไปลดฐานค่าจ้างที่ใช้คิดเงินสมทบ"
              />
              <OptionCheckCard
                checked={isAllowanceItem}
                onChange={() => {}}
                disabled
                title="เป็นค่าลดหย่อน"
                description="ใช้เป็นค่าลดหย่อนตอนคิดภาษีทั้งปี (ประกันสังคม / กองทุนสำรองเลี้ยงชีพ)"
              />
            </div>
          ) : null}

          {/* เปิดการใช้งานรายการนี้ (Toggle Switch - แสดงเฉพาะตอนแก้ไข) */}
          {item && (!lockActive || wasInactive) && (
            <ActiveToggleRow label="เปิดใช้งานรายการนี้" checked={isActive} onChange={setIsActive} divider />
          )}

    </Modal>
  );
};
