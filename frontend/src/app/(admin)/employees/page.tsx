'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useEmployeeTypeOptions } from '@/hooks/useEmployeeTypeOptions';
import { employeeService } from '@/services/employeeService';
import { apiClient, getAvatarUrl } from '@/lib/api-client';
import { Employee, CreateEmployeePayload } from '@/types/employee';
import { NATIONALITIES } from '@/constants/nationalities';
import { NationalitySelect } from '@/components/ui/NationalitySelect';
import { useToast } from '@/context/ToastContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { confirmDelete } from '@/lib/sweetalert';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';
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
} from 'lucide-react';
import { AccessDenied } from '@/components/common/AccessDenied';
import { bankService } from '@/services/bankService';
import { useMasterLookups, lookupId } from '@/hooks/useMasterLookups';
import { organizationService } from '@/services/organizationService';
import type { Position } from '@/types/organization';
import type { Bank } from '@/types/api';

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
    return `${digits[0]}-${digits.substring(1, 5)}-xxxxx-xx-${digits[12]}`;
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


export default function EmployeesPage() {
  const { user, hasPermission, hasRole, getDataScope } = useAuth();
  const toast = useToast();
  const { setBreadcrumb } = useBreadcrumb();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [activeTab, setActiveTab] = useState('จัดการพนักงาน');

  // สัญชาติ / ศาสนา / สถานภาพสมรส จากเมนู ข้อมูลหลัก
  const lookups = useMasterLookups();

  // ตำแหน่งจากโครงสร้างองค์กร (เฉพาะที่เปิดใช้งาน) — ไม่ใช้รายชื่อตายตัว
  const [positions, setPositions] = useState<Position[]>([]);
  useEffect(() => {
    organizationService
      .getPositions()
      .then((list) => setPositions(list.filter((p) => p.status === 'ACTIVE')))
      .catch(() => setPositions([]));
  }, []);

  // ธนาคารจากข้อมูลหลัก (ใช้ตรวจจำนวนหลักเลขบัญชีตามที่ตั้งไว้ในข้อมูลหลัก)
  const [banks, setBanks] = useState<Bank[]>([]);
  useEffect(() => {
    bankService
      .getAll()
      .then((list) => setBanks(list.filter((b) => b.status === 'ACTIVE')))
      .catch(() => setBanks([]));
  }, []);
  /** จำนวนหลักเลขบัญชีของธนาคาร (null = ไม่กำหนด ตรวจแค่ 6–20 หลัก) */
  const getRequiredBankDigits = (bankName?: string): number | null =>
    banks.find((b) => b.bankName === bankName)?.accountDigits ?? null;

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Modal Tabs & Family Member state
  const [activeModalTab, setActiveModalTab] = useState<'personal' | 'family' | 'emergency'>('personal');
  const [activeFamilyIndex, setActiveFamilyIndex] = useState(0);

  // Form State for creating employee
  const initialFormData: CreateEmployeePayload = {
    employeeCode: '',
    biometricId: '',
    prefix: '',
    firstName: '',
    lastName: '',
    citizenId: '',
    gender: '',
    nationality: 'ไทย',
    religion: '',
    birthDate: '',
    maritalStatus: '',
    militaryStatus: '',
    addressType: 'บ้านตัวเอง',
    addressLine: '',
    subDistrict: '',
    district: '',
    province: '',
    postalCode: '',
    personalEmail: '',
    organizationEmail: '',
    personalPhone: '',
    educationLevel: '',
    institution: '',
    major: '',
    graduationYear: 2569,
    gpa: undefined,
    bankName: '',
    accountNumber: '',
    positionName: '',
    employeeType: '',
    managerEmployeeId: null,
    familyMembers: [],
    emergencyContact: {
      relationship: 'บิดา',
      prefix: '',
      firstName: '',
      lastName: '',
      address: '',
      primaryPhone: '',
    },
  };

  const [formData, setFormData] = useState<CreateEmployeePayload>(initialFormData);
  const employeeTypeOptions = useEmployeeTypeOptions();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

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
  }, [employees, searchTerm, selectedDepartment, departments, sortField, sortDirection]);

  // Pagination slice
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddFamilyMember = () => {
    const current = formData.familyMembers || [];
    const nextIdx = current.length;
    setFormData({
      ...formData,
      familyMembers: [
        ...current,
        {
          relationshipType: 'บิดา',
          prefix: '',
          firstName: '',
          lastName: '',
          citizenId: '',
          birthDate: '',
        },
      ],
    });
    setActiveFamilyIndex(nextIdx);
  };

  const handleRemoveFamilyMember = (indexToRemove: number) => {
    const current = formData.familyMembers || [];
    const updated = current.filter((_, idx) => idx !== indexToRemove);
    setFormData({ ...formData, familyMembers: updated });
    setActiveFamilyIndex(Math.max(0, updated.length - 1));
  };

  const personalErrorKeys = [
    'employeeCode',
    'prefix',
    'firstName',
    'lastName',
    'citizenId',
    'gender',
    'nationality',
    'birthDate',
    'maritalStatus',
    'militaryStatus',
    'addressType',
    'addressLine',
    'subDistrict',
    'district',
    'province',
    'postalCode',
    'personalEmail',
    'organizationEmail',
    'personalPhone',
    'educationLevel',
    'institution',
    'major',
    'graduationYear',
    'gpa',
    'bankName',
    'accountNumber',
    'positionName',
    'employeeType',
  ];

  const emergencyErrorKeys = [
    'emergency_relationship',
    'emergency_prefix',
    'emergency_firstName',
    'emergency_lastName',
    'emergency_address',
    'emergency_primaryPhone',
  ];

  const personalErrorsCount = Object.keys(formErrors).filter((k) => personalErrorKeys.includes(k)).length;
  const emergencyErrorsCount = Object.keys(formErrors).filter((k) => emergencyErrorKeys.includes(k)).length;
  const familyErrorsCount = Object.keys(formErrors).filter((k) => !personalErrorKeys.includes(k) && !emergencyErrorKeys.includes(k)).length;

  const clearFieldError = (key: string) => {
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateCreateForm = (data: CreateEmployeePayload): Record<string, string> => {
    const errors: Record<string, string> = {};

    // 1. Tab Personal - ข้อมูลส่วนบุคคล
    if (!data.employeeCode?.trim()) errors.employeeCode = 'กรุณากรอกรหัสพนักงาน';
    if (!data.prefix || data.prefix === 'เลือกคำนำหน้า') errors.prefix = 'กรุณาเลือกคำนำหน้า';
    if (!data.firstName?.trim()) errors.firstName = 'กรุณากรอกชื่อ';
    if (!data.lastName?.trim()) errors.lastName = 'กรุณากรอกนามสกุล';

    const citizenDigits = (data.citizenId || '').replace(/\D/g, '');
    if (!data.citizenId?.trim()) {
      errors.citizenId = 'กรุณากรอกเลขบัตรประชาชน';
    } else if (citizenDigits.length !== 13) {
      errors.citizenId = 'เลขบัตรประชาชนต้องมี 13 หลัก';
    }

    if (!data.gender || data.gender === 'เลือกเพศ') errors.gender = 'กรุณาเลือกเพศ';
    if (!data.nationality || data.nationality === 'เลือกสัญชาติ') errors.nationality = 'กรุณาเลือกสัญชาติ';
    const todayStr = new Date().toISOString().split('T')[0];
    if (!data.birthDate?.trim()) {
      errors.birthDate = 'กรุณาเลือกวันเกิด';
    } else if (data.birthDate > todayStr) {
      errors.birthDate = 'วันเกิดต้องไม่ใช่วันในอนาคต';
    }
    if (!data.maritalStatus || data.maritalStatus === 'เลือกสถานภาพ') errors.maritalStatus = 'กรุณาเลือกสถานภาพสมรส';
    if (!data.militaryStatus || data.militaryStatus === 'เลือกสถานภาพทางทหาร') errors.militaryStatus = 'กรุณาเลือกสถานภาพทางทหาร';

    // ที่อยู่
    if (!data.addressType?.trim()) errors.addressType = 'กรุณาเลือกประเภทที่อยู่';
    if (!data.addressLine?.trim()) errors.addressLine = 'กรุณากรอกบ้านเลขที่';
    if (!data.subDistrict?.trim()) errors.subDistrict = 'กรุณากรอกตำบล / แขวง';
    if (!data.district?.trim()) errors.district = 'กรุณากรอกอำเภอ / เขต';
    if (!data.province?.trim()) errors.province = 'กรุณากรอกจังหวัด';

    const postalDigits = (data.postalCode || '').replace(/\D/g, '');
    if (!data.postalCode?.trim()) {
      errors.postalCode = 'กรุณากรอกรหัสไปรษณีย์';
    } else if (postalDigits.length !== 5) {
      errors.postalCode = 'รหัสไปรษณีย์ต้องมี 5 หลัก';
    }

    // ช่องทางการติดต่อ & การศึกษา
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.personalEmail?.trim()) {
      errors.personalEmail = 'กรุณากรอกอีเมลส่วนตัว';
    } else if (!emailRegex.test(data.personalEmail.trim())) {
      errors.personalEmail = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    if (!data.organizationEmail?.trim()) {
      errors.organizationEmail = 'กรุณากรอกอีเมลองค์กร';
    } else if (!emailRegex.test(data.organizationEmail.trim())) {
      errors.organizationEmail = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    const phoneDigits = (data.personalPhone || '').replace(/\D/g, '');
    if (!data.personalPhone?.trim()) {
      errors.personalPhone = 'กรุณากรอกเบอร์โทรศัพท์ส่วนตัว';
    } else if (phoneDigits.length < 9 || phoneDigits.length > 10) {
      errors.personalPhone = 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก';
    }

    if (!data.educationLevel || data.educationLevel === 'เลือกวุฒิการศึกษา') errors.educationLevel = 'กรุณาเลือกวุฒิการศึกษา';
    if (!data.institution?.trim()) errors.institution = 'กรุณากรอกชื่อสถาบันการศึกษา';
    if (!data.major?.trim()) errors.major = 'กรุณากรอกสาขาวิชา';
    if (!data.graduationYear) errors.graduationYear = 'กรุณาเลือกปีที่สำเร็จการศึกษา';

    if (data.gpa === undefined || data.gpa === null || isNaN(Number(data.gpa))) {
      errors.gpa = 'กรุณากรอกเกรดเฉลี่ยสะสม';
    } else if (Number(data.gpa) < 0 || Number(data.gpa) > 4) {
      errors.gpa = 'เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00 - 4.00';
    }

    // การเงิน & ตำแหน่งงาน
    if (!data.bankName || data.bankName === 'เลือกธนาคาร') {
      errors.bankName = 'กรุณาเลือกธนาคาร';
    }
    const reqBankDigits = getRequiredBankDigits(data.bankName);
    const cleanAccountDigits = (data.accountNumber || '').replace(/\D/g, '');
    if (!data.accountNumber?.trim()) {
      errors.accountNumber = 'กรุณากรอกเลขที่บัญชี';
    } else if (reqBankDigits != null && cleanAccountDigits.length !== reqBankDigits) {
      errors.accountNumber = `เลขที่บัญชีต้องมี ${reqBankDigits} หลัก (ปัจจุบัน ${cleanAccountDigits.length} หลัก)`;
    } else if (reqBankDigits == null && (cleanAccountDigits.length < 6 || cleanAccountDigits.length > 20)) {
      errors.accountNumber = 'เลขที่บัญชีต้องมี 6–20 หลัก';
    }
    if (!data.positionName || data.positionName === 'เลือกตำแหน่ง') errors.positionName = 'กรุณาเลือกตำแหน่ง';
    if (!data.employeeType || data.employeeType === 'เลือกประเภท') errors.employeeType = 'กรุณาเลือกประเภทพนักงาน';

    // 2. Tab Family - สมาชิกครอบครัว (ไม่บังคับ แต่ถ้ากรอกข้อมูลคนใดคนหนึ่ง ต้องกรอกชื่อและข้อมูลให้สมบูรณ์)
    if (data.familyMembers && data.familyMembers.length > 0) {
      data.familyMembers.forEach((fm, idx) => {
        const hasAnyData = Boolean(
          fm.firstName?.trim() ||
          fm.lastName?.trim() ||
          fm.citizenId?.trim() ||
          fm.birthDate?.trim() ||
          (fm.prefix && fm.prefix !== 'เลือกคำนำหน้า')
        );

        if (hasAnyData) {
          if (!fm.relationshipType) errors[`family_${idx}_relationshipType`] = 'กรุณาเลือกความสัมพันธ์';
          if (!fm.prefix || fm.prefix === 'เลือกคำนำหน้า') errors[`family_${idx}_prefix`] = 'กรุณาเลือกคำนำหน้า';
          if (!fm.firstName?.trim()) errors[`family_${idx}_firstName`] = 'กรุณากรอกชื่อ';
          if (!fm.lastName?.trim()) errors[`family_${idx}_lastName`] = 'กรุณากรอกนามสกุล';

          const fmCitizenDigits = (fm.citizenId || '').replace(/\D/g, '');
          if (fm.citizenId?.trim() && fmCitizenDigits.length !== 13) {
            errors[`family_${idx}_citizenId`] = 'เลขบัตรประชาชนต้องมี 13 หลัก';
          }

          if (fm.birthDate?.trim() && fm.birthDate > todayStr) {
            errors[`family_${idx}_birthDate`] = 'วันเกิดต้องไม่ใช่วันในอนาคต';
          }
        }
      });
    }

    // กรณีฉุกเฉินติดต่อใคร
    const ec = data.emergencyContact;
    if (!ec?.relationship) errors['emergency_relationship'] = 'กรุณาเลือกความสัมพันธ์';
    if (!ec?.prefix || ec.prefix === 'เลือกคำนำหน้า') errors['emergency_prefix'] = 'กรุณาเลือกคำนำหน้า';
    if (!ec?.firstName?.trim()) errors['emergency_firstName'] = 'กรุณากรอกชื่อ';
    if (!ec?.lastName?.trim()) errors['emergency_lastName'] = 'กรุณากรอกนามสกุล';
    if (!ec?.address?.trim()) errors['emergency_address'] = 'กรุณากรอกที่อยู่';

    const ecPhoneDigits = (ec?.primaryPhone || '').replace(/\D/g, '');
    if (!ec?.primaryPhone?.trim()) {
      errors['emergency_primaryPhone'] = 'กรุณากรอกเบอร์โทร';
    } else if (ecPhoneDigits.length < 9 || ecPhoneDigits.length > 10) {
      errors['emergency_primaryPhone'] = 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก';
    }

    return errors;
  };

  const getFieldClass = (fieldName: string, isMono = false) => {
    const hasError = hasAttemptedSubmit && Boolean(formErrors[fieldName]);
    return `w-full px-3.5 py-2 bg-white dark:bg-slate-800 rounded-lg text-xs transition-all ${
      isMono ? 'font-mono' : ''
    } ${
      hasError
        ? 'border-2 border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-slate-900 dark:text-slate-100 placeholder:text-rose-300 focus:outline-none focus:border-rose-600 focus:ring-rose-500/30'
        : 'border border-slate-200 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]'
    }`;
  };

  const renderFieldError = (fieldName: string) => {
    if (!hasAttemptedSubmit || !formErrors[fieldName]) return null;
    return (
      <span className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 shrink-0 text-rose-500" />
        {formErrors[fieldName]}
      </span>
    );
  };

  const handleOpenCreateModal = async () => {
    setFormData(initialFormData);
    setFormErrors({});
    setHasAttemptedSubmit(false);
    setActiveModalTab('personal');
    setActiveFamilyIndex(0);
    setIsCreateModalOpen(true);

    // Auto-generate next employee code (fetch from API, fallback to local compute)
    try {
      const nextCode = await employeeService.getNextCode();
      setFormData((prev) => ({ ...prev, employeeCode: nextCode }));
    } catch {
      // Fallback: compute from current employees list
      let maxCode = 0;
      for (const emp of employees) {
        const m = emp.employeeCode?.match(/^EMP(\d+)$/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxCode) maxCode = num;
        }
      }
      const nextCode = `EMP${String(maxCode + 1).padStart(4, '0')}`;
      setFormData((prev) => ({ ...prev, employeeCode: nextCode }));
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setFormErrors({});
    setHasAttemptedSubmit(false);
    setActiveModalTab('personal');
    setActiveFamilyIndex(0);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateCreateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setHasAttemptedSubmit(true);

      const hasPersonalError = Object.keys(errors).some((k) => personalErrorKeys.includes(k));
      const hasFamilyError = Object.keys(errors).some((k) => !personalErrorKeys.includes(k) && !emergencyErrorKeys.includes(k));
      const hasEmergencyError = Object.keys(errors).some((k) => emergencyErrorKeys.includes(k));

      if (activeModalTab === 'personal' && !hasPersonalError) {
        if (hasFamilyError) setActiveModalTab('family');
        else if (hasEmergencyError) setActiveModalTab('emergency');
      } else if (activeModalTab === 'family' && !hasFamilyError) {
        if (hasPersonalError) setActiveModalTab('personal');
        else if (hasEmergencyError) setActiveModalTab('emergency');
      } else if (activeModalTab === 'emergency' && !hasEmergencyError) {
        if (hasPersonalError) setActiveModalTab('personal');
        else if (hasFamilyError) setActiveModalTab('family');
      }

      if (hasFamilyError) {
        const firstFmErrIdx = formData.familyMembers?.findIndex((_, idx) =>
          Object.keys(errors).some((k) => k.startsWith(`family_${idx}_`))
        );
        if (firstFmErrIdx !== undefined && firstFmErrIdx >= 0) {
          setActiveFamilyIndex(firstFmErrIdx);
        }
      }

      return;
    }

    setIsSubmitting(true);
    try {
      const addressItem = {
        addressType: 'CURRENT',
        addressLine: formData.addressLine?.trim() || '',
        subDistrict: formData.subDistrict?.trim() || '',
        district: formData.district?.trim() || '',
        province: formData.province?.trim() || '',
        postalCode: formData.postalCode?.trim() || '',
        isCurrent: true,
      };

      const payload: CreateEmployeePayload = {
        ...formData,
        employeeCode: formData.employeeCode.trim(),
        biometricId: formData.biometricId?.trim() || undefined,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        citizenId: formData.citizenId?.trim() || undefined,
        prefix: formData.prefix && formData.prefix !== 'เลือกคำนำหน้า' ? formData.prefix : undefined,
        gender: formData.gender && formData.gender !== 'เลือกเพศ' ? formData.gender : undefined,
        genderId: formData.gender === 'ชาย' ? 1 : (formData.gender === 'หญิง' ? 2 : (formData.gender === 'ไม่ระบุ' ? 3 : undefined)),
        nationality: formData.nationality && formData.nationality !== 'เลือกสัญชาติ' ? formData.nationality : 'ไทย (Thai)',
        // ศาสนาเป็นข้อมูลอ่อนไหว (PDPA) → ไม่บังคับ และไม่ใส่ค่าให้เอง
        religion: formData.religion && formData.religion !== 'เลือกศาสนา' ? formData.religion : undefined,
        religionId: lookupId(lookups.religions, formData.religion),
        maritalStatus: formData.maritalStatus && formData.maritalStatus !== 'เลือกสถานภาพ' ? formData.maritalStatus : undefined,
        maritalStatusId: lookupId(lookups.maritalStatuses, formData.maritalStatus),
        nationalityId: lookupId(lookups.nationalities, formData.nationality),
        militaryStatus: formData.militaryStatus && formData.militaryStatus !== 'เลือกสถานภาพทางทหาร' ? formData.militaryStatus : undefined,
        educationLevel: formData.educationLevel && formData.educationLevel !== 'เลือกวุฒิการศึกษา' ? formData.educationLevel : undefined,
        institution: formData.institution && formData.institution !== 'เลือกสถาบันการศึกษา' ? formData.institution : undefined,
        bankName: formData.bankName && formData.bankName !== 'เลือกธนาคาร' ? formData.bankName : undefined,
        bankId: banks.find((b) => b.bankName === formData.bankName)?.id,
        accountNumber: formData.accountNumber?.trim() ? formData.accountNumber.replace(/\D/g, '') : undefined,
        positionName: formData.positionName && formData.positionName !== 'เลือกตำแหน่ง' ? formData.positionName : undefined,
        positionId: formData.positionId,
        employeeType: formData.employeeType && formData.employeeType !== 'เลือกประเภท' ? formData.employeeType : undefined,
        managerEmployeeId: formData.managerEmployeeId || null,
        setManager: true,
        addresses: [addressItem],
        familyMembers: formData.familyMembers?.filter((f) => f.firstName?.trim()).map((f) => ({
          ...f,
          relationshipType: f.relationshipType || 'บิดา',
          prefix: f.prefix || undefined,
          firstName: f.firstName.trim(),
          lastName: f.lastName?.trim() || '-',
          citizenId: f.citizenId?.trim() || undefined,
          birthDate: f.birthDate?.trim() || undefined,
        })),
        emergencyContact: formData.emergencyContact?.firstName?.trim() ? {
          ...formData.emergencyContact,
          relationship: formData.emergencyContact.relationship || 'บิดา',
          prefix: formData.emergencyContact.prefix || undefined,
          firstName: formData.emergencyContact.firstName.trim(),
          lastName: formData.emergencyContact.lastName?.trim() || '-',
          address: formData.emergencyContact.address?.trim() || '-',
          primaryPhone: formatPhoneNumber(formData.emergencyContact.primaryPhone?.trim() || '-'),
        } : undefined,
      };

      const created = await employeeService.create(payload);
      const linked = created?.attendanceRowsLinked ?? 0;
      toast.success(
        linked > 0
          ? `บันทึกข้อมูลพนักงานเรียบร้อย และเชื่อมเวลาเข้างานจากไฟล์ที่นำเข้าไว้แล้ว ${linked} รายการ`
          : 'บันทึกข้อมูลพนักงานเรียบร้อย'
      );
      handleCloseCreateModal();
      setFormData(initialFormData);
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    'bg-[#0B2046] text-white',
    'bg-teal-600 text-white',
    'bg-stone-400 text-white',
    'bg-amber-500 text-white',
    'bg-rose-500 text-white',
    'bg-blue-600 text-white',
    'bg-indigo-600 text-white',
  ];

  const canViewProfile = hasPermission('EMP_PROFILE_VIEW') || hasPermission('EMP_VIEW');
  const canViewTypes = hasPermission('EMP_TYPE_VIEW') || hasPermission('EMP_VIEW');
  const canViewTransfers = hasPermission('EMP_TRANSFER_VIEW') || hasPermission('EMP_VIEW');
  const canViewOrg = hasPermission('ORG_STRUCT_VIEW') || hasPermission('ORG_VIEW');
  const canViewContracts = hasPermission('EMP_CONTRACT_VIEW') || hasPermission('EMP_VIEW');

  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', active: true, show: canViewProfile },
    { title: 'ประเภทพนักงาน', href: '/employees/types', show: canViewTypes },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/transfers', show: canViewTransfers },
    { title: 'สัญญาจ้าง', href: '/employees/contracts', show: canViewContracts },
    { title: 'เอกสารใกล้หมดอายุ', href: '/employees/documents', show: canViewProfile },
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
                    ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
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
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/90 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] shadow-2xs"
            />
          </div>

          {/* Department Filter Dropdown - ซ่อนสำหรับ role หัวหน้าแผนก (DEPT_MGR) */}
          {!isDeptManager && (
            <div className="shrink-0">
              <CustomSelect
                value={selectedDepartment}
                onChange={(val) => setSelectedDepartment(val)}
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

        {/* Right Side: + เพิ่มพนักงาน Button */}
        <div className="w-full sm:w-auto flex justify-end">
          {(hasRole('ADMIN') || hasPermission('EMP_PROFILE_CREATE')) && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2046] hover:bg-[#112a59] text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่มพนักงาน
            </button>
          )}
        </div>
      </div>

      {/* 4. Figma 1:1 Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[380px]">
          <table className="w-full min-w-[1100px] text-left border-collapse text-[12px] whitespace-nowrap">
            {/* Table Header: Dark Navy Theme (#0B2046) */}
            <thead>
              <tr className="bg-[#0B2046] text-white font-medium text-xs whitespace-nowrap">
                <th
                  onClick={() => handleSort('employeeCode')}
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                  className="py-3 px-3.5 whitespace-nowrap font-medium min-w-[160px] cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                  className="py-3 px-3.5 whitespace-nowrap font-medium min-w-[150px] cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                  className="py-3 px-3.5 whitespace-nowrap font-medium min-w-[130px] cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                  className="py-3 px-3.5 whitespace-nowrap font-medium cursor-pointer select-none hover:bg-[#122c5e] transition-colors"
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
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0B2046] mb-2" />
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
                      {/* 1. รหัสพนักงาน */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-mono text-slate-700 dark:text-slate-300 font-medium text-xs">{emp.employeeCode}</div>
                        {emp.biometricId && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5" title={`รหัสเครื่องสแกน: ${emp.biometricId}`}>
                            <span className="text-[9px] px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400 font-sans font-medium">สแกน:</span>
                            <span className="font-semibold text-slate-600 dark:text-slate-400">{emp.biometricId}</span>
                          </div>
                        )}
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
                              className="relative w-7 h-7 rounded-full overflow-hidden flex items-center justify-center font-bold text-[11px] shadow-2xs hover:ring-2 hover:ring-[#0B2046]/40 transition-all focus:outline-none"
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
                                onClick={() => {
                                  setCommentModalEmp(emp);
                                  setCommentInput(comments[emp.id] || '');
                                }}
                                className="absolute -top-1 -right-1 z-20 w-3.5 h-3.5 rounded-full bg-[#0B2046] text-white flex items-center justify-center text-[9px] font-bold ring-1.5 ring-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                                title="คลิกเพื่อแก้ไขคอมเมนต์"
                              >
                                !
                              </button>
                            )}

                            {/* Tooltip เมื่อเอา mouse ไป hold (hover) เหนือ avatar หรือ badge */}
                            {hasComment ? (
                              <div className="hidden group-hover/avatar:flex absolute left-8 -top-2 z-50 whitespace-nowrap items-center gap-1.5 bg-[#0B2046] text-white text-[11px] px-3 py-1 rounded-full shadow-xl border border-white/20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                <div className="w-3.5 h-3.5 rounded-full bg-white/25 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                  !
                                </div>
                                <span className="font-normal">** {commentText}</span>
                              </div>
                            ) : (
                              /* หากยังไม่มีคอมเมนต์ เมื่อ hover แสดง tooltip แจ้งให้คลิกเพื่อกรอก */
                              <div className="hidden group-hover/avatar:flex absolute left-8 -top-2 z-50 whitespace-nowrap items-center gap-1 bg-slate-800 text-white text-[11px] px-2.5 py-1 rounded-full shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                <span>คลิกเพื่อใส่คอมเมนต์</span>
                              </div>
                            )}
                          </div>

                          {/* ชื่อเต็ม */}
                          <Link
                            href={`/employees/${emp.id}`}
                            className="font-medium text-slate-800 dark:text-slate-200 hover:text-[#0B2046] hover:underline"
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
                              <Link
                                href={`/employees/${emp.id}/edit`}
                                onClick={close}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors font-medium"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span>แก้ไขข้อมูลพนักงาน</span>
                              </Link>

                              {/* 4. เปลี่ยนสถานะการจ้างงาน */}
                              {(hasRole('ADMIN') || hasPermission('EMP_PROFILE_EDIT')) && (
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
                              {(hasRole('ADMIN') || hasPermission('EMP_PROFILE_EDIT')) && (
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
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] shadow-2xs cursor-pointer"
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
                    ? 'bg-[#0B2046] text-white shadow-xs'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#0B2046] text-white flex items-center justify-center text-xs font-bold">
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
                placeholder="พิมพ์คอมเมนต์ตรงนี้..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
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
                  className="px-4 py-1.5 bg-[#0B2046] hover:bg-[#143268] text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  บันทึกคอมเมนต์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: ดูรายละเอียดพนักงาน (Detail View) */}
      {isDetailOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0B2046] text-white font-bold text-xs flex items-center justify-center">
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
        </div>
      )}

      {/* 8. Modal: เพิ่มพนักงานใหม่ (Figma 1:1 - ข้อมูลส่วนตัว & ข้อมูลครอบครัว) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 w-full max-w-6xl max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col">
            {/* Header Tabs: ข้อมูลส่วนตัว / ข้อมูลครอบครัว */}
            <div className="px-6 sm:px-8 pt-5 pb-0 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center space-x-8">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('personal')}
                  className={`pb-3 text-xs sm:text-[13px] font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                    activeModalTab === 'personal'
                      ? 'border-slate-900 text-slate-900 dark:text-slate-100'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>ข้อมูลส่วนตัว</span>
                  {hasAttemptedSubmit && personalErrorsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      {personalErrorsCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('family')}
                  className={`pb-3 text-xs sm:text-[13px] font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                    activeModalTab === 'family'
                      ? 'border-slate-900 text-slate-900 dark:text-slate-100'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>ข้อมูลครอบครัว</span>
                  {hasAttemptedSubmit && familyErrorsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      {familyErrorsCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('emergency')}
                  className={`pb-3 text-xs sm:text-[13px] font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                    activeModalTab === 'emergency'
                      ? 'border-slate-900 text-slate-900 dark:text-slate-100'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>ผู้ติดต่อกรณีฉุกเฉิน</span>
                  {hasAttemptedSubmit && emergencyErrorsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      {emergencyErrorsCount}
                    </span>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-400 p-1 -mt-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleCreateSubmit} noValidate className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-xs text-slate-700 dark:text-slate-300">
                {/* Banner แสดงข้อผิดพลาดรวมถ้ากรอกไม่ครบ */}
                {hasAttemptedSubmit && Object.keys(formErrors).length > 0 && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 shadow-xs animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold">กรุณากรอกหรือเลือกข้อมูลที่จำเป็นให้ครบทุกช่อง:</span>{' '}
                      <span>พบ {Object.keys(formErrors).length} รายการที่ยังไม่สมบูรณ์ (แสดงกรอบสีแดงที่ช่องข้อมูลที่ต้องระบุ)</span>
                    </div>
                  </div>
                )}

                {activeModalTab === 'personal' && (
                  /* ================= TAB 1: ข้อมูลส่วนตัว ================= */
                  <div className="space-y-6">
                    {/* Top 3 Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                      {/* Column 1 */}
                      <div className="space-y-3.5">
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            รหัสพนักงาน (Employee Code) <span className="text-rose-500">*</span>
                            <span className="ml-2 text-[10px] font-normal text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-full px-2 py-0.5">
                              สร้างรหัสให้อัตโนมัติ
                            </span>
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={formData.employeeCode}
                            className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-mono font-semibold cursor-not-allowed select-none"
                          />
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1">
                            รหัสพนักงานถูกกำหนดให้อัตโนมัติโดยระบบ ไม่สามารถแก้ไขได้
                          </p>
                          {renderFieldError('employeeCode')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            รหัสเครื่องสแกนนิ้ว (Biometric ID)
                          </label>
                          <input
                            type="text"
                            placeholder="เช่น 100001"
                            value={formData.biometricId || ''}
                            onChange={(e) => {
                              setFormData({ ...formData, biometricId: e.target.value });
                              clearFieldError('biometricId');
                            }}
                            className={getFieldClass('biometricId', true)}
                          />
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1">
                            รหัสเครื่องสแกน/ทาบบัตร (สำหรับ Merge ไฟล์เวลาเข้างานอัตโนมัติ)
                          </p>
                          {renderFieldError('biometricId')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            ตำแหน่ง <span className="text-rose-500">*</span>
                          </label>
                          <CustomSelect
                            value={formData.positionId ?? ''}
                            onChange={(e) => {
                              const id = e.target.value ? Number(e.target.value) : undefined;
                              const pos = positions.find((p) => p.id === id);
                              setFormData({ ...formData, positionId: id, positionName: pos?.positionName || '' });
                              clearFieldError('positionName');
                            }}
                            className={`${getFieldClass('positionName')} cursor-pointer`}
                          >
                            <option value="">เลือกตำแหน่ง</option>
                            {Array.from(new Set(positions.map((p) => p.departmentName))).map((dept) => (
                              <optgroup key={dept} label={dept || 'ไม่ระบุแผนก'}>
                                {positions
                                  .filter((p) => p.departmentName === dept)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.positionName}
                                      {p.headcountPlan != null
                                        ? ` (${p.filledCount ?? 0}/${p.headcountPlan}${(p.vacantCount ?? 0) === 0 ? ' เต็ม' : ''})`
                                        : ''}
                                    </option>
                                  ))}
                              </optgroup>
                            ))}
                          </CustomSelect>
                          {positions.length === 0 && (
                            <p className="text-[11px] text-amber-600 mt-1">ยังไม่มีตำแหน่ง — สร้างที่เมนู โครงสร้างองค์กร → จัดการตำแหน่ง</p>
                          )}
                          {renderFieldError('positionName')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            ประเภทพนักงาน <span className="text-rose-500">*</span>
                          </label>
                          <CustomSelect
                            value={formData.employeeType}
                            onChange={(e) => {
                              setFormData({ ...formData, employeeType: e.target.value });
                              clearFieldError('employeeType');
                            }}
                            className={`${getFieldClass('employeeType')} cursor-pointer`}
                          >
                            <option value="">เลือกประเภท</option>
                            {employeeTypeOptions.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </CustomSelect>
                          {renderFieldError('employeeType')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            หัวหน้างานโดยตรง (Direct Manager)
                          </label>
                          <EmployeeSelect
                            employees={employees}
                            value={formData.managerEmployeeId ?? ''}
                            onChange={(empId) => setFormData((prev) => ({ ...prev, managerEmployeeId: empId === '' ? null : empId }))}
                            emptyLabel="ไม่มีหัวหน้างาน (ไม่มี)"
                            placeholder="เลือกหัวหน้างาน หรือพิมพ์ค้นหา..."
                          />
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                            ใช้สำหรับสายการอนุมัติคำขอ (เช่น การลา, เอกสาร)
                          </p>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            คำนำหน้า (Prefix) <span className="text-rose-500">*</span>
                          </label>
                          <CustomSelect
                            value={formData.prefix}
                            onChange={(e) => {
                              const val = e.target.value;
                              let autoGender = formData.gender;
                              if (!autoGender || autoGender === 'เลือกเพศ') {
                                if (val === 'นาย') autoGender = 'ชาย';
                                else if (val === 'นางสาว' || val === 'นาง') autoGender = 'หญิง';
                              }
                              setFormData({ ...formData, prefix: val, gender: autoGender });
                              clearFieldError('prefix');
                              if (autoGender) clearFieldError('gender');
                            }}
                            className={`${getFieldClass('prefix')} cursor-pointer`}
                          >
                            <option value="">เลือกคำนำหน้า</option>
                            <option value="นาย">นาย</option>
                            <option value="นางสาว">นางสาว</option>
                            <option value="นาง">นาง</option>
                          </CustomSelect>
                          {renderFieldError('prefix')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            ชื่อ (First Name) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="กรอกชื่อ"
                            value={formData.firstName}
                            onChange={(e) => {
                              setFormData({ ...formData, firstName: e.target.value });
                              clearFieldError('firstName');
                            }}
                            className={getFieldClass('firstName')}
                          />
                          {renderFieldError('firstName')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            นามสกุล (Last Name) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="กรอกนามสกุล"
                            value={formData.lastName}
                            onChange={(e) => {
                              setFormData({ ...formData, lastName: e.target.value });
                              clearFieldError('lastName');
                            }}
                            className={getFieldClass('lastName')}
                          />
                          {renderFieldError('lastName')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            เลขบัตรประชาชน (National ID) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={13}
                            placeholder="เลขบัตรประชาชน 13 หลัก"
                            value={formData.citizenId}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                              setFormData({ ...formData, citizenId: val });
                              clearFieldError('citizenId');
                            }}
                            className={getFieldClass('citizenId', true)}
                          />
                          {renderFieldError('citizenId')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            เพศ (Gender) <span className="text-rose-500">*</span>
                          </label>
                          <CustomSelect
                            value={formData.gender}
                            onChange={(e) => {
                              setFormData({ ...formData, gender: e.target.value });
                              clearFieldError('gender');
                            }}
                            className={`${getFieldClass('gender')} cursor-pointer`}
                          >
                            <option value="">เลือกเพศ</option>
                            <option value="ชาย">ชาย</option>
                            <option value="หญิง">หญิง</option>
                          </CustomSelect>
                          {renderFieldError('gender')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            สัญชาติ (Nationality) <span className="text-rose-500">*</span>
                          </label>
                          <NationalitySelect
                            value={formData.nationality}
                            onChange={(val) => {
                              setFormData({ ...formData, nationality: val });
                              clearFieldError('nationality');
                            }}
                            hasError={hasAttemptedSubmit && Boolean(formErrors.nationality)}
                          />
                          {renderFieldError('nationality')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            ศาสนา (Religion) <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
                          </label>
                          <CustomSelect
                            value={formData.religion}
                            onChange={(e) => {
                              setFormData({ ...formData, religion: e.target.value });
                              clearFieldError('religion');
                            }}
                            className={`${getFieldClass('religion')} cursor-pointer`}
                          >
                            <option value="">ไม่ระบุ</option>
                            {lookups.religions.map((r) => (
                              <option key={r.id ?? r.name} value={r.name}>
                                {r.name}
                              </option>
                            ))}
                          </CustomSelect>
                          {renderFieldError('religion')}
                        </div>
                      </div>

                      {/* Column 2 */}
                      <div className="space-y-3.5">
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            วันเกิด (Date of Birth) <span className="text-rose-500">*</span>
                          </label>
                          <ThaiDatePicker
                            value={formData.birthDate}
                            onChange={(val) => {
                              setFormData({ ...formData, birthDate: val });
                              clearFieldError('birthDate');
                            }}
                            maxDate={new Date().toISOString().split('T')[0]}
                            error={hasAttemptedSubmit && Boolean(formErrors['birthDate'])}
                          />
                          {renderFieldError('birthDate')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            สถานภาพสมรส (Marital Status) <span className="text-rose-500">*</span>
                          </label>
                          <CustomSelect
                            value={formData.maritalStatus}
                            onChange={(e) => {
                              setFormData({ ...formData, maritalStatus: e.target.value });
                              clearFieldError('maritalStatus');
                            }}
                            className={`${getFieldClass('maritalStatus')} cursor-pointer`}
                          >
                            <option value="">เลือกสถานภาพ</option>
                            {lookups.maritalStatuses.map((m) => (
                              <option key={m.id ?? m.name} value={m.name}>
                                {m.name}
                              </option>
                            ))}
                          </CustomSelect>
                          {renderFieldError('maritalStatus')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            สถานภาพทางทหาร (Military Status) <span className="text-rose-500">*</span>
                          </label>
                          <CustomSelect
                            value={formData.militaryStatus}
                            onChange={(e) => {
                              setFormData({ ...formData, militaryStatus: e.target.value });
                              clearFieldError('militaryStatus');
                            }}
                            className={`${getFieldClass('militaryStatus')} cursor-pointer`}
                          >
                            <option value="">เลือกสถานภาพทางทหาร</option>
                            <option value="ผ่านการเกณฑ์ทหาร">ผ่านการเกณฑ์ทหาร</option>
                            <option value="ได้รับการยกเว้น">ได้รับการยกเว้น</option>
                            <option value="ยังไม่ได้รับการเกณฑ์">ยังไม่ได้รับการเกณฑ์</option>
                          </CustomSelect>
                          {renderFieldError('militaryStatus')}
                        </div>

                        {/* ที่อยู่ (Address) */}
                        <div className="pt-1 space-y-3">
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                            ที่อยู่ (Address) <span className="text-rose-500">*</span>
                          </label>

                          {/* ประเภทที่อยู่ Radio Buttons */}
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1.5">
                              ประเภทที่อยู่ <span className="text-rose-500">*</span>
                            </span>
                            <div className={`flex flex-wrap items-center gap-3 p-1.5 rounded-lg transition-all ${hasAttemptedSubmit && formErrors.addressType ? 'border-2 border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : ''}`}>
                              {['อาศัยกับครอบครัว', 'บ้านตัวเอง', 'บ้านเช่า', 'หอพัก'].map((t) => (
                                <label key={t} className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 text-xs">
                                  <input
                                    type="radio"
                                    name="addressType"
                                    value={t}
                                    checked={formData.addressType === t}
                                    onChange={(e) => {
                                      setFormData({ ...formData, addressType: e.target.value });
                                      clearFieldError('addressType');
                                    }}
                                    className="accent-[#0B2046]"
                                  />
                                  <span>{t}</span>
                                </label>
                              ))}
                            </div>
                            {renderFieldError('addressType')}
                          </div>

                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                              บ้านเลขที่ <span className="text-rose-500">*</span>
                            </span>
                            <input
                              type="text"
                              placeholder="บ้านเลขที่ 4"
                              value={formData.addressLine}
                              onChange={(e) => {
                                setFormData({ ...formData, addressLine: e.target.value });
                                clearFieldError('addressLine');
                              }}
                              className={getFieldClass('addressLine')}
                            />
                            {renderFieldError('addressLine')}
                          </div>

                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                              ตำบล / แขวง <span className="text-rose-500">*</span>
                            </span>
                            <input
                              type="text"
                              placeholder="แขวงหัวหมาก"
                              value={formData.subDistrict}
                              onChange={(e) => {
                                setFormData({ ...formData, subDistrict: e.target.value });
                                clearFieldError('subDistrict');
                              }}
                              className={getFieldClass('subDistrict')}
                            />
                            {renderFieldError('subDistrict')}
                          </div>

                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                              อำเภอ / เขต <span className="text-rose-500">*</span>
                            </span>
                            <input
                              type="text"
                              placeholder="บางกะปิ"
                              value={formData.district}
                              onChange={(e) => {
                                setFormData({ ...formData, district: e.target.value });
                                clearFieldError('district');
                              }}
                              className={getFieldClass('district')}
                            />
                            {renderFieldError('district')}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                                จังหวัด <span className="text-rose-500">*</span>
                              </span>
                              <input
                                type="text"
                                placeholder="กรุงเทพมหานคร"
                                value={formData.province}
                                onChange={(e) => {
                                  setFormData({ ...formData, province: e.target.value });
                                  clearFieldError('province');
                                }}
                                className={getFieldClass('province')}
                              />
                              {renderFieldError('province')}
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                                รหัสไปรษณีย์ <span className="text-rose-500">*</span>
                              </span>
                              <input
                                type="text"
                                maxLength={5}
                                placeholder="10240"
                                value={formData.postalCode}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                                  setFormData({ ...formData, postalCode: val });
                                  clearFieldError('postalCode');
                                }}
                                className={getFieldClass('postalCode', true)}
                              />
                              {renderFieldError('postalCode')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 3 */}
                      <div className="space-y-3.5">
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            อีเมล (E-mail) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            placeholder="test001@gmail.com"
                            value={formData.personalEmail}
                            onChange={(e) => {
                              setFormData({ ...formData, personalEmail: e.target.value });
                              clearFieldError('personalEmail');
                            }}
                            className={getFieldClass('personalEmail')}
                          />
                          {renderFieldError('personalEmail')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            อีเมลองค์กร (Organization email) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            placeholder="name@company.com"
                            value={formData.organizationEmail}
                            onChange={(e) => {
                              setFormData({ ...formData, organizationEmail: e.target.value });
                              clearFieldError('organizationEmail');
                            }}
                            className={getFieldClass('organizationEmail')}
                          />
                          {renderFieldError('organizationEmail')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            เบอร์โทรศัพท์ส่วนตัว (Phone number) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={12}
                            placeholder="08X-XXX-XXXX"
                            value={formData.personalPhone}
                            onChange={(e) => {
                              setFormData({ ...formData, personalPhone: autoFormatPhone(e.target.value) });
                              clearFieldError('personalPhone');
                            }}
                            className={getFieldClass('personalPhone', true)}
                          />
                          {renderFieldError('personalPhone')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            ระดับวุฒิการศึกษา (Education level) <span className="text-rose-500">*</span>
                          </label>
                          <CustomSelect
                            value={formData.educationLevel}
                            onChange={(e) => {
                              setFormData({ ...formData, educationLevel: e.target.value });
                              clearFieldError('educationLevel');
                            }}
                            className={`${getFieldClass('educationLevel')} cursor-pointer`}
                          >
                            <option value="">เลือกวุฒิการศึกษา</option>
                            <option value="มัธยมศึกษา">มัธยมศึกษา</option>
                            <option value="ปวช.">ปวช.</option>
                            <option value="ปวส.">ปวส.</option>
                            <option value="ปริญญาตรี">ปริญญาตรี</option>
                            <option value="ปริญญาโท">ปริญญาโท</option>
                            <option value="ปริญญาเอก">ปริญญาเอก</option>
                          </CustomSelect>
                          {renderFieldError('educationLevel')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            ชื่อสถาบันการศึกษา (Institution) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย, ม.รามคำแหง"
                            value={formData.institution}
                            onChange={(e) => {
                              setFormData({ ...formData, institution: e.target.value });
                              clearFieldError('institution');
                            }}
                            className={getFieldClass('institution')}
                          />
                          {renderFieldError('institution')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            สาขาวิชา (Major) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="สาขาวิชาที่เรียน"
                            value={formData.major}
                            onChange={(e) => {
                              setFormData({ ...formData, major: e.target.value });
                              clearFieldError('major');
                            }}
                            className={getFieldClass('major')}
                          />
                          {renderFieldError('major')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            ปีที่สำเร็จการศึกษา (Graduation year) <span className="text-rose-500">*</span>
                          </label>
                          <CustomSelect
                            value={formData.graduationYear}
                            onChange={(e) => {
                              setFormData({ ...formData, graduationYear: Number(e.target.value) });
                              clearFieldError('graduationYear');
                            }}
                            className={`${getFieldClass('graduationYear')} cursor-pointer`}
                          >
                            <option value="">เลือกปีที่สำเร็จการศึกษา</option>
                            {[2570, 2569, 2568, 2567, 2566, 2565, 2564, 2563, 2562, 2561, 2560].map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </CustomSelect>
                          {renderFieldError('graduationYear')}
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            เกรดเฉลี่ยสะสม (GPA) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="4"
                            placeholder="3.99"
                            value={formData.gpa ?? ''}
                            onChange={(e) => {
                              setFormData({ ...formData, gpa: e.target.value ? Number(e.target.value) : undefined });
                              clearFieldError('gpa');
                            }}
                            className={getFieldClass('gpa')}
                          />
                          {renderFieldError('gpa')}
                        </div>
                      </div>
                    </div>

                    {/* Section ด้านล่าง: การเงิน & ตำแหน่งงาน (ตรงตามภาพที่ 3 ใน Figma) */}
                    <div className="pt-5 border-t border-slate-100 dark:border-slate-700/60">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                        <div className="space-y-3.5">
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                              ชื่อธนาคาร (Bank name) <span className="text-rose-500">*</span>
                            </label>
                            <CustomSelect
                              value={formData.bankName}
                              onChange={(e) => {
                                const newBank = e.target.value;
                                const maxDigits = getRequiredBankDigits(newBank) ?? 20;
                                const currentDigits = formData.accountNumber ? formData.accountNumber.replace(/\D/g, '') : '';
                                const newAcc = currentDigits.slice(0, maxDigits);
                                setFormData({
                                  ...formData,
                                  bankName: newBank,
                                  accountNumber: newAcc,
                                });
                                clearFieldError('bankName');
                                if (newAcc.length === maxDigits) {
                                  clearFieldError('accountNumber');
                                }
                              }}
                              className={`${getFieldClass('bankName')} cursor-pointer`}
                            >
                              <option value="">เลือกธนาคาร</option>
                              {banks.map((b) => (
                                <option key={b.id} value={b.bankName}>
                                  {b.bankName}
                                  {b.shortName ? ` (${b.shortName})` : ''}
                                  {b.accountDigits ? ` - ${b.accountDigits} หลัก` : ''}
                                </option>
                              ))}
                            </CustomSelect>
                            {renderFieldError('bankName')}
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                เลขที่บัญชี (Account Number) <span className="text-rose-500">*</span>
                              </label>
                              <span
                                className={`text-[11px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                                  formData.accountNumber?.length === (getRequiredBankDigits(formData.bankName) ?? -1)
                                    ? 'bg-emerald-50 text-emerald-600 font-medium'
                                    : 'bg-slate-100 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {formData.accountNumber?.length || 0}
                                {getRequiredBankDigits(formData.bankName) != null ? ` / ${getRequiredBankDigits(formData.bankName)}` : ''} หลัก
                              </span>
                            </div>
                            <input
                              type="text"
                              maxLength={getRequiredBankDigits(formData.bankName) ?? 20}
                              placeholder={
                                getRequiredBankDigits(formData.bankName) != null
                                  ? `ระบุตัวเลข ${getRequiredBankDigits(formData.bankName)} หลัก`
                                  : 'ระบุเลขที่บัญชี (ตัวเลข)'
                              }
                              value={formData.accountNumber}
                              onChange={(e) => {
                                const maxDigits = getRequiredBankDigits(formData.bankName) ?? 20;
                                const val = e.target.value.replace(/\D/g, '').slice(0, maxDigits);
                                setFormData({ ...formData, accountNumber: val });
                                clearFieldError('accountNumber');
                              }}
                              className={getFieldClass('accountNumber', true)}
                            />
                            {renderFieldError('accountNumber')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= TAB 2: ข้อมูลครอบครัว ================= */}
                {activeModalTab === 'family' && (
                  <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        ข้อมูลสมาชิกในครอบครัว (Family Members)
                      </h3>
                    </div>

                    {(!formData.familyMembers || formData.familyMembers.length === 0) ? (
                      <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีข้อมูลสมาชิกในครอบครัว (ไม่บังคับ)</p>
                        <button
                          type="button"
                          onClick={handleAddFamilyMember}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> เพิ่มข้อมูลสมาชิกครอบครัว
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Family Member Switcher Tabs */}
                        <div className="flex items-center gap-2 mb-2">
                          {formData.familyMembers.map((_, idx) => {
                            const memberHasErrors = hasAttemptedSubmit && Object.keys(formErrors).some((k) => k.startsWith(`family_${idx}_`));
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveFamilyIndex(idx)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all relative cursor-pointer ${
                                  activeFamilyIndex === idx
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                } ${memberHasErrors ? 'ring-2 ring-rose-500 border border-rose-500' : ''}`}
                              >
                                {idx + 1}
                                {memberHasErrors && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5 ring-2 ring-white"></span>
                                )}
                              </button>
                            );
                          })}

                          {/* ปุ่ม + เพิ่มสมาชิกครอบครัว */}
                          <button
                            type="button"
                            onClick={handleAddFamilyMember}
                            className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 hover:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100 flex items-center justify-center transition-all cursor-pointer"
                            title="เพิ่มสมาชิกครอบครัวคนถัดไป"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {formData.familyMembers.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFamilyMember(activeFamilyIndex)}
                              className="text-[11px] text-rose-500 hover:underline ml-auto cursor-pointer"
                            >
                              ลบสมาชิกคนที่ {activeFamilyIndex + 1}
                            </button>
                          )}
                        </div>

                        {/* ฟิลด์สมาชิกครอบครัวตาม Index ที่เลือก */}
                        {formData.familyMembers[activeFamilyIndex] && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                ความสัมพันธ์ (Relationship) <span className="text-rose-500">*</span>
                              </label>
                              <CustomSelect
                                value={formData.familyMembers[activeFamilyIndex].relationshipType}
                                onChange={(e) => {
                                  const list = [...(formData.familyMembers || [])];
                                  list[activeFamilyIndex].relationshipType = e.target.value;
                                  setFormData({ ...formData, familyMembers: list });
                                  clearFieldError(`family_${activeFamilyIndex}_relationshipType`);
                                }}
                                className={`${getFieldClass(`family_${activeFamilyIndex}_relationshipType`)} cursor-pointer`}
                              >
                                <option value="">เลือกความสัมพันธ์</option>
                                <option value="บิดา">บิดา</option>
                                <option value="มารดา">มารดา</option>
                                <option value="คู่สมรส">คู่สมรส</option>
                                <option value="บุตร">บุตร</option>
                                <option value="พี่น้อง">พี่น้อง</option>
                              </CustomSelect>
                              {renderFieldError(`family_${activeFamilyIndex}_relationshipType`)}
                            </div>

                            <div>
                              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                คำนำหน้า (Prefix) <span className="text-rose-500">*</span>
                              </label>
                              <CustomSelect
                                value={formData.familyMembers[activeFamilyIndex].prefix || ''}
                                onChange={(e) => {
                                  const list = [...(formData.familyMembers || [])];
                                  list[activeFamilyIndex].prefix = e.target.value;
                                  setFormData({ ...formData, familyMembers: list });
                                  clearFieldError(`family_${activeFamilyIndex}_prefix`);
                                }}
                                className={`${getFieldClass(`family_${activeFamilyIndex}_prefix`)} cursor-pointer`}
                              >
                                <option value="">เลือกคำนำหน้า</option>
                                <option value="นาย">นาย</option>
                                <option value="นางสาว">นางสาว</option>
                                <option value="นาง">นาง</option>
                                <option value="เด็กชาย">เด็กชาย</option>
                                <option value="เด็กหญิง">เด็กหญิง</option>
                              </CustomSelect>
                              {renderFieldError(`family_${activeFamilyIndex}_prefix`)}
                            </div>

                            <div>
                              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                ชื่อ (First Name) <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="กรอกชื่อ"
                                value={formData.familyMembers[activeFamilyIndex].firstName}
                                onChange={(e) => {
                                  const list = [...(formData.familyMembers || [])];
                                  list[activeFamilyIndex].firstName = e.target.value;
                                  setFormData({ ...formData, familyMembers: list });
                                  clearFieldError(`family_${activeFamilyIndex}_firstName`);
                                }}
                                className={getFieldClass(`family_${activeFamilyIndex}_firstName`)}
                              />
                              {renderFieldError(`family_${activeFamilyIndex}_firstName`)}
                            </div>

                            <div>
                              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                นามสกุล (Last Name) <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="กรอกนามสกุล"
                                value={formData.familyMembers[activeFamilyIndex].lastName || ''}
                                onChange={(e) => {
                                  const list = [...(formData.familyMembers || [])];
                                  list[activeFamilyIndex].lastName = e.target.value;
                                  setFormData({ ...formData, familyMembers: list });
                                  clearFieldError(`family_${activeFamilyIndex}_lastName`);
                                }}
                                className={getFieldClass(`family_${activeFamilyIndex}_lastName`)}
                              />
                              {renderFieldError(`family_${activeFamilyIndex}_lastName`)}
                            </div>

                            <div>
                              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                เลขบัตรประชาชน (National ID)
                              </label>
                              <input
                                type="text"
                                maxLength={13}
                                placeholder="เลขบัตรประชาชน 13 หลัก"
                                value={formData.familyMembers[activeFamilyIndex].citizenId || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                                  const list = [...(formData.familyMembers || [])];
                                  list[activeFamilyIndex].citizenId = val;
                                  setFormData({ ...formData, familyMembers: list });
                                  clearFieldError(`family_${activeFamilyIndex}_citizenId`);
                                }}
                                className={getFieldClass(`family_${activeFamilyIndex}_citizenId`, true)}
                              />
                              {renderFieldError(`family_${activeFamilyIndex}_citizenId`)}
                            </div>

                            <div>
                              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                วันเกิด (Date of Birth)
                              </label>
                              <ThaiDatePicker
                                value={formData.familyMembers[activeFamilyIndex].birthDate || ''}
                                onChange={(val) => {
                                  const list = [...(formData.familyMembers || [])];
                                  list[activeFamilyIndex].birthDate = val;
                                  setFormData({ ...formData, familyMembers: list });
                                  clearFieldError(`family_${activeFamilyIndex}_birthDate`);
                                }}
                                maxDate={new Date().toISOString().split('T')[0]}
                                error={hasAttemptedSubmit && Boolean(formErrors[`family_${activeFamilyIndex}_birthDate`])}
                              />
                              {renderFieldError(`family_${activeFamilyIndex}_birthDate`)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ================= TAB 3: กรณีฉุกเฉินติดต่อใคร ================= */}
                {activeModalTab === 'emergency' && (
                  <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <Phone className="w-4 h-4 text-[#0B2046]" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        กรณีฉุกเฉินติดต่อใคร (Emergency Contact)
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          ความสัมพันธ์ (Relationship) <span className="text-rose-500">*</span>
                        </label>
                        <CustomSelect
                          value={formData.emergencyContact?.relationship || ''}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              emergencyContact: {
                                ...(formData.emergencyContact || { firstName: '', lastName: '', primaryPhone: '' }),
                                relationship: e.target.value,
                              },
                            });
                            clearFieldError('emergency_relationship');
                          }}
                          className={`${getFieldClass('emergency_relationship')} cursor-pointer`}
                        >
                          <option value="">เลือกความสัมพันธ์</option>
                          <option value="บิดา">บิดา</option>
                          <option value="มารดา">มารดา</option>
                          <option value="คู่สมรส">คู่สมรส</option>
                          <option value="บุตร">บุตร</option>
                          <option value="ญาติ">ญาติ</option>
                          <option value="เพื่อน">เพื่อน</option>
                          <option value="อื่นๆ">อื่นๆ</option>
                        </CustomSelect>
                        {renderFieldError('emergency_relationship')}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          คำนำหน้า (Prefix) <span className="text-rose-500">*</span>
                        </label>
                        <CustomSelect
                          value={formData.emergencyContact?.prefix || ''}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              emergencyContact: {
                                ...(formData.emergencyContact || { firstName: '', lastName: '', primaryPhone: '' }),
                                prefix: e.target.value,
                              },
                            });
                            clearFieldError('emergency_prefix');
                          }}
                          className={`${getFieldClass('emergency_prefix')} cursor-pointer`}
                        >
                          <option value="">เลือกคำนำหน้า</option>
                          <option value="นาย">นาย</option>
                          <option value="นางสาว">นางสาว</option>
                          <option value="นาง">นาง</option>
                        </CustomSelect>
                        {renderFieldError('emergency_prefix')}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          ชื่อ (First Name) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="กรอกชื่อ"
                          value={formData.emergencyContact?.firstName || ''}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              emergencyContact: {
                                ...(formData.emergencyContact || { lastName: '', primaryPhone: '' }),
                                firstName: e.target.value,
                              },
                            });
                            clearFieldError('emergency_firstName');
                          }}
                          className={getFieldClass('emergency_firstName')}
                        />
                        {renderFieldError('emergency_firstName')}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          นามสกุล (Last Name) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="กรอกนามสกุล"
                          value={formData.emergencyContact?.lastName || ''}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              emergencyContact: {
                                ...(formData.emergencyContact || { firstName: '', primaryPhone: '' }),
                                lastName: e.target.value,
                              },
                            });
                            clearFieldError('emergency_lastName');
                          }}
                          className={getFieldClass('emergency_lastName')}
                        />
                        {renderFieldError('emergency_lastName')}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          เบอร์โทร (Phone number) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={12}
                          placeholder="08X-XXX-XXXX"
                          value={formData.emergencyContact?.primaryPhone || ''}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              emergencyContact: {
                                ...(formData.emergencyContact || { firstName: '', lastName: '' }),
                                primaryPhone: autoFormatPhone(e.target.value),
                              },
                            });
                            clearFieldError('emergency_primaryPhone');
                          }}
                          className={getFieldClass('emergency_primaryPhone', true)}
                        />
                        {renderFieldError('emergency_primaryPhone')}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          ที่อยู่ (Address) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="กรอกที่อยู่"
                          value={formData.emergencyContact?.address || ''}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              emergencyContact: {
                                ...(formData.emergencyContact || { firstName: '', lastName: '', primaryPhone: '' }),
                                address: e.target.value,
                              },
                            });
                            clearFieldError('emergency_address');
                          }}
                          className={getFieldClass('emergency_address')}
                        />
                        {renderFieldError('emergency_address')}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 sm:px-8 py-4 bg-slate-50/90 dark:bg-slate-950/90 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="px-5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#0B2046] hover:bg-[#15346e] text-white text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    'บันทึกข้อมูล'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

