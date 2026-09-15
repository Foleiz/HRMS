'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  History,
  Search,
  Building2,
  Users,
  ShieldCheck,
  Percent,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Scale,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import { salaryService } from '@/services/salaryService';
import { organizationService } from '@/services/organizationService';
import {
  SalaryStructure,
  TaxBracket,
  SocialSecurityRate,
  EmployeeSalaryOverview,
  CreateSalaryStructurePayload,
  UpdateSalaryStructurePayload,
  AdjustEmployeeSalaryPayload,
} from '@/types/payroll';
import { Position, EmployeeLevel, Department } from '@/types/organization';
import { SalaryStructureModal } from '@/components/payroll/SalaryStructureModal';
import { AdjustSalaryModal } from '@/components/payroll/AdjustSalaryModal';
import { SalaryHistoryModal } from '@/components/payroll/SalaryHistoryModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

type ActiveTab = 'structures' | 'employees' | 'tax-sso';

export default function PayrollManagementPage() {
  const { hasPermission, hasRole } = useAuth();
  const canViewPayroll =
    hasPermission('PAYROLL_VIEW') ||
    hasPermission('PAYROLL_CALC_VIEW') ||
    hasPermission('PAYROLL_SLIP_VIEW') ||
    hasRole('ADMIN');

  const [activeTab, setActiveTab] = useState<ActiveTab>('structures');

  // Master Data
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [ssoRates, setSsoRates] = useState<SocialSecurityRate[]>([]);
  const [employees, setEmployees] = useState<EmployeeSalaryOverview[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [levels, setLevels] = useState<EmployeeLevel[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters for Employee Salaries Tab
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // Modals
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedEmployeeForAdjust, setSelectedEmployeeForAdjust] = useState<EmployeeSalaryOverview | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<EmployeeSalaryOverview | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [structureToDelete, setStructureToDelete] = useState<SalaryStructure | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (canViewPayroll) {
      loadInitialData();
    }
  }, [canViewPayroll]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [structData, taxData, ssoData, empData, posData, lvlData, deptData] = await Promise.all([
        salaryService.getStructures(),
        salaryService.getTaxBrackets(),
        salaryService.getSocialSecurityRates(),
        salaryService.getEmployeesOverview(),
        organizationService.getPositions(),
        organizationService.getLevels(),
        organizationService.getDepartments(),
      ]);

      setStructures(structData || []);
      setTaxBrackets(taxData || []);
      setSsoRates(ssoData || []);
      setEmployees(empData || []);
      setPositions(posData || []);
      setLevels(lvlData || []);
      setDepartments(deptData || []);
    } catch (err) {
      console.error('Failed to load payroll initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Salary Structure Handlers
  const handleOpenCreateStructure = () => {
    setSelectedStructure(null);
    setIsStructureModalOpen(true);
  };

  const handleOpenEditStructure = (s: SalaryStructure) => {
    setSelectedStructure(s);
    setIsStructureModalOpen(true);
  };

  const handleSaveStructure = async (
    payload: CreateSalaryStructurePayload | UpdateSalaryStructurePayload,
    id?: number
  ) => {
    if (id) {
      await salaryService.updateStructure(id, payload);
      showToast('แก้ไขโครงสร้างเงินเดือนสำเร็จ');
    } else {
      await salaryService.createStructure(payload);
      showToast('เพิ่มโครงสร้างเงินเดือนใหม่สำเร็จ');
    }
    const updated = await salaryService.getStructures();
    setStructures(updated);
  };

  const handleConfirmDelete = async () => {
    if (!structureToDelete) return;
    try {
      setIsDeleting(true);
      await salaryService.deleteStructure(structureToDelete.id);
      showToast('ลบโครงสร้างเงินเดือนเรียบร้อยแล้ว');
      const updated = await salaryService.getStructures();
      setStructures(updated);
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      console.error('Failed to delete structure:', err);
    } finally {
      setIsDeleting(false);
      setStructureToDelete(null);
    }
  };

  // Employee Salary Handlers
  const handleOpenAdjustSalary = (emp: EmployeeSalaryOverview) => {
    setSelectedEmployeeForAdjust(emp);
    setIsAdjustModalOpen(true);
  };

  const handleOpenSalaryHistory = (emp: EmployeeSalaryOverview) => {
    setSelectedEmployeeForHistory(emp);
    setIsHistoryModalOpen(true);
  };

  const handleSaveAdjustSalary = async (employeeId: number, payload: AdjustEmployeeSalaryPayload) => {
    await salaryService.adjustEmployeeSalary(employeeId, payload);
    showToast('บันทึกปรับฐานเงินเดือนพนักงานสำเร็จ');
    const updatedEmps = await salaryService.getEmployeesOverview(searchQuery, selectedDeptId ? parseInt(selectedDeptId) : undefined);
    setEmployees(updatedEmps);
  };

  const handleFilterEmployees = async () => {
    try {
      const data = await salaryService.getEmployeesOverview(
        searchQuery.trim() || undefined,
        selectedDeptId ? parseInt(selectedDeptId) : undefined
      );
      setEmployees(data);
    } catch (err) {
      console.error('Failed to filter employees:', err);
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const totalStructures = structures.length;
    const empsWithSalary = employees.filter((e) => (e.currentSalary || 0) > 0).length;
    const totalPayroll = employees.reduce((sum, e) => sum + (e.currentSalary || 0), 0);
    const activeSso = ssoRates.find((s) => s.status === 'ACTIVE') || ssoRates[0];

    return {
      totalStructures,
      empsWithSalary,
      totalEmployees: employees.length,
      totalPayroll,
      ssoPercent: activeSso ? `${(activeSso.employeeContributionPercent * 100).toFixed(0)}%` : '5%',
    };
  }, [structures, employees, ssoRates]);

  if (!canViewPayroll) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์เข้าถึงระบบเงินเดือน"
        message="คุณไม่มีสิทธิ์ในการดูข้อมูลโครงสร้างเงินเดือนและค่าตอบแทน กรุณาติดต่อผู้ดูแลระบบ"
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-[#0B2046]" />
            <span>ระบบเงินเดือนและค่าตอบแทน</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            จัดการโครงสร้างกรอบอัตราเงินเดือน ฐานเงินเดือนรายบุคคล ตารางภาษี และอัตราประกันสังคม
          </p>
        </div>

        {activeTab === 'structures' && (
          <button
            onClick={handleOpenCreateStructure}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มโครงสร้างเงินเดือน</span>
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">กรอบเงินเดือนตามตำแหน่ง</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.totalStructures} ตำแหน่ง</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">พนักงานที่มีฐานเงินเดือน</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {metrics.empsWithSalary} / {metrics.totalEmployees} คน
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">ฐานเงินเดือนรวมทั้งองค์กร</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              ฿{metrics.totalPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">อัตราเงินสมทบ ปกส.</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.ssoPercent} (เพดาน 1.5 หมื่น)</p>
          </div>
        </div>
      </div>

      {/* Main Card with Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-4 pt-2 gap-2 overflow-x-auto bg-slate-50/50">
          <button
            onClick={() => setActiveTab('structures')}
            className={`pb-3 px-4 border-b-2 font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'structures'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>โครงสร้างกรอบเงินเดือน ({structures.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-3 px-4 border-b-2 font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'employees'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ข้อมูลเงินเดือนพนักงาน ({employees.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tax-sso')}
            className={`pb-3 px-4 border-b-2 font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tax-sso'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>เกณฑ์ภาษีและประกันสังคม</span>
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: โครงสร้างกรอบเงินเดือน (Salary Structures) */}
        {activeTab === 'structures' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">กรอบอัตราเงินเดือนตามตำแหน่งงาน</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ใช้อ้างอิงการพิจารณาว่าจ้าง ปรับเงินเดือนประจำปี และควบคุมเพดานอำนาจอนุมัติ
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
                    <th className="py-3.5 px-4">ตำแหน่งงาน / ระดับ</th>
                    <th className="py-3.5 px-4 text-right">เงินเดือนขั้นต่ำ (Min)</th>
                    <th className="py-3.5 px-4 text-right">ค่าเริ่มต้น (Mid)</th>
                    <th className="py-3.5 px-4 text-right">เพดานสูงสุด (Max)</th>
                    <th className="py-3.5 px-4 text-right">เพดานอำนาจอนุมัติ</th>
                    <th className="py-3.5 px-4 text-center">วันที่มีผล</th>
                    <th className="py-3.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูลโครงสร้างเงินเดือน...
                        </div>
                      </td>
                    </tr>
                  ) : structures.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        ยังไม่มีการกำหนดโครงสร้างเงินเดือนในระบบ
                      </td>
                    </tr>
                  ) : (
                    structures.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {s.positionName || 'ทุกตำแหน่งในระบบ'}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {s.levelName || 'ทุกระดับตำแหน่ง'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          ฿{s.minSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-blue-700">
                          {s.defaultSalary != null
                            ? `฿${s.defaultSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                          ฿{s.maxSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-600 font-mono">
                          {s.approvalLimit != null
                            ? `฿${s.approvalLimit.toLocaleString()}`
                            : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center text-xs text-slate-500 font-mono">
                          {s.effectiveFrom} {s.effectiveTo ? `ถึง ${s.effectiveTo}` : 'เป็นต้นไป'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditStructure(s)}
                              title="แก้ไข"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setStructureToDelete(s);
                                setDeleteConfirmOpen(true);
                              }}
                              title="ลบ"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: ข้อมูลเงินเดือนพนักงาน (Employee Salaries) */}
        {activeTab === 'employees' && (
          <div className="p-6">
            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
              <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหารหัส หรือชื่อพนักงาน..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFilterEmployees()}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
                  />
                </div>

                <select
                  value={selectedDeptId}
                  onChange={(e) => {
                    setSelectedDeptId(e.target.value);
                  }}
                  className="text-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
                >
                  <option value="">-- ทุกแผนก --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleFilterEmployees}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  ค้นหา
                </button>
              </div>

              <div className="text-xs text-slate-500 self-end sm:self-center">
                แสดงผล <span className="font-bold text-slate-800">{employees.length}</span> คน
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
                    <th className="py-3.5 px-4">รหัส / ชื่อพนักงาน</th>
                    <th className="py-3.5 px-4">แผนก / ตำแหน่ง</th>
                    <th className="py-3.5 px-4 text-right">ฐานเงินเดือนปัจจุบัน</th>
                    <th className="py-3.5 px-4 text-center">วันที่มีผล</th>
                    <th className="py-3.5 px-4">กรอบเงินเดือนตามตำแหน่ง</th>
                    <th className="py-3.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูลเงินเดือนพนักงาน...
                        </div>
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => {
                      const hasSalary = (emp.currentSalary || 0) > 0;
                      return (
                        <tr key={emp.employeeId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{emp.employeeName}</div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">{emp.employeeCode}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-800 text-xs font-medium">
                              {emp.departmentName || 'ไม่ระบุแผนก'}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {emp.positionName || 'ไม่ระบุตำแหน่ง'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {hasSalary ? (
                              <span className="font-bold text-slate-900">
                                ฿{emp.currentSalary?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                                ยังไม่ระบุ
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs text-slate-500 font-mono">
                            {emp.currentEffectiveFrom || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            {emp.salaryStructureMin != null && emp.salaryStructureMax != null ? (
                              <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                ฿{emp.salaryStructureMin.toLocaleString()} - ฿{emp.salaryStructureMax.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleOpenAdjustSalary(emp)}
                                className="px-3 py-1.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                {hasSalary ? 'ปรับเงินเดือน' : 'กำหนดเงินเดือน'}
                              </button>
                              <button
                                onClick={() => handleOpenSalaryHistory(emp)}
                                title="ดูประวัติการปรับเงินเดือน"
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: เกณฑ์ภาษีและประกันสังคม (Tax & SSO Tab) */}
        {activeTab === 'tax-sso' && (
          <div className="p-6 space-y-8">
            {/* Section 1: Tax Brackets */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-blue-700" />
                    <span>ตารางอัตราภาษีเงินได้บุคคลธรรมดาแบบขั้นบันได (ภ.ง.ด. 8 ขั้น)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    อัตราภาษีเงินได้สุทธิสะสมต่อปีตามประมวลรัษฎากรสำหรับคำนวณหักภาษี ณ ที่จ่าย (Withholding Tax)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
                      <th className="py-3.5 px-4">ขั้นบันไดภาษี</th>
                      <th className="py-3.5 px-4 text-right">เงินได้สุทธิตั้งแต่</th>
                      <th className="py-3.5 px-4 text-right">ถึงเงินได้สุทธิ</th>
                      <th className="py-3.5 px-4 text-center">อัตราภาษี (%)</th>
                      <th className="py-3.5 px-4 text-right">ภาษีสะสมขั้นก่อนหน้า</th>
                      <th className="py-3.5 px-4 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {taxBrackets.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {t.bracketName}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                          ฿{t.incomeFrom.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                          {t.incomeTo != null
                            ? `฿${t.incomeTo.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : 'ขึ้นไป (ไม่จำกัด)'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-blue-700">
                          {(t.taxRate * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                          ฿{t.baseTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Social Security Rates */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-700" />
                    <span>เกณฑ์และอัตราเงินสมทบกองทุนประกันสังคม (Social Security Fund)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    อัตราเงินสมทบฝ่ายลูกจ้างและนายจ้าง พร้อมฐานเพดานค่าจ้างขั้นต่ำและสูงสุดตามกฎหมาย
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
                      <th className="py-3.5 px-4">ชื่อเกณฑ์</th>
                      <th className="py-3.5 px-4 text-center">สมทบฝ่ายผู้ประกันตน (%)</th>
                      <th className="py-3.5 px-4 text-center">สมทบฝ่ายนายจ้าง (%)</th>
                      <th className="py-3.5 px-4 text-right">ฐานค่าจ้างต่ำสุด</th>
                      <th className="py-3.5 px-4 text-right">เพดานค่าจ้างสูงสุด</th>
                      <th className="py-3.5 px-4 text-center">วันที่มีผล</th>
                      <th className="py-3.5 px-4 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {ssoRates.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">{s.rateName}</td>
                        <td className="py-3 px-4 text-center font-bold text-purple-700">
                          {(s.employeeContributionPercent * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-purple-700">
                          {(s.employerContributionPercent * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                          ฿{s.minWageBaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-900 font-semibold">
                          ฿{s.maxWageBaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-slate-500 font-mono">
                          {s.effectiveFrom}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Salary Structure Modal */}
      <SalaryStructureModal
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        onSuccess={() => {}}
        structure={selectedStructure}
        positions={positions}
        levels={levels}
        onSubmit={handleSaveStructure}
      />

      {/* Adjust Salary Modal */}
      <AdjustSalaryModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        employee={selectedEmployeeForAdjust}
        onSubmit={handleSaveAdjustSalary}
      />

      {/* Salary History Modal */}
      <SalaryHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        employee={selectedEmployeeForHistory}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบโครงสร้างเงินเดือน"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบโครงสร้างเงินเดือนของ "${
          structureToDelete?.positionName || 'ตำแหน่งนี้'
        }" ออกจากระบบ?`}
        confirmText="ลบโครงสร้าง"
        cancelText="ยกเลิก"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
