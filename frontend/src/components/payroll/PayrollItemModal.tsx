'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Info, Calculator, Lock, Sparkles } from 'lucide-react';
import { PayrollItem, SocialSecurityRate } from '@/types/payroll';
import { salaryService } from '@/services/salaryService';
import { getAutoPullSource } from './autoPullItems';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  FormulaParamsEditor,
  FormulaParams,
  PARAM_TEMPLATES,
  parseFormulaParams,
  serializeFormulaParams,
  validateFormulaParams,
} from './FormulaParamsEditor';

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
    hint: 'คิดจากค่าจ้างที่ติ๊ก "คิดประกันสังคม" — อัตราและฐานค่าจ้างที่แก้ตรงนี้คือค่าเดียวกับแท็บภาษี & ประกันสังคม (ช่วงที่มีผลปัจจุบัน)',
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
  const [params, setParams] = useState<FormulaParams>(() => parseFormulaParams('', ''));
  const [isTaxable, setIsTaxable] = useState(true);
  const [isSocialSecurityCalculated, setIsSocialSecurityCalculated] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** อัตราประกันสังคมที่มีผลปัจจุบัน (แก้ร่วมกับแท็บภาษี & ประกันสังคม) */
  const [ssoRate, setSsoRate] = useState<SocialSecurityRate | null>(null);

  useEffect(() => {
    if (item) {
      setItemCode(item.itemCode || '');
      setItemName(item.itemName || '');
      setDescription(item.description || '');
      const t = item.itemType || defaultType;
      setItemType(t);
      const calcType = item.calculationType || 'FIXED';
      // รายได้คงที่รายเดือนย้ายไปตั้งที่เมนูสวัสดิการแล้ว รายการรายได้จึงไม่ใช้แบบ FIXED
      setCalculationType(t === 'EARNING' && calcType === 'FIXED' ? 'MANUAL' : calcType);
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
      setCalculationType(defaultType === 'EARNING' ? 'MANUAL' : 'FIXED');
      setFormulaTemplate('');
      setFormulaValue('');
      setIsTaxable(true);
      setIsSocialSecurityCalculated(defaultType === 'EARNING');
      setIsActive(true);
    }
    setError(null);
  }, [item, defaultType, isOpen]);

  // ประกันสังคม: อ่านอัตรา/ฐานค่าจ้างจริงจากตั้งค่าในแท็บภาษี & ประกันสังคม
  useEffect(() => {
    if (!isOpen || (item?.formulaTemplate || '').toUpperCase() !== 'SSO_STANDARD') return;
    let active = true;
    salaryService
      .getSocialSecurityRates()
      .then((rates) => {
        if (!active || !rates?.length) return;
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const current =
          rates.find(
            (r) => r.status === 'ACTIVE' && r.effectiveFrom <= today && (!r.effectiveTo || r.effectiveTo >= today),
          ) ?? [...rates].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
        setSsoRate(current);
        setParams((prev) => ({
          ...prev,
          ssoPercent: String(current.employeeContributionPercent),
          ssoMin: String(current.minWageBaseAmount),
          ssoMax: String(current.maxWageBaseAmount),
        }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [item, isOpen]);

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
  const availableTemplates = [
    ...(systemTemplate ? [{ ...systemTemplate, name: `${systemTemplate.name} (รายการของระบบ)` }] : []),
    ...FORMULA_TEMPLATES.filter((tpl) => tpl.category === itemType || tpl.category === 'BOTH'),
    // รายการเดิมที่ยังใช้สูตรที่เลิกใช้: แสดงไว้ให้รู้ว่าตั้งอะไรอยู่ (ระบบไม่คำนวณให้)
    ...(legacyTemplate ? [{ ...legacyTemplate, name: `${legacyTemplate.name} (เลิกใช้ — ระบบไม่คำนวณ)` }] : []),
  ];

  const selectedTemplate = FORMULA_TEMPLATES.find((t) => t.code === templateCode) ?? systemTemplate ?? legacyTemplate;
  const hasParams = !isAutoPullModuleItem && PARAM_TEMPLATES.includes(templateCode);

  const handleCalculationTypeChange = (newType: 'FIXED' | 'FORMULA' | 'MANUAL') => {
    if (isAutoPullModuleItem) return;
    setCalculationType(newType);
    if (newType === 'FORMULA') {
      if (!formulaTemplate) {
        // เงินเดือน/ประกันสังคม/ภาษี เป็นรายการของระบบอยู่แล้ว ค่าเริ่มต้นจึงเป็นสูตรที่ใช้สร้างรายการเพิ่มได้จริง
        const defaultTpl = itemType === 'EARNING' ? 'DILIGENT_ALLOWANCE' : 'LATE_ABSENT';
        setFormulaTemplate(defaultTpl);
        const tplObj = FORMULA_TEMPLATES.find((t) => t.code === defaultTpl);
        if (tplObj) {
          if (!formulaValue) setFormulaValue(tplObj.defaultValue);
          setParams(parseFormulaParams(defaultTpl, tplObj.defaultValue));
          setIsTaxable(tplObj.defaultTaxable);
          setIsSocialSecurityCalculated(tplObj.defaultSocialSecurity);
        }
      }
    }
  };

  const handleTemplateChange = (newTplCode: string) => {
    if (isAutoPullModuleItem) return;
    setFormulaTemplate(newTplCode);
    const tplObj = FORMULA_TEMPLATES.find((t) => t.code === newTplCode);
    if (tplObj) {
      setFormulaValue(tplObj.defaultValue);
      setParams(parseFormulaParams(newTplCode, tplObj.defaultValue));
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

    let finalFormulaValue = formulaValue.trim();
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

      // ประกันสังคม: บันทึกอัตรา/ฐานค่าจ้างลงตั้งค่าเดียวกับแท็บภาษี & ประกันสังคม
      if (templateCode === 'SSO_STANDARD' && ssoRate) {
        await salaryService.updateSocialSecurityRate(ssoRate.id, {
          rateName: ssoRate.rateName,
          employeeContributionPercent: Number(params.ssoPercent),
          employerContributionPercent: Number(params.ssoPercent),
          minWageBaseAmount: Number(params.ssoMin),
          maxWageBaseAmount: Number(params.ssoMax),
          effectiveFrom: ssoRate.effectiveFrom,
          effectiveTo: ssoRate.effectiveTo ?? null,
          status: ssoRate.status,
        });
      }

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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-700/60 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center shrink-0 border-b border-slate-100 dark:border-slate-700/60">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {item
              ? `แก้ไข${isEarning ? 'รายการรายได้' : 'รายการรายหัก'}`
              : `เพิ่ม${isEarning ? 'รายการรายได้' : 'รายการรายหัก'}`}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="absolute right-4 top-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

          {/* Item Code (only when creating) */}
          {!item && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">รหัสรายการ (เช่น INC_OTHER) <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                placeholder="เช่น INC_OTHER"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800 dark:text-slate-200 uppercase"
              />
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">ชื่อรายการ <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              placeholder="เช่น เบี้ยเลี้ยงพิเศษ"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">คำอธิบายย่อ</label>
            <input
              type="text"
              placeholder="เช่น จ่ายตามที่ปฏิบัติงานนอกสถานที่"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Calculation Type */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>ประเภทการคำนวณ</span>
              {isAutoPullModuleItem && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  <Lock className="w-3 h-3" />
                  ระบบดึงข้อมูลให้
                </span>
              )}
            </label>
            {isAutoPullModuleItem ? (
              <div className="w-full py-2.5 px-3.5 text-xs font-semibold rounded-xl border border-[#0B2046] bg-[#0B2046] text-white shadow-xs flex items-center justify-center gap-2 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5 text-teal-300" />
                <span>ดึงข้อมูลอัตโนมัติ</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { id: 'FIXED', label: 'จำนวนคงที่' },
                  { id: 'FORMULA', label: 'สูตรคำนวณ' },
                  { id: 'MANUAL', label: 'กำหนดเอง' },
                ]
                  .filter((opt) => !(itemType === 'EARNING' && opt.id === 'FIXED'))
                  .filter((opt) => !(linkedBenefits.length > 0 && opt.id !== 'MANUAL'))
                  .map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleCalculationTypeChange(opt.id as any)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all cursor-pointer text-center ${
                      calculationType === opt.id
                        ? 'bg-[#0B2046] text-white border-[#0B2046] shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAutoPullModuleItem ? (
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-900 dark:text-teal-200">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>ดึงจาก: {autoPull?.source}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-teal-800 dark:text-teal-300">{autoPull?.hint}</p>
            </div>
          ) : linkedBenefits.length > 0 ? (
            <div className="text-[11px] leading-relaxed px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300">
              ใช้กับสวัสดิการ: <span className="font-semibold">{linkedBenefits.join(', ')}</span> — ยอดเงินและผู้มีสิทธิ์กำหนดที่เมนูสวัสดิการ หน้านี้ใช้ตั้งค่าการคิดภาษี/ประกันสังคมของรายการในสลิป
            </div>
          ) : itemType === 'EARNING' ? (
            <div className="text-[11px] leading-relaxed px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
              เงินได้คงที่รายเดือน (เช่น ค่าเดินทาง ค่าโทรศัพท์) ให้ตั้งเป็นสวัสดิการแบบ &quot;เบี้ยเลี้ยง&quot; ที่เมนูสวัสดิการ แล้วเลือกรายการรายได้นี้เป็นรหัสในสลิป
            </div>
          ) : null}

          {/* If FORMULA is chosen (and not locked auto-pull): Show Formula Template selector and clean Summary Card */}
          {!isAutoPullModuleItem && (calculationType === 'FORMULA' ? (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-blue-700" />
                  <span>รูปแบบสูตรมาตรฐานของระบบ (Formula Template)</span>
                </label>
                <CustomSelect
                  value={formulaTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  disabled={isSystemFormula}
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {availableTemplates.map((tpl) => (
                    <option key={tpl.code} value={tpl.code}>
                      {tpl.name}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {selectedTemplate && (
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
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      {isSystemFormula
                        ? `${selectedTemplate.hint} — รายการของระบบ ระบบคำนวณให้เอง`
                        : selectedTemplate.hint}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {calculationType === 'FIXED' ? 'จำนวนเงินคงที่ (บาท)' : 'เกณฑ์การคิด / บันทึกช่วยจำ'}
              </label>
              <div className="relative">
                <input
                  type={calculationType === 'FIXED' ? 'number' : 'text'}
                  step={calculationType === 'FIXED' ? '0.01' : undefined}
                  placeholder={
                    calculationType === 'FIXED'
                      ? 'เช่น 500'
                      : 'เช่น กำหนดเป็นรายครั้ง หรือ ตามยอดจริงที่เกิดขึ้น'
                  }
                  value={formulaValue}
                  onChange={(e) => setFormulaValue(e.target.value)}
                  className={`w-full text-xs py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800 dark:text-slate-200 ${
                    calculationType === 'FIXED' ? 'pl-7 pr-3 font-semibold' : 'px-3.5'
                  }`}
                />
                {calculationType === 'FIXED' && (
                  <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium">฿</span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1 block">
                {calculationType === 'FIXED'
                  ? 'ระบุยอดเงินคงที่ที่จ่ายหรือหักในสลิปเงินเดือน'
                  : 'ระบุเกณฑ์หรือคำอธิบายสำหรับอ้างอิงและแสดงบนสลิปเงินเดือน'}
              </span>
            </div>
          ))}

          {/* Checkboxes: คิดภาษี & คิดประกันสังคม */}
          <div className="flex items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isTaxable}
                onChange={(e) => setIsTaxable(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600"
              />
              <span>คิดภาษี</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isSocialSecurityCalculated}
                onChange={(e) => setIsSocialSecurityCalculated(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600"
              />
              <span>คิดประกันสังคม</span>
            </label>
          </div>

          {/* เปิดการใช้งานรายการนี้ (Toggle Switch - แสดงเฉพาะตอนแก้ไข) */}
          {item && (
            <div className="flex items-center justify-between pt-2 pb-1 border-t border-slate-100 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">เปิดใช้งานรายการนี้</span>
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
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          </div>

          {/* Actions - Sticky Footer */}
          <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl transition-all cursor-pointer text-center"
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
