'use client';

import { ModalShell } from '@/components/ui/ModalShell';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { employeeService } from '@/services/employeeService';
import { apiClient, getAvatarUrl } from '@/lib/api-client';
import { Employee } from '@/types/employee';
import { useToast } from '@/context/ToastContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { confirmDelete } from '@/lib/sweetalert';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Trash2,
  X,
  ShieldCheck,
  AlertCircle,
  MessageSquarePlus,
  Edit3,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  List,
  LayoutGrid,
  Star,
  Info,
  Filter,
  Hash,
  UserCog,
  Armchair,
  Clock,
  CircleDollarSign,
  Folder,
  Contact,
  Briefcase,
} from 'lucide-react';
import { AccessDenied } from '@/components/common/AccessDenied';
import CreateEmployeeModal from '@/components/employees/CreateEmployeeModal';
import { inputClass } from '@/components/ui';

interface DepartmentItem {
  id: number;
  departmentCode: string;
  departmentName: string;
}

export const getGenderDisplay = (gender?: string, genderId?: number, prefix?: string): string => {
  if (gender && gender.trim()) return gender;
  if (genderId === 1) return 'ชาย';
  if (genderId === 2) return 'หญิง';
  if (genderId === 3) return 'ไม่ระบุ';
  if (prefix === 'นาย' || prefix === 'เด็กชาย' || prefix?.toLowerCase() === 'mr.' || prefix?.toLowerCase() === 'mr') return 'ชาย';
  if (prefix === 'นาง' || prefix === 'นางสาว' || prefix === 'น.ส.' || prefix === 'เด็กหญิง' || prefix?.toLowerCase() === 'mrs.' || prefix?.toLowerCase() === 'ms.' || prefix?.toLowerCase() === 'miss') return 'หญิง';
  return '-';
};

export const formatMaskedCitizenId = (val?: string): string => {
  if (!val) return '-';
  const clean = val.trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 13 && !clean.includes('x') && !clean.includes('*')) {
    return `x-xxxx-xxxx${digits[9]}-${digits.substring(10, 12)}-${digits[12]}`;
  }
  return clean;
};

export const formatPhoneNumber = (val?: string | null): string => {
  if (!val) return '-';
  const clean = val.trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    if (digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return clean;
};

export const formatBirthDate = (val?: string | null): string => {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return val;
  }
};

export const autoFormatPhone = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length > 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return digits;
};

export const formatHireDateAndTenure = (val?: string | null): string => {
  if (!val) return '01/02/2557 (12 ปี 8 เดือน)';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '01/02/2557 (12 ปี 8 เดือน)';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const thaiYear = d.getFullYear() + 543;

    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();

    if (now.getDate() < d.getDate()) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    let tenure = '';
    if (years > 0 && months > 0) {
      tenure = `${years} ปี ${months} เดือน`;
    } else if (years > 0) {
      tenure = `${years} ปี`;
    } else if (months > 0) {
      tenure = `${months} เดือน`;
    } else {
      tenure = 'น้อยกว่า 1 เดือน';
    }

    return `${day}/${month}/${thaiYear} (${tenure})`;
  } catch {
    return '01/02/2557 (12 ปี 8 เดือน)';
  }
};


