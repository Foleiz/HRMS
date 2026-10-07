'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  PowerOff,
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
  Landmark,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { organizationService } from '@/services/organizationService';
import { benefitService } from '@/services/benefitService';
import { PayCodeSelect } from '@/components/benefits/PayCodeSelect';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { employeeService } from '@/services/employeeService';
import { bankService } from '@/services/bankService';
import { companyBankAccountService } from '@/services/companyBankAccountService';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/common/AccessDenied';
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
  CompanyBankAccount,
  CreateCompanyBankAccountRequest,
  UpdateCompanyBankAccountRequest,
} from '@/types/organization';
import { Bank } from '@/types/api';
import { BenefitItem, CreateBenefitPayload, UpdateBenefitPayload } from '@/types/benefit';
import { Employee } from '@/types/employee';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';
import OrgChartView from '@/components/organization/OrgChartView';

type TabType = 'divisions' | 'departments' | 'positions' | 'levels' | 'benefits' | 'company' | 'bank-accounts' | 'orgchart';

const BENEFIT_CATEGORY_MAP: Record<string, { label: string; color: string; icon: any }> = {
  STATUTORY: { label: 'กฎหมายแรงงาน', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Shield },
  HEALTH: { label: 'สุขภาพ & ประกัน', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: HeartPulse },
  ALLOWANCE: { label: 'เบี้ยเลี้ยง & ช่วยเหลือ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Coins },
  WELLNESS: { label: 'กิจกรรม & สันทนาการ', color: 'bg-pink-50 text-pink-700 border-pink-200', icon: Smile },
  FINANCIAL: { label: 'การเงิน & กองทุน', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Coins },
  OTHER: { label: 'ทั่วไป / อื่นๆ', color: 'bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200', icon: HelpCircle },
};

export default function OrganizationPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();
  const { hasPermission, hasRole } = useAuth();

  const canViewStruct = hasPermission('ORG_STRUCT_VIEW') || hasPermission('ORG_VIEW') || hasRole('ADMIN');
  const canViewPos = hasPermission('ORG_POS_VIEW') || hasPermission('ORG_VIEW') || hasRole('ADMIN');
  const canViewBenefits = hasPermission('ORG_BENEFIT_VIEW') || hasPermission('ORG_VIEW') || hasRole('ADMIN');
  const canViewCompany = hasPermission('ORG_COMP_VIEW') || hasPermission('ORG_VIEW') || hasRole('ADMIN');
  const canViewAnyOrg = canViewStruct || canViewPos || canViewBenefits || canViewCompany;

  const defaultTab: TabType = canViewStruct
    ? 'divisions'
    : canViewPos
    ? 'positions'
    : canViewBenefits
    ? 'benefits'
    : 'company';

  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivisionId, setFilterDivisionId] = useState<string>('ALL');
  const [filterDeptId, setFilterDeptId] = useState<string>('ALL');
  const [filterBenefitCategory, setFilterBenefitCategory] = useState<string>('ALL');

  const tabTitles: Record<TabType, string> = {
    divisions: 'จัดการฝ่าย',
    departments: 'จัดการแผนก',
    positions: 'จัดการตำแหน่งงาน',
    levels: 'ระดับพนักงาน',
    benefits: 'สวัสดิการและสิทธิประโยชน์',
    company: 'ข้อมูลบริษัท',
    'bank-accounts': 'บัญชีธนาคารบริษัท',
    orgchart: 'แผนผังองค์กร',
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab') as TabType;
      if (tabParam && ['divisions', 'departments', 'positions', 'levels', 'benefits', 'company', 'bank-accounts', 'orgchart'].includes(tabParam)) {
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
  // หัวหน้าฝ่าย/แผนก — ใช้หาผู้อนุมัติแบบ "หัวหน้าของผู้ยื่น" ในสายการอนุมัติ
  const renderHeadCell = (name?: string | null) =>
    name ? (
      renderEmployeeCell(name)
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap dark:bg-amber-900/20 dark:text-amber-400">
        <AlertTriangle className="w-3 h-3" /> ยังไม่ได้ตั้งหัวหน้า
      </span>
    );

  const renderEmployeeCell = (name?: string | null) => {
    if (!name) return <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">-</span>;
    const initial = name.trim().charAt(0);
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0B2046] flex items-center justify-center text-[10px] font-bold ring-1 ring-blue-200 shrink-0">
          {initial}
        </div>
        <span className="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">{name}</span>
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
    isDocumentRequired: false,
    defaultCoverageAmount: 0,
    defaultFrequency: 'YEARLY',
    payoutType: 'REIMBURSEMENT',
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

  // Company Bank Account states
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankAccountModalOpen, setBankAccountModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<CompanyBankAccount | null>(null);
  const [bankAccountForm, setBankAccountForm] = useState<{
    id?: number;
    bankId: number;
    accountNumber: string;
    accountName: string;
    isPrimaryPayrollAccount: boolean;
    status: string;
  }>({
    bankId: 0,
    accountNumber: '',
    accountName: '',
    isPrimaryPayrollAccount: false,
    status: 'ACTIVE',
  });
  const [savingBankAccount, setSavingBankAccount] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [divs, depts, pos, lvls, comp, ben, emps, bAccounts, bList] = await Promise.all([
        organizationService.getDivisions().catch(() => []),
        organizationService.getDepartments().catch(() => []),
        organizationService.getPositions().catch(() => []),
        organizationService.getLevels().catch(() => []),
        organizationService.getCompany().catch(() => null),
        benefitService.getAll().catch(() => []),
        employeeService.getAll().catch(() => []),
        companyBankAccountService.getAll().catch(() => []),
        bankService.getAll().catch(() => []),
      ]);
      setDivisions(divs || []);
      setDepartments(depts || []);
      setPositions(pos || []);
      setLevels(lvls || []);
      setCompany(comp || null);
      setBenefits(ben || []);
      setEmployees(emps || []);
      setBankAccounts(bAccounts || []);
      setBanks(bList || []);
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
        headcountPlan: pos.headcountPlan ?? null,
      });
    } else {
      setModalMode('create');
      setPosForm({
        departmentId: departments[0]?.id || 0,
        employeeLevelId: levels[0]?.id,
        positionCode: '',
        positionName: '',
        status: 'ACTIVE',
        headcountPlan: null,
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
          headcountPlan: posForm.headcountPlan ?? null,
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
        isDocumentRequired: item.isDocumentRequired ?? false,
        defaultCoverageAmount: item.defaultCoverageAmount ?? 0,
        defaultFrequency: item.defaultFrequency || 'YEARLY',
        payoutType: item.payoutType || 'REIMBURSEMENT',
        status: item.status,
        payrollItemId: item.payrollItemId ?? undefined,
      });
    } else {
      setModalMode('create');
      setBenefitForm({
        benefitCode: '',
        benefitName: '',
        category: 'HEALTH',
        description: '',
        isStatutory: false,
        isDocumentRequired: false,
        defaultCoverageAmount: 0,
        defaultFrequency: 'YEARLY',
        payoutType: 'REIMBURSEMENT',
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
          isDocumentRequired: benefitForm.isDocumentRequired,
          defaultCoverageAmount: Number(benefitForm.defaultCoverageAmount) || 0,
          defaultFrequency: benefitForm.defaultFrequency,
          payoutType: benefitForm.payoutType,
          status: benefitForm.status,
          payrollItemId: benefitForm.payrollItemId,
        });
        showSuccess('เพิ่มสวัสดิการของบริษัทสำเร็จ');
      } else if (benefitForm.id) {
        await benefitService.update(benefitForm.id, {
          benefitName: benefitForm.benefitName.trim(),
          category: benefitForm.category,
          description: benefitForm.description?.trim() || undefined,
          isStatutory: benefitForm.isStatutory,
          isDocumentRequired: benefitForm.isDocumentRequired,
          defaultCoverageAmount: Number(benefitForm.defaultCoverageAmount) || 0,
          defaultFrequency: benefitForm.defaultFrequency,
          payoutType: benefitForm.payoutType,
          status: benefitForm.status,
          payrollItemId: benefitForm.payrollItemId,
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

  // Handlers for Company Bank Accounts
  const handleOpenBankAccountModal = (account?: CompanyBankAccount) => {
    if (account) {
      setEditingBankAccount(account);
      setBankAccountForm({
        id: account.id,
        bankId: account.bankId,
        accountNumber: account.accountNumber,
        accountName: account.accountName || '',
        isPrimaryPayrollAccount: account.isPrimaryPayrollAccount,
        status: account.status,
      });
    } else {
      setEditingBankAccount(null);
      const defaultBankId = banks.length > 0 ? banks[0].id : 0;
      setBankAccountForm({
        bankId: defaultBankId,
        accountNumber: '',
        accountName: company?.companyName || '',
        isPrimaryPayrollAccount: bankAccounts.length === 0,
        status: 'ACTIVE',
      });
    }
    setBankAccountModalOpen(true);
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountForm.bankId || bankAccountForm.bankId === 0) {
      toast.error('กรุณาเลือกธนาคาร');
      return;
    }
    if (!bankAccountForm.accountNumber.trim()) {
      toast.error('กรุณาระบุเลขที่บัญชี');
      return;
    }

    setSavingBankAccount(true);
    try {
      if (editingBankAccount) {
        await companyBankAccountService.update(editingBankAccount.id, {
          bankId: Number(bankAccountForm.bankId),
          accountNumber: bankAccountForm.accountNumber.trim(),
          accountName: bankAccountForm.accountName.trim() || undefined,
          isPrimaryPayrollAccount: bankAccountForm.isPrimaryPayrollAccount,
          status: bankAccountForm.status,
        });
        showSuccess('อัปเดตข้อมูลบัญชีธนาคารสำเร็จ');
      } else {
        await companyBankAccountService.create({
          bankId: Number(bankAccountForm.bankId),
          accountNumber: bankAccountForm.accountNumber.trim(),
          accountName: bankAccountForm.accountName.trim() || undefined,
          isPrimaryPayrollAccount: bankAccountForm.isPrimaryPayrollAccount,
          status: bankAccountForm.status,
        });
        showSuccess('เพิ่มบัญชีธนาคารบริษัทสำเร็จ');
      }
      setBankAccountModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error.response?.data?.message || (err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก'));
    } finally {
      setSavingBankAccount(false);
    }
  };

  const handleSetPrimaryBankAccount = async (account: CompanyBankAccount) => {
    try {
      await companyBankAccountService.setPrimary(account.id);
      showSuccess(`ตั้ง ${account.bankName} (${account.accountNumber}) เป็นบัญชีจ่ายเงินเดือนหลักสำเร็จ`);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error.response?.data?.message || (err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'));
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
      } else if (itemToDelete.type === 'bank-account') {
        await companyBankAccountService.delete(itemToDelete.id);
        showSuccess(`ปิดใช้งานบัญชีธนาคาร ${itemToDelete.name} สำเร็จ`);
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
  const filteredBankAccounts = bankAccounts.filter((ba) =>
    ba.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ba.bankCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ba.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ba.accountName && ba.accountName.toLowerCase().includes(searchQuery.toLowerCase()))
  );
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

  if (!canViewAnyOrg) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์เข้าถึงโครงสร้างองค์กร"
        message="ขออภัย บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงหรือดูข้อมูลโครงสร้างองค์กร กรุณาติดต่อผู้ดูแลระบบ"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub Navigation Bar - Standardized to Employee Module */}
      <div className="border-b border-slate-200 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl dark:border-slate-700 dark:bg-slate-900">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {canViewStruct && (
            <button
              type="button"
              onClick={() => { setActiveTab('divisions'); setSearchQuery(''); }}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'divisions'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              จัดการฝ่าย
            </button>
          )}

          {canViewStruct && (
            <button
              type="button"
              onClick={() => { setActiveTab('departments'); setSearchQuery(''); }}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'departments'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              จัดการแผนก
            </button>
          )}

          {canViewPos && (
            <button
              type="button"
              onClick={() => { setActiveTab('positions'); setSearchQuery(''); }}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'positions'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              จัดการตำแหน่ง
            </button>
          )}

          {canViewPos && (
            <button
              type="button"
              onClick={() => { setActiveTab('levels'); setSearchQuery(''); }}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'levels'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              ระดับพนักงาน
            </button>
          )}

          {canViewBenefits && (
            <button
              type="button"
              onClick={() => { setActiveTab('benefits'); setSearchQuery(''); }}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'benefits'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              สวัสดิการและสิทธิประโยชน์
            </button>
          )}

          {canViewCompany && (
            <button
              type="button"
              onClick={() => { setActiveTab('company'); setSearchQuery(''); }}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'company'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              ข้อมูลบริษัท
            </button>
          )}

          {canViewCompany && (
            <button
              type="button"
              onClick={() => { setActiveTab('bank-accounts'); setSearchQuery(''); }}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'bank-accounts'
                  ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
              }`}
            >
              บัญชีธนาคารบริษัท
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('orgchart')}
            className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
              activeTab === 'orgchart'
                ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
            }`}
          >
            แผนผังองค์กร
          </button>
        </nav>
      </div>

      {/* 4. Tab Content Panels (แท็บแผนผังองค์กรมีกรอบของตัวเอง จึงซ่อนกรอบนี้) */}
      <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm ${activeTab === 'orgchart' ? 'hidden' : ''}`}>
        {/* TAB 1: DIVISIONS */}
        {activeTab === 'divisions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อฝ่าย หรือรหัสฝ่าย..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:placeholder:text-slate-500 dark:text-slate-400 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
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
              <table className="w-full min-w-[850px] text-left text-xs border-collapse whitespace-nowrap">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr className="whitespace-nowrap">
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
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลฝ่าย...
                      </td>
                    </tr>
                  ) : filteredDivisions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        ไม่พบข้อมูลฝ่าย
                      </td>
                    </tr>
                  ) : (
                    filteredDivisions.map((div) => (
                      <tr key={div.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap dark:text-slate-100">{div.divisionCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">{div.divisionName}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{renderHeadCell(div.headEmployeeName)}</td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 whitespace-nowrap dark:bg-indigo-900/20 dark:text-indigo-400">
                            {div.departmentCount} แผนก
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">{formatThaiDate(div.createdAt)}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">{formatThaiDate(div.updatedAt)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                              div.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600 dark:text-slate-400'
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
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirmDelete(div.id, div.divisionName, 'division')}
                              title="ลบ"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:text-slate-500 dark:text-slate-400"
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
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อแผนก หรือรหัสแผนก..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:placeholder:text-slate-500 dark:text-slate-400 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                  />
                </div>

                <CustomSelect
                  value={filterDivisionId}
                  onChange={(val) => setFilterDivisionId(val)}
                  placeholder="ทุกฝ่าย"
                  options={[
                    { value: 'ALL', label: 'ทุกฝ่าย' },
                    ...divisions.map((d) => ({ value: String(d.id), label: d.divisionName })),
                  ]}
                />
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
              <table className="w-full min-w-[900px] text-left text-xs border-collapse whitespace-nowrap">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr className="whitespace-nowrap">
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
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลแผนก...
                      </td>
                    </tr>
                  ) : filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        ไม่พบข้อมูลแผนก
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap dark:text-slate-100">{dept.departmentCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">{dept.departmentName}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{renderHeadCell(dept.headEmployeeName)}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">{dept.divisionName}</td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 whitespace-nowrap dark:bg-blue-900/20 dark:text-blue-400">
                            {dept.positionCount} ตำแหน่ง
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">{formatThaiDate(dept.createdAt)}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">{formatThaiDate(dept.updatedAt)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                              dept.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600 dark:text-slate-400'
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
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirmDelete(dept.id, dept.departmentName, 'department')}
                              title="ลบ"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:text-slate-500 dark:text-slate-400"
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
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อตำแหน่ง หรือรหัสตำแหน่ง..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:placeholder:text-slate-500 dark:text-slate-400 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                  />
                </div>

                <CustomSelect
                  value={filterDeptId}
                  onChange={(val) => setFilterDeptId(val)}
                  placeholder="ทุกแผนก"
                  className="min-w-[150px]"
                  options={[
                    { value: 'ALL', label: 'ทุกแผนก' },
                    ...departments.map((d) => ({ value: String(d.id), label: d.departmentName })),
                  ]}
                />
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
              <table className="w-full min-w-[950px] text-left text-xs border-collapse whitespace-nowrap">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr className="whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสตำแหน่ง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อตำแหน่งงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สังกัดแผนก</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สังกัดฝ่าย</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ระดับพนักงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-center">อัตรากำลัง (มีคน/อัตรา)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">วันที่สร้าง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">แก้ไขวันที่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลตำแหน่ง...
                      </td>
                    </tr>
                  ) : filteredPositions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        ไม่พบข้อมูลตำแหน่ง
                      </td>
                    </tr>
                  ) : (
                    filteredPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap dark:text-slate-100">{pos.positionCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">{pos.positionName}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">{pos.departmentName}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">{pos.divisionName || '-'}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 whitespace-nowrap dark:bg-purple-900/20 dark:text-purple-400">
                            {pos.levelCode ? `${pos.levelCode} - ${pos.levelName}` : 'ไม่ระบุ'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          {pos.headcountPlan != null ? (
                            <span
                              className={`font-mono font-semibold ${
                                (pos.filledCount ?? 0) > pos.headcountPlan
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : (pos.vacantCount ?? 0) === 0
                                    ? 'text-slate-600 dark:text-slate-300'
                                    : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                              title={(pos.filledCount ?? 0) > pos.headcountPlan ? 'เกินอัตรากำลัง' : `ว่าง ${pos.vacantCount ?? 0} อัตรา`}
                            >
                              {pos.filledCount ?? 0}/{pos.headcountPlan}
                            </span>
                          ) : (
                            <span className="text-slate-400">{pos.filledCount ?? 0} คน · ไม่กำหนด</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">{formatThaiDate(pos.createdAt)}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">{formatThaiDate(pos.updatedAt)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                              pos.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600 dark:text-slate-400'
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
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirmDelete(pos.id, pos.positionName, 'position')}
                              title="ลบ"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:text-slate-500 dark:text-slate-400"
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
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาระดับพนักงาน, รหัส หรือชื่อ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:placeholder:text-slate-500 dark:text-slate-400 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
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

            <p className="text-xs text-slate-500 dark:text-slate-400">
              ระดับพนักงานสำหรับจัดเกรดและโครงสร้างตำแหน่งในองค์กร
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[500px] text-left text-xs border-collapse whitespace-nowrap">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr className="whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสระดับ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อระดับพนักงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลระดับพนักงาน...
                      </td>
                    </tr>
                  ) : filteredLevels.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        ไม่พบข้อมูลระดับพนักงาน
                      </td>
                    </tr>
                  ) : (
                    filteredLevels.map((lvl) => (
                      <tr key={lvl.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap dark:text-slate-100">{lvl.levelCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">{lvl.levelName}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                              lvl.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600 dark:text-slate-400'
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
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirmDelete(lvl.id, lvl.levelName, 'level')}
                              title="ลบ"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:text-slate-500 dark:text-slate-400"
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
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาสวัสดิการ, รหัส หรือรายละเอียด..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:placeholder:text-slate-500 dark:text-slate-400 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                  />
                </div>

                <CustomSelect
                  value={filterBenefitCategory}
                  onChange={(val) => setFilterBenefitCategory(val)}
                  placeholder="ทุกหมวดหมู่สวัสดิการ"
                  className="min-w-[170px]"
                  options={[
                    { value: 'ALL', label: 'ทุกหมวดหมู่สวัสดิการ' },
                    ...Object.entries(BENEFIT_CATEGORY_MAP).map(([key, item]) => ({
                      value: key,
                      label: item.label,
                    })),
                  ]}
                />
              </div>

              <button
                onClick={() => handleOpenBenefitModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                เพิ่มสวัสดิการใหม่
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              จัดการรายการสิทธิประโยชน์และสวัสดิการกลางขององค์กร สวัสดิการเหล่านี้จะถูกนำไปผูกกับประเภทสัญญาจ้างพนักงาน (Employee Types) ในหน้าจัดการประเภทพนักงาน
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[850px] text-left text-xs border-collapse whitespace-nowrap">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr className="whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสสวัสดิการ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อสวัสดิการ / สิทธิประโยชน์</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">หมวดหมู่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">โควตาวงเงินเริ่มต้น & รูปแบบ</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ประเภทสิทธิ์</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลสวัสดิการ...
                      </td>
                    </tr>
                  ) : filteredBenefits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        ไม่พบข้อมูลสวัสดิการ
                      </td>
                    </tr>
                  ) : (
                    filteredBenefits.map((ben) => {
                      const catInfo = BENEFIT_CATEGORY_MAP[ben.category] || BENEFIT_CATEGORY_MAP.OTHER;
                      const CatIcon = catInfo.icon;
                      const freqLabel = ben.defaultFrequency === 'MONTHLY' ? 'ด.' : ben.defaultFrequency === 'YEARLY' ? 'ปี' : ben.defaultFrequency === 'DAILY' ? 'วัน' : 'ครั้ง';
                      const payoutBadge = ben.payoutType === 'PAYROLL' 
                        ? { label: 'จ่ายในเงินเดือน', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' }
                        : ben.payoutType === 'IN_KIND'
                        ? { label: 'ตามระเบียบบริษัท', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' }
                        : { label: 'ยื่นเบิกตามบิล', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };

                      return (
                        <tr key={ben.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap dark:text-slate-100">
                            {ben.benefitCode}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600 dark:text-slate-400 dark:bg-slate-700 dark:text-slate-300">
                                <CatIcon className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <div>{ben.benefitName}</div>
                                {ben.description && (
                                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal truncate max-w-xs">{ben.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {ben.defaultCoverageAmount > 0 
                                  ? `${Number(ben.defaultCoverageAmount).toLocaleString()} บ./${freqLabel}`
                                  : 'ตามสิทธิ์'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${payoutBadge.cls}`}>
                                {payoutBadge.label}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              {ben.isStatutory ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">
                                  ⚖️ สิทธิตามกฎหมาย
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400">
                                  ⭐ สวัสดิการบริษัท
                                </span>
                              )}
                              {ben.isDocumentRequired && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300">
                                  📎 บังคับแนบเอกสาร
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                                ben.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600 dark:text-slate-400'
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
                                className="p-1.5 text-slate-400 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-500 dark:text-slate-400 dark:hover:bg-slate-800"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleConfirmDelete(ben.id, ben.benefitName, 'benefit')}
                                title="ลบ"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:text-slate-500 dark:text-slate-400"
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
            <div className="flex items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 dark:border-slate-600 dark:bg-slate-900">
                {companyForm.logoData ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={companyForm.logoData.startsWith('data:') ? companyForm.logoData : `data:image/png;base64,${companyForm.logoData}`}
                    alt="Company Logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Building className="w-8 h-8 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">ตราสัญลักษณ์ / โลโก้บริษัท (Logo)</label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">รองรับไฟล์ PNG, JPG หรือ SVG ขนาดไม่เกิน 2MB</p>
                <div className="flex items-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-800/40 dark:text-slate-300">
                    <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">รหัสบริษัท (Company Code)</label>
                <input
                  type="text"
                  disabled
                  value={company?.companyCode || ''}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 dark:text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-300 dark:border-slate-700 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ชื่อบริษัท (Company Name) *</label>
                <input
                  type="text"
                  required
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">สถานะบริษัท</label>
                <CustomSelect
                  value={companyForm.status}
                  onChange={(e) => setCompanyForm({ ...companyForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20"
                >
                  <option value="ACTIVE">เปิดใช้งาน</option>
                  <option value="INACTIVE">ปิดใช้งาน</option>
                </CustomSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">เบอร์โทรศัพท์ (Phone)</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">อีเมลติดต่อ (Email)</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ที่อยู่สำนักงานใหญ่ (Address)</label>
              <textarea
                rows={3}
                value={companyForm.address}
                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
              />
            </div>

            {/* Timestamps Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
              <div>
                <span className="text-slate-500 dark:text-slate-400">วันที่สร้างระบบ: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatThaiDate(company?.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">แก้ไขล่าสุดเมื่อ: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatThaiDate(company?.updatedAt)}</span>
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

        {/* TAB: COMPANY BANK ACCOUNTS (Payroll) */}
        {activeTab === 'bank-accounts' && (
          <div className="space-y-6">
            {/* Header / Actions Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-700/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#0B2046]">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight dark:text-slate-100">บัญชีธนาคารบริษัท (สำหรับจ่ายเงินเดือน)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 dark:text-slate-400">
                      จัดการบัญชีธนาคารของบริษัทสำหรับโอนจ่ายเงินเดือนพนักงาน (Payroll Direct Credit) และกำหนดบัญชีหลัก
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenBankAccountModal()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                เพิ่มบัญชีธนาคาร
              </button>
            </div>

            {/* Search Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยชื่อธนาคาร, รหัสธนาคาร, เลขที่บัญชี หรือชื่อบัญชี..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>
            </div>

            {/* Bank Accounts Table */}
            {filteredBankAccounts.length === 0 ? (
              <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 dark:border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:bg-slate-800 dark:text-slate-500 dark:text-slate-400">
                  <Landmark className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 dark:text-slate-200">
                  {searchQuery ? 'ไม่พบข้อมูลบัญชีธนาคารที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลบัญชีธนาคารบริษัท'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 dark:text-slate-400">
                  {searchQuery ? 'ลองค้นหาด้วยคำอื่น หรือล้างคำค้นหา' : 'เพิ่มบัญชีธนาคารของบริษัทเพื่อใช้เป็นบัญชีต้นทางในการโอนจ่ายเงินเดือนพนักงาน'}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleOpenBankAccountModal()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2046] text-white text-xs font-semibold shadow-sm hover:bg-[#081836] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มบัญชีแรก
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full min-w-[700px] text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                      <th className="py-3 px-4">ธนาคาร</th>
                      <th className="py-3 px-4">เลขที่บัญชี</th>
                      <th className="py-3 px-4">ชื่อบัญชี</th>
                      <th className="py-3 px-4 text-center">บัญชีจ่ายเงินเดือน</th>
                      <th className="py-3 px-4 text-center">สถานะ</th>
                      <th className="py-3 px-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                    {filteredBankAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B2046] shrink-0 font-bold text-xs">
                              {acc.bankCode || 'BK'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug dark:text-slate-100">{acc.bankName}</div>
                              <div className="text-[11px] text-slate-400 font-mono dark:text-slate-500 dark:text-slate-400">รหัสธนาคาร: {acc.bankCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200 dark:text-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
                            {acc.accountNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium dark:text-slate-300">
                          {acc.accountName || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {acc.isPrimaryPayrollAccount ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs dark:bg-emerald-900/20 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              บัญชีหลัก (Payroll Primary)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryBankAccount(acc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer dark:text-slate-400 dark:border-slate-700"
                              title="คลิกเพื่อตั้งบัญชีนี้เป็นบัญชีจ่ายเงินเดือนหลัก"
                            >
                              ตั้งเป็นบัญชีหลัก
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                              acc.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 dark:text-slate-400 border-slate-200'
                            }`}
                          >
                            {acc.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenBankAccountModal(acc)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer dark:text-slate-400"
                              title="แก้ไขข้อมูลบัญชี"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {/* บัญชีหลักปิดใช้งานไม่ได้ (ต้องตั้งบัญชีอื่นเป็นบัญชีหลักก่อน) / บัญชีที่ปิดแล้วเปิดใหม่ได้ผ่านปุ่มแก้ไข */}
                            {acc.isPrimaryPayrollAccount ? (
                              <span
                                className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                title="บัญชีหลักปิดใช้งานไม่ได้ — ตั้งบัญชีอื่นเป็นบัญชีหลักก่อน"
                              >
                                <PowerOff className="w-3.5 h-3.5" />
                              </span>
                            ) : acc.status === 'ACTIVE' ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmDelete(acc.id, `${acc.bankName} (${acc.accountNumber})`, 'bank-account')}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="ปิดใช้งานบัญชี"
                              >
                                <PowerOff className="w-3.5 h-3.5" />
                              </button>
                            ) : null}
                          </div>
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

      {/* 5. Create / Edit Modal (Division) */}
      {modalOpen && activeTab === 'divisions' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm dark:text-slate-100">
                {modalMode === 'create' ? 'เพิ่มฝ่ายใหม่' : 'แก้ไขข้อมูลฝ่าย'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDivision} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ชื่อฝ่าย / สายงาน *</label>
                <input
                  type="text"
                  required
                  value={divisionForm.divisionName}
                  onChange={(e) => setDivisionForm({ ...divisionForm, divisionName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">หัวหน้าฝ่าย</label>
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">สถานะ</label>
                <CustomSelect
                  value={divisionForm.status}
                  onChange={(e) => setDivisionForm({ ...divisionForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20"
                >
                  <option value="ACTIVE">ใช้งานอยู่</option>
                  <option value="INACTIVE">ไม่ได้ใช้งาน</option>
                </CustomSelect>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-medium dark:hover:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm dark:text-slate-100">
                {modalMode === 'create' ? 'เพิ่มแผนกใหม่' : 'แก้ไขข้อมูลแผนก'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">สังกัดฝ่าย *</label>
                <CustomSelect
                  required
                  value={deptForm.divisionId}
                  onChange={(e) => setDeptForm({ ...deptForm, divisionId: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20"
                >
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.divisionName}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ชื่อแผนก *</label>
                <input
                  type="text"
                  required
                  value={deptForm.departmentName}
                  onChange={(e) => setDeptForm({ ...deptForm, departmentName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">หัวหน้าแผนก</label>
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">สถานะ</label>
                <CustomSelect
                  value={deptForm.status}
                  onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20"
                >
                  <option value="ACTIVE">ใช้งานอยู่</option>
                  <option value="INACTIVE">ไม่ได้ใช้งาน</option>
                </CustomSelect>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-medium dark:hover:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm dark:text-slate-100">
                {modalMode === 'create' ? 'เพิ่มตำแหน่งใหม่' : 'แก้ไขข้อมูลตำแหน่ง'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePos} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">สังกัดแผนก *</label>
                <CustomSelect
                  required
                  value={posForm.departmentId}
                  onChange={(e) => setPosForm({ ...posForm, departmentId: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentName} ({d.divisionName})
                    </option>
                  ))}
                </CustomSelect>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ระดับตำแหน่ง</label>
                <CustomSelect
                  value={posForm.employeeLevelId || ''}
                  onChange={(e) => setPosForm({ ...posForm, employeeLevelId: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20"
                >
                  <option value="">-- ไม่ระบุระดับ --</option>
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.levelCode} - {lvl.levelName}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ชื่อตำแหน่งงาน *</label>
                <input
                  type="text"
                  required
                  value={posForm.positionName}
                  onChange={(e) => setPosForm({ ...posForm, positionName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">อัตรากำลัง (คน)</label>
                <input
                  type="number"
                  min={0}
                  value={posForm.headcountPlan ?? ''}
                  onChange={(e) =>
                    setPosForm({ ...posForm, headcountPlan: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })
                  }
                  placeholder="เว้นว่าง = ไม่กำหนด"
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">สถานะ</label>
                <CustomSelect
                  value={posForm.status}
                  onChange={(e) => setPosForm({ ...posForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20"
                >
                  <option value="ACTIVE">ทำงานอยู่</option>
                  <option value="INACTIVE">ไม่ได้ทำงาน</option>
                </CustomSelect>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-medium dark:hover:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 shrink-0 bg-slate-50/70 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#0B2046] dark:text-cyan-400" />
                {modalMode === 'create' ? 'เพิ่มสวัสดิการใหม่' : 'แก้ไขข้อมูลสวัสดิการ'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveBenefit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อสวัสดิการ / สิทธิประโยชน์ *
                  </label>
                  <input
                    type="text"
                    required
                    value={benefitForm.benefitName}
                    onChange={(e) => setBenefitForm({ ...benefitForm, benefitName: e.target.value })}
                    placeholder="เช่น รถรับส่งพนักงาน"
                    className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">หมวดหมู่สวัสดิการ *</label>
                  <CustomSelect
                    value={benefitForm.category}
                    onChange={(e) => setBenefitForm({ ...benefitForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-blue-500/20"
                  >
                    {Object.entries(BENEFIT_CATEGORY_MAP).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </CustomSelect>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">รายละเอียดเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    value={benefitForm.description || ''}
                    onChange={(e) => setBenefitForm({ ...benefitForm, description: e.target.value })}
                    placeholder="รายละเอียดเงื่อนไขหรือข้อมูลของสวัสดิการ..."
                    className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-blue-500/20 dark:focus:border-blue-500 resize-none"
                  />
                </div>

                {/* วงเงินและการเบิกจ่าย (Benefit Quota & Payout Policy) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    กำหนดโควตาวงเงินและรูปแบบการใช้สิทธิ์
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      รูปแบบการให้สิทธิ์ / เบิกจ่าย *
                    </label>
                    <CustomSelect
                      value={benefitForm.payoutType || 'REIMBURSEMENT'}
                      onChange={(e) => setBenefitForm({ ...benefitForm, payoutType: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:border-slate-700"
                    >
                      <option value="IN_KIND">ตามระเบียบบริษัท</option>
                      <option value="REIMBURSEMENT">ยื่นเบิกตามบิล / ใบเสร็จ</option>
                      <option value="PAYROLL">จ่ายในเงินเดือน</option>
                    </CustomSelect>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      จ่ายผ่านรายการ (บนสลิปเงินเดือน)
                    </label>
                    <PayCodeSelect
                      value={benefitForm.payrollItemId}
                      onChange={(id) => setBenefitForm({ ...benefitForm, payrollItemId: id })}
                      isNew={modalMode === 'create'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        วงเงินมาตรฐาน (บาท)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={benefitForm.defaultCoverageAmount ?? 0}
                        onChange={(e) => setBenefitForm({ ...benefitForm, defaultCoverageAmount: Number(e.target.value) || 0 })}
                        placeholder="0 = ไม่จำกัด/ตามระเบียบ"
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:border-slate-700"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">0 = ตามสิทธิ์ / ไม่จำกัด</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        รอบการให้สิทธิ์
                      </label>
                      <CustomSelect
                        value={benefitForm.defaultFrequency || 'YEARLY'}
                        onChange={(e) => setBenefitForm({ ...benefitForm, defaultFrequency: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:border-slate-700"
                      >
                        <option value="YEARLY">ต่อปี</option>
                        <option value="MONTHLY">ต่อเดือน</option>
                        <option value="DAILY">ต่อวัน</option>
                        <option value="PER_OCCURRENCE">ต่อครั้ง</option>
                      </CustomSelect>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 dark:bg-slate-950 dark:border-slate-700/60">
                  <input
                    type="checkbox"
                    id="isStatutory"
                    checked={benefitForm.isStatutory}
                    onChange={(e) => setBenefitForm({ ...benefitForm, isStatutory: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0B2046] focus:ring-[#0B2046] cursor-pointer"
                  />
                  <label htmlFor="isStatutory" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    เป็นสิทธิตามกฎหมายแรงงานบังคับ (Statutory Benefit)
                  </label>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 dark:bg-slate-950 dark:border-slate-700/60">
                  <input
                    type="checkbox"
                    id="isDocumentRequired"
                    checked={benefitForm.isDocumentRequired}
                    onChange={(e) => setBenefitForm({ ...benefitForm, isDocumentRequired: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0B2046] focus:ring-[#0B2046] cursor-pointer"
                  />
                  <label htmlFor="isDocumentRequired" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    แนบเอกสารประกอบหรือใบรับรองแพทย์ (บังคับแนบเอกสารเมื่อขอเบิกสวัสดิการนี้)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">สถานะ</label>
                  <CustomSelect
                    value={benefitForm.status}
                    onChange={(e) => setBenefitForm({ ...benefitForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-blue-500/20"
                  >
                    <option value="ACTIVE">เปิดใช้งาน</option>
                    <option value="INACTIVE">ปิดใช้งาน</option>
                  </CustomSelect>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-700/60 shrink-0 bg-slate-50/70 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium dark:border-slate-700 cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 cursor-pointer transition-all"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm dark:text-slate-100">
                {modalMode === 'create' ? 'เพิ่มระดับพนักงานใหม่' : 'แก้ไขข้อมูลระดับพนักงาน'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLevel} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">
                  ชื่อระดับพนักงาน *
                </label>
                <input
                  type="text"
                  required
                  value={levelForm.levelName}
                  onChange={(e) => setLevelForm({ ...levelForm, levelName: e.target.value })}
                  placeholder="เช่น พนักงานปฏิบัติการ, ผู้จัดการฝ่าย"
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">สถานะ</label>
                <CustomSelect
                  value={levelForm.status}
                  onChange={(e) => setLevelForm({ ...levelForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20"
                >
                  <option value="ACTIVE">ใช้งานอยู่</option>
                  <option value="INACTIVE">ไม่ได้ใช้งาน</option>
                </CustomSelect>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-medium dark:hover:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400"
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

      {/* === TAB: แผนผังองค์กร (Org Chart) === */}
      {activeTab === 'orgchart' && (
        <OrgChartView />
      )}

      {/* Modal: Create / Edit Company Bank Account */}
      {bankAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-[#0B2046]">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm dark:text-slate-100">
                  {editingBankAccount ? 'แก้ไขบัญชีธนาคารบริษัท' : 'เพิ่มบัญชีธนาคารบริษัทใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setBankAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400 cursor-pointer dark:text-slate-500 dark:text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankAccount} className="space-y-4 pt-4">
              {/* ธนาคาร */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ธนาคารพาณิชย์ *</label>
                <CustomSelect
                  required
                  value={bankAccountForm.bankId}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankId: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                >
                  <option value={0} disabled>-- เลือกธนาคาร --</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.bankCode}] {b.bankName}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* เลขที่บัญชี */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">เลขที่บัญชีธนาคาร *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 789-0-12345-6"
                  value={bankAccountForm.accountNumber}
                  onFocus={() => {
                    // เลขถูกปิดบางส่วน: เมื่อคลิกแก้ ให้ล้างช่องเพื่อกรอกเลขใหม่ทั้งหมด
                    if (editingBankAccount?.isAccountNumberMasked && bankAccountForm.accountNumber === editingBankAccount.accountNumber) {
                      setBankAccountForm({ ...bankAccountForm, accountNumber: '' });
                    }
                  }}
                  onBlur={() => {
                    if (editingBankAccount?.isAccountNumberMasked && !bankAccountForm.accountNumber.trim()) {
                      setBankAccountForm({ ...bankAccountForm, accountNumber: editingBankAccount.accountNumber });
                    }
                  }}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>

              {editingBankAccount?.isAccountNumberMasked && (
                <p className="-mt-2 text-[11px] text-slate-500">
                  เลขบัญชีแสดงแบบปิดบางส่วน — ถ้าไม่ต้องการเปลี่ยนเลข ปล่อยไว้ตามเดิม (เห็นเลขเต็มได้เฉพาะฝ่ายการเงิน/ผู้ดูแลระบบ)
                </p>
              )}

              {/* ชื่อบัญชี */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ชื่อบัญชี (Account Name)</label>
                <input
                  type="text"
                  placeholder="เช่น บจก. สยาม อินโนเวชั่น เทคโนโลยี"
                  value={bankAccountForm.accountName}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>

              {/* ตั้งเป็นบัญชีจ่ายเงินเดือนหลัก */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                <input
                  type="checkbox"
                  id="isPrimaryPayrollAccount"
                  checked={bankAccountForm.isPrimaryPayrollAccount}
                  disabled={!!editingBankAccount?.isPrimaryPayrollAccount}
                  onChange={(e) =>
                    setBankAccountForm({
                      ...bankAccountForm,
                      isPrimaryPayrollAccount: e.target.checked,
                      status: e.target.checked ? 'ACTIVE' : bankAccountForm.status,
                    })
                  }
                  className="mt-0.5 rounded text-[#0B2046] focus:ring-[#0B2046] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                />
                <label htmlFor="isPrimaryPayrollAccount" className="text-xs cursor-pointer select-none">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block dark:text-slate-200">ใช้เป็นบัญชีหลักสำหรับจ่ายเงินเดือน (Primary Payroll Account)</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 dark:text-slate-400">
                    {editingBankAccount?.isPrimaryPayrollAccount
                      ? 'บัญชีนี้เป็นบัญชีหลักอยู่ — ถ้าต้องการเปลี่ยน ให้กด "ตั้งเป็นบัญชีหลัก" ที่บัญชีอื่นแทน'
                      : 'เมื่อเปิดใช้งาน บัญชีนี้จะถูกเลือกเป็นบัญชีต้นทางอัตโนมัติในการทำรายการจ่ายเงินเดือนพนักงาน'}
                  </span>
                </label>
              </div>

              {/* สถานะ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">สถานะการใช้งาน</label>
                <CustomSelect
                  value={bankAccountForm.status}
                  disabled={bankAccountForm.isPrimaryPayrollAccount}
                  title={bankAccountForm.isPrimaryPayrollAccount ? 'บัญชีหลักต้องเปิดใช้งานเสมอ' : undefined}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                >
                  <option value="ACTIVE">เปิดใช้งาน</option>
                  <option value="INACTIVE">ระงับการใช้งาน</option>
                </CustomSelect>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setBankAccountModalOpen(false)}
                  disabled={savingBankAccount}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingBankAccount}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#0B2046] hover:bg-[#081836] rounded-xl shadow-md shadow-[#0B2046]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingBankAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingBankAccount ? 'บันทึกการแก้ไข' : 'เพิ่มบัญชีธนาคาร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Delete Confirmation Modal */}

      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-center text-sm mb-2 dark:text-slate-100">
              {itemToDelete.type === 'bank-account' ? 'ยืนยันการปิดใช้งานบัญชี?' : 'ยืนยันการลบข้อมูล?'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 dark:text-slate-400">
              {itemToDelete.type === 'bank-account' ? (
                <>
                  ปิดใช้งานบัญชี <span className="font-semibold text-slate-900 dark:text-slate-100">&quot;{itemToDelete.name}&quot;</span> ใช่หรือไม่? ข้อมูลยังเก็บไว้ในระบบ และเปิดใช้งานใหม่ได้จากปุ่มแก้ไข
                </>
              ) : (
                <>
                  คุณต้องการลบข้อมูล <span className="font-semibold text-slate-900 dark:text-slate-100">&quot;{itemToDelete.name}&quot;</span> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                </>
              )}
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-medium w-full dark:hover:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/20 w-full"
              >
                {itemToDelete.type === 'bank-account' ? 'ยืนยันปิดใช้งาน' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

