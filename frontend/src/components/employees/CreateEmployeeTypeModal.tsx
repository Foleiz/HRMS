'use client';
import { ModalHeader } from '@/components/ui/ModalHeader';

import { ModalShell, Button } from '@/components/ui';
import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import {
  EmployeeType,
  CreateEmployeeTypePayload,
  UpdateEmployeeTypePayload,
} from '@/types/employeeType';
import { BenefitItem } from '@/types/benefit';
import { benefitService } from '@/services/benefitService';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CodeInput } from '@/components/ui/CodeInput';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { inputClass } from '@/components/ui';

interface CreateEmployeeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeeTypePayload | UpdateEmployeeTypePayload) => Promise<void>;
  initialData?: EmployeeType | null;
  onOpenManageBenefits?: () => void;
  /** รหัสที่มีอยู่แล้ว — ใช้แสดงรหัสแนะนำทันที */
  existingCodes?: string[];
}

type CategoryFilter = 'ALL' | 'STATUTORY' | 'HEALTH' | 'ALLOWANCE' | 'OTHER';

const formatBenefitRate = (b: BenefitItem) => {
  if (!b.defaultCoverageAmount || Number(b.defaultCoverageAmount) === 0) {
    return b.isStatutory ? 'ตามสิทธิ์กฎหมาย' : 'ตามระเบียบบริษัท';
  }
  const amt = Number(b.defaultCoverageAmount).toLocaleString('th-TH');
  const freqMap: Record<string, string> = {
    DAILY: 'วันทำงาน',
    MONTHLY: 'เดือน',
    YEARLY: 'ปี',
    PER_OCCURRENCE: 'ครั้ง',
  };
  const freq = freqMap[b.defaultFrequency] || 'เดือน';
  return `${amt} บ./${freq}`;
};

