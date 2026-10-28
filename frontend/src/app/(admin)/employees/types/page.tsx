'use client';

import React, { useState, useEffect, useTransition, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Search,
  Plus,
  MoreVertical,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ShieldCheck,
  FileCheck2,
  CreditCard,
  Layers,
  Power,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { employeeTypeService } from '@/services/employeeTypeService';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  EmployeeType,
  EmployeeTypeStats,
  CreateEmployeeTypePayload,
  UpdateEmployeeTypePayload,
} from '@/types/employeeType';
import { BenefitItem } from '@/types/benefit';
import { CreateEmployeeTypeModal } from '@/components/employees/CreateEmployeeTypeModal';
import { ActionDropdown } from '@/components/ui/ActionDropdown';

import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import { ActiveStatus } from '@/components/ui';

const CATEGORY_META: Record<string, { label: string }> = {
  STATUTORY: { label: 'สิทธิตามกฎหมาย' },
  HEALTH: { label: 'สุขภาพและประกัน' },
  ALLOWANCE: { label: 'เบี้ยเลี้ยงและการช่วยเหลือ' },
  FINANCIAL: { label: 'การเงินและกองทุน' },
  WELLNESS: { label: 'การเรียนรู้และสุขภาพกาย' },
  OTHER: { label: 'สิทธิประโยชน์อื่นๆ' },
};

