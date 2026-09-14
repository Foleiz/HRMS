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
  Gift,
  HeartPulse,
  Coins,
  Smile,
  HelpCircle,
  Shield,
  Upload,
  User,
  Image as ImageIcon,
} from 'lucide-react';
import { organizationService } from '@/services/organizationService';
import { benefitService } from '@/services/benefitService';
import { employeeService } from '@/services/employeeService';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
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
  CreateEmployeeLevelRequest,
  UpdateEmployeeLevelRequest,
} from '@/types/organization';
import { BenefitItem, CreateBenefitPayload, UpdateBenefitPayload } from '@/types/benefit';
import { Employee } from '@/types/employee';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';

type TabType = 'divisions' | 'departments' | 'positions' | 'levels' | 'benefits' | 'company';

const BENEFIT_CATEGORY_MAP: Record<string, { label: string; color: string; icon: any }> = {
  STATUTORY: { label: 'กฎหมายแรงงาน', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Shield },
  HEALTH: { label: 'สุขภาพ & ประกัน', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: HeartPulse },
  ALLOWANCE: { label: 'เบี้ยเลี้ยง & ช่วยเหลือ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Coins },
  WELLNESS: { label: 'กิจกรรม & สันทนาการ', color: 'bg-pink-50 text-pink-700 border-pink-200', icon: Smile },
  FINANCIAL: { label: 'การเงิน & กองทุน', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Coins },
  OTHER: { label: 'ทั่วไป / อื่นๆ', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: HelpCircle },
};

export default function OrganizationPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('divisions');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivisionId, setFilterDivisionId] = useState<string>('ALL');
  const [filterDeptId, setFilterDeptId] = useState<string>('ALL');
  const [filterBenefitCategory, setFilterBenefitCategory] = useState<string>('ALL');

  const tabTitles: Record<TabType, string> = {
    divisions: 'จัดการฝ่าย (Division)',
    departments: 'จัดการแผนก (Department)',
    positions: 'จัดการตำแหน่งงาน (Position)',
    levels: 'ระดับพนักงาน (Level)',
    benefits: 'สวัสดิการและสิทธิประโยชน์ (Benefits)',
    company: 'ข้อมูลบริษัท (Company Profile)',
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab') as TabType;
      if (tabParam && ['divisions', 'departments', 'positions', 'levels', 'benefits', 'company'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  useEffect(() => {
    setBreadcrumb({
      section: 'โครงสร้างองค์กร',
      page: tabTitles[activeTab] || 'จัดการฝ่าย',
    });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  // Helper แปลงวันที่รูปแบบไทย (พ.ศ.) เช่น 2 มกราคม 2569
  const formatThaiDate = (dateString?: string | Date | null): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ];

    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543;

    return `${day} ${month} ${year}`;
  };

  // Helper แสดง Avatar และชื่อพนักงาน
  const renderEmployeeCell = (name?: string | null) => {
    if (!name) return <span className="text-slate-400">-</span>;
    const initial = name.trim().charAt(0);
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0B2046] flex items-center justify-center text-[10px] font-bold ring-1 ring-blue-200 shrink-0">
          {initial}
        </div>
        <span className="font-medium text-slate-800 whitespace-nowrap">{name}</span>
      </div>
    );
  };

  // Data states
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [levels, setLevels] = useState<EmployeeLevel[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string; type: string } | null>(null);

  // Form states
  const [divisionForm, setDivisionForm] = useState<CreateDivisionRequest & { id?: number }>({
    divisionCode: '',
    divisionName: '',
    headEmployeeId: undefined,
    status: 'ACTIVE',
  });

  const [deptForm, setDeptForm] = useState<CreateDepartmentRequest & { id?: number }>({
    divisionId: 0,
    parentDepartmentId: undefined,
    departmentCode: '',
    departmentName: '',
    headEmployeeId: undefined,
    status: 'ACTIVE',
  });

  const [posForm, setPosForm] = useState<CreatePositionRequest & { id?: number }>({
    departmentId: 0,
    positionCode: '',
    positionName: '',
    status: 'ACTIVE',
  });

  const [benefitForm, setBenefitForm] = useState<CreateBenefitPayload & { id?: number }>({
    benefitCode: '',
    benefitName: '',
    category: 'HEALTH',
    description: '',
    isStatutory: false,
    status: 'ACTIVE',
  });

  const [levelForm, setLevelForm] = useState<CreateEmployeeLevelRequest & { id?: number }>({
    levelCode: '',
    levelName: '',
    levelRank: undefined,
    status: 'ACTIVE',
  });

  const [companyForm, setCompanyForm] = useState<UpdateCompanyRequest>({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    status: 'ACTIVE',
    logoData: null,
    ceoEmployeeId: null,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [divs, depts, pos, lvls, comp, ben, emps] = await Promise.all([
        organizationService.getDivisions(),
        organizationService.getDepartments(),
        organizationService.getPositions(),
        organizationService.getLevels(),
        organizationService.getCompany(),
        benefitService.getAll().catch(() => []),
        employeeService.getAll().catch(() => []),
      ]);
      setDivisions(divs);
      setDepartments(depts);
      setPositions(pos);
      setLevels(lvls);
      setCompany(comp);
      setBenefits(ben || []);
      setEmployees(emps || []);
      if (comp) {
        setCompanyForm({
          companyName: comp.companyName,
          address: comp.address || '',
          phone: comp.phone || '',
          email: comp.email || '',
          status: comp.status,
          logoData: comp.logoData || null,
          ceoEmployeeId: comp.ceoEmployeeId || null,
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('ไม่สามารถโหลดข้อมูลโครงสร้างองค์กรได้');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSuccess = (msg: string) => {
    toast.success(msg);
  };

  // Handlers for Division
  const handleOpenDivisionModal = (div?: Division) => {
    if (div) {
      setModalMode('edit');
      setDivisionForm({
        id: div.id,
        divisionCode: div.divisionCode,
        divisionName: div.divisionName,
        headEmployeeId: div.headEmployeeId,
        status: div.status,
      });
    } else {
      setModalMode('create');
      setDivisionForm({
        divisionCode: '',
        divisionName: '',
        headEmployeeId: undefined,
        status: 'ACTIVE',
      });
    }
    setModalOpen(true);
  };

  const handleSaveDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await organizationService.createDivision(divisionForm);
        showSuccess('เพิ่มข้อมูลฝ่ายสำเร็จ');
      } else if (divisionForm.id) {
        await organizationService.updateDivision(divisionForm.id, {
          divisionName: divisionForm.divisionName,
          headEmployeeId: divisionForm.headEmployeeId,
          status: divisionForm.status,
        });
        showSuccess('แก้ไขข้อมูลฝ่ายสำเร็จ');
      }
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
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
        headEmployeeId: dept.headEmployeeId,
        status: dept.status,
      });
    } else {
      setModalMode('create');
      setDeptForm({
        divisionId: divisions[0]?.id || 0,
        parentDepartmentId: undefined,
        departmentCode: '',
        departmentName: '',
        headEmployeeId: undefined,
        status: 'ACTIVE',
      });
    }
    setModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await organizationService.createDepartment(deptForm);
        showSuccess('เพิ่มข้อมูลแผนกสำเร็จ');
      } else if (deptForm.id) {
        await organizationService.updateDepartment(deptForm.id, {
          divisionId: deptForm.divisionId,
          parentDepartmentId: deptForm.parentDepartmentId,
          departmentName: deptForm.departmentName,
          headEmployeeId: deptForm.headEmployeeId,
          status: deptForm.status,
        });
        showSuccess('แก้ไขข้อมูลแผนกสำเร็จ');
      }
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
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
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // Benefit Handlers
  const handleOpenBenefitModal = (item?: BenefitItem) => {
    if (item) {
      setModalMode('edit');
      setBenefitForm({
        id: item.id,
        benefitCode: item.benefitCode,
        benefitName: item.benefitName,
        category: item.category || 'HEALTH',
        description: item.description || '',
        isStatutory: item.isStatutory,
        status: item.status,
      });
    } else {
      setModalMode('create');
      setBenefitForm({
        benefitCode: '',
        benefitName: '',
        category: 'HEALTH',
        description: '',
        isStatutory: false,
        status: 'ACTIVE',
      });
    }
    setModalOpen(true);
  };

  const handleSaveBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await benefitService.create({
          benefitCode: benefitForm.benefitCode.trim().toUpperCase(),
          benefitName: benefitForm.benefitName.trim(),
          category: benefitForm.category,
          description: benefitForm.description?.trim() || undefined,
          isStatutory: benefitForm.isStatutory,
          status: benefitForm.status,
        });
        showSuccess('เพิ่มสวัสดิการของบริษัทสำเร็จ');
      } else if (benefitForm.id) {
        await benefitService.update(benefitForm.id, {
          benefitName: benefitForm.benefitName.trim(),
          category: benefitForm.category,
          description: benefitForm.description?.trim() || undefined,
          isStatutory: benefitForm.isStatutory,
          status: benefitForm.status,
        });
        showSuccess('แก้ไขสวัสดิการสำเร็จ');
      }
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการบันทึกสวัสดิการ');
    }
  };

  // Employee Level Handlers
  const handleOpenLevelModal = (lvl?: EmployeeLevel) => {
    if (lvl) {
      setModalMode('edit');
      setLevelForm({
        id: lvl.id,
        levelCode: lvl.levelCode,
        levelName: lvl.levelName,
        levelRank: lvl.levelRank ?? undefined,
        status: lvl.status,
      });
    } else {
      setModalMode('create');
      setLevelForm({
        levelCode: '',
        levelName: '',
        levelRank: undefined,
        status: 'ACTIVE',
      });
    }
    setModalOpen(true);
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await organizationService.createLevel({
          levelCode: levelForm.levelCode.trim().toUpperCase(),
          levelName: levelForm.levelName.trim(),
          levelRank: levelForm.levelRank,
          status: levelForm.status,
        });
        showSuccess('เพิ่มระดับพนักงานสำเร็จ');
      } else if (levelForm.id) {
        await organizationService.updateLevel(levelForm.id, {
          levelName: levelForm.levelName.trim(),
          levelRank: levelForm.levelRank,
          status: levelForm.status,
        });
        showSuccess('แก้ไขระดับพนักงานสำเร็จ');
      }
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error.response?.data?.message || (err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก'));
    }
  };

  // Handler for Company Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ภาพต้องไม่เกิน 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCompanyForm((prev) => ({ ...prev, logoData: base64String }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handler for Company Profile Save
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await organizationService.updateCompany(companyForm);
      showSuccess('บันทึกข้อมูลบริษัทเรียบร้อยแล้ว');
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error.response?.data?.message || (err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก'));
    }
  };

  // Delete Handlers
  const handleConfirmDelete = (id: number, name: string, type: string) => {
    setItemToDelete({ id, name, type });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
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
      } else if (itemToDelete.type === 'benefit') {
        await benefitService.delete(itemToDelete.id);
        showSuccess(`ลบสิทธิประโยชน์ ${itemToDelete.name} สำเร็จ`);
      } else if (itemToDelete.type === 'level') {
        await organizationService.deleteLevel(itemToDelete.id);
        showSuccess(`ลบระดับพนักงาน ${itemToDelete.name} สำเร็จ`);
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error.response?.data?.message || (err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบ'));
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

  const filteredBenefits = benefits
    .filter((b) => (filterBenefitCategory === 'ALL' ? true : b.category === filterBenefitCategory))
    .filter((b) =>
      b.benefitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.benefitCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const filteredLevels = levels.filter((lvl) =>
    lvl.levelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lvl.levelCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. Sub-navigation Tabs */}
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
            onClick={() => { setActiveTab('benefits'); setSearchQuery(''); }}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'benefits'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Gift className="w-4 h-4" />
            สวัสดิการและสิทธิประโยชน์
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
                    <th className="py-3.5 px-4 whitespace-nowrap">หัวหน้าฝ่าย</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">จำนวนแผนกในสังกัด</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">วันที่สร้าง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">แก้ไขวันที่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลฝ่าย...
                      </td>
                    </tr>
                  ) : filteredDivisions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 whitespace-nowrap">
                        ไม่พบข้อมูลฝ่าย
                      </td>
                    </tr>
                  ) : (
                    filteredDivisions.map((div) => (
                      <tr key={div.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{div.divisionCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{div.divisionName}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{renderEmployeeCell(div.headEmployeeName)}</td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 whitespace-nowrap">
                            {div.departmentCount} แผนก
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatThaiDate(div.createdAt)}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatThaiDate(div.updatedAt)}</td>
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
                            {div.status === 'ACTIVE' ? 'ใช้งานอยู่' : 'ไม่ได้ใช้งาน'}
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
                    <th className="py-3.5 px-4 whitespace-nowrap">หัวหน้าแผนก</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สังกัดฝ่าย</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">จำนวนตำแหน่ง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">วันที่สร้าง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">แก้ไขวันที่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลแผนก...
                      </td>
                    </tr>
                  ) : filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 whitespace-nowrap">
                        ไม่พบข้อมูลแผนก
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{dept.departmentCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{dept.departmentName}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{renderEmployeeCell(dept.headEmployeeName)}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{dept.divisionName}</td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 whitespace-nowrap">
                            {dept.positionCount} ตำแหน่ง
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatThaiDate(dept.createdAt)}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatThaiDate(dept.updatedAt)}</td>
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
                            {dept.status === 'ACTIVE' ? 'ใช้งานอยู่' : 'ไม่ได้ใช้งาน'}
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
                    <th className="py-3.5 px-4 whitespace-nowrap">สังกัดฝ่าย</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ระดับพนักงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">วันที่สร้าง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">แก้ไขวันที่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลตำแหน่ง...
                      </td>
                    </tr>
                  ) : filteredPositions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 whitespace-nowrap">
                        ไม่พบข้อมูลตำแหน่ง
                      </td>
                    </tr>
                  ) : (
                    filteredPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{pos.positionCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{pos.positionName}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{pos.departmentName}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{pos.divisionName || '-'}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 whitespace-nowrap">
                            {pos.levelCode ? `${pos.levelCode} - ${pos.levelName}` : 'ไม่ระบุ'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatThaiDate(pos.createdAt)}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatThaiDate(pos.updatedAt)}</td>
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
                            {pos.status === 'ACTIVE' ? 'ใช้งานอยู่' : 'ไม่ได้ใช้งาน'}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative max-w-sm w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาระดับพนักงาน, รหัส หรือชื่อ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>
              </div>

              <button
                onClick={() => handleOpenLevelModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                เพิ่มระดับพนักงาน
              </button>
            </div>

            <p className="text-xs text-slate-500">
              ระดับขั้นพนักงาน ใช้สำหรับกำหนดสายบังคับบัญชาและสิทธิ์วงเงินอนุมัติเอกสารในระบบ
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสระดับ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อระดับพนักงาน</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ลำดับขั้น (Rank)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลระดับพนักงาน...
                      </td>
                    </tr>
                  ) : filteredLevels.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 whitespace-nowrap">
                        ไม่พบข้อมูลระดับพนักงาน
                      </td>
                    </tr>
                  ) : (
                    filteredLevels.map((lvl) => (
                      <tr key={lvl.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{lvl.levelCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{lvl.levelName}</td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">
                            {lvl.levelRank !== undefined && lvl.levelRank !== null ? `Rank ${lvl.levelRank}` : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                              lvl.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                lvl.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            {lvl.status === 'ACTIVE' ? 'ใช้งานอยู่' : 'ไม่ได้ใช้งาน'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenLevelModal(lvl)}
                              title="แก้ไข"
                              className="p-1.5 text-slate-500 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirmDelete(lvl.id, lvl.levelName, 'level')}
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

        {/* TAB 5: BENEFITS */}
        {activeTab === 'benefits' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative max-w-sm w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาสวัสดิการ, รหัส หรือรายละเอียด..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <select
                    value={filterBenefitCategory}
                    onChange={(e) => setFilterBenefitCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  >
                    <option value="ALL">ทุกหมวดหมู่สวัสดิการ</option>
                    {Object.entries(BENEFIT_CATEGORY_MAP).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => handleOpenBenefitModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                เพิ่มสวัสดิการใหม่
              </button>
            </div>

            <p className="text-xs text-slate-500">
              จัดการรายการสิทธิประโยชน์และสวัสดิการกลางขององค์กร สวัสดิการเหล่านี้จะถูกนำไปผูกกับประเภทสัญญาจ้างพนักงาน (Employee Types) ในหน้าจัดการประเภทพนักงาน
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสสวัสดิการ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อสวัสดิการ / สิทธิประโยชน์</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">หมวดหมู่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">รายละเอียด</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ประเภทสิทธิ์</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลสวัสดิการ...
                      </td>
                    </tr>
                  ) : filteredBenefits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 whitespace-nowrap">
                        ไม่พบข้อมูลสวัสดิการ
                      </td>
                    </tr>
                  ) : (
                    filteredBenefits.map((ben) => {
                      const catInfo = BENEFIT_CATEGORY_MAP[ben.category] || BENEFIT_CATEGORY_MAP.OTHER;
                      const CatIcon = catInfo.icon;
                      return (
                        <tr key={ben.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {ben.benefitCode}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                                <CatIcon className="w-3.5 h-3.5" />
                              </span>
                              <span>{ben.benefitName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {ben.description || '-'}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {ben.isStatutory ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                ⚖️ สิทธิตามกฎหมาย
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                ⭐ สวัสดิการบริษัท
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                                ben.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  ben.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              ></span>
                              {ben.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenBenefitModal(ben)}
                                title="แก้ไข"
                                className="p-1.5 text-slate-400 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleConfirmDelete(ben.id, ben.benefitName, 'benefit')}
                                title="ลบ"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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

        {/* TAB 6: COMPANY PROFILE */}
        {activeTab === 'company' && (
          <form onSubmit={handleSaveCompany} className="max-w-2xl space-y-5">
            {/* Logo Upload Section */}
            <div className="flex items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {companyForm.logoData ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={companyForm.logoData.startsWith('data:') ? companyForm.logoData : `data:image/png;base64,${companyForm.logoData}`}
                    alt="Company Logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Building className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="block text-xs font-semibold text-slate-800">ตราสัญลักษณ์ / โลโก้บริษัท (Logo)</label>
                <p className="text-[11px] text-slate-500">รองรับไฟล์ PNG, JPG หรือ SVG ขนาดไม่เกิน 2MB</p>
                <div className="flex items-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    อัปโหลดโลโก้
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {companyForm.logoData && (
                    <button
                      type="button"
                      onClick={() => setCompanyForm({ ...companyForm, logoData: null })}
                      className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      นำรูปออก
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสบริษัท (Company Code)</label>
                <input
                  type="text"
                  disabled
                  value={company?.companyCode || ''}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อบริษัท (Company Name) *</label>
                <input
                  type="text"
                  required
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ประธานเจ้าหน้าที่บริหาร / ผู้บริหารสูงสุด (CEO)
                </label>
                <EmployeeSelect
                  employees={employees}
                  value={companyForm.ceoEmployeeId || ''}
                  onChange={(empId) =>
                    setCompanyForm({
                      ...companyForm,
                      ceoEmployeeId: empId === '' ? null : Number(empId),
                    })
                  }
                  placeholder="เลือกพนักงาน หรือพิมพ์ค้นหา..."
                  emptyLabel="ไม่ระบุ CEO / ผู้บริหารสูงสุด"
                  required={false}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะบริษัท</label>
                <select
                  value={companyForm.status}
                  onChange={(e) => setCompanyForm({ ...companyForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ACTIVE">เปิดใช้งาน (ACTIVE)</option>
                  <option value="INACTIVE">ปิดใช้งาน (INACTIVE)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ (Phone)</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลติดต่อ (Email)</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่สำนักงานใหญ่ (Address)</label>
              <textarea
                rows={3}
                value={companyForm.address}
                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
              />
            </div>

            {/* Timestamps Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">วันที่สร้างระบบ: </span>
                <span className="font-semibold text-slate-800">{formatThaiDate(company?.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-500">แก้ไขล่าสุดเมื่อ: </span>
                <span className="font-semibold text-slate-800">{formatThaiDate(company?.updatedAt)}</span>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสฝ่าย (เช่น DIV_HR) *</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">หัวหน้าฝ่าย</label>
                <EmployeeSelect
                  employees={employees}
                  value={divisionForm.headEmployeeId || ''}
                  onChange={(empId) =>
                    setDivisionForm({
                      ...divisionForm,
                      headEmployeeId: empId === '' ? undefined : Number(empId),
                    })
                  }
                  placeholder="เลือกพนักงาน หรือพิมพ์ค้นหา..."
                  emptyLabel="ไม่ระบุหัวหน้าฝ่าย"
                  required={false}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                <select
                  value={divisionForm.status}
                  onChange={(e) => setDivisionForm({ ...divisionForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ACTIVE">ใช้งานอยู่</option>
                  <option value="INACTIVE">ไม่ได้ใช้งาน</option>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">หัวหน้าแผนก</label>
                <EmployeeSelect
                  employees={employees}
                  value={deptForm.headEmployeeId || ''}
                  onChange={(empId) =>
                    setDeptForm({
                      ...deptForm,
                      headEmployeeId: empId === '' ? undefined : Number(empId),
                    })
                  }
                  placeholder="เลือกพนักงาน หรือพิมพ์ค้นหา..."
                  emptyLabel="ไม่ระบุหัวหน้าแผนก"
                  required={false}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                <select
                  value={deptForm.status}
                  onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ACTIVE">ใช้งานอยู่</option>
                  <option value="INACTIVE">ไม่ได้ใช้งาน</option>
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

      {/* 7. Create / Edit Modal (Benefit) */}
      {modalOpen && activeTab === 'benefits' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#0B2046]" />
                {modalMode === 'create' ? 'เพิ่มสวัสดิการใหม่' : 'แก้ไขข้อมูลสวัสดิการ'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBenefit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสสวัสดิการ (เช่น DENTAL, MEAL_ALLOWANCE) *
                </label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={benefitForm.benefitCode}
                  onChange={(e) => setBenefitForm({ ...benefitForm, benefitCode: e.target.value })}
                  placeholder="เช่น SHUTTLE_BUS"
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-mono disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อสวัสดิการ / สิทธิประโยชน์ *
                </label>
                <input
                  type="text"
                  required
                  value={benefitForm.benefitName}
                  onChange={(e) => setBenefitForm({ ...benefitForm, benefitName: e.target.value })}
                  placeholder="เช่น รถรับส่งพนักงาน"
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่สวัสดิการ *</label>
                <select
                  value={benefitForm.category}
                  onChange={(e) => setBenefitForm({ ...benefitForm, category: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  {Object.entries(BENEFIT_CATEGORY_MAP).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รายละเอียดเพิ่มเติม</label>
                <textarea
                  rows={3}
                  value={benefitForm.description || ''}
                  onChange={(e) => setBenefitForm({ ...benefitForm, description: e.target.value })}
                  placeholder="รายละเอียดเงื่อนไขหรือข้อมูลของสวัสดิการ..."
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <input
                  type="checkbox"
                  id="isStatutory"
                  checked={benefitForm.isStatutory}
                  onChange={(e) => setBenefitForm({ ...benefitForm, isStatutory: e.target.checked })}
                  className="w-4 h-4 rounded text-[#0B2046] focus:ring-[#0B2046]"
                />
                <label htmlFor="isStatutory" className="text-xs text-slate-700 cursor-pointer select-none">
                  เป็นสิทธิตามกฎหมายแรงงานบังคับ (Statutory Benefit)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                <select
                  value={benefitForm.status}
                  onChange={(e) => setBenefitForm({ ...benefitForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ACTIVE">เปิดใช้งาน</option>
                  <option value="INACTIVE">ปิดใช้งาน</option>
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

      {/* 8. Create / Edit Modal (Employee Level) */}
      {modalOpen && activeTab === 'levels' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {modalMode === 'create' ? 'เพิ่มระดับพนักงานใหม่' : 'แก้ไขข้อมูลระดับพนักงาน'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLevel} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสระดับพนักงาน (เช่น L1, L2, EXEC_1) *
                </label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={levelForm.levelCode}
                  onChange={(e) => setLevelForm({ ...levelForm, levelCode: e.target.value.toUpperCase() })}
                  placeholder="เช่น L1, L2"
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-mono disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อระดับพนักงาน *
                </label>
                <input
                  type="text"
                  required
                  value={levelForm.levelName}
                  onChange={(e) => setLevelForm({ ...levelForm, levelName: e.target.value })}
                  placeholder="เช่น พนักงานปฏิบัติการ, ผู้จัดการฝ่าย"
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ลำดับขั้น (Rank)
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={levelForm.levelRank ?? ''}
                  onChange={(e) =>
                    setLevelForm({
                      ...levelForm,
                      levelRank: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="เช่น 1 (ระดับเริ่มต้น) ถึง 10 (ระดับผู้บริหาร)"
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
                <p className="text-[11px] text-slate-400 mt-1">ใช้กำหนดลำดับขั้นในการแสดงผลและสายการบังคับบัญชา</p>
              </div>


              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                <select
                  value={levelForm.status}
                  onChange={(e) => setLevelForm({ ...levelForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ACTIVE">ใช้งานอยู่</option>
                  <option value="INACTIVE">ไม่ได้ใช้งาน</option>
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

      {/* 9. Delete Confirmation Modal */}
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