export const CreateEmployeeTypeModal: React.FC<CreateEmployeeTypeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  existingCodes,
}) => {
  const [typeCode, setTypeCode] = useState('');
  const [typeName, setTypeName] = useState('');
  const [wageType, setWageType] = useState('MONTHLY');
  const [status, setStatus] = useState('ACTIVE');

  // Dynamic Benefits
  const [availableBenefits, setAvailableBenefits] = useState<BenefitItem[]>([]);
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<number[]>([]);
  const [loadingBenefits, setLoadingBenefits] = useState(false);

  // Search & Filter
  const [benefitSearch, setBenefitSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<CategoryFilter>('ALL');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEdit = Boolean(initialData);
  const [hasInitializedForm, setHasInitializedForm] = useState(false);

  // Load available active benefits
  useEffect(() => {
    if (isOpen) {
      loadBenefits();
      setBenefitSearch('');
      setSelectedCategoryTab('ALL');

      // Auto re-fetch latest benefits whenever user switches back to this browser tab
      const handleWindowFocus = () => {
        loadBenefits();
      };
      window.addEventListener('focus', handleWindowFocus);
      return () => {
        window.removeEventListener('focus', handleWindowFocus);
      };
    } else {
      setHasInitializedForm(false);
    }
  }, [isOpen]);

  const loadBenefits = async () => {
    try {
      setLoadingBenefits(true);
      const data = await benefitService.getAll({ status: 'ACTIVE' });
      setAvailableBenefits(data || []);
    } catch {
      // Fallback
    } finally {
      setLoadingBenefits(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setTypeCode(initialData.typeCode || '');
      setTypeName(initialData.typeName || '');
      setWageType(initialData.wageType || 'MONTHLY');
      setStatus(initialData.status || 'ACTIVE');

      // Initialize selected benefit IDs
      if (initialData.benefits && initialData.benefits.length > 0) {
        setSelectedBenefitIds(initialData.benefits.map((b) => b.id));
      } else {
        // Fallback to statutory flags if benefits array empty
        const ids: number[] = [];
        availableBenefits.forEach((b) => {
          if (b.benefitCode === 'SSO' && initialData.hasSocialSecurity) ids.push(b.id);
          if (b.benefitCode === 'LEAVE' && initialData.hasLeaveEntitlement) ids.push(b.id);
          if (b.benefitCode === 'OT' && initialData.hasOvertime) ids.push(b.id);
          if (b.benefitCode === 'PVD' && initialData.hasProvidentFund) ids.push(b.id);
        });
        if (ids.length > 0) {
          setSelectedBenefitIds(ids);
        }
      }
      setHasInitializedForm(true);
    } else if (!hasInitializedForm) {
      setTypeCode('');
      setTypeName('');
      setWageType('MONTHLY');
      setStatus('ACTIVE');

      // For new type, pre-check standard statutory benefits (SSO, LEAVE, OT, PVD if statutory)
      const defaultIds = availableBenefits
        .filter((b) => b.isStatutory || ['SSO', 'LEAVE', 'OT'].includes(b.benefitCode))
        .map((b) => b.id);
      setSelectedBenefitIds(defaultIds);
      setHasInitializedForm(true);
    }
    setErrorMessage(null);
  }, [initialData, isOpen, availableBenefits.length, hasInitializedForm]);

  // Category classification helper
  const getGroupKey = (b: BenefitItem): 'STATUTORY' | 'HEALTH' | 'ALLOWANCE' | 'OTHER' => {
    if (b.isStatutory || b.category === 'STATUTORY') return 'STATUTORY';
    if (b.category === 'HEALTH') return 'HEALTH';
    if (b.category === 'ALLOWANCE' || b.category === 'WELLNESS') return 'ALLOWANCE';
    return 'OTHER';
  };

  // Filtered benefits based on tab & search
  const filteredBenefits = useMemo(() => {
    return availableBenefits.filter((b) => {
      // Category filter
      if (selectedCategoryTab !== 'ALL') {
        const group = getGroupKey(b);
        if (group !== selectedCategoryTab) return false;
      }

      // Search filter
      if (benefitSearch.trim()) {
        const q = benefitSearch.trim().toLowerCase();
        const matchName = b.benefitName.toLowerCase().includes(q);
        const matchCode = b.benefitCode.toLowerCase().includes(q);
        const matchDesc = b.description?.toLowerCase().includes(q);
        const matchCat = b.category.toLowerCase().includes(q);
        return matchName || matchCode || matchDesc || matchCat;
      }

      return true;
    });
  }, [availableBenefits, selectedCategoryTab, benefitSearch]);

  if (!isOpen) return null;

  const toggleBenefit = (id: number) => {
    setSelectedBenefitIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) {
      setErrorMessage('กรุณาระบุชื่อประเภทสัญญา/การจ้างงาน');
      return;
    }

    // Check which statutory codes are selected to keep boolean flags synced
    const selectedCodes = availableBenefits
      .filter((b) => selectedBenefitIds.includes(b.id))
      .map((b) => b.benefitCode);

    const hasSSO = selectedCodes.includes('SSO');
    const hasLeave = selectedCodes.includes('LEAVE');
    const hasOT = selectedCodes.includes('OT');
    const hasPVD = selectedCodes.includes('PVD');

    const benefitAssignments = selectedBenefitIds.map((id) => {
      const b = availableBenefits.find((item) => item.id === id);
      return {
        benefitItemId: id,
        coverageAmount: Number(b?.defaultCoverageAmount) || 0,
        frequency: b?.defaultFrequency || 'MONTHLY',
      };
    });

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (isEdit) {
        await onSubmit({
          typeName: typeName.trim(),
          wageType,
          hasSocialSecurity: hasSSO,
          hasLeaveEntitlement: hasLeave,
          hasOvertime: hasOT,
          hasProvidentFund: hasPVD,
          status,
          benefitItemIds: selectedBenefitIds,
          benefitAssignments,
        });
      } else {
        await onSubmit({
          typeCode: typeCode.trim() ? typeCode.trim().toUpperCase() : undefined,
          typeName: typeName.trim(),
          wageType,
          hasSocialSecurity: hasSSO,
          hasLeaveEntitlement: hasLeave,
          hasOvertime: hasOT,
          hasProvidentFund: hasPVD,
          status,
          benefitItemIds: selectedBenefitIds,
          benefitAssignments,
        });
      }
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { errors?: string[]; message?: string } }; message?: string };
      const apiErrors = error.response?.data?.errors;
      const msg =
        (Array.isArray(apiErrors) && apiErrors.length > 0 ? apiErrors[0] : null) ||
        error.response?.data?.message ||
        error.message ||
        'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const GROUP_ORDER: Array<'STATUTORY' | 'HEALTH' | 'ALLOWANCE' | 'OTHER'> = ['STATUTORY', 'HEALTH', 'ALLOWANCE', 'OTHER'];
  const GROUP_LABEL: Record<string, string> = {
    STATUTORY: 'สิทธิตามกฎหมาย',
    HEALTH: 'สุขภาพ & ประกัน',
    ALLOWANCE: 'เบี้ยเลี้ยง & ช่วยเหลือ',
    OTHER: 'อื่นๆ',
  };
  const groupedBenefits = GROUP_ORDER.map((g) => ({
    key: g,
    label: GROUP_LABEL[g],
    items: filteredBenefits.filter((b) => getGroupKey(b) === g),
  })).filter((g) => g.items.length > 0);

  return (
    <ModalShell className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans" innerClassName="items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <ModalHeader title={isEdit ? 'แก้ไขประเภทพนักงาน' : 'เพิ่มประเภทพนักงานใหม่'} onClose={onClose} />

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 bg-slate-50/70 dark:bg-slate-900/40">
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ข้อมูลประเภท */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3.5">
              <CodeInput
                type="employee-type"
                prefix="ET"
                existingCodes={existingCodes}
                label="รหัสประเภทพนักงาน"
                mode={isEdit ? 'edit' : 'create'}
                value={typeCode}
                onChange={setTypeCode}
                resetKey={isOpen}
                labelClassName="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                inputClassName="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 focus:border-primary dark:focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ชื่อประเภทพนักงาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="เช่น พนักงานประจำ, พนักงานสัญญาจ้าง, นักศึกษาฝึกงาน"
                  className={`${inputClass} h-10`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">รูปแบบค่าตอบแทน</label>
                <CustomSelect value={wageType} onChange={(e) => setWageType(e.target.value)} className={`${inputClass} h-10`}>
                  <option value="MONTHLY">รายเดือน</option>
                  <option value="DAILY">รายวัน</option>
                  <option value="HOURLY">รายชั่วโมง</option>
                  <option value="PIECE_RATE">รายชิ้นงาน</option>
                  <option value="STIPEND">เบี้ยเลี้ยงเหมาจ่าย</option>
                </CustomSelect>
              </div>
            </div>

            {/* สวัสดิการที่ได้รับ */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">สวัสดิการที่ได้รับ</span>
                <span className="text-xs font-semibold text-primary dark:text-blue-300">เลือก {selectedBenefitIds.length} รายการ</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={benefitSearch}
                  onChange={(e) => setBenefitSearch(e.target.value)}
                  placeholder="ค้นหาสวัสดิการ"
                  className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                />
              </div>

              {loadingBenefits && availableBenefits.length === 0 ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดรายการสวัสดิการ...
                </div>
              ) : groupedBenefits.length === 0 ? (
                <p className="m-0 py-8 text-center text-xs text-slate-400">ไม่พบสวัสดิการที่ค้นหา</p>
              ) : (
                <div>
                  {groupedBenefits.map((group, gi) => (
                    <div key={group.key}>
                      <div className={`${gi === 0 ? 'mt-1' : 'mt-3'} mb-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-primary dark:text-blue-300`}>{group.label}</div>
                      <ul className="m-0 p-0 list-none divide-y divide-slate-100 dark:divide-slate-700/60">
                        {group.items.map((b) => {
                          const checked = selectedBenefitIds.includes(b.id);
                          return (
                            <li key={b.id}>
                              <label className="flex items-center gap-3 py-2.5 px-2.5 cursor-pointer text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-lg">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleBenefit(b.id)}
                                  className="w-4 h-4 rounded border-slate-300 accent-[var(--color-primary)] cursor-pointer shrink-0"
                                />
                                <span className={`flex-1 min-w-0 truncate ${checked ? 'text-slate-800 dark:text-slate-100 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
                                  {b.benefitName}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{formatBenefitRate(b)}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* แถบล่าง: สถานะซ้าย, ปุ่มขวา */}
          <div className="flex items-center gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
            {isEdit && (
              <label className="mr-auto inline-flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                <ToggleSwitch
                  checked={status === 'ACTIVE'}
                  onChange={(v) => setStatus(v ? 'ACTIVE' : 'INACTIVE')}
                  ariaLabel="เปิดใช้งาน"
                />
                เปิดใช้งาน
              </label>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                บันทึก
              </Button>
            </div>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};