function getBadgeColor(category?: string): string {
  switch (category) {
    case 'STATUTORY':
      return 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60';
    case 'HEALTH':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
    case 'ALLOWANCE':
      return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
    case 'FINANCIAL':
      return 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60';
    case 'WELLNESS':
      return 'bg-pink-50 text-pink-700 border-pink-200/80 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800/60';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
}

export default function EmployeeTypesPage() {
  const { hasPermission, hasRole } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const [, startTransition] = useTransition();

  // Data states
  const [types, setTypes] = useState<EmployeeType[]>([]);
  const [stats, setStats] = useState<EmployeeTypeStats>({
    totalTypes: 0,
    monthlyWageCount: 0,
    otherWageCount: 0,
    activeCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Notification feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Menu
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTypeForEdit, setSelectedTypeForEdit] = useState<EmployeeType | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Benefits Popover state
  const [mounted, setMounted] = useState(false);
  const [popoverData, setPopoverData] = useState<{
    typeName: string;
    typeCode: string;
    benefits: BenefitItem[];
    anchorRect: DOMRect;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!popoverData) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverData(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverData(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [popoverData]);

  const groupedPopoverBenefits = useMemo(() => {
    if (!popoverData?.benefits) return {};
    const groups: Record<string, BenefitItem[]> = {};
    for (const b of popoverData.benefits) {
      const cat = b.category || 'OTHER';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    }
    return groups;
  }, [popoverData]);

  const getPopoverPosition = (rect: DOMRect) => {
    const popoverWidth = 380;
    const padding = 16;
    let left = rect.left;
    if (typeof window !== 'undefined') {
      if (left + popoverWidth > window.innerWidth - padding) {
        left = window.innerWidth - popoverWidth - padding;
      }
      if (left < padding) left = padding;
    }

    let top = rect.bottom + 8;
    const estimatedHeight = 340;
    if (typeof window !== 'undefined') {
      if (top + estimatedHeight > window.innerHeight - padding && rect.top > estimatedHeight) {
        top = Math.max(padding, rect.top - estimatedHeight - 8);
      }
    }

    return { top, left };
  };

  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canViewProfile = hasPermission('EMP_PROFILE_VIEW') || isSuper;
  const canViewTypes = hasPermission('EMP_TYPE_VIEW') || isSuper;
  const canViewTransfers = hasPermission('EMP_TRANSFER_VIEW') || isSuper;
  const canViewContracts = hasPermission('EMP_CONTRACT_VIEW') || isSuper;
  const canViewDocs = hasPermission('EMP_DOC_VIEW') || isSuper;

  const canCreateTypes = hasPermission('EMP_TYPE_CREATE') || hasPermission('EMP_MANAGE') || isSuper;
  const canEditTypes = hasPermission('EMP_TYPE_EDIT') || hasPermission('EMP_MANAGE') || isSuper;

  // Sub-Navigation Tabs matching Design System
  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', show: canViewProfile },
    { title: 'ประเภทพนักงาน', href: '/employees/types', active: true, show: canViewTypes },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/transfers', show: canViewTransfers },
    { title: 'สัญญาจ้าง', href: '/employees/contracts', show: canViewContracts },
    { title: 'เอกสารใกล้หมดอายุ', href: '/employees/documents', show: canViewDocs },
  ].filter((t) => t.show);

  if (!canViewTypes) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์ดูประเภทพนักงาน"
        message="ขออภัย บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงหรือดูข้อมูลประเภทพนักงาน กรุณาติดต่อผู้ดูแลระบบ"
      />
    );
  }

  useEffect(() => {
    setBreadcrumb({ section: 'พนักงาน', page: 'ประเภทพนักงาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [typeList, statData] = await Promise.all([
        employeeTypeService.getAll({
          search: searchTerm || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        employeeTypeService.getStats(),
      ]);
      setTypes(typeList);
      setStats(statData);
    } catch (err: unknown) {
      console.error('Failed to load employee types:', err);
      setErrorMessage('ไม่สามารถโหลดข้อมูลประเภทสัญญาได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadData();
    });
  }, [searchTerm, statusFilter]);

  const handleCreateOrUpdate = async (data: CreateEmployeeTypePayload | UpdateEmployeeTypePayload) => {
    if (selectedTypeForEdit) {
      await employeeTypeService.update(selectedTypeForEdit.id, data as UpdateEmployeeTypePayload);
      setSuccessMessage(`อัปเดตประเภทสัญญา "${data.typeName}" สำเร็จ`);
    } else {
      await employeeTypeService.create(data as CreateEmployeeTypePayload);
      setSuccessMessage(`สร้างประเภทสัญญาใหม่ "${data.typeName}" สำเร็จ`);
    }
    loadData();
  };

  const handleToggleStatus = async (type: EmployeeType) => {
    try {
      const newStatus = type.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await employeeTypeService.update(type.id, {
        typeName: type.typeName,
        wageType: type.wageType,
        hasSocialSecurity: type.hasSocialSecurity,
        hasLeaveEntitlement: type.hasLeaveEntitlement,
        hasOvertime: type.hasOvertime,
        hasProvidentFund: type.hasProvidentFund,
        status: newStatus,
      });
      setSuccessMessage(
        `${newStatus === 'ACTIVE' ? 'เปิดใช้งาน' : 'ปิดการใช้งาน'} ประเภทสัญญา "${type.typeName}" เรียบร้อยแล้ว`
      );
      loadData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMessage(error?.message || 'ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const formatWageType = (val: string) => {
    switch (val) {
      case 'MONTHLY':
        return { label: 'รายเดือน', color: 'bg-blue-50 text-blue-700 border-blue-200/80' };
      case 'DAILY':
        return { label: 'รายวัน', color: 'bg-amber-50 text-amber-700 border-amber-200/80' };
      case 'HOURLY':
        return { label: 'รายชั่วโมง', color: 'bg-indigo-50 text-indigo-700 border-indigo-200/80' };
      case 'STIPEND':
        return { label: 'เบี้ยเลี้ยง', color: 'bg-purple-50 text-purple-700 border-purple-200/80' };
      default:
        return { label: val, color: 'bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200/80' };
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(types.length / pageSize) || 1;
  const paginatedTypes = types.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-5 font-sans pb-12">
      {/* 1. Sub-Navigation Tabs matching Design System */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl shadow-2xs">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {subNavTabs.map((tab) => {
            const isActive = tab.active;
            return (
              <Link
                key={tab.title}
                href={tab.href}
                className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium ${
                  isActive
                    ? 'border-primary dark:border-white text-primary dark:text-white font-bold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
                }`}
              >
                {tab.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 2. Notifications Alert */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs shadow-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-rose-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Header Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            ประเภทการจ้างงานและสัญญาจ้าง
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            กำหนดประเภทสัญญาจ้าง รูปแบบการจ่ายค่าตอบแทน และสิทธิประโยชน์พนักงานในองค์กร
          </p>
        </div>

        {canCreateTypes && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => {
                setSelectedTypeForEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-[#07152d] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มประเภทสัญญา/การจ้างงาน</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. KPI Stat Cards (3 Cards matching theme) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: ประเภทสัญญาทั้งหมด */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">ประเภทสัญญาทั้งหมด</h4>
            <p className="text-xs text-slate-400 dark:text-slate-400">ประเภทการจ้างงานที่กำหนดในระบบ</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 text-blue-600 dark:text-blue-300 px-4 py-1.5 rounded-xl font-bold text-2xl tracking-tight">
            {stats.totalTypes}
          </div>
        </div>

        {/* Card 2: จ่ายค่าจ้างรายเดือน */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">จ่ายค่าจ้างรายเดือน</h4>
            <p className="text-xs text-slate-400 dark:text-slate-400">สัญญาจ้างรูปแบบเงินเดือนประจำ</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-300 px-4 py-1.5 rounded-xl font-bold text-2xl tracking-tight">
            {stats.monthlyWageCount}
          </div>
        </div>

        {/* Card 3: รายวัน / รายชั่วโมง / เบี้ยเลี้ยง */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">รายวัน / รายชั่วโมง / อื่นๆ</h4>
            <p className="text-xs text-slate-400 dark:text-slate-400">สัญญาจ้างยืดหยุ่นและนักศึกษาฝึกงาน</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/60 text-purple-600 dark:text-purple-300 px-4 py-1.5 rounded-xl font-bold text-2xl tracking-tight">
            {stats.otherWageCount}
          </div>
        </div>
      </div>

      {/* 5. Main Card Container with Filters & Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Top Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">รายการประเภทสัญญา</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">({types.length} รายการ)</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ หรือรหัสประเภท..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Status Filter */}
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(String(val))}
              placeholder="สถานะทั้งหมด"
              size="sm"
              className="min-w-[140px]"
              options={[
                { value: 'ALL', label: 'สถานะทั้งหมด' },
                { value: 'ACTIVE', label: 'เปิดใช้งาน' },
                { value: 'INACTIVE', label: 'ปิดการใช้งาน' },
              ]}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 dark:text-slate-400 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <span>กำลังโหลดข้อมูลประเภทสัญญา...</span>
            </div>
          ) : paginatedTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 dark:text-slate-400 text-xs">
              <FileCheck2 className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-medium text-slate-600 dark:text-slate-400">ไม่พบข้อมูลประเภทสัญญา</p>
              <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่มเพิ่มประเภทสัญญาใหม่</p>
            </div>
          ) : (
            <table className="table-standard w-full min-w-[850px] text-left text-xs border-collapse whitespace-nowrap">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr className="whitespace-nowrap">
                  <th className="py-3 px-5 whitespace-nowrap">รหัสประเภท</th>
                  <th className="py-3 px-4 whitespace-nowrap">ชื่อประเภทสัญญา / การจ้างงาน</th>
                  <th className="py-3 px-4 whitespace-nowrap">รูปแบบค่าตอบแทน</th>
                  <th className="py-3 px-4 whitespace-nowrap">สิทธิประโยชน์และสวัสดิการ</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">สัญญาที่ใช้งานอยู่</th>
                  <th className="py-3 px-4 whitespace-nowrap">สถานะ</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 dark:text-slate-300">
                {paginatedTypes.map((item) => {
                  const wage = formatWageType(item.wageType);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* รหัสประเภท */}
                      <td className="py-3.5 px-5 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                          {item.typeCode}
                        </span>
                      </td>

                      {/* ชื่อประเภท */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {item.typeName}
                      </td>

                      {/* รูปแบบค่าตอบแทน */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${wage.color}`}
                        >
                          {wage.label}
                        </span>
                      </td>

                      {/* สิทธิประโยชน์ */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                          {item.benefits && item.benefits.length > 0 ? (
                            <>
                              {item.benefits.slice(0, 3).map((b) => {
                                const badgeColor = getBadgeColor(b.category);
                                const amt = Number(b.coverageAmount) || 0;
                                const freqLabel =
                                  b.frequency === 'DAILY'
                                    ? 'บ./วัน'
                                    : b.frequency === 'YEARLY'
                                    ? 'บ./ปี'
                                    : 'บ./ด.';
                                return (
                                  <span
                                    key={b.id}
                                    title={b.description || b.benefitName}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${badgeColor}`}
                                  >
                                    <span>{b.benefitName}</span>
                                    {amt > 0 && (
                                      <span className="font-mono font-semibold opacity-85">
                                        ({amt.toLocaleString()} {freqLabel})
                                      </span>
                                    )}
                                  </span>
                                );
                              })}

                              {item.benefits.length > 3 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setPopoverData({
                                      typeName: item.typeName,
                                      typeCode: item.typeCode,
                                      benefits: item.benefits || [],
                                      anchorRect: rect,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 cursor-pointer transition-all shadow-2xs hover:scale-105"
                                  title="คลิกเพื่อดูสิทธิประโยชน์ทั้งหมด"
                                >
                                  +{item.benefits.length - 3} รายการ
                                </button>
                              )}
                            </>
                          ) : item.hasSocialSecurity ||
                            item.hasLeaveEntitlement ||
                            item.hasOvertime ||
                            item.hasProvidentFund ? (
                            <>
                              {item.hasSocialSecurity && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-[10px]">
                                  ประกันสังคม
                                </span>
                              )}
                              {item.hasLeaveEntitlement && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 text-[10px]">
                                  สิทธิ์วันลา
                                </span>
                              )}
                              {item.hasOvertime && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 text-[10px]">
                                  คิดโอที (OT)
                                </span>
                              )}
                              {item.hasProvidentFund && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 text-[10px]">
                                  กองทุนสำรองฯ
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-[11px]">- ไม่มี -</span>
                          )}
                        </div>
                      </td>

                      {/* จำนวนสัญญาที่ใช้งาน */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                          {item.activeContractsCount}
                        </span>
                      </td>

                      {/* สถานะ */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <ActiveStatus active={item.status === 'ACTIVE'} activeText="เปิดใช้งาน" inactiveText="ปิดการใช้งาน" />
                      </td>

                      {/* จัดการ (3 Dots Action Menu) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canEditTypes ? (
                          <ActionDropdown
                            menuClassName="w-44"
                            items={[
                              {
                                label: 'แก้ไขประเภทสัญญา',
                                icon: <Edit2 className="w-3.5 h-3.5 text-slate-400" />,
                                onClick: () => {
                                  setSelectedTypeForEdit(item);
                                  setIsCreateModalOpen(true);
                                },
                              },
                              {
                                label: item.status === 'ACTIVE' ? 'ปิดการใช้งาน' : 'เปิดใช้งาน',
                                icon: <Power className="w-3.5 h-3.5" />,
                                danger: item.status === 'ACTIVE',
                                className: item.status === 'ACTIVE' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50',
                                onClick: () => handleToggleStatus(item),
                              },
                            ]}
                          />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer with Pagination */}
        <div className="border-t border-slate-100 dark:border-slate-700/60 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>แสดง</span>
            <CustomSelect
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </CustomSelect>
            <span>แถวต่อหน้า</span>
            <span className="text-slate-400 dark:text-slate-500 text-[11px] ml-1">
              (แสดง {types.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} ถึง{' '}
              {Math.min(currentPage * pageSize, types.length)} จากทั้งหมด {types.length} รายการ)
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  page === currentPage
                    ? 'bg-primary text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 6. Modal สร้าง/แก้ไขประเภทสัญญา */}
      <CreateEmployeeTypeModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedTypeForEdit(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedTypeForEdit}
        existingCodes={types.map((t) => t.typeCode)}
      />

      {/* 7. Popover แสดงสิทธิประโยชน์ทั้งหมดแยกหมวดหมู่ */}
      {mounted &&
        popoverData &&
        createPortal(
          (() => {
            const pos = getPopoverPosition(popoverData.anchorRect);
            return (
              <div
                ref={popoverRef}
                style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
                className="fixed z-50 w-96 max-w-[95vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {popoverData.typeCode}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {popoverData.typeName}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        สิทธิประโยชน์และสวัสดิการทั้งหมด
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                      {popoverData.benefits.length} รายการ
                    </span>
                    <button
                      type="button"
                      onClick={() => setPopoverData(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Categorized List */}
                <div className="mt-3 space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {Object.entries(groupedPopoverBenefits).map(([category, list]) => {
                    const meta = CATEGORY_META[category] || { label: 'สิทธิประโยชน์อื่นๆ' };
                    return (
                      <div key={category} className="space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>{meta.label}</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            {list.length} รายการ
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {list.map((b) => {
                            const badgeColor = getBadgeColor(b.category);
                            const amt = Number(b.coverageAmount) || 0;
                            const freqLabel =
                              b.frequency === 'DAILY'
                                ? 'บ./วัน'
                                : b.frequency === 'YEARLY'
                                ? 'บ./ปี'
                                : 'บ./ด.';
                            return (
                              <span
                                key={b.id}
                                title={b.description || b.benefitName}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${badgeColor}`}
                              >
                                <span>{b.benefitName}</span>
                                {amt > 0 && (
                                  <span className="font-mono font-bold opacity-85 text-[10px]">
                                    ({amt.toLocaleString()} {freqLabel})
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })(),
          document.body
        )}
    </div>
  );
}
