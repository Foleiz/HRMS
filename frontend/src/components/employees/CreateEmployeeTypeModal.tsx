'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  Gift,
  Search,
  Check,
  Shield,
  HeartPulse,
  Coins,
  CheckSquare,
  HelpCircle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  EmployeeType,
  CreateEmployeeTypePayload,
  UpdateEmployeeTypePayload,
} from '@/types/employeeType';
import { BenefitItem } from '@/types/benefit';
import { benefitService } from '@/services/benefitService';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface CreateEmployeeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeeTypePayload | UpdateEmployeeTypePayload) => Promise<void>;
  initialData?: EmployeeType | null;
  onOpenManageBenefits?: () => void;
}

type CategoryFilter = 'ALL' | 'STATUTORY' | 'HEALTH' | 'ALLOWANCE' | 'OTHER';

const CATEGORY_META: Record<string, { label: string; badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  STATUTORY: {
    label: 'สิทธิตามกฎหมาย',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    icon: Shield,
  },
  HEALTH: {
    label: 'สุขภาพและประกัน',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    icon: HeartPulse,
  },
  ALLOWANCE: {
    label: 'เบี้ยเลี้ยงและการช่วยเหลือ',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    icon: Coins,
  },
  WELLNESS: {
    label: 'กิจกรรมและฟิตเนส',
    badge: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
    icon: HeartPulse,
  },
  FINANCIAL: {
    label: 'กองทุนและการเงิน',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    icon: Coins,
  },
  OTHER: {
    label: 'ทั่วไป / อื่นๆ',
    badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: HelpCircle,
  },
};

const PAYOUT_LABELS: Record<string, string> = {
  PAYROLL: 'เข้าสลิปเงินเดือน',
  REIMBURSEMENT: 'เบิกจ่ายตามจริง',
  IN_KIND: 'สิทธิประโยชน์/สวัสดิการในตัว',
  DIRECT: 'คุ้มครองโดยตรง',
};