export default function EmployeesPage() {
  const router = useRouter();
  const { user, hasPermission, hasRole, getDataScope } = useAuth();
  const toast = useToast();
  const { setBreadcrumb } = useBreadcrumb();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [activeTab, setActiveTab] = useState('จัดการพนักงาน');

  // View Mode: 'table' (List) vs 'grid' (Card Grid)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [favorites, setFavorites] = useState<Record<number, boolean | number>>({});

  // Tooltip state for info button in Grid view (exact match with mockup)
  const [hoveredEmpTooltip, setHoveredEmpTooltip] = useState<{
    emp: Employee;
    anchorRect: DOMRect;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close tooltip on window scroll or resize
  useEffect(() => {
    const handleScrollOrResize = () => {
      setHoveredEmpTooltip(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  const handleInfoMouseEnter = (emp: Employee, e: React.MouseEvent<HTMLButtonElement>) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredEmpTooltip({ emp, anchorRect: rect });
  };

  const handleInfoMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredEmpTooltip(null);
    }, 150);
  };

  const handleTooltipMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    setHoveredEmpTooltip(null);
  };

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('hrms_emp_view_mode');
      if (savedMode === 'table' || savedMode === 'grid') {
        setViewMode(savedMode);
      }
      const savedFav = localStorage.getItem('hrms_emp_favorites');
      if (savedFav) {
        setFavorites(JSON.parse(savedFav));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSetViewMode = (mode: 'table' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem('hrms_emp_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const toggleFavorite = (empId: number, empName?: string) => {
    setFavorites((prev) => {
      const isFav = Boolean(prev[empId]);
      const next = { ...prev };
      if (isFav) {
        delete next[empId];
        if (empName) {
          toast.info(`ยกเลิกติดดาว ${empName}`);
        }
      } else {
        // บันทึก timestamp เพื่อให้คนที่กดล่าสุดขึ้นมาอยู่อันดับแรกสุดเสมอ
        next[empId] = Date.now();
        // นำผู้ใช้กลับไปหน้า 1 เพื่อให้เห็นพนักงานคนนั้นขึ้นมาอยู่คนแรกทันที
        setCurrentPage(1);
        if (empName) {
          toast.success(`ติดดาว ${empName} แล้ว (ย้ายไปอยู่อันดับแรก)`);
        }
      }
      try {
        localStorage.setItem('hrms_emp_favorites', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const getEmployeeStatusBadge = (emp: Employee) => {
    const type = (emp.employeeType || '').toLowerCase();
    const status = (emp.employmentStatus || '').toUpperCase();

    if (status === 'INACTIVE' || status === 'RESIGNED' || status === 'TERMINATED') {
      return {
        text: 'พ้นสภาพ',
        badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
      };
    }

    if (type.includes('ทดลอง') || type.includes('probation')) {
      return {
        text: 'ทดลองงาน',
        badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
      };
    }

    if (type.includes('สัญญา') || type.includes('contract')) {
      return {
        text: 'สัญญาจ้าง',
        badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60',
      };
    }

    return {
      text: 'บรรจุ',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
    };
  };

  // ซ่อน Dropdown ตัวกรองแผนกสำหรับ Role หัวหน้าแผนก (DEPT_MGR) เนื่องจากเห็นเฉพาะแผนกของตนเองอยู่แล้ว
  const isDeptManager = useMemo(() => {
    if (!user) return false;
    const roles = user.roles || [];
    if (roles.includes('ADMIN') || roles.includes('SYSTEM_SUPER') || roles.includes('CEO')) {
      return false;
    }
    return roles.includes('DEPT_MGR') || getDataScope('EMP_VIEW') === 'DEPARTMENT';
  }, [user, getDataScope]);

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'พนักงาน', page: 'จัดการพนักงาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);



  // Detail Modal & Create Modal states
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Sorting state
  const [sortField, setSortField] = useState<string>('employeeCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Reset page when search or department filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDepartment]);

  // HR Comments State: stored in localStorage { [empId: number]: string }
  const [comments, setComments] = useState<Record<number, string>>({});
  const [commentModalEmp, setCommentModalEmp] = useState<Employee | null>(null);
  const [commentInput, setCommentInput] = useState('');


  // Load comments from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hrms_employee_comments');
      if (saved) {
        try {
          setComments(JSON.parse(saved));
        } catch {
          // ignore error
        }
      } else {
        // ตัวอย่างตั้งต้นตรงตามภาพ Figma (EMP-001: พนักงานคนนี้ป่วยทางจิต, EMP-002: กำลังทดลองงาน)
        const defaultNotes: Record<number, string> = {
          1: 'พนักงานคนนี้ป่วยทางจิต',
          2: 'กำลังอยู่ในช่วงทดลองงาน',
        };
        setComments(defaultNotes);
        localStorage.setItem('hrms_employee_comments', JSON.stringify(defaultNotes));
      }
    }
  }, []);

  // Save comment
  const handleSaveComment = (empId: number, text: string) => {
    const updated = { ...comments };
    if (text.trim()) {
      updated[empId] = text.trim();
    } else {
      delete updated[empId];
    }
    setComments(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hrms_employee_comments', JSON.stringify(updated));
    }
    setCommentModalEmp(null);
    setCommentInput('');
    toast.success(text.trim() ? 'บันทึกคอมเมนต์พนักงานเรียบร้อยแล้ว' : 'ลบคอมเมนต์เรียบร้อยแล้ว');
  };



  // Load Employees and Departments
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [empList, deptRes] = await Promise.all([
        employeeService.getAll(),
        apiClient.get('/organization/departments').catch(() => ({ data: { data: [] } })),
      ]);
      setEmployees(empList);
      if (deptRes?.data?.data) {
        setDepartments(deptRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load employee list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and Sort Employees
  const filteredEmployees = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    const filtered = employees.filter((emp) => {
      // 1. Search filter across all visible fields
      const matchSearch =
        !term ||
        emp.employeeCode?.toLowerCase().includes(term) ||
        (emp.biometricId && emp.biometricId.toLowerCase().includes(term)) ||
        emp.fullName?.toLowerCase().includes(term) ||
        (emp.citizenIdMasked && emp.citizenIdMasked.toLowerCase().includes(term)) ||
        (emp.divisionName && emp.divisionName.toLowerCase().includes(term)) ||
        (emp.departmentName && emp.departmentName.toLowerCase().includes(term)) ||
        (emp.positionName && emp.positionName.toLowerCase().includes(term)) ||
        (emp.contact?.organizationEmail && emp.contact.organizationEmail.toLowerCase().includes(term)) ||
        (emp.contact?.personalEmail && emp.contact.personalEmail.toLowerCase().includes(term)) ||
        (emp.contact?.personalPhone && emp.contact.personalPhone.includes(term));

      // 2. Department filter
      let matchDept = true;
      if (selectedDepartment && selectedDepartment !== 'ALL') {
        const selectedDeptObj = departments.find(
          (d) =>
            d.departmentName?.trim() === selectedDepartment.trim() ||
            d.departmentCode?.trim() === selectedDepartment.trim() ||
            String(d.id) === selectedDepartment
        );
        const targetName = (selectedDeptObj?.departmentName || selectedDepartment).trim().toLowerCase();
        const targetCode = (selectedDeptObj?.departmentCode || selectedDepartment).trim().toLowerCase();

        const empDeptName = (emp.departmentName || '').trim().toLowerCase();
        const empDeptCode = (emp.departmentCode || '').trim().toLowerCase();

        matchDept =
          empDeptName === targetName ||
          empDeptCode === targetCode ||
          (emp.departmentId !== undefined && emp.departmentId !== null && String(emp.departmentId) === String(selectedDeptObj?.id));
      }

      return matchSearch && matchDept;
    });

    // 3. Sorting
    return [...filtered].sort((a, b) => {
      // ดันคนที่ติดดาว (Favorite) ขึ้นมาไว้บนสุด โดยคนที่เพิ่งกดล่าสุดจะขึ้นมาอยู่คนแรกสุด
      const aFav = favorites[a.id];
      const bFav = favorites[b.id];
      const aTime = typeof aFav === 'number' ? aFav : (aFav ? 1 : 0);
      const bTime = typeof bFav === 'number' ? bFav : (bFav ? 1 : 0);

      if (aTime !== bTime) {
        if (aTime && !bTime) return -1;
        if (!aTime && bTime) return 1;
        return bTime - aTime; // timestamp มากกว่า (กดล่าสุด) อยู่ลำดับแรก
      }

      let aVal = '';
      let bVal = '';

      switch (sortField) {
        case 'employeeCode':
          aVal = a.employeeCode || '';
          bVal = b.employeeCode || '';
          break;
        case 'fullName':
          aVal = a.fullName || `${a.firstName} ${a.lastName}`;
          bVal = b.fullName || `${b.firstName} ${b.lastName}`;
          break;
        case 'citizenId':
          aVal = a.citizenIdMasked || '';
          bVal = b.citizenIdMasked || '';
          break;
        case 'division':
          aVal = a.divisionName || '';
          bVal = b.divisionName || '';
          break;
        case 'department':
          aVal = a.departmentName || '';
          bVal = b.departmentName || '';
          break;
        case 'position':
          aVal = a.positionName || '';
          bVal = b.positionName || '';
          break;
        case 'birthDate':
          aVal = a.birthDate || '';
          bVal = b.birthDate || '';
          break;
        case 'gender':
          aVal = a.gender || '';
          bVal = b.gender || '';
          break;
        case 'email':
          aVal = a.contact?.organizationEmail || a.contact?.personalEmail || '';
          bVal = b.contact?.organizationEmail || b.contact?.personalEmail || '';
          break;
        case 'phone':
          aVal = a.contact?.personalPhone || '';
          bVal = b.contact?.personalPhone || '';
          break;
        case 'status':
          aVal = a.employmentStatus || '';
          bVal = b.employmentStatus || '';
          break;
        default:
          aVal = a.employeeCode || '';
          bVal = b.employeeCode || '';
          break;
      }

      const comparison = String(aVal).localeCompare(String(bVal), 'th', { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [employees, searchTerm, selectedDepartment, departments, sortField, sortDirection, favorites]);

  // Pagination slice
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const handleDelete = async (id: number, name: string) => {
    const isConfirmed = await confirmDelete({
      title: 'ยืนยันการลบข้อมูลพนักงาน',
      text: `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลพนักงาน "${name}"? การดำเนินการนี้ไม่สามารถยกเลิกได้`,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
    });
    if (!isConfirmed) return;

    try {
      await employeeService.delete(id);
      toast.success('ลบข้อมูลพนักงานเรียบร้อย');
      loadData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || 'ไม่สามารถลบข้อมูลพนักงานได้');
    }
  };

  // เปลี่ยนสถานะการจ้างงานพนักงาน (ACTIVE | INACTIVE)
  const handleStatusChange = async (id: number, status: string) => {
    try {
      const updated = await employeeService.updateStatus(id, status);
      // อัปเดต state ใน list โดยตรงโดยไม่ต้อง reload ใหม่ทั้งหมด
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? { ...e, employmentStatus: updated.employmentStatus } : e)));
      const labels: Record<string, string> = { ACTIVE: 'ทำงานอยู่', INACTIVE: 'ไม่ได้ทำงาน' };
      toast.success(`เปลี่ยนสถานะเป็น "${labels[status] ?? status}" เรียบร้อยแล้ว`);
    } catch {
      toast.error('ไม่สามารถเปลี่ยนสถานะพนักงานได้');
    }
  };

  // Status Badge Mapper — 2 สถานะ: ACTIVE (ทำงานอยู่) / INACTIVE (ไม่ได้ทำงาน)
  const getStatusBadge = (emp: Employee) => {
    const status = emp.employmentStatus?.toUpperCase() ?? 'ACTIVE';
    if (status === 'INACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
          ไม่ได้ทำงาน
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        ทำงานอยู่
      </span>
    );
  };

  // Avatar colors for fallback
  const avatarColors = [
    'bg-primary text-white',
    'bg-teal-600 text-white',
    'bg-stone-400 text-white',
    'bg-amber-500 text-white',
    'bg-rose-500 text-white',
    'bg-blue-600 text-white',
    'bg-indigo-600 text-white',
  ];

  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canViewProfile = hasPermission('EMP_PROFILE_VIEW') || isSuper;
  const canCreateEmp = hasPermission('EMP_PROFILE_CREATE') || isSuper;
  const canEditEmp = hasPermission('EMP_PROFILE_EDIT') || isSuper;
  const canViewTypes = hasPermission('EMP_TYPE_VIEW') || isSuper;
  const canViewTransfers = hasPermission('EMP_TRANSFER_VIEW') || isSuper;
  const canViewContracts = hasPermission('EMP_CONTRACT_VIEW') || isSuper;
  const canViewDocs = hasPermission('EMP_DOC_VIEW') || isSuper;

  useEffect(() => {
    if (!canViewProfile) {
      if (canViewContracts) {
        router.replace('/employees/contracts');
      } else if (canViewTransfers) {
        router.replace('/employees/transfers');
      } else if (canViewTypes) {
        router.replace('/employees/types');
      } else if (canViewDocs) {
        router.replace('/employees/documents');
      }
    }
  }, [canViewProfile, canViewContracts, canViewTransfers, canViewTypes, canViewDocs, router]);

  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', active: true, show: canViewProfile },
    { title: 'ประเภทพนักงาน', href: '/employees/types', show: canViewTypes },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/transfers', show: canViewTransfers },
    { title: 'สัญญาจ้าง', href: '/employees/contracts', show: canViewContracts },
    { title: 'เอกสารใกล้หมดอายุ', href: '/employees/documents', show: canViewDocs },
  ].filter((tab) => tab.show);

  if (!canViewProfile) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์ดูทะเบียนประวัติพนักงาน"
        message="ขออภัย บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงหรือดูข้อมูลทะเบียนประวัติพนักงาน กรุณาติดต่อผู้ดูแลระบบ"
      />
    );
  }

  return (
    <div className="space-y-4 font-sans pb-12">
      {/* 1. Sub-Navigation Tabs (ตรงตามแถบด้านบนของ Figma & Mockup) */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {subNavTabs.map((tab) => {
            const isActive = tab.title === activeTab;
            return (
              <Link
                key={tab.title}
                href={tab.href}
                onClick={() => setActiveTab(tab.title)}
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

      {/* 2. Search Bar, Department Filter & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาพนักงาน"
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/90 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            />
          </div>

          {/* Department Filter Dropdown - ซ่อนสำหรับ role หัวหน้าแผนก (DEPT_MGR) */}
          {!isDeptManager && (
            <div className="shrink-0">
              <CustomSelect
                value={selectedDepartment}
                onChange={(val) => setSelectedDepartment(String(val))}
                placeholder="ทุกแผนก"
                className="min-w-[140px]"
                options={[
                  { value: 'ALL', label: 'ทุกแผนก' },
                  ...departments.map((dept) => ({
                    value: dept.departmentName,
                    label: dept.departmentName,
                  })),
                ]}
              />
            </div>
          )}
        </div>

        {/* Right Side: View Switcher (List vs Grid) + เพิ่มพนักงาน Button */}
        <div className="w-full sm:w-auto flex items-center justify-end gap-3">
          {/* View Mode Switcher Pill matching example */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => handleSetViewMode('table')}
              className={`p-1.5 transition-all cursor-pointer flex items-center justify-center ${
                viewMode === 'table'
                  ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-500 dark:text-sky-300 border-r border-sky-300 dark:border-sky-500'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
              title="มุมมองรายการ (List View)"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 transition-all cursor-pointer flex items-center justify-center ${
                viewMode === 'grid'
                  ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-500 dark:text-sky-300 border-l border-sky-300 dark:border-sky-500'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
              title="มุมมองการ์ด (Grid View)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {canCreateEmp && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่มพนักงาน
            </button>
          )}
        </div>
      </div>

      {/* 4. Employee Data Display (Table or Grid View) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        {viewMode === 'grid' ? (
          <div>
            {/* Grid Header Info Bar */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 text-xs">
              <div className="font-medium text-slate-600 dark:text-slate-400">
                พนักงาน{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {paginatedEmployees.length} / {filteredEmployees.length}
                </span>{' '}
                คน
              </div>
              <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>สถานะการจ้าง:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ทำงานอยู่
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 text-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span>กำลังโหลดข้อมูลพนักงาน...</span>
                </div>
              ) : paginatedEmployees.length === 0 ? (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs">
                  <p className="font-medium text-slate-600 dark:text-slate-400">ไม่พบข้อมูลพนักงาน</p>
                  <p className="mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกแผนกอื่น</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {paginatedEmployees.map((emp) => {
                    const statusInfo = getEmployeeStatusBadge(emp);
                    const hasComment = Boolean(comments[emp.id]);
                    const commentText = comments[emp.id] || '';
                    const avatarColor = avatarColors[(emp.id - 1) % avatarColors.length];

                    return (
                      <div
                        key={emp.id}
                        onClick={() => router.push(`/employees/${emp.id}`)}
                        className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-4 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all flex flex-col items-center text-center relative group cursor-pointer"
                      >
                        {/* Top Action Icons: Star & Info */}
                        <div className="absolute top-2.5 right-2.5 flex flex-col items-center gap-1 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(emp.id, emp.fullName);
                            }}
                            className="p-1 text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                            title={favorites[emp.id] ? 'ยกเลิกการติดดาว' : 'ติดดาวพนักงาน (ย้ายขึ้นอันดับแรก)'}
                          >
                            <Star
                              className={`w-4 h-4 transition-all ${
                                favorites[emp.id] ? 'fill-amber-400 text-amber-400 scale-110' : ''
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/employees/${emp.id}`);
                            }}
                            onMouseEnter={(e) => handleInfoMouseEnter(emp, e)}
                            onMouseLeave={handleInfoMouseLeave}
                            className={`p-1 transition-colors cursor-pointer ${
                              hoveredEmpTooltip?.emp.id === emp.id
                                ? 'text-primary dark:text-blue-400'
                                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                            }`}
                            title="ดูประวัติพนักงาน"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Avatar Photo Box Wrapper */}
                        <div className="relative group/avatar">
                          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 shadow-2xs relative flex items-center justify-center group-hover/avatar:scale-105 transition-transform">
                            {emp.avatarUrl ? (
                              <img
                                src={getAvatarUrl(emp.avatarUrl) || ''}
                                alt={emp.fullName}
                                className="w-full h-full object-cover rounded-2xl"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-full h-full ${
                                emp.avatarUrl ? 'absolute inset-0 -z-10' : ''
                              } flex items-center justify-center font-bold text-xl ${avatarColor}`}
                            >
                              {emp.firstName ? emp.firstName.charAt(0) : 'E'}
                            </div>
                          </div>

                          {/* Comment Indicator Button & Pill Tooltip (ตรงตามภาพ Image 1 & 2) */}
                          <div className="absolute -top-1 -left-1 z-30 group/comment">
                            {hasComment ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setCommentModalEmp(emp);
                                  setCommentInput(comments[emp.id] || '');
                                }}
                                className="w-6 h-6 rounded-full bg-[#0b2046] text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-slate-800 shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                                title="คลิกเพื่อแก้ไขคอมเมนต์"
                              >
                                !
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setCommentModalEmp(emp);
                                  setCommentInput('');
                                }}
                                className="w-6 h-6 rounded-full bg-[#0b2046]/75 hover:bg-[#0b2046] text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-slate-800 shadow-md opacity-0 group-hover/avatar:opacity-100 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                                title="คลิกเพื่อเพิ่มคอมเมนต์"
                              >
                                !
                              </button>
                            )}

                            {/* Hover Pill Tooltip matching Image 2 */}
                            {hasComment ? (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setCommentModalEmp(emp);
                                  setCommentInput(comments[emp.id] || '');
                                }}
                                className="hidden group-hover/comment:flex absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap items-center gap-2 bg-[#0b2046] text-white text-xs px-3.5 py-1.5 rounded-full shadow-2xl border border-white/20 cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                              >
                                <div className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  !
                                </div>
                                <span className="font-medium text-white">** {commentText}</span>
                              </div>
                            ) : (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setCommentModalEmp(emp);
                                  setCommentInput('');
                                }}
                                className="hidden group-hover/comment:flex absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap items-center gap-1.5 bg-[#0b2046] text-white text-xs px-3 py-1 rounded-full shadow-2xl border border-white/20 cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                              >
                                <span>คลิกเพื่อใส่คอมเมนต์</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Employee Name */}
                        <h4
                          className="mt-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors truncate w-full"
                          title={emp.fullName}
                        >
                          {emp.prefix ? `${emp.prefix} ` : ''}
                          {emp.firstName} {emp.lastName}
                        </h4>

                        {/* Department or Division */}
                        <p
                          className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate w-full"
                          title={emp.departmentName || emp.divisionName || emp.positionName || '-'}
                        >
                          {emp.departmentName
                            ? `แผนก ${emp.departmentName}`
                            : emp.divisionName
                            ? `ฝ่าย ${emp.divisionName}`
                            : emp.positionName || '-'}
                        </p>

                        {/* Status Badge */}
                        <div className="mt-3">
                          <span
                            className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.badgeClass}`}
                          >
                            {statusInfo.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto min-h-[380px]">
            <table className="table-standard w-full min-w-[1100px] text-left border-collapse text-xs whitespace-nowrap">
            {/* Table Header: Dark Navy Theme (#0B2046) */}
            <thead>
              <tr className="bg-primary text-white font-medium text-xs whitespace-nowrap">
                <th
                  onClick={() => handleSort('employeeCode')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>รหัสพนักงาน</span>
                    {sortField === 'employeeCode' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('fullName')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium min-w-[160px] cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>ชื่อ-นามสกุล</span>
                    {sortField === 'fullName' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('citizenId')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium min-w-[150px] cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>รหัสบัตรประชาชน</span>
                    {sortField === 'citizenId' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('division')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>ฝ่าย</span>
                    {sortField === 'division' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('department')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>แผนก</span>
                    {sortField === 'department' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('position')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium min-w-[130px] cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>ตำแหน่ง</span>
                    {sortField === 'position' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('birthDate')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>วันเกิด</span>
                    {sortField === 'birthDate' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('gender')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>เพศ</span>
                    {sortField === 'gender' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('email')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>อีเมล</span>
                    {sortField === 'email' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('phone')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>เบอร์โทร</span>
                    {sortField === 'phone' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-primary-hover transition-colors"
                  title="คลิกเพื่อเรียงลำดับ"
                >
                  <div className="flex items-center gap-1">
                    <span>สถานะ</span>
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/40 hover:text-white" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium text-center">จัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    กำลังโหลดข้อมูลพนักงาน...
                  </td>
                </tr>
              ) : paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    ไม่พบข้อมูลพนักงานในระบบ
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, index) => {
                  const hasComment = Boolean(comments[emp.id]);
                  const commentText = comments[emp.id];
                  const avatarColor = avatarColors[(emp.id - 1) % avatarColors.length];

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group text-slate-700 dark:text-slate-300"
                    >
                      {/* 1. รหัสพนักงาน + ติดดาว */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(emp.id, emp.fullName);
                            }}
                            className="p-0.5 text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400 transition-colors cursor-pointer shrink-0"
                            title={favorites[emp.id] ? 'ยกเลิกการติดดาว' : 'ติดดาวพนักงาน (ย้ายขึ้นอันดับแรก)'}
                          >
                            <Star
                              className={`w-3.5 h-3.5 transition-all ${
                                favorites[emp.id] ? 'fill-amber-400 text-amber-400 scale-110' : ''
                              }`}
                            />
                          </button>
                          <div>
                            <div className="font-mono text-slate-700 dark:text-slate-300 font-medium text-xs">{emp.employeeCode}</div>
                            {emp.biometricId && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5" title={`รหัสเครื่องสแกน: ${emp.biometricId}`}>
                                <span className="text-[9px] px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400 font-sans font-medium">สแกน:</span>
                                <span className="font-semibold text-slate-600 dark:text-slate-400">{emp.biometricId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. ชื่อ-นามสกุล + โปรไฟล์ + เครื่องหมาย ! คอมเมนต์ */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar Container พร้อมปุ่มและ Tooltip */}
                          <div className="relative shrink-0 group/avatar">
                            <button
                              type="button"
                              onClick={() => {
                                setCommentModalEmp(emp);
                                setCommentInput(comments[emp.id] || '');
                              }}
                              className="relative w-7 h-7 rounded-full overflow-hidden flex items-center justify-center font-bold text-[11px] shadow-2xs hover:ring-2 hover:ring-primary/40 transition-all focus:outline-none"
                              title={hasComment ? `คอมเมนต์: ${commentText}` : 'คลิกเพื่อเพิ่มคอมเมนต์'}
                            >
                              {emp.avatarUrl ? (
                                <img
                                  src={getAvatarUrl(emp.avatarUrl)!}
                                  alt={emp.fullName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <span className={`w-full h-full ${emp.avatarUrl ? 'absolute inset-0 -z-10' : ''} flex items-center justify-center text-[10px] ${avatarColor}`}>
                                {emp.firstName ? emp.firstName.charAt(0) : 'U'}
                              </span>
                            </button>

                            {/* Badge เครื่องหมาย ! สไตล์ Figma (แสดงเมื่อมีคอมเมนต์) */}
                            {hasComment && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCommentModalEmp(emp);
                                  setCommentInput(comments[emp.id] || '');
                                }}
                                className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-[#0b2046] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                                title="คลิกเพื่อแก้ไขคอมเมนต์"
                              >
                                !
                              </button>
                            )}

                            {/* Tooltip เมื่อเอา mouse ไป hold (hover) เหนือ avatar หรือ badge */}
                            {hasComment ? (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCommentModalEmp(emp);
                                  setCommentInput(comments[emp.id] || '');
                                }}
                                className="hidden group-hover/avatar:flex absolute left-8 -top-2 z-50 whitespace-nowrap items-center gap-2 bg-[#0b2046] text-white text-xs px-3.5 py-1.5 rounded-full shadow-2xl border border-white/20 cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                              >
                                <div className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  !
                                </div>
                                <span className="font-medium text-white">** {commentText}</span>
                              </div>
                            ) : (
                              /* หากยังไม่มีคอมเมนต์ เมื่อ hover แสดง tooltip แจ้งให้คลิกเพื่อกรอก */
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCommentModalEmp(emp);
                                  setCommentInput('');
                                }}
                                className="hidden group-hover/avatar:flex absolute left-8 -top-2 z-50 whitespace-nowrap items-center gap-1.5 bg-[#0b2046] text-white text-xs px-3 py-1 rounded-full shadow-lg border border-white/20 cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                              >
                                <span>คลิกเพื่อใส่คอมเมนต์</span>
                              </div>
                            )}
                          </div>

                          {/* ชื่อเต็ม */}
                          <Link
                            href={`/employees/${emp.id}`}
                            className="font-medium text-slate-800 dark:text-slate-200 hover:text-primary hover:underline"
                          >
                            {emp.prefix} {emp.firstName} {emp.lastName}
                          </Link>
                        </div>
                      </td>

                      {/* 3. รหัสบัตรประชาชน */}
                      <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatMaskedCitizenId(emp.citizenIdMasked)}
                      </td>

                      {/* 4. ฝ่าย */}
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.divisionName || '-'}
                      </td>

                      {/* 5. แผนก */}
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.departmentName || '-'}
                      </td>

                      {/* 6. ตำแหน่ง */}
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.positionName || '-'}
                      </td>

                      {/* 7. วันเกิด */}
                      <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatBirthDate(emp.birthDate)}
                      </td>

                      {/* 8. เพศ */}
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {getGenderDisplay(emp.gender, emp.genderId, emp.prefix)}
                      </td>

                      {/* 9. อีเมล */}
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.contact?.organizationEmail || emp.contact?.personalEmail || '-'}
                      </td>

                      {/* 10. เบอร์โทร */}
                      <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatPhoneNumber(emp.contact?.personalPhone)}
                      </td>

                      {/* 11. สถานะ */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {getStatusBadge(emp)}
                      </td>

                      {/* 12. ปุ่มจัดการ (จุด 3 จุด ⋮ พร้อม Dropdown ตามภาพ 2 ใน Figma) */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <ActionDropdown menuClassName="w-48">
                          {(close) => (
                            <>
                              {/* 1. ดูข้อมูลพนักงาน */}
                              <Link
                                href={`/employees/${emp.id}`}
                                onClick={close}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors font-medium"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span>ดูข้อมูลพนักงาน</span>
                              </Link>

                              {/* 2. แก้ไขข้อมูลพนักงาน */}
                              {canEditEmp && (
                                <Link
                                  href={`/employees/${emp.id}/edit`}
                                  onClick={close}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors font-medium"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  <span>แก้ไขข้อมูลพนักงาน</span>
                                </Link>
                              )}

                              {/* 4. เปลี่ยนสถานะการจ้างงาน */}
                              {canEditEmp && (
                                <div className="border-t border-slate-100 dark:border-slate-700/60 pt-1">
                                  <p className="px-3.5 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wide">เปลี่ยนสถานะ</p>
                                  {[
                                    { value: 'ACTIVE', label: 'ทำงานอยู่', color: 'text-emerald-600', dot: 'bg-emerald-500' },
                                    { value: 'INACTIVE', label: 'ไม่ได้ทำงาน', color: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-300' },
                                  ].map((s) => {
                                    const isCurrentStatus = (emp.employmentStatus?.toUpperCase() ?? 'ACTIVE') === s.value;
                                    return (
                                      <button
                                        key={s.value}
                                        type="button"
                                        disabled={isCurrentStatus}
                                        onClick={() => {
                                          handleStatusChange(emp.id, s.value);
                                          close();
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-3.5 py-1.5 text-xs transition-colors ${
                                          isCurrentStatus
                                            ? 'opacity-40 cursor-not-allowed ' + s.color
                                            : s.color + ' hover:bg-slate-50 cursor-pointer font-medium'
                                        }`}
                                      >
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`}></span>
                                        <span>{s.label}</span>
                                        {isCurrentStatus && <span className="ml-auto text-[10px] font-semibold opacity-70">✓</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* 5. ลบข้อมูล */}
                              {canEditEmp && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDelete(emp.id, emp.fullName);
                                    close();
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100 font-medium cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>ลบข้อมูล</span>
                                </button>
                              )}
                            </>
                          )}
                        </ActionDropdown>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* 5. Footer: Rows per page (ซ้ายล่าง) & Pagination (ขวาล่าง) */}
        <div className="py-3 px-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* ซ้ายล่าง: Rows per page selector */}
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <span>แสดง</span>
            <CustomSelect
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
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
            <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-[11px] ml-1">
              (ทั้งหมด {filteredEmployees.length} รายการ)
            </span>
          </div>

          {/* ขวาล่าง: Pagination Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Previous Page Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="หน้าก่อนหน้า"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Dynamic Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                  currentPage === p
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}

            {/* Next Page Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="หน้าถัดไป"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Modal / Popover สำหรับเพิ่มหรือแก้ไข Comment ของพนักงานรายคน */}
      {commentModalEmp && (
        <ModalShell className="z-50 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#0b2046] text-white flex items-center justify-center text-xs font-bold ring-2 ring-white/60">
                  !
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  คอมเมนต์สำหรับ: {commentModalEmp.fullName}
                </h3>
              </div>
              <button
                onClick={() => setCommentModalEmp(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 block">
                ระบุหมายเหตุ/ข้อควรระวังสำหรับ HR หรือ Admin (เช่น พนักงานคนนี้ป่วยห้ามใช้งานหนัก):
              </label>
              <textarea
                rows={3}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSaveComment(commentModalEmp.id, commentInput);
                  }
                }}
                placeholder="พิมพ์คอมเมนต์ตรงนี้... (กด Ctrl+Enter เพื่อบันทึก)"
                className={inputClass}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {comments[commentModalEmp.id] && (
                <button
                  type="button"
                  onClick={() => handleSaveComment(commentModalEmp.id, '')}
                  className="text-xs text-rose-600 hover:underline"
                >
                  ลบคอมเมนต์นี้
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setCommentModalEmp(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveComment(commentModalEmp.id, commentInput)}
                  className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  บันทึกคอมเมนต์
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 7. Modal: ดูรายละเอียดพนักงาน (Detail View) */}
      {isDetailOpen && selectedEmployee && (
        <ModalShell className="z-50 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center">
                  {selectedEmployee.firstName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedEmployee.fullName}</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400 font-mono">รหัส: {selectedEmployee.employeeCode}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400 block">เลขบัตรประชาชน (PDPA Masked)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                    {selectedEmployee.citizenIdMasked || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400 block">วันเดือนปีเกิด</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                    {formatBirthDate(selectedEmployee.birthDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400 block">อีเมล</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                    {selectedEmployee.contact?.organizationEmail || selectedEmployee.contact?.personalEmail || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400 block">เบอร์โทรศัพท์</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                    {formatPhoneNumber(selectedEmployee.contact?.personalPhone)}
                  </span>
                </div>
              </div>

              {comments[selectedEmployee.id] && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/80 rounded-xl flex items-start gap-2 text-amber-900">
                  <div className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    !
                  </div>
                  <div>
                    <span className="font-semibold block">คอมเมนต์สำหรับ HR:</span>
                    <p className="mt-0.5">{comments[selectedEmployee.id]}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Modal: เพิ่มพนักงานใหม่ (ดีไซน์เดียวกับ EditEmployeeModal) */}
      <CreateEmployeeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        existingEmployees={employees}
      />

      {/* Floating Employee Info Tooltip Portal (anchored to (i) button matching reference mockup) */}
      {isMounted && hoveredEmpTooltip && typeof document !== 'undefined' && createPortal(
        (() => {
          const { emp, anchorRect } = hoveredEmpTooltip;
          const statusInfo = getEmployeeStatusBadge(emp);
          const TOOLTIP_WIDTH = 420;
          const TOOLTIP_HEIGHT = 320;

          const targetX = anchorRect.left + anchorRect.width / 2;
          const targetY = anchorRect.top;

          // Ideal left puts the arrow ~72px from the right edge of tooltip
          const idealLeft = targetX - (TOOLTIP_WIDTH - 72);
          const minLeft = 12;
          const maxLeft = Math.max(12, window.innerWidth - TOOLTIP_WIDTH - 12);
          const left = Math.max(minLeft, Math.min(maxLeft, idealLeft));
          const arrowLeft = Math.max(20, Math.min(TOOLTIP_WIDTH - 20, targetX - left));

          const showAbove = targetY - TOOLTIP_HEIGHT - 12 > 10;
          const top = showAbove
            ? targetY - TOOLTIP_HEIGHT - 10
            : anchorRect.bottom + 10;

          const rows = [
            {
              icon: Hash,
              label: 'รหัส',
              value: emp.employeeCode || emp.biometricId || String(emp.id).padStart(7, '0'),
            },
            {
              icon: Info,
              label: 'อีเมล',
              value: emp.contact?.organizationEmail || emp.contact?.personalEmail || (emp.fullName ? `${emp.firstName.toLowerCase()}@hotmail.com` : '-'),
            },
            {
              icon: UserCog,
              label: 'บทบาท',
              value: emp.userAccount?.roleNames?.[0] || emp.userAccount?.roles?.[0] || 'Staff',
            },
            {
              icon: Armchair,
              label: 'ตำแหน่ง',
              value: emp.positionName || '-',
            },
            {
              icon: Clock,
              label: 'กะการทำงาน',
              value: '(SHIFT101) เวลาทำงาน 08:00 - 17:00',
            },
            {
              icon: CircleDollarSign,
              label: 'ประเภทการจ่ายเงิน',
              value: emp.employeeType?.includes('รายวัน') ? 'รายวัน' : 'รายเดือน',
            },
            {
              icon: Folder,
              label: 'ประเภทการจ้าง',
              value: emp.employeeType || 'ประจำ',
            },
            {
              icon: Contact,
              label: 'สถานะ',
              value: statusInfo.text,
            },
            {
              icon: Briefcase,
              label: 'วันที่เริ่มทำงาน',
              value: formatHireDateAndTenure(emp.createdAt),
            },
          ];

          return (
            <div
              style={{
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                width: `${TOOLTIP_WIDTH}px`,
                zIndex: 9999,
              }}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
              className="bg-[#6d6d6d] text-white rounded-xl shadow-2xl shadow-black/40 border border-white/10 p-4 select-none pointer-events-auto transition-opacity duration-150"
            >
              {/* Arrow Triangle */}
              {showAbove ? (
                <svg
                  className="absolute -bottom-2 text-[#6d6d6d] drop-shadow-xs pointer-events-none"
                  style={{ left: `${arrowLeft}px`, transform: 'translateX(-50%)' }}
                  width="18"
                  height="9"
                  viewBox="0 0 18 9"
                  fill="currentColor"
                >
                  <path d="M0 0L9 9L18 0H0Z" />
                </svg>
              ) : (
                <svg
                  className="absolute -top-2 text-[#6d6d6d] drop-shadow-xs pointer-events-none"
                  style={{ left: `${arrowLeft}px`, transform: 'translateX(-50%)' }}
                  width="18"
                  height="9"
                  viewBox="0 0 18 9"
                  fill="currentColor"
                >
                  <path d="M0 9L9 0L18 9H0Z" />
                </svg>
              )}

              {/* Rows */}
              <div className="space-y-2 text-xs sm:text-[13px] leading-relaxed">
                {rows.map((row, idx) => {
                  const IconComp = row.icon;
                  return (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className="w-5 flex items-center justify-center shrink-0">
                        <IconComp className="w-4 h-4 text-white" />
                      </div>
                      <span className="w-28 sm:w-32 shrink-0 text-white font-medium text-left">
                        {row.label}
                      </span>
                      <span className="text-white font-medium shrink-0 mr-1">:</span>
                      <span className="text-white font-normal truncate text-left flex-1" title={String(row.value)}>
                        {row.value}
                      </span>
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

