'use client';

import React, { useState, useEffect, useTransition } from 'react';
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
import {
  EmployeeType,
  EmployeeTypeStats,
  CreateEmployeeTypePayload,
  UpdateEmployeeTypePayload,
} from '@/types/employeeType';
import { CreateEmployeeTypeModal } from '@/components/employees/CreateEmployeeTypeModal';
import { ActionDropdown } from '@/components/ui/ActionDropdown';

import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/common/AccessDenied';

export default function EmployeeTypesPage() {
  const { hasPermission } = useAuth();
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
  const pageSize = 8;

  const canViewProfile = hasPermission('EMP_PROFILE_VIEW') || hasPermission('EMP_VIEW');
  const canViewTypes = hasPermission('EMP_TYPE_VIEW') || hasPermission('EMP_VIEW');
  const canViewTransfers = hasPermission('EMP_TRANSFER_VIEW') || hasPermission('EMP_VIEW');
  const canViewContracts = hasPermission('EMP_CONTRACT_VIEW') || hasPermission('EMP_VIEW');

  // Sub-Navigation Tabs matching Design System
  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', show: canViewProfile },
    { title: 'ประเภทพนักงาน', href: '/employees/types', active: true, show: canViewTypes },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/transfers', show: canViewTransfers },
    { title: 'สัญญาจ้าง', href: '/employees/contracts', show: canViewContracts },
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
        return { label: val, color: 'bg-slate-50 text-slate-700 border-slate-200/80' };
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(types.length / pageSize) || 1;
  const paginatedTypes = types.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-5 font-sans pb-12">
      {/* 1. Sub-Navigation Tabs matching Design System */}
      <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl shadow-2xs">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {subNavTabs.map((tab) => {
            const isActive = tab.active;
            return (
              <Link
                key={tab.title}
                href={tab.href}
                className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium ${
                  isActive
                    ? 'border-[#0B2046] text-[#0B2046] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
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
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0B2046]" />
            ประเภทการจ้างงานและสัญญาจ้าง
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดประเภทสัญญาจ้าง รูปแบบการจ่ายค่าตอบแทน และสิทธิประโยชน์พนักงานในองค์กร
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              setSelectedTypeForEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B2046] hover:bg-[#07152d] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มประเภทสัญญา/การจ้างงาน</span>
          </button>
        </div>
      </div>

      {/* 4. KPI Stat Cards (3 Cards matching theme) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: ประเภทสัญญาทั้งหมด */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-1">ประเภทสัญญาทั้งหมด</h4>
            <p className="text-xs text-slate-400">ประเภทการจ้างงานที่กำหนดในระบบ</p>
          </div>
          <div className="bg-blue-50 text-[#0B2046] px-4 py-1.5 rounded-xl font-bold text-2xl tracking-tight">
            {stats.totalTypes}
          </div>
        </div>

        {/* Card 2: จ่ายค่าจ้างรายเดือน */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-1">จ่ายค่าจ้างรายเดือน</h4>
            <p className="text-xs text-slate-400">สัญญาจ้างรูปแบบเงินเดือนประจำ</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-xl font-bold text-2xl tracking-tight">
            {stats.monthlyWageCount}
          </div>
        </div>

        {/* Card 3: รายวัน / รายชั่วโมง / เบี้ยเลี้ยง */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-1">รายวัน / รายชั่วโมง / อื่นๆ</h4>
            <p className="text-xs text-slate-400">สัญญาจ้างยืดหยุ่นและนักศึกษาฝึกงาน</p>
          </div>
          <div className="bg-purple-50 text-purple-600 px-4 py-1.5 rounded-xl font-bold text-2xl tracking-tight">
            {stats.otherWageCount}
          </div>
        </div>
      </div>

      {/* 5. Main Card Container with Filters & Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Top Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">รายการประเภทสัญญา</span>
            <span className="text-xs text-slate-400">({types.length} รายการ)</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ หรือรหัสประเภท..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="ACTIVE">เปิดใช้งาน</option>
              <option value="INACTIVE">ปิดการใช้งาน</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B2046] mb-2" />
              <span>กำลังโหลดข้อมูลประเภทสัญญา...</span>
            </div>
          ) : paginatedTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs">
              <FileCheck2 className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-medium text-slate-600">ไม่พบข้อมูลประเภทสัญญา</p>
              <p className="text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่มเพิ่มประเภทสัญญาใหม่</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5 whitespace-nowrap">รหัสประเภท</th>
                  <th className="py-3 px-4 whitespace-nowrap">ชื่อประเภทสัญญา / การจ้างงาน</th>
                  <th className="py-3 px-4 whitespace-nowrap">รูปแบบค่าตอบแทน</th>
                  <th className="py-3 px-4 whitespace-nowrap">สิทธิประโยชน์และสวัสดิการ</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">สัญญาที่ใช้งานอยู่</th>
                  <th className="py-3 px-4 whitespace-nowrap">สถานะ</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedTypes.map((item) => {
                  const wage = formatWageType(item.wageType);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* รหัสประเภท */}
                      <td className="py-3.5 px-5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200">
                          {item.typeCode}
                        </span>
                      </td>

                      {/* ชื่อประเภท */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
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
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
                          {item.benefits && item.benefits.length > 0 ? (
                            item.benefits.map((b) => {
                              let badgeColor = 'bg-slate-50 text-slate-700 border-slate-200/80';
                              if (b.category === 'STATUTORY') {
                                badgeColor = 'bg-blue-50 text-blue-700 border-blue-200/80';
                              } else if (b.category === 'HEALTH') {
                                badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
                              } else if (b.category === 'ALLOWANCE') {
                                badgeColor = 'bg-amber-50 text-amber-700 border-amber-200/80';
                              } else if (b.category === 'FINANCIAL') {
                                badgeColor = 'bg-purple-50 text-purple-700 border-purple-200/80';
                              } else if (b.category === 'WELLNESS') {
                                badgeColor = 'bg-pink-50 text-pink-700 border-pink-200/80';
                              }
                              return (
                                <span
                                  key={b.id}
                                  title={b.description || b.benefitName}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${badgeColor}`}
                                >
                                  {b.benefitName}
                                </span>
                              );
                            })
                          ) : item.hasSocialSecurity ||
                            item.hasLeaveEntitlement ||
                            item.hasOvertime ||
                            item.hasProvidentFund ? (
                            <>
                              {item.hasSocialSecurity && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 text-[10px]">
                                  ประกันสังคม
                                </span>
                              )}
                              {item.hasLeaveEntitlement && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px]">
                                  สิทธิ์วันลา
                                </span>
                              )}
                              {item.hasOvertime && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px]">
                                  คิดโอที (OT)
                                </span>
                              )}
                              {item.hasProvidentFund && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 text-[10px]">
                                  กองทุนสำรองฯ
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px]">- ไม่มี -</span>
                          )}
                        </div>
                      </td>

                      {/* จำนวนสัญญาที่ใช้งาน */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          {item.activeContractsCount}
                        </span>
                      </td>

                      {/* สถานะ */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            item.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          {item.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ปิดการใช้งาน'}
                        </span>
                      </td>

                      {/* จัดการ (3 Dots Action Menu) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer with Pagination */}
        <div className="border-t border-slate-100 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            แสดง {types.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} ถึง{' '}
            {Math.min(currentPage * pageSize, types.length)} จากทั้งหมด {types.length} รายการ
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  page === currentPage
                    ? 'bg-[#0B2046] text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-700 disabled:opacity-40 cursor-pointer"
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
      />
    </div>
  );
}