export const CreateEmployeeTypeModal: React.FC<CreateEmployeeTypeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [typeCode, setTypeCode] = useState('');
  const [typeName, setTypeName] = useState('');
  const [wageType, setWageType] = useState('MONTHLY');
  const [status, setStatus] = useState('ACTIVE');

  // Dynamic Benefits
  const [availableBenefits, setAvailableBenefits] = useState<BenefitItem[]>([]);
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<number[]>([]);
  const [benefitDetails, setBenefitDetails] = useState<Record<number, { coverageAmount: number; frequency: string }>>({});
  const [loadingBenefits, setLoadingBenefits] = useState(false);

  // Search & Filter
  const [benefitSearch, setBenefitSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<CategoryFilter>('ALL');
  const benefitListRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEdit = Boolean(initialData);

  // Load available active benefits
  useEffect(() => {
    if (isOpen) {
      loadBenefits();
      setBenefitSearch('');
      setSelectedCategoryTab('ALL');
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
    if (initialData) {
      setTypeCode(initialData.typeCode || '');
      setTypeName(initialData.typeName || '');
      setWageType(initialData.wageType || 'MONTHLY');
      setStatus(initialData.status || 'ACTIVE');

      // Initialize selected benefit IDs & details
      if (initialData.benefits && initialData.benefits.length > 0) {
        setSelectedBenefitIds(initialData.benefits.map((b) => b.id));
        const details: Record<number, { coverageAmount: number; frequency: string }> = {};
        initialData.benefits.forEach((b) => {
          details[b.id] = {
            coverageAmount: b.coverageAmount ?? b.defaultCoverageAmount ?? 0,
            frequency: b.frequency ?? b.defaultFrequency ?? (b.category === 'ALLOWANCE' && b.benefitCode.includes('MEAL') ? 'DAILY' : b.category === 'HEALTH' ? 'YEARLY' : 'MONTHLY'),
          };
        });
        setBenefitDetails(details);
      } else {
        // Fallback to statutory flags if benefits array empty
        const ids: number[] = [];
        availableBenefits.forEach((b) => {
          if (b.benefitCode === 'SSO' && initialData.hasSocialSecurity) ids.push(b.id);
          if (b.benefitCode === 'LEAVE' && initialData.hasLeaveEntitlement) ids.push(b.id);
          if (b.benefitCode === 'OT' && initialData.hasOvertime) ids.push(b.id);
          if (b.benefitCode === 'PVD' && initialData.hasProvidentFund) ids.push(b.id);
        });
        setSelectedBenefitIds(ids);
      }
    } else {
      setTypeCode('');
      setTypeName('');
      setWageType('MONTHLY');
      setStatus('ACTIVE');

      // For new type, pre-check standard statutory benefits (SSO, LEAVE, OT, PVD if statutory)
      const defaultIds = availableBenefits
        .filter((b) => b.isStatutory || ['SSO', 'LEAVE', 'OT'].includes(b.benefitCode))
        .map((b) => b.id);
      setSelectedBenefitIds(defaultIds);
    }
    setErrorMessage(null);
  }, [initialData, isOpen, availableBenefits.length]);

  // Derived selected list
  const selectedBenefits = useMemo(() => {
    return availableBenefits.filter((b) => selectedBenefitIds.includes(b.id));
  }, [availableBenefits, selectedBenefitIds]);

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

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { ALL: availableBenefits.length, STATUTORY: 0, HEALTH: 0, ALLOWANCE: 0, OTHER: 0 };
    availableBenefits.forEach((b) => {
      const g = getGroupKey(b);
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [availableBenefits]);

  if (!isOpen) return null;

  const toggleBenefit = (id: number) => {
    setSelectedBenefitIds((prev) => {
      const willSelect = !prev.includes(id);
      if (willSelect) {
        const item = availableBenefits.find((b) => b.id === id);
        setBenefitDetails((d) => ({
          ...d,
          [id]: d[id] || {
            coverageAmount: item?.coverageAmount ?? item?.defaultCoverageAmount ?? (item?.category === 'ALLOWANCE' ? 50 : item?.category === 'HEALTH' ? 2000 : 0),
            frequency: item?.frequency ?? item?.defaultFrequency ?? (item?.category === 'ALLOWANCE' && item?.benefitCode.includes('MEAL') ? 'DAILY' : item?.category === 'HEALTH' ? 'YEARLY' : 'MONTHLY'),
          },
        }));
        return [...prev, id];
      } else {
        return prev.filter((item) => item !== id);
      }
    });
  };

  const updateBenefitDetail = (id: number, field: 'coverageAmount' | 'frequency', val: any) => {
    setBenefitDetails((prev) => ({
      ...prev,
      [id]: {
        coverageAmount: prev[id]?.coverageAmount ?? 0,
        frequency: prev[id]?.frequency ?? 'MONTHLY',
        [field]: val,
      },
    }));
  };

  const handleSelectAllInView = () => {
    const idsToAdd = filteredBenefits.map((b) => b.id);
    setSelectedBenefitIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    // Initialize details for newly selected
    filteredBenefits.forEach((b) => {
      if (!benefitDetails[b.id]) {
        setBenefitDetails((d) => ({
          ...d,
          [b.id]: {
            coverageAmount: b.coverageAmount ?? b.defaultCoverageAmount ?? 0,
            frequency: b.frequency ?? b.defaultFrequency ?? 'MONTHLY',
          },
        }));
      }
    });
  };

  const handleSelectStatutoryOnly = () => {
    const statutoryIds = availableBenefits
      .filter((b) => b.isStatutory || b.category === 'STATUTORY' || ['SSO', 'LEAVE', 'OT', 'PVD'].includes(b.benefitCode))
      .map((b) => b.id);
    setSelectedBenefitIds((prev) => Array.from(new Set([...prev, ...statutoryIds])));
  };

  const handleClearAll = () => {
    setSelectedBenefitIds([]);
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

    const benefitAssignments = selectedBenefitIds.map((id) => ({
      benefitItemId: id,
      coverageAmount: Number(benefitDetails[id]?.coverageAmount) || 0,
      frequency: benefitDetails[id]?.frequency || 'MONTHLY',
    }));

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
          typeCode: typeCode.trim().toUpperCase(),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-[#0B2046] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isEdit ? 'แก้ไขประเภทสัญญา/การจ้างงาน' : 'เพิ่มประเภทสัญญา/การจ้างงานใหม่'}
              </h2>
              <p className="text-[11px] text-slate-300">
                กำหนดชื่อ รูปแบบค่าตอบแทน และสิทธิประโยชน์ของประเภทการจ้างงาน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* ชื่อประเภทสัญญา & รหัสประเภท */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ชื่อประเภทสัญญา/การจ้างงาน <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="เช่น พนักงานประจำ, พนักงานสัญญาจ้าง, พาร์ทไทม์"
                className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                รหัสประเภท (Type Code)
              </label>
              <input
                type="text"
                disabled={isEdit}
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
                placeholder={isEdit ? '' : 'สร้างอัตโนมัติ'}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* รูปแบบค่าตอบแทน & สถานะ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                รูปแบบค่าตอบแทน (Wage Type)
              </label>
              <CustomSelect
                value={wageType}
                onChange={(e) => setWageType(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500 transition-all"
              >
                <option value="MONTHLY">รายเดือน (Monthly)</option>
                <option value="DAILY">รายวัน (Daily)</option>
                <option value="HOURLY">รายชั่วโมง (Hourly)</option>
                <option value="PIECE_RATE">รายชิ้นงาน (Piece Rate)</option>
                <option value="STIPEND">เบี้ยเลี้ยงเหมาจ่าย (Stipend)</option>
              </CustomSelect>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                สถานะการใช้งาน
              </label>
              <CustomSelect
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500 transition-all"
              >
                <option value="ACTIVE">เปิดใช้งาน (Active)</option>
                <option value="INACTIVE">ปิดการใช้งาน (Inactive)</option>
              </CustomSelect>
            </div>
          </div>

          {/* 4. สิทธิประโยชน์และสวัสดิการ */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
            {/* Header section with counts and link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#0B2046] text-white rounded-lg shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      สิทธิประโยชน์และสวัสดิการที่ได้รับ
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0B2046] dark:text-cyan-300 border border-blue-200 dark:border-blue-800">
                      เลือกแล้ว {selectedBenefitIds.length} จาก {availableBenefits.length} รายการ
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    เลือกสวัสดิการที่จะมอบให้พนักงานในประเภทสัญญานี้ พร้อมกำหนดวงเงิน/รอบจ่าย
                  </p>
                </div>
              </div>

              <Link
                href="/organization?tab=benefits"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#0B2046] dark:text-cyan-400 hover:underline font-semibold inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                title="เปิดหน้าจัดการสวัสดิการกลางในโครงสร้างองค์กร (แท็บใหม่)"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>จัดการสวัสดิการกลาง</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Selected items quick badges tray (Always visible if any selected) */}
            {selectedBenefits.length > 0 && (
              <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-blue-200/80 dark:border-blue-900/40 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    รายการที่เลือกไว้ในปัจจุบัน ({selectedBenefits.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[10px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium hover:underline cursor-pointer"
                  >
                    ยกเลิกทั้งหมด
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {selectedBenefits.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200"
                    >
                      <span className="truncate max-w-[160px]">{b.benefitName}</span>
                      <button
                        type="button"
                        onClick={() => toggleBenefit(b.id)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 cursor-pointer"
                        title={`นำ ${b.benefitName} ออก`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Search Bar & Quick Filters */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={benefitSearch}
                    onChange={(e) => setBenefitSearch(e.target.value)}
                    placeholder="ค้นหาชื่อสวัสดิการ, รหัส หรือหมวดหมู่..."
                    className="w-full h-8 pl-8 pr-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#0B2046] dark:focus:ring-blue-500"
                  />
                  {benefitSearch && (
                    <button
                      type="button"
                      onClick={() => setBenefitSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectStatutoryOnly}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-[#0B2046] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium transition-colors cursor-pointer"
                  >
                    สิทธิตามกฎหมาย
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllInView}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    เลือกที่แสดง
                  </button>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategoryTab === 'ALL'
                      ? 'bg-[#0B2046] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  ทั้งหมด ({categoryCounts.ALL})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab('STATUTORY')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategoryTab === 'STATUTORY'
                      ? 'bg-[#0B2046] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  สิทธิตามกฎหมาย ({categoryCounts.STATUTORY})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab('HEALTH')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategoryTab === 'HEALTH'
                      ? 'bg-[#0B2046] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  สุขภาพ & ประกัน ({categoryCounts.HEALTH})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab('ALLOWANCE')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategoryTab === 'ALLOWANCE'
                      ? 'bg-[#0B2046] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  เบี้ยเลี้ยง & ช่วยเหลือ ({categoryCounts.ALLOWANCE})
                </button>
                {categoryCounts.OTHER > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryTab('OTHER')}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategoryTab === 'OTHER'
                        ? 'bg-[#0B2046] text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    อื่นๆ ({categoryCounts.OTHER})
                  </button>
                )}
              </div>
            </div>

            {/* Benefit Items List */}
            {loadingBenefits ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#0B2046] dark:text-cyan-400" />
                กำลังโหลดรายการสวัสดิการทั้งหมดจากระบบ...
              </div>
            ) : filteredBenefits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p>ไม่พบรายการสวัสดิการที่ตรงกับคำค้นหาหรือตัวกรอง</p>
                {(benefitSearch || selectedCategoryTab !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBenefitSearch('');
                      setSelectedCategoryTab('ALL');
                    }}
                    className="mt-2 text-[#0B2046] dark:text-cyan-400 hover:underline font-medium cursor-pointer inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>
            ) : (
              <div
                ref={benefitListRef}
                className="space-y-2 text-xs pt-1 max-h-80 overflow-y-auto pr-1.5 custom-scrollbar"
              >
                {filteredBenefits.map((b) => {
                  const isChecked = selectedBenefitIds.includes(b.id);
                  const isMonetary =
                    b.category === 'ALLOWANCE' ||
                    b.category === 'HEALTH' ||
                    b.category === 'FINANCIAL' ||
                    b.category === 'WELLNESS' ||
                    b.category === 'OTHER';
                  const meta = CATEGORY_META[b.category] || CATEGORY_META.OTHER;
                  const Icon = meta.icon;
                  const payoutText = PAYOUT_LABELS[b.payoutType] || b.payoutType;

                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isChecked
                          ? 'bg-white dark:bg-slate-800 border-blue-400/80 dark:border-blue-500/60 shadow-xs ring-1 ring-blue-500/20'
                          : 'bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/70 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBenefit(b.id)}
                          className="w-4 h-4 mt-0.5 rounded text-[#0B2046] dark:text-blue-500 border-slate-300 dark:border-slate-600 focus:ring-[#0B2046] dark:focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-slate-800 dark:text-slate-100 font-semibold leading-tight">
                              {b.benefitName}
                            </span>

                            {/* Category Badge */}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${meta.badge}`}
                            >
                              <Icon className="w-2.5 h-2.5" />
                              {b.isStatutory ? 'สิทธิตามกฎหมาย' : meta.label}
                            </span>

                            {/* Payout Type Badge */}
                            {payoutText && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-normal bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {payoutText}
                              </span>
                            )}
                          </div>

                          {b.description && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 block">
                              {b.description}
                            </span>
                          )}
                        </div>
                      </label>

                      {/* Configurable Amount & Frequency when Selected */}
                      {isChecked && isMonetary && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap sm:flex-nowrap items-center gap-2.5 pl-6">
                          <div className="flex-1 min-w-[130px]">
                            <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                              วงเงิน / อัตราจ่าย (บาท)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={b.category === 'ALLOWANCE' ? '10' : '100'}
                              value={benefitDetails[b.id]?.coverageAmount ?? 0}
                              onChange={(e) => updateBenefitDetail(b.id, 'coverageAmount', Number(e.target.value))}
                              className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] dark:focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="w-full sm:w-56">
                            <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                              รอบการคำนวณ / จ่าย
                            </label>
                            <CustomSelect
                              value={benefitDetails[b.id]?.frequency ?? 'MONTHLY'}
                              onChange={(e) => updateBenefitDetail(b.id, 'frequency', e.target.value)}
                              className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] dark:focus:ring-blue-500"
                            >
                              <option value="DAILY">บาท / วันทำงานจริง (เข้าสลิป)</option>
                              <option value="MONTHLY">บาท / เดือน (เข้าสลิป)</option>
                              <option value="YEARLY">บาท / ปี (วงเงินคุ้มครอง)</option>
                              <option value="PER_OCCURRENCE">บาท / ครั้งที่เบิก</option>
                            </CustomSelect>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0B2046] hover:bg-[#07152d] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEdit ? 'บันทึกการแก้ไข' : 'สร้างประเภทสัญญา'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
