'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOnboardingTour, TourStep } from '@/hooks/useOnboardingTour';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Eye,
  Trash2,
  Clock,
  CalendarClock,
  Briefcase,
  Layers,
  X,
  Paperclip,
  Download,
  Upload,
  FileSearch,
} from 'lucide-react';
import { openBlobInNewTab } from '@/lib/filePreview';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { contractService } from '@/services/contractService';
import { employeeService } from '@/services/employeeService';
import { EmploymentContract, ContractSummaryStats, CreateContractRequest, RenewContractRequest } from '@/types/contract';
import { Employee } from '@/types/employee';
import CreateContractModal from '@/components/contracts/CreateContractModal';
import RenewContractModal from '@/components/contracts/RenewContractModal';
import ContractDetailModal from '@/components/contracts/ContractDetailModal';
import EmployeeTimelineModal from '@/components/contracts/EmployeeTimelineModal';
import AttachContractModal from '@/components/contracts/AttachContractModal';
import ContractDocumentPreviewModal from '@/components/contracts/ContractDocumentPreviewModal';
import { ActionDropdown, type ActionDropdownItem } from '@/components/ui/ActionDropdown';
import { Button, TabBar, TableToolbar, AvatarName } from '@/components/ui';

import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import { TableEmpty, TableLoading } from '@/components/ui/TableState';

const CONTRACT_BUTTON_STEPS: TourStep[] = [
  {
    element: '#tour-contract-add-btn',
    popover: {
      title: 'ขั้นตอนที่ 2: เพิ่มสัญญาจ้าง',
      description: 'คลิกปุ่ม "+ สร้างสัญญาใหม่" เพื่อจัดทำสัญญาจ้างงานให้พนักงาน',
      side: 'bottom',
      align: 'end',
    },
    requiredPermission: 'EMP_CONTRACT_VIEW',
  },
];

const CONTRACT_MODAL_STEPS: TourStep[] = [
  {
    element: '#tour-contract-modal-dialog',
    popover: {
      title: 'ขั้นตอนที่ 2: กรอกข้อมูลสัญญาจ้างงาน',
      description: 'เลือกพนักงานและระบุรายละเอียดสัญญา หรือกด "ถัดไป" เพื่อไปขั้นตอนผู้ใช้งาน',
      side: 'left',
      align: 'start',
    },
    requiredPermission: 'EMP_CONTRACT_VIEW',
  },
];

function ContractsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tourParam = searchParams?.get('tour');
  const mockParam = searchParams?.get('mock');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Phase 1: Tour ชี้ปุ่มสร้างสัญญาใหม่
  useOnboardingTour('hr-onboarding-contract-btn', CONTRACT_BUTTON_STEPS, {
    triggerCondition: tourParam === 'hr-onboarding-2' && !isCreateModalOpen,
    prevBtnText: 'ย้อนกลับ',
    doneBtnText: 'ถัดไป',
    onPrev: () => {
      const mockQuery = mockParam ? `&mock=${encodeURIComponent(mockParam)}` : '';
      router.push(`/employees?tour=hr-onboarding-1${mockQuery}`);
    },
    onDone: () => {
      const mockQuery = mockParam ? `&mock=${encodeURIComponent(mockParam)}` : '';
      router.push(`/settings?tab=users&tour=hr-onboarding-3${mockQuery}`);
    },
    onClose: () => {
      router.replace(window.location.pathname);
    },
  });

  // Phase 2: Tour ชี้ที่แบบฟอร์มสัญญาภาพรวมเมื่อ Modal เปิด
  useOnboardingTour('hr-onboarding-contract-modal', CONTRACT_MODAL_STEPS, {
    triggerCondition: tourParam === 'hr-onboarding-2' && isCreateModalOpen,
    delayMs: 250,
    showPrevBtn: true,
    prevBtnText: 'ย้อนกลับ',
    doneBtnText: 'ถัดไป',
    onPrev: () => {
      setIsCreateModalOpen(false);
    },
    onDone: () => {
      setIsCreateModalOpen(false);
      const mockQuery = mockParam ? `&mock=${encodeURIComponent(mockParam)}` : '';
      router.push(`/settings?tab=users&tour=hr-onboarding-3${mockQuery}`);
    },
    onClose: () => {
      setIsCreateModalOpen(false);
      router.replace(window.location.pathname);
    },
  });

  const { hasPermission, hasRole } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();

  // Data States
  const [contracts, setContracts] = useState<EmploymentContract[]>([]);
  const [stats, setStats] = useState<ContractSummaryStats>({
    probationCount: 0,
    permanentCount: 0,
    fixedTermCount: 0,
    probationExpiring7DaysCount: 0,
    probationExpiring30DaysCount: 0,
    contractExpiring30DaysCount: 0,
    totalActiveCount: 0,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  // รูปโปรไฟล์/คำนำหน้าจากรายชื่อพนักงาน (ใช้แทนเมื่อข้อมูลสัญญายังไม่มีมาให้)
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContractType, setSelectedContractType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'requests'>('requests');

  // Modals & Actions
  const [selectedContract, setSelectedContract] = useState<EmploymentContract | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedTimelineEmployee, setSelectedTimelineEmployee] = useState<{
    id: number;
    name: string;
    code: string;
  } | null>(null);

  // Renew Modal States
  const [selectedContractForRenew, setSelectedContractForRenew] = useState<EmploymentContract | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);

  // Document Attach & Preview Modals
  const [selectedContractForAttach, setSelectedContractForAttach] = useState<EmploymentContract | null>(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [selectedContractForDocPreview, setSelectedContractForDocPreview] = useState<EmploymentContract | null>(null);
  const [isDocPreviewModalOpen, setIsDocPreviewModalOpen] = useState(false);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Breadcrumbs
  useEffect(() => {
    setBreadcrumb({
      section: 'พนักงาน',
      page: 'สัญญาจ้าง',
    });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const isCustomFilter =
        selectedStatus === 'CONTRACT_EXPIRING' || selectedStatus === 'PROBATION_EXPIRING';

      const [contractsData, statsData, employeesData] = await Promise.all([
        contractService.getAll({
          search: searchTerm || undefined,
          contractType: selectedContractType !== 'ALL' ? selectedContractType : undefined,
          status: selectedStatus !== 'ALL' && !isCustomFilter ? selectedStatus : undefined,
        }),
        contractService.getStats(),
        employeeService.getAll(),
      ]);

      // ไม่ให้พนักงานคนเดิมขึ้นแถวซ้ำ โดยเลือกสัญญาหลักปัจจุบันเพียงสัญญาเดียวต่อพนักงาน 1 คน (ACTIVE ก่อน)
      const uniqueByEmp = new Map<number, EmploymentContract>();
      for (const c of contractsData) {
        const existing = uniqueByEmp.get(c.employeeId);
        if (!existing) {
          uniqueByEmp.set(c.employeeId, c);
        } else if (existing.status !== 'ACTIVE' && c.status === 'ACTIVE') {
          uniqueByEmp.set(c.employeeId, c);
        }
      }
      let filtered = Array.from(uniqueByEmp.values());
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedStatus === 'CONTRACT_EXPIRING') {
        filtered = contractsData.filter((c) => {
          if (!c.contractEndDate || c.status === 'TERMINATED' || c.status === 'COMPLETED' || c.status === 'CANCELLED') return false;
          const cEnd = new Date(c.contractEndDate);
          cEnd.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((cEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 30;
        });
      } else if (selectedStatus === 'PROBATION_EXPIRING') {
        filtered = contractsData.filter((c) => {
          if (!c.probationEndDate || c.status === 'TERMINATED' || c.status === 'COMPLETED' || c.status === 'CANCELLED') return false;
          const pEnd = new Date(c.probationEndDate);
          pEnd.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((pEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 30;
        });
      }

      setContracts(filtered);
      setStats({
        ...statsData,
        fixedTermCount:
          statsData.fixedTermCount ??
          contractsData.filter((c) => c.contractType === 'FIXED_TERM' && c.status === 'ACTIVE').length,
        contractExpiring30DaysCount:
          statsData.contractExpiring30DaysCount ??
          contractsData.filter((c) => {
            if (!c.contractEndDate || c.status === 'TERMINATED' || c.status === 'COMPLETED' || c.status === 'CANCELLED')
              return false;
            const cEnd = new Date(c.contractEndDate);
            cEnd.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((cEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
          }).length,
        probationExpiring30DaysCount:
          statsData.probationExpiring30DaysCount ??
          contractsData.filter((c) => {
            if (!c.probationEndDate || c.status === 'TERMINATED' || c.status === 'COMPLETED' || c.status === 'CANCELLED')
              return false;
            const pEnd = new Date(c.probationEndDate);
            pEnd.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((pEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
          }).length,
      });
      setEmployees(employeesData);
    } catch (err: any) {
      console.error('Failed to load contracts data:', err);
      toast.error(err.message || 'ไม่สามารถโหลดข้อมูลสัญญาจ้างได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, selectedContractType, selectedStatus]);

  // Handle Create Contract
  const handleCreateContract = async (payload: CreateContractRequest) => {
    await contractService.create(payload);
    toast.success('สร้างสัญญาจ้างงานใหม่สำเร็จเรียบร้อย');
    await fetchData();
  };

  // Handle Renew Contract
  const handleRenewContract = async (contractId: number, payload: RenewContractRequest) => {
    await contractService.renew(contractId, payload);
    toast.success('ต่ออายุสัญญาจ้างงานสำเร็จเรียบร้อย');
    await fetchData();
  };

  // Handle Terminate Contract
  const handleTerminateContract = async (id: number, reason: string) => {
    await contractService.terminate(id, reason);
    toast.success('บันทึกสิ้นสุดสัญญาจ้างงานสำเร็จ');
    await fetchData();
  };

  // Pagination logic
  const totalPages = Math.ceil(contracts.length / pageSize) || 1;
  const paginatedContracts = contracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canViewProfile = hasPermission('EMP_PROFILE_VIEW') || isSuper;
  const canViewTypes = hasPermission('EMP_TYPE_VIEW') || isSuper;
  const canViewTransfers = hasPermission('EMP_TRANSFER_VIEW') || isSuper;
  const canViewContracts = hasPermission('EMP_CONTRACT_VIEW') || isSuper;
  const canViewDocs = hasPermission('EMP_DOC_VIEW') || isSuper;

  const canCreateContracts = hasPermission('EMP_CONTRACT_CREATE') || hasPermission('EMP_MANAGE') || isSuper;
  const canEditContracts = hasPermission('EMP_CONTRACT_EDIT') || hasPermission('EMP_MANAGE') || isSuper;

  // Sub-Navigation Tabs matching Mockup
  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', show: canViewProfile },
    { title: 'ประเภทพนักงาน', href: '/employees/types', show: canViewTypes },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/transfers', show: canViewTransfers },
    { title: 'สัญญาจ้าง', href: '/employees/contracts', active: true, show: canViewContracts },
    { title: 'เอกสารใกล้หมดอายุ', href: '/employees/documents', show: canViewDocs },
  ].filter((t) => t.show);

  const handleViewAttachment = (contract: EmploymentContract) => {
    setSelectedContractForDocPreview(contract);
    setIsDocPreviewModalOpen(true);
  };

  const handleDownloadAttachment = async (contract: EmploymentContract) => {
    try {
      const res = await contractService.getDocumentBlob(contract.id, false);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = contract.documentFileName || res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('ดาวน์โหลดไฟล์แนบเรียบร้อยแล้ว');
    } catch {
      toast.error('ไม่สามารถดาวน์โหลดเอกสารได้');
    }
  };

    // ฟังก์ชันคำนวณและแสดงสถานะสัญญาจ้าง (แสดงใกล้ครบกำหนดทดลองงาน ... วัน)
  const renderContractStatus = (contract: EmploymentContract) => {
    if (contract.status === 'COMPLETED' || contract.status === 'TERMINATED' || contract.status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          สิ้นสุดสัญญาแล้ว
        </span>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. ตรวจสอบวันสิ้นสุดสัญญาจ้าง (Fixed-Term)
    if (contract.contractEndDate) {
      const contractEnd = new Date(contract.contractEndDate);
      contractEnd.setHours(0, 0, 0, 0);
      const diffTime = contractEnd.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0 && diffDays <= 30) {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            ใกล้สิ้นสุดสัญญา {diffDays} วัน
          </span>
        );
      } else if (diffDays === 0) {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            สิ้นสุดสัญญาวันนี้
          </span>
        );
      } else if (diffDays < 0 && contract.contractType === 'FIXED_TERM') {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            หมดสัญญาแล้ว
          </span>
        );
      }
    }

    // 2. ตรวจสอบวันครบกำหนดทดลองงาน (Probation)
    if (contract.probationEndDate) {
      const probEnd = new Date(contract.probationEndDate);
      probEnd.setHours(0, 0, 0, 0);
      const diffTime = probEnd.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0 && diffDays <= 30) {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            ใกล้ครบกำหนดทดลองงาน {diffDays} วัน
          </span>
        );
      } else if (diffDays === 0) {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            ครบกำหนดทดลองงานวันนี้
          </span>
        );
      } else if (diffDays < 0 && contract.contractType === 'PROBATION') {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            ครบกำหนดทดลองงานแล้ว
          </span>
        );
      }
    }

    if (contract.status === 'PENDING_APPROVAL') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          ใกล้สิ้นสุดสัญญา
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        กำลังจ้างงาน
      </span>
    );
  };

  const getContractActionItems = (contract: EmploymentContract): ActionDropdownItem[] => {
    const items: ActionDropdownItem[] = [
      {
        label: 'ดูรายละเอียด',
        icon: <FileSearch className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />,
        onClick: () => {
          setSelectedContract(contract);
          setIsDetailModalOpen(true);
        },
      },
      {
        label: 'ดูไฟล์แนบ',
        icon: <Paperclip className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />,
        disabled: !contract.hasDocument,
        onClick: () => {
          if (!contract.hasDocument) {
            toast.error('ยังไม่มีไฟล์แนบในสัญญานี้');
            return;
          }
          handleViewAttachment(contract);
        },
      },
    ];

    if (contract.hasDocument) {
      items.push({ divider: true, label: '' });
      items.push({
        label: 'ดาวน์โหลดไฟล์แนบ',
        icon: <Download className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />,
        onClick: () => handleDownloadAttachment(contract),
      });
    }

    items.push({ divider: true, label: '' });
    items.push({
      label: 'ประวัติรายบุคคล',
      icon: <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />,
      onClick: () => {
        setSelectedTimelineEmployee({
          id: contract.employeeId,
          name: contract.employeeName,
          code: contract.employeeCode,
        });
        setIsTimelineModalOpen(true);
      },
    });

    if (canEditContracts) {
      items.push({ divider: true, label: '' });
      items.push({
        label: 'ต่ออายุสัญญา',
        icon: <CalendarClock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        onClick: () => {
          setSelectedContractForRenew(contract);
          setIsRenewModalOpen(true);
        },
      });
    }

    if (contract.status === 'ACTIVE' && canEditContracts) {
      items.push({ divider: true, label: '' });
      items.push({
        label: 'สิ้นสุดสัญญา',
        icon: <X className="w-4 h-4 text-rose-600 shrink-0" />,
        danger: true,
        onClick: () => {
          setSelectedContract(contract);
          setIsDetailModalOpen(true);
        },
      });
    }

    return items;
  };

  if (!canViewContracts) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์ดูข้อมูลสัญญาจ้าง"
        message="ขออภัย บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงหรือดูข้อมูลสัญญาจ้างงาน กรุณาติดต่อผู้ดูแลระบบ"
      />
    );
  }

  return (
    <div className="space-y-5 font-sans pb-12">




      {/* 4. KPI Stat Cards (4 Cards: กำลังจ้างงาน, สัญญาจ้างชั่วคราว, ใกล้ครบทดลองงาน, ใกล้สิ้นสุดสัญญา) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: กำลังจ้างงาน */}
        <div
          onClick={() => {
            setSelectedStatus((prev) => (prev === 'ACTIVE' ? 'ALL' : 'ACTIVE'));
            setSelectedContractType('ALL');
            setCurrentPage(1);
          }}
          className={`bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between cursor-pointer select-none group ${
            selectedStatus === 'ACTIVE' ? 'ring-2 ring-sky-500 shadow-md' : ''
          }`}
          title="คลิกเพื่อกรองสัญญาที่มีสถานะกำลังจ้างงานทั้งหมด"
        >
          <div>
            <h4 className="text-sm font-bold text-sky-800 dark:text-sky-300 mb-1 group-hover:text-sky-900 transition-colors">กำลังจ้างงาน</h4>
            <p className="text-xs text-sky-700/80 dark:text-sky-400">พนักงานที่อยู่ระหว่างสัญญาจ้าง</p>
          </div>
          <div className="bg-white dark:bg-sky-900/60 shadow-xs border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-200 px-3.5 py-1.5 rounded-xl font-black text-2xl tracking-tight">
            {stats.totalActiveCount}
          </div>
        </div>

        {/* Card 2: สัญญาจ้างชั่วคราวทั้งหมด (Fixed-Term) */}
        <div
          onClick={() => {
            setSelectedContractType((prev) => (prev === 'FIXED_TERM' ? 'ALL' : 'FIXED_TERM'));
            setSelectedStatus('ALL');
            setCurrentPage(1);
          }}
          className={`bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between cursor-pointer select-none group ${
            selectedContractType === 'FIXED_TERM' ? 'ring-2 ring-indigo-500 shadow-md' : ''
          }`}
          title="คลิกเพื่อกรองสัญญาจ้างชั่วคราว/มีกำหนดเวลา"
        >
          <div>
            <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-1 group-hover:text-indigo-900 transition-colors">สัญญาจ้างชั่วคราว</h4>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-400">สัญญาแบบมีกำหนดเวลา</p>
          </div>
          <div className="bg-white dark:bg-indigo-900/60 shadow-xs border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-200 px-3.5 py-1.5 rounded-xl font-black text-2xl tracking-tight">
            {stats.fixedTermCount ?? 0}
          </div>
        </div>

        {/* Card 3: ใกล้ครบทดลองงาน (30 วัน) */}
        <div
          onClick={() => {
            setSelectedStatus((prev) => (prev === 'PROBATION_EXPIRING' ? 'ALL' : 'PROBATION_EXPIRING'));
            setSelectedContractType('ALL');
            setCurrentPage(1);
          }}
          className={`bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between cursor-pointer select-none group ${
            selectedStatus === 'PROBATION_EXPIRING' ? 'ring-2 ring-amber-500 shadow-md' : ''
          }`}
          title="คลิกเพื่อกรองสัญญาที่ใกล้ครบกำหนดทดลองงาน"
        >
          <div>
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1 group-hover:text-amber-900 transition-colors">ใกล้ครบทดลองงาน</h4>
            <p className="text-xs text-amber-700/80 dark:text-amber-400">ต้องประเมินผลใน 30 วัน</p>
          </div>
          <div className="bg-white dark:bg-amber-900/60 shadow-xs border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-200 px-3.5 py-1.5 rounded-xl font-black text-2xl tracking-tight">
            {stats.probationExpiring30DaysCount ?? stats.probationExpiring7DaysCount ?? 0}
          </div>
        </div>

        {/* Card 4: ใกล้สิ้นสุดสัญญา (30 วัน) */}
        <div
          onClick={() => {
            setSelectedStatus((prev) => (prev === 'CONTRACT_EXPIRING' ? 'ALL' : 'CONTRACT_EXPIRING'));
            setSelectedContractType('ALL');
            setCurrentPage(1);
          }}
          className={`bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between cursor-pointer select-none group ${
            selectedStatus === 'CONTRACT_EXPIRING' ? 'ring-2 ring-rose-500 shadow-md' : ''
          }`}
          title="คลิกเพื่อกรองสัญญาจ้างที่ใกล้หมดอายุใน 30 วัน"
        >
          <div>
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-1 group-hover:text-rose-900 transition-colors">ใกล้สิ้นสุดสัญญา</h4>
            <p className="text-xs text-rose-700/80 dark:text-rose-400">สัญญาหมดอายุใน 30 วัน</p>
          </div>
          <div className="bg-white dark:bg-rose-900/60 shadow-xs border border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-200 px-3.5 py-1.5 rounded-xl font-black text-2xl tracking-tight">
            {stats.contractExpiring30DaysCount ?? 0}
          </div>
        </div>
      </div>

      {/* 5. Main Card Container with Filters & Table (มาตรฐานระบบแบบหน้าจัดการฝ่าย) */}
      <div id="tour-contract-table-container" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="space-y-4">
          {/* Toolbar: ค้นหา & ฟิลเตอร์ด้านซ้าย, ปุ่มเพิ่มด้านขวา */}
          <TableToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
            filters={
              <>
                <CustomSelect
                  value={selectedContractType}
                  onChange={(val) => {
                    setSelectedContractType(String(val));
                    setCurrentPage(1);
                  }}
                  placeholder="ประเภทสัญญาทั้งหมด"
                  className="min-w-[170px]"
                  options={[
                    { value: 'ALL', label: 'ประเภทสัญญาทั้งหมด' },
                    { value: 'PROBATION', label: 'ทดลองงาน' },
                    { value: 'PERMANENT', label: 'ประจำ' },
                    { value: 'FIXED_TERM', label: 'สัญญาจ้าง' },
                    { value: 'OTHER', label: 'อื่นๆ / ฝึกงาน' },
                  ]}
                />
                <CustomSelect
                  value={selectedStatus}
                  onChange={(val) => {
                    setSelectedStatus(String(val));
                    setCurrentPage(1);
                  }}
                  placeholder="สถานะทั้งหมด"
                  className="min-w-[195px]"
                  options={[
                    { value: 'ALL', label: 'สถานะทั้งหมด' },
                    { value: 'ACTIVE', label: '1. กำลังจ้างงาน' },
                    { value: 'CONTRACT_EXPIRING', label: '2. ใกล้สิ้นสุดสัญญา' },
                    { value: 'PROBATION_EXPIRING', label: '3. ใกล้ครบกำหนดทดลองงาน' },
                    { value: 'TERMINATED', label: '4. สิ้นสุดสัญญาแล้ว' },
                  ]}
                />
              </>
            }
            actions={
              canCreateContracts ? (
                <Button
                  id="tour-contract-add-btn"
                  onClick={() => setIsCreateModalOpen(true)}
                  icon={<Plus className="w-4 h-4" />}
                  className="shrink-0 self-start sm:self-auto"
                >
                  สร้างสัญญาใหม่
                </Button>
              ) : null
            }
          />

          {/* Contracts Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="table-standard w-full min-w-[850px] text-left border-collapse text-xs whitespace-nowrap">
              <thead className="bg-primary text-white font-semibold">
                <tr className="whitespace-nowrap">
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">พนักงาน</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">ประเภทสัญญา</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">เริ่มสัญญา</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">สถานะ</th>
                <th className="py-3.5 px-6 font-medium text-right whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableLoading colSpan={5} text="กำลังโหลดข้อมูลสัญญาจ้างงาน..." />
              ) : paginatedContracts.length === 0 ? (
                <TableEmpty colSpan={5} text="ไม่พบข้อมูลสัญญาจ้างงาน" />
              ) : (
                paginatedContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* พนักงาน: อรวรรณ ใจดี · EMP-0142 */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <Link
                        href={`/employees/${contract.employeeId}`}
                        className="inline-flex hover:opacity-80 transition-opacity"
                        title={contract.employeeCode}
                      >
                        <AvatarName
                          id={contract.employeeId}
                          name={contract.employeeName}
                          prefix={contract.employeePrefix ?? employeeById.get(contract.employeeId)?.prefix}
                          avatarUrl={contract.avatarUrl ?? employeeById.get(contract.employeeId)?.avatarUrl}
                        />
                      </Link>
                    </td>

                    {/* ประเภทสัญญา: ทดลองงาน, ประจำ, สัญญาจ้าง, ฝึกงาน */}
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {contract.employeeTypeName || contract.contractTypeDisplay}
                    </td>

                    {/* เริ่มสัญญา: 01/07/2569 */}
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {contract.startDateDisplay}
                    </td>

                    {/* สถานะ: กำลังจ้างงาน (เขียว), สิ้นสุดสัญญาแล้ว (เทา), ใกล้ครบกำหนดทดลองงาน ... วัน (ส้ม) */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {renderContractStatus(contract)}
                    </td>

                    {/* 3-Dots Action Menu */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <ActionDropdown
                        menuClassName="w-52"
                        items={getContractActionItems(contract)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

        </div>

          {/* Table Footer with TablePagination มาตรฐานระบบ */}
          {contracts.length > 0 && (
            <TablePagination
              total={contracts.length}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* 8. Modals */}
      {/* Modal ต่ออายุสัญญาจ้างงาน */}
      <RenewContractModal
        contract={selectedContractForRenew}
        isOpen={isRenewModalOpen}
        onClose={() => {
          setIsRenewModalOpen(false);
          setSelectedContractForRenew(null);
        }}
        onSubmit={handleRenewContract}
      />

      <CreateContractModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateContract}
        employees={employees}
      />

      <ContractDetailModal
        contract={selectedContract}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedContract(null);
        }}
        onTerminate={handleTerminateContract}
        onUpdateContract={(updated) => {
          setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedContract(updated);
        }}
      />

      <EmployeeTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => {
          setIsTimelineModalOpen(false);
          setSelectedTimelineEmployee(null);
        }}
        employeeId={selectedTimelineEmployee?.id ?? null}
        employeeName={selectedTimelineEmployee?.name ?? ''}
        employeeCode={selectedTimelineEmployee?.code ?? ''}
        onViewContractDoc={(ct) => {
          setSelectedContractForDocPreview(ct);
          setIsDocPreviewModalOpen(true);
        }}
      />

      {/* 9. แนบเอกสารสัญญาจ้างงานรายบุคคล */}
      <AttachContractModal
        contract={selectedContractForAttach}
        isOpen={isAttachModalOpen}
        onClose={() => {
          setIsAttachModalOpen(false);
          setSelectedContractForAttach(null);
        }}
        onSuccess={(updated) => {
          setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          fetchData();
        }}
      />

      {/* 10. ดูตัวอย่างเอกสารสัญญาจ้างงาน */}
      <ContractDocumentPreviewModal
        contractId={selectedContractForDocPreview?.id ?? null}
        fileName={selectedContractForDocPreview?.documentFileName}
        isOpen={isDocPreviewModalOpen}
        onClose={() => {
          setIsDocPreviewModalOpen(false);
          setSelectedContractForDocPreview(null);
        }}
      />
    </div>
  );
}

export default function ContractsPage() {
  return (
    <Suspense fallback={null}>
      <ContractsPageContent />
    </Suspense>
  );
}
