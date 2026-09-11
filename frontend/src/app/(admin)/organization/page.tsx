'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  GitFork,
  Briefcase,
  Layers,
  Building,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { organizationService } from '@/services/organizationService';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import {
  Division,
  Department,
  Position,
  EmployeeLevel,
  Company,
  CreateDivisionRequest,
  UpdateDivisionRequest,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  CreatePositionRequest,
  UpdatePositionRequest,
  UpdateCompanyRequest,
} from '@/types/organization';

type TabType = 'divisions' | 'departments' | 'positions' | 'levels' | 'company';

export default function OrganizationPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const [activeTab, setActiveTab] = useState<TabType>('divisions');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivisionId, setFilterDivisionId] = useState<string>('ALL');
  const [filterDeptId, setFilterDeptId] = useState<string>('ALL');

  const tabTitles: Record<TabType, string> = {
    divisions: 'จัดการฝ่าย',
    departments: 'จัดการแผนก',
    positions: 'จัดการตำแหน่ง',
    levels: 'ระดับพนักงาน',
    company: 'ข้อมูลบริษัท',
  };

  useEffect(() => {
    setBreadcrumb({
      section: 'โครงสร้างองค์กร',
      page: tabTitles[activeTab] || 'จัดการฝ่าย',
    });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  // Data states
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [levels, setLevels] = useState<EmployeeLevel[]>([]);
  const [company, setCompany] = useState<Company | null>(null);

  // Alert states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string; type: string } | null>(null);

  // Form states
  const [divisionForm, setDivisionForm] = useState<CreateDivisionRequest & { id?: number }>({
    divisionCode: '',
    divisionName: '',
    status: 'ACTIVE',
  });

  const [deptForm, setDeptForm] = useState<CreateDepartmentRequest & { id?: number }>({
    divisionId: 0,
    departmentCode: '',
    departmentName: '',
    status: 'ACTIVE',
  });

  const [posForm, setPosForm] = useState<CreatePositionRequest & { id?: number }>({
    departmentId: 0,
    positionCode: '',
    positionName: '',
    status: 'ACTIVE',
  });

  const [companyForm, setCompanyForm] = useState<UpdateCompanyRequest>({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    status: 'ACTIVE',
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [divs, depts, pos, lvls, comp] = await Promise.all([
        organizationService.getDivisions(),
        organizationService.getDepartments(),
        organizationService.getPositions(),
        organizationService.getLevels(),
        organizationService.getCompany(),
      ]);
      setDivisions(divs);
      setDepartments(depts);
      setPositions(pos);
      setLevels(lvls);
      setCompany(comp);
      if (comp) {
        setCompanyForm({
          companyName: comp.companyName,
          address: comp.address || '',
          phone: comp.phone || '',
          email: comp.email || '',
          status: comp.status,
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('ไม่สามารถโหลดข้อมูลโครงสร้างองค์กรได้');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Handlers for Division
  const handleOpenDivisionModal = (div?: Division) => {
    if (div) {
      setModalMode('edit');
      setDivisionForm({
        id: div.id,
        divisionCode: div.divisionCode,
        divisionName: div.divisionName,
        status: div.status,
      });
    } else {
      setModalMode('create');
      setDivisionForm({
        divisionCode: '',
        divisionName: '',
        status: 'ACTIVE',
      });
    }
    setModalOpen(true);
  };

  const handleSaveDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      if (modalMode === 'create') {
        await organizationService.createDivision(divisionForm);
        showSuccess('เพิ่มข้อมูลฝ่ายสำเร็จ');
      } else if (divisionForm.id) {
        await organizationService.updateDivision(divisionForm.id, {
          divisionName: divisionForm.divisionName,
          status: divisionForm.status,
        });
        showSuccess('แก้ไขข้อมูลฝ่ายสำเร็จ');
      }
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // Handlers for Department
  const handleOpenDeptModal = (dept?: Department) => {
    if (dept) {
      setModalMode('edit');
      setDeptForm({
        id: dept.id,
        divisionId: dept.divisionId,
        parentDepartmentId: dept.parentDepartmentId,
        departmentCode: dept.departmentCode,
        departmentName: dept.departmentName,
        status: dept.status,
      });
    } else {
      setModalMode('create');
      setDeptForm({
        divisionId: divisions[0]?.id || 0,
        departmentCode: '',
        departmentName: '',
        status: 'ACTIVE',
      });
    }
    setModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      if (modalMode === 'create') {
        await organizationService.createDepartment(deptForm);
        showSuccess('เพิ่มข้อมูลแผนกสำเร็จ');
      } else if (deptForm.id) {
        await organizationService.updateDepartment(deptForm.id, {
          divisionId: deptForm.divisionId,
          parentDepartmentId: deptForm.parentDepartmentId,
          departmentName: deptForm.departmentName,
          status: deptForm.status,
        });
        showSuccess('แก้ไขข้อมูลแผนกสำเร็จ');
      }
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // Handlers for Position
  const handleOpenPosModal = (pos?: Position) => {
    if (pos) {
      setModalMode('edit');
      setPosForm({
        id: pos.id,
        departmentId: pos.departmentId,
        employeeLevelId: pos.employeeLevelId,
        positionCode: pos.positionCode,
        positionName: pos.positionName,
        status: pos.status,
      });
    } else {
      setModalMode('create');
      setPosForm({
        departmentId: departments[0]?.id || 0,
        employeeLevelId: levels[0]?.id,
        positionCode: '',
        positionName: '',
        status: 'ACTIVE',
      });
    }
    setModalOpen(true);
  };

  const handleSavePos = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      if (modalMode === 'create') {
        await organizationService.createPosition(posForm);
        showSuccess('เพิ่มข้อมูลตำแหน่งงานสำเร็จ');
      } else if (posForm.id) {
        await organizationService.updatePosition(posForm.id, {
          departmentId: posForm.departmentId,
          employeeLevelId: posForm.employeeLevelId,
          positionName: posForm.positionName,
          status: posForm.status,
        });
        showSuccess('แก้ไขข้อมูลตำแหน่งงานสำเร็จ');
      }
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // Handler for Company Profile Save
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await organizationService.updateCompany(companyForm);
      showSuccess('บันทึกข้อมูลบริษัทเรียบร้อยแล้ว');
      loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // Delete Handlers
  const handleConfirmDelete = (id: number, name: string, type: string) => {
    setItemToDelete({ id, name, type });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    setErrorMessage(null);
    try {
      if (itemToDelete.type === 'division') {
        await organizationService.deleteDivision(itemToDelete.id);
        showSuccess(`ลบฝ่าย ${itemToDelete.name} สำเร็จ`);
      } else if (itemToDelete.type === 'department') {
        await organizationService.deleteDepartment(itemToDelete.id);
        showSuccess(`ลบแผนก ${itemToDelete.name} สำเร็จ`);
      } else if (itemToDelete.type === 'position') {
        await organizationService.deletePosition(itemToDelete.id);
        showSuccess(`ลบตำแหน่ง ${itemToDelete.name} สำเร็จ`);
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบ');
      setDeleteModalOpen(false);
    }
  };

  // Filtered lists
  const filteredDivisions = divisions.filter((d) =>
    d.divisionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.divisionCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDepartments = departments
    .filter((d) => (filterDivisionId === 'ALL' ? true : d.divisionId.toString() === filterDivisionId))
    .filter((d) =>
      d.departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.departmentCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredPositions = positions
    .filter((p) => (filterDeptId === 'ALL' ? true : p.departmentId.toString() === filterDeptId))
    .filter((p) =>
      p.positionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.positionCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-6">
      {/* 1. Success / Error Banners */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Sub-navigation Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 shadow-sm overflow-x-auto">
        <div className="flex gap-2 text-sm font-medium whitespace-nowrap min-w-max">
          <button
            onClick={() => { setActiveTab('divisions'); setSearchQuery(''); }}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'divisions'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitFork className="w-4 h-4" />
            จัดการฝ่าย
          </button>

          <button
            onClick={() => { setActiveTab('departments'); setSearchQuery(''); }}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'departments'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            จัดการแผนก
          </button>

          <button
            onClick={() => { setActiveTab('positions'); setSearchQuery(''); }}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'positions'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            จัดการตำแหน่ง
          </button>

          <button
            onClick={() => { setActiveTab('levels'); setSearchQuery(''); }}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'levels'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            ระดับพนักงาน
          </button>

          <button
            onClick={() => { setActiveTab('company'); setSearchQuery(''); }}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'company'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            ข้อมูลบริษัท
          </button>
        </div>
      </div>

      {/* 4. Tab Content Panels */}
      <div className="bg-white border border-slate-200 border-t-0 rounded-b-2xl p-6 shadow-sm">
        {/* TAB 1: DIVISIONS */}
        {activeTab === 'divisions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อฝ่าย หรือรหัสฝ่าย..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <button
                onClick={() => handleOpenDivisionModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                เพิ่มฝ่าย
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสฝ่าย</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อฝ่าย / สายงาน</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">จำนวนแผนกในสังกัด</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลฝ่าย...
                      </td>
                    </tr>
                  ) : filteredDivisions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 whitespace-nowrap">
                        ไม่พบข้อมูลฝ่าย
                      </td>
                    </tr>
                  ) : (
                    filteredDivisions.map((div) => (
                      <tr key={div.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{div.divisionCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{div.divisionName}</td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 whitespace-nowrap">
                            {div.departmentCount} แผนก
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                              div.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                div.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            {div.status === 'ACTIVE' ? 'ทำงานอยู่' : 'ไม่ได้ทำงาน'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenDivisionModal(div)}
                              title="แก้ไข"
                              className="p-1.5 text-slate-500 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirmDelete(div.id, div.divisionName, 'division')}
                              title="ลบ"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

        {/* TAB 2: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-lg w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อแผนก หรือรหัสแผนก..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>

                <select
                  value={filterDivisionId}
                  onChange={(e) => setFilterDivisionId(e.target.value)}
                  className="px-3 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ALL">ทุกฝ่าย</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.divisionName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => handleOpenDeptModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                เพิ่มแผนก
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสแผนก</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อแผนก</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สังกัดฝ่าย</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">จำนวนตำแหน่ง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลแผนก...
                      </td>
                    </tr>
                  ) : filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 whitespace-nowrap">
                        ไม่พบข้อมูลแผนก
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{dept.departmentCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{dept.departmentName}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{dept.divisionName}</td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 whitespace-nowrap">
                            {dept.positionCount} ตำแหน่ง
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                              dept.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dept.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            {dept.status === 'ACTIVE' ? 'ทำงานอยู่' : 'ไม่ได้ทำงาน'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenDeptModal(dept)}
                              title="แก้ไข"
                              className="p-1.5 text-slate-500 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirmDelete(dept.id, dept.departmentName, 'department')}
                              title="ลบ"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

        {/* TAB 3: POSITIONS */}
        {activeTab === 'positions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-lg w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อตำแหน่ง หรือรหัสตำแหน่ง..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>

                <select
                  value={filterDeptId}
                  onChange={(e) => setFilterDeptId(e.target.value)}
                  className="px-3 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ALL">ทุกแผนก</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => handleOpenPosModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                เพิ่มตำแหน่ง
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสตำแหน่ง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อตำแหน่งงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สังกัดแผนก</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ระดับพนักงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลตำแหน่ง...
                      </td>
                    </tr>
                  ) : filteredPositions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 whitespace-nowrap">
                        ไม่พบข้อมูลตำแหน่ง
                      </td>
                    </tr>
                  ) : (
                    filteredPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{pos.positionCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{pos.positionName}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{pos.departmentName}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 whitespace-nowrap">
                            {pos.levelCode ? `${pos.levelCode} - ${pos.levelName}` : 'ไม่ระบุ'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                              pos.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                pos.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            {pos.status === 'ACTIVE' ? 'ทำงานอยู่' : 'ไม่ได้ทำงาน'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenPosModal(pos)}
                              title="แก้ไข"
                              className="p-1.5 text-slate-500 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirmDelete(pos.id, pos.positionName, 'position')}
                              title="ลบ"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

        {/* TAB 4: EMPLOYEE LEVELS */}
        {activeTab === 'levels' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              ระดับขั้นพนักงาน ใช้สำหรับกำหนดสายบังคับบัญชา ฐานเงินเดือนขั้นต่ำ-สูงสุด และสิทธิ์การอนุมัติ
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสระดับ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อระดับพนักงาน</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">เงินเดือนขั้นต่ำ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">เงินเดือนขั้นสูง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {levels.map((lvl) => (
                    <tr key={lvl.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{lvl.levelCode}</td>
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{lvl.levelName}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                        {lvl.minSalary ? lvl.minSalary.toLocaleString() : '0.00'} ฿
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                        {lvl.maxSalary ? lvl.maxSalary.toLocaleString() : '0.00'} ฿
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          ทำงานอยู่
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: COMPANY PROFILE */}
        {activeTab === 'company' && (
          <form onSubmit={handleSaveCompany} className="max-w-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสบริษัท</label>
                <input
                  type="text"
                  disabled
                  value={company?.companyCode || ''}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อบริษัท *</label>
                <input
                  type="text"
                  required
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่สำนักงานใหญ่</label>
              <textarea
                rows={3}
                value={companyForm.address}
                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลติดต่อ</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all"
              >
                บันทึกข้อมูลบริษัท
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 5. Create / Edit Modal (Division) */}
      {modalOpen && activeTab === 'divisions' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {modalMode === 'create' ? 'เพิ่มฝ่ายใหม่' : 'แก้ไขข้อมูลฝ่าย'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDivision} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสฝ่าย (เช่น DIV_MKT) *</label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={divisionForm.divisionCode}
                  onChange={(e) => setDivisionForm({ ...divisionForm, divisionCode: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-mono disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อฝ่าย / สายงาน *</label>
                <input
                  type="text"
                  required
                  value={divisionForm.divisionName}
                  onChange={(e) => setDivisionForm({ ...divisionForm, divisionName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                <select
                  value={divisionForm.status}
                  onChange={(e) => setDivisionForm({ ...divisionForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ACTIVE">ทำงานอยู่</option>
                  <option value="INACTIVE">ไม่ได้ทำงาน</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Create / Edit Modal (Department) */}
      {modalOpen && activeTab === 'departments' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {modalMode === 'create' ? 'เพิ่มแผนกใหม่' : 'แก้ไขข้อมูลแผนก'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สังกัดฝ่าย *</label>
                <select
                  required
                  value={deptForm.divisionId}
                  onChange={(e) => setDeptForm({ ...deptForm, divisionId: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.divisionName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสแผนก (เช่น DEPT_QA) *</label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={deptForm.departmentCode}
                  onChange={(e) => setDeptForm({ ...deptForm, departmentCode: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-mono disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อแผนก *</label>
                <input
                  type="text"
                  required
                  value={deptForm.departmentName}
                  onChange={(e) => setDeptForm({ ...deptForm, departmentName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                <select
                  value={deptForm.status}
                  onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ACTIVE">ทำงานอยู่</option>
                  <option value="INACTIVE">ไม่ได้ทำงาน</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Create / Edit Modal (Position) */}
      {modalOpen && activeTab === 'positions' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {modalMode === 'create' ? 'เพิ่มตำแหน่งใหม่' : 'แก้ไขข้อมูลตำแหน่ง'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePos} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สังกัดแผนก *</label>
                <select
                  required
                  value={posForm.departmentId}
                  onChange={(e) => setPosForm({ ...posForm, departmentId: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentName} ({d.divisionName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ระดับตำแหน่ง</label>
                <select
                  value={posForm.employeeLevelId || ''}
                  onChange={(e) => setPosForm({ ...posForm, employeeLevelId: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="">-- ไม่ระบุระดับ --</option>
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.levelCode} - {lvl.levelName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสตำแหน่ง (เช่น POS_SE) *</label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={posForm.positionCode}
                  onChange={(e) => setPosForm({ ...posForm, positionCode: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-mono disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อตำแหน่งงาน *</label>
                <input
                  type="text"
                  required
                  value={posForm.positionName}
                  onChange={(e) => setPosForm({ ...posForm, positionName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                <select
                  value={posForm.status}
                  onChange={(e) => setPosForm({ ...posForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ACTIVE">ทำงานอยู่</option>
                  <option value="INACTIVE">ไม่ได้ทำงาน</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-center text-sm mb-2">
              ยืนยันการลบข้อมูล?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              คุณต้องการลบข้อมูล <span className="font-semibold text-slate-900">&quot;{itemToDelete.name}&quot;</span> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium w-full"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/20 w-full"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
