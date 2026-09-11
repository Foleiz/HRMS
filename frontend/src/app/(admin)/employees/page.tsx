'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { employeeService } from '@/services/employeeService';
import { apiClient } from '@/lib/api-client';
import { Employee, CreateEmployeePayload } from '@/types/employee';
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  CreditCard,
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
} from 'lucide-react';

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

export default function EmployeesPage() {
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [activeTab, setActiveTab] = useState('จัดการพนักงาน');

  // Action Menu dropdown state (by employee id)
  const [actionMenuOpenId, setActionMenuOpenId] = useState<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Detail Modal & Create Modal states
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(8);

  // HR Comments State: stored in localStorage { [empId: number]: string }
  const [comments, setComments] = useState<Record<number, string>>({});
  const [commentModalEmp, setCommentModalEmp] = useState<Employee | null>(null);
  const [commentInput, setCommentInput] = useState('');

  // Modal Tabs & Family Member state
  const [activeModalTab, setActiveModalTab] = useState<'personal' | 'family'>('personal');
  const [activeFamilyIndex, setActiveFamilyIndex] = useState(0);

  // Form State for creating employee
  const initialFormData: CreateEmployeePayload = {
    employeeCode: '',
    prefix: '',
    firstName: '',
    lastName: '',
    citizenId: '',
    gender: '',
    nationality: 'ไทย',
    religion: 'พุทธ',
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
    familyMembers: [
      {
        relationshipType: 'บิดา',
        prefix: '',
        firstName: '',
        lastName: '',
        citizenId: '',
        birthDate: '',
      },
    ],
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Filter Employees
  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      !term ||
      emp.employeeCode.toLowerCase().includes(term) ||
      emp.fullName.toLowerCase().includes(term) ||
      (emp.citizenIdMasked && emp.citizenIdMasked.toLowerCase().includes(term)) ||
      (emp.contact?.organizationEmail && emp.contact.organizationEmail.toLowerCase().includes(term)) ||
      (emp.contact?.personalPhone && emp.contact.personalPhone.includes(term));

    return matchSearch;
  });

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
    if (current.length <= 1) return;
    const updated = current.filter((_, idx) => idx !== indexToRemove);
    setFormData({ ...formData, familyMembers: updated });
    setActiveFamilyIndex(Math.max(0, indexToRemove - 1));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: CreateEmployeePayload = {
        ...formData,
        employeeCode: formData.employeeCode.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        citizenId: formData.citizenId?.trim() || undefined,
        prefix: formData.prefix && formData.prefix !== 'เลือกคำนำหน้า' ? formData.prefix : undefined,
        gender: formData.gender && formData.gender !== 'เลือกเพศ' ? formData.gender : undefined,
        genderId: formData.gender === 'ชาย' ? 1 : (formData.gender === 'หญิง' ? 2 : (formData.gender === 'ไม่ระบุ' ? 3 : undefined)),
        nationality: formData.nationality && formData.nationality !== 'เลือกสัญชาติ' ? formData.nationality : 'ไทย',
        religion: formData.religion && formData.religion !== 'เลือกศาสนา' ? formData.religion : 'พุทธ',
        maritalStatus: formData.maritalStatus && formData.maritalStatus !== 'เลือกสถานภาพ' ? formData.maritalStatus : undefined,
        militaryStatus: formData.militaryStatus && formData.militaryStatus !== 'เลือกสถานภาพทางทหาร' ? formData.militaryStatus : undefined,
        educationLevel: formData.educationLevel && formData.educationLevel !== 'เลือกวุฒิการศึกษา' ? formData.educationLevel : undefined,
        institution: formData.institution && formData.institution !== 'เลือกสถาบันการศึกษา' ? formData.institution : undefined,
        bankName: formData.bankName && formData.bankName !== 'เลือกธนาคาร' ? formData.bankName : undefined,
        positionName: formData.positionName && formData.positionName !== 'เลือกตำแหน่ง' ? formData.positionName : undefined,
        employeeType: formData.employeeType && formData.employeeType !== 'เลือกประเภท' ? formData.employeeType : undefined,
        familyMembers: formData.familyMembers?.filter((f) => f.firstName?.trim()),
        emergencyContact: formData.emergencyContact?.firstName?.trim() ? formData.emergencyContact : undefined,
      };

      await employeeService.create(payload);
      setSuccessMessage('บันทึกข้อมูลพนักงานเรียบร้อย');
      setIsCreateModalOpen(false);
      setFormData(initialFormData);
      setActiveModalTab('personal');
      setActiveFamilyIndex(0);
      loadData();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMessage(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลพนักงาน "${name}"?`)) return;
    try {
      await employeeService.delete(id);
      setSuccessMessage('ลบข้อมูลพนักงานเรียบร้อย');
      loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setErrorMessage('ไม่สามารถลบข้อมูลพนักงานได้');
    }
  };

  // Status Badge Mapper (ตรงตามสีและฟอนต์ใน Figma: ทำงานอยู่, ทดลองงาน, ลาออก, ไม่ได้ทำงาน)
  const getStatusBadge = (emp: Employee) => {
    if (emp.id === 3) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-medium whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          ทดลองงาน
        </span>
      );
    }
    if (emp.id === 4) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-rose-500 font-medium whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          ลาออก
        </span>
      );
    }
    if (emp.id === 2 || emp.id === 7) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium whitespace-nowrap">
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

  // Placeholder division / department / position generator if not yet assigned in DB
  const getMockAssignment = (emp: Employee) => {
    const list = [
      { division: 'ทรัพยากรบุคคล', department: 'สรรหาและคัดเลือก', position: 'ผู้จัดการแผนกสรรหา' },
      { division: 'เทคโนโลยีสารสนเทศ', department: 'พัฒนาซอฟต์แวร์', position: 'หัวหน้าทีมนักพัฒนา' },
      { division: 'การตลาด', department: 'การตลาดดิจิทัล', position: 'เจ้าหน้าที่ยิงโฆษณาออนไลน์' },
      { division: 'ขาย', department: 'ลูกค้าองค์กร', position: 'ผู้จัดการลูกค้ารายใหญ่' },
      { division: 'บัญชีและการเงิน', department: 'บัญชีการเงิน', position: 'สมุห์บัญชี' },
      { division: 'ซัพพลายเชนและโลจิสติกส์', department: 'คลังสินค้าและจัดส่ง', position: 'ผู้ควบคุมคลังสินค้า' },
      { division: 'ผลิตและควบคุมคุณภาพ', department: 'ประกันและตรวจสอบ...', position: 'วิศวกรควบคุมคุณภาพ' },
    ];
    return list[(emp.id - 1) % list.length];
  };

  // Mock photo avatars matching Figma design
  const mockAvatarImages = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', // EMP-001 (ชาย)
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80', // EMP-002 (หญิง)
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', // EMP-003 (ชาย)
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', // EMP-004 (หญิง)
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80', // EMP-005 (หญิง)
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80', // EMP-006 (หญิง)
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80', // EMP-007 (ชาย)
  ];

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

  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', active: true },
    { title: 'จัดการฝ่าย', href: '/organization' },
    { title: 'จัดการแผนก', href: '/organization' },
    { title: 'จัดการตำแหน่ง', href: '/organization' },
    { title: 'ระดับพนักงาน', href: '/organization' },
    { title: 'ประเภทพนักงาน', href: '/organization' },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees' },
    { title: 'แผนผังองค์กร', href: '/organization' },
    { title: 'สัญญาจ้าง', href: '/employees' },
  ];

  return (
    <div className="space-y-4 font-sans pb-12">
      {/* 1. Sub-Navigation Tabs (ตรงตามแถบด้านบนของ Figma) */}
      <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {subNavTabs.map((tab) => {
            const isActive = tab.title === activeTab;
            return (
              <button
                key={tab.title}
                onClick={() => setActiveTab(tab.title)}
                className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium ${
                  isActive
                    ? 'border-[#0B2046] text-[#0B2046] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.title}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 2. Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Search Bar, Department Filter & Action Buttons */}
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
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] shadow-2xs"
            />
          </div>

          {/* Department Filter Dropdown */}
          <div className="shrink-0">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B2046] shadow-2xs cursor-pointer"
            >
              <option value="ALL">ทุกแผนก</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.departmentCode}>
                  {dept.departmentName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side: + เพิ่มพนักงาน Button */}
        <div className="w-full sm:w-auto flex justify-end">
          {hasPermission('EMP_MANAGE') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2046] hover:bg-[#112a59] text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              เพิ่มพนักงาน
            </button>
          )}
        </div>
      </div>

      {/* 4. Figma 1:1 Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            {/* Table Header: Dark Navy Theme (#0B2046) */}
            <thead>
              <tr className="bg-[#0B2046] text-white font-medium">
                <th className="py-3 px-3.5 whitespace-nowrap font-medium">รหัสพนักงาน</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium min-w-[160px]">ชื่อ-นามสกุล</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium min-w-[150px]">รหัสบัตรประชาชน</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium">ฝ่าย</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium">แผนก</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium min-w-[130px]">ตำแหน่ง</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium">วันเกิด</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium">เพศ</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium">อีเมล</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium">เบอร์โทร</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium">สถานะ</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-medium text-center">จัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0B2046] mb-2" />
                    กำลังโหลดข้อมูลพนักงาน...
                  </td>
                </tr>
              ) : paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    ไม่พบข้อมูลพนักงานในระบบ
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const assignment = getMockAssignment(emp);
                  const hasComment = Boolean(comments[emp.id]);
                  const commentText = comments[emp.id];
                  const avatarColor = avatarColors[(emp.id - 1) % avatarColors.length];

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 transition-colors group text-slate-700"
                    >
                      {/* 1. รหัสพนักงาน */}
                      <td className="py-3 px-3.5 text-slate-500 font-mono whitespace-nowrap">
                        {emp.employeeCode}
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
                              <img
                                src={mockAvatarImages[(emp.id - 1) % mockAvatarImages.length]}
                                alt={emp.fullName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <span className={`w-full h-full absolute inset-0 flex items-center justify-center text-[10px] ${avatarColor} -z-10`}>
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
                            className="font-medium text-slate-800 hover:text-[#0B2046] hover:underline"
                          >
                            {emp.prefix} {emp.firstName} {emp.lastName}
                          </Link>
                        </div>
                      </td>

                      {/* 3. รหัสบัตรประชาชน */}
                      <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {formatMaskedCitizenId(emp.citizenIdMasked)}
                      </td>

                      {/* 4. ฝ่าย */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {assignment?.division || '-'}
                      </td>

                      {/* 5. แผนก */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {assignment?.department || '-'}
                      </td>

                      {/* 6. ตำแหน่ง */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {assignment?.position || '-'}
                      </td>

                      {/* 7. วันเกิด */}
                      <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap">
                        {emp.birthDate || '-'}
                      </td>

                      {/* 8. เพศ */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {getGenderDisplay(emp.gender, emp.genderId, emp.prefix)}
                      </td>

                      {/* 9. อีเมล */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {emp.contact?.organizationEmail || emp.contact?.personalEmail || '-'}
                      </td>

                      {/* 10. เบอร์โทร */}
                      <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {emp.contact?.personalPhone || '-'}
                      </td>

                      {/* 11. สถานะ */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {getStatusBadge(emp)}
                      </td>

                      {/* 12. ปุ่มจัดการ (จุด 3 จุด ⋮ พร้อม Dropdown ตามภาพ 2 ใน Figma) */}
                      <td className="py-3 px-3.5 text-center relative whitespace-nowrap">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpenId(actionMenuOpenId === emp.id ? null : emp.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Popup Menu (ตรงตามภาพ 2) */}
                          {actionMenuOpenId === emp.id && (
                            <div
                              ref={actionMenuRef}
                              className="absolute right-0 top-7 w-40 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                            >
                              {/* 1. ดูข้อมูลพนักงาน */}
                              <Link
                                href={`/employees/${emp.id}`}
                                onClick={() => setActionMenuOpenId(null)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>ดูข้อมูลพนักงาน</span>
                              </Link>

                              {/* 2. จัดการเงินเดือน */}
                              <Link
                                href="/payroll"
                                onClick={() => setActionMenuOpenId(null)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                                <span>จัดการเงินเดือน</span>
                              </Link>

                              {/* 3. ลบข้อมูล */}
                              {hasPermission('EMP_MANAGE') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDelete(emp.id, emp.fullName);
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>ลบข้อมูล</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Footer: Rows per page (ซ้ายล่าง) & Pagination (ขวาล่าง) */}
        <div className="py-3 px-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* ซ้ายล่าง: Rows per page selector */}
          <div className="flex items-center gap-2 text-slate-600">
            <span>แสดง</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] shadow-2xs cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>แถวต่อหน้า</span>
            <span className="text-slate-400 text-[11px] ml-1">
              (ทั้งหมด {filteredEmployees.length} รายการ)
            </span>
          </div>

          {/* ขวาล่าง: Pagination Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Previous Page Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}

            {/* Next Page Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#0B2046] text-white flex items-center justify-center text-xs font-bold">
                  !
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  คอมเมนต์สำหรับ: {commentModalEmp.fullName}
                </h3>
              </div>
              <button
                onClick={() => setCommentModalEmp(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500 block">
                ระบุหมายเหตุ/ข้อควรระวังสำหรับ HR หรือ Admin (เช่น พนักงานคนนี้ป่วยห้ามใช้งานหนัก):
              </label>
              <textarea
                rows={3}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="พิมพ์คอมเมนต์ตรงนี้..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
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
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
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
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0B2046] text-white font-bold text-xs flex items-center justify-center">
                  {selectedEmployee.firstName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedEmployee.fullName}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">รหัส: {selectedEmployee.employeeCode}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block">เลขบัตรประชาชน (PDPA Masked)</span>
                  <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                    {selectedEmployee.citizenIdMasked || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">วันเดือนปีเกิด</span>
                  <span className="font-medium text-slate-800 block mt-0.5">
                    {selectedEmployee.birthDate || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">อีเมล</span>
                  <span className="font-medium text-slate-800 block mt-0.5">
                    {selectedEmployee.contact?.organizationEmail || selectedEmployee.contact?.personalEmail || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">เบอร์โทรศัพท์</span>
                  <span className="font-mono font-medium text-slate-800 block mt-0.5">
                    {selectedEmployee.contact?.personalPhone || '-'}
                  </span>
                </div>
              </div>

              {comments[selectedEmployee.id] && (
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-amber-900">
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

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
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
          <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col">
            {/* Header Tabs: ข้อมูลส่วนตัว / ข้อมูลครอบครัว */}
            <div className="px-6 sm:px-8 pt-5 pb-0 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center space-x-8">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('personal')}
                  className={`pb-3 text-xs sm:text-[13px] font-bold transition-all border-b-2 ${
                    activeModalTab === 'personal'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  ข้อมูลส่วนตัว
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('family')}
                  className={`pb-3 text-xs sm:text-[13px] font-bold transition-all border-b-2 ${
                    activeModalTab === 'family'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  ข้อมูลครอบครัว
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 -mt-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-xs text-slate-700">
                {activeModalTab === 'personal' ? (
                  /* ================= TAB 1: ข้อมูลส่วนตัว ================= */
                  <div className="space-y-6">
                    {/* Top 3 Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                      {/* Column 1 */}
                      <div className="space-y-3.5">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            รหัสพนักงาน (Employee Code) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="เช่น EMP001"
                            value={formData.employeeCode}
                            onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            คำนำหน้า (Prefix) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.prefix}
                            onChange={(e) => {
                              const val = e.target.value;
                              let autoGender = formData.gender;
                              if (!autoGender || autoGender === 'เลือกเพศ') {
                                if (val === 'นาย') autoGender = 'ชาย';
                                else if (val === 'นางสาว' || val === 'นาง') autoGender = 'หญิง';
                              }
                              setFormData({ ...formData, prefix: val, gender: autoGender });
                            }}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                          >
                            <option value="">เลือกคำนำหน้า</option>
                            <option value="นาย">นาย</option>
                            <option value="นางสาว">นางสาว</option>
                            <option value="นาง">นาง</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            ชื่อ (First Name) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="กรอกชื่อ"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            นามสกุล (Last Name) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="กรอกนามสกุล"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            เลขบัตรประชาชน (National ID) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={13}
                            placeholder="เลขบัตรประชาชน 13 หลัก"
                            value={formData.citizenId}
                            onChange={(e) => setFormData({ ...formData, citizenId: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            เพศ (Gender) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                          >
                            <option value="">เลือกเพศ</option>
                            <option value="ชาย">ชาย</option>
                            <option value="หญิง">หญิง</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            สัญชาติ (Nationality) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.nationality}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                          >
                            <option value="ไทย">ไทย</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            ศาสนา (Religion) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.religion}
                            onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                          >
                            <option value="พุทธ">พุทธ</option>
                            <option value="คริสต์">คริสต์</option>
                            <option value="อิสลาม">อิสลาม</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                            <option value="ไม่ระบุ">ไม่ระบุ</option>
                          </select>
                        </div>
                      </div>

                      {/* Column 2 */}
                      <div className="space-y-3.5">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            วันเกิด (Date of Birth) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            สถานภาพสมรส (Marital Status) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.maritalStatus}
                            onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                          >
                            <option value="">เลือกสถานภาพ</option>
                            <option value="โสด">โสด</option>
                            <option value="สมรส">สมรส</option>
                            <option value="หย่าร้าง">หย่าร้าง</option>
                            <option value="หม้าย">หม้าย</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            สถานภาพทางทหาร (Military Status) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.militaryStatus}
                            onChange={(e) => setFormData({ ...formData, militaryStatus: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                          >
                            <option value="">เลือกสถานภาพทางทหาร</option>
                            <option value="ผ่านการเกณฑ์ทหาร">ผ่านการเกณฑ์ทหาร</option>
                            <option value="ได้รับการยกเว้น">ได้รับการยกเว้น</option>
                            <option value="ยังไม่ได้รับการเกณฑ์">ยังไม่ได้รับการเกณฑ์</option>
                          </select>
                        </div>

                        {/* ที่อยู่ (Address) */}
                        <div className="pt-1 space-y-3">
                          <label className="font-semibold text-slate-700 block">
                            ที่อยู่ (Address) <span className="text-rose-500">*</span>
                          </label>

                          {/* ประเภทที่อยู่ Radio Buttons */}
                          <div>
                            <span className="text-slate-500 text-[11px] block mb-1.5">
                              ประเภทที่อยู่ <span className="text-rose-500">*</span>
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                              {['อาศัยกับครอบครัว', 'บ้านตัวเอง', 'บ้านเช่า', 'หอพัก'].map((t) => (
                                <label key={t} className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs">
                                  <input
                                    type="radio"
                                    name="addressType"
                                    value={t}
                                    checked={formData.addressType === t}
                                    onChange={(e) => setFormData({ ...formData, addressType: e.target.value })}
                                    className="accent-[#0B2046]"
                                  />
                                  <span>{t}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-500 text-[11px] block mb-1">
                              บ้านเลขที่ <span className="text-rose-500">*</span>
                            </span>
                            <input
                              type="text"
                              placeholder="บ้านเลขที่ 4"
                              value={formData.addressLine}
                              onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                            />
                          </div>

                          <div>
                            <span className="text-slate-500 text-[11px] block mb-1">
                              ตำบล / แขวง <span className="text-rose-500">*</span>
                            </span>
                            <input
                              type="text"
                              placeholder="แขวงหัวหมาก"
                              value={formData.subDistrict}
                              onChange={(e) => setFormData({ ...formData, subDistrict: e.target.value })}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                            />
                          </div>

                          <div>
                            <span className="text-slate-500 text-[11px] block mb-1">
                              อำเภอ / เขต <span className="text-rose-500">*</span>
                            </span>
                            <input
                              type="text"
                              placeholder="บางกะปิ"
                              value={formData.district}
                              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-slate-500 text-[11px] block mb-1">
                                จังหวัด <span className="text-rose-500">*</span>
                              </span>
                              <input
                                type="text"
                                placeholder="กรุงเทพมหานคร"
                                value={formData.province}
                                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                              />
                            </div>
                            <div>
                              <span className="text-slate-500 text-[11px] block mb-1">
                                รหัสไปรษณีย์ <span className="text-rose-500">*</span>
                              </span>
                              <input
                                type="text"
                                placeholder="10240"
                                value={formData.postalCode}
                                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 3 */}
                      <div className="space-y-3.5">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            อีเมล (E-mail) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            placeholder="test001@gmail.com"
                            value={formData.personalEmail}
                            onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            อีเมลองค์กร (Organization email) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            placeholder="name@company.com"
                            value={formData.organizationEmail}
                            onChange={(e) => setFormData({ ...formData, organizationEmail: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            เบอร์โทรศัพท์ส่วนตัว (Phone number) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="095-111-222-1"
                            value={formData.personalPhone}
                            onChange={(e) => setFormData({ ...formData, personalPhone: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            ระดับวุฒิการศึกษา (Education level) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.educationLevel}
                            onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                          >
                            <option value="">เลือกวุฒิการศึกษา</option>
                            <option value="มัธยมศึกษา">มัธยมศึกษา</option>
                            <option value="ปวช.">ปวช.</option>
                            <option value="ปวส.">ปวส.</option>
                            <option value="ปริญญาตรี">ปริญญาตรี</option>
                            <option value="ปริญญาโท">ปริญญาโท</option>
                            <option value="ปริญญาเอก">ปริญญาเอก</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            ชื่อสถาบันการศึกษา (Institution) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย, ม.รามคำแหง"
                            value={formData.institution}
                            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            สาขาวิชา (Major) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="สาขาวิชาที่เรียน"
                            value={formData.major}
                            onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            ปีที่สำเร็จการศึกษา (Graduation year) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.graduationYear}
                            onChange={(e) => setFormData({ ...formData, graduationYear: Number(e.target.value) })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                          >
                            {[2570, 2569, 2568, 2567, 2566, 2565, 2564, 2563, 2562, 2561, 2560].map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            เกรดเฉลี่ยสะสม (GPA) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="4"
                            placeholder="3.99"
                            value={formData.gpa ?? ''}
                            onChange={(e) => setFormData({ ...formData, gpa: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section ด้านล่าง: การเงิน & ตำแหน่งงาน (ตรงตามภาพที่ 3 ใน Figma) */}
                    <div className="pt-5 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                        <div className="space-y-3.5">
                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">
                              ชื่อธนาคาร (Bank name) <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={formData.bankName}
                              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                            >
                              <option value="">เลือกธนาคาร</option>
                              <option value="ธนาคารกสิกรไทย">ธนาคารกสิกรไทย</option>
                              <option value="ธนาคารไทยพาณิชย์">ธนาคารไทยพาณิชย์</option>
                              <option value="ธนาคารกรุงเทพ">ธนาคารกรุงเทพ</option>
                              <option value="ธนาคารกรุงไทย">ธนาคารกรุงไทย</option>
                              <option value="ธนาคารกรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา</option>
                              <option value="ธนาคารทหารไทยธนชาต">ธนาคารทหารไทยธนชาต (TTB)</option>
                            </select>
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">
                              เลขที่บัญชี (Account Number) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="xxx-xxx-xx-x-x"
                              value={formData.accountNumber}
                              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                            />
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">
                              ตำแหน่ง <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={formData.positionName}
                              onChange={(e) => setFormData({ ...formData, positionName: e.target.value })}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                            >
                              <option value="">เลือกตำแหน่ง</option>
                              <option value="ผู้จัดการแผนกสรรหา">ผู้จัดการแผนกสรรหา</option>
                              <option value="หัวหน้าทีมนักพัฒนา">หัวหน้าทีมนักพัฒนา</option>
                              <option value="เจ้าหน้าที่ยิงโฆษณาออนไลน์">เจ้าหน้าที่ยิงโฆษณาออนไลน์</option>
                              <option value="ผู้จัดการลูกค้ารายใหญ่">ผู้จัดการลูกค้ารายใหญ่</option>
                              <option value="สมุห์บัญชี">สมุห์บัญชี</option>
                              <option value="ผู้ควบคุมคลังสินค้า">ผู้ควบคุมคลังสินค้า</option>
                              <option value="วิศวกรควบคุมคุณภาพ">วิศวกรควบคุมคุณภาพ</option>
                              <option value="นักพัฒนาซอฟต์แวร์">นักพัฒนาซอฟต์แวร์</option>
                              <option value="เจ้าหน้าที่ฝ่ายบุคคล">เจ้าหน้าที่ฝ่ายบุคคล</option>
                            </select>
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">
                              ประเภทพนักงาน <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={formData.employeeType}
                              onChange={(e) => setFormData({ ...formData, employeeType: e.target.value })}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                            >
                              <option value="">เลือกประเภท</option>
                              <option value="พนักงานประจำ">พนักงานประจำ</option>
                              <option value="พนักงานสัญญาจ้าง">พนักงานสัญญาจ้าง</option>
                              <option value="พนักงานทดลองงาน">พนักงานทดลองงาน</option>
                              <option value="พนักงานพาร์ทไทม์">พนักงานพาร์ทไทม์</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= TAB 2: ข้อมูลครอบครัว ================= */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                    {/* คอลัมน์ซ้าย: สมาชิกในครอบครัว */}
                    <div className="space-y-4">
                      {/* Family Member Switcher Tabs */}
                      <div className="flex items-center gap-2 mb-2">
                        {formData.familyMembers?.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveFamilyIndex(idx)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                              activeFamilyIndex === idx
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        ))}

                        {/* ปุ่ม + เพิ่มสมาชิกครอบครัว */}
                        <button
                          type="button"
                          onClick={handleAddFamilyMember}
                          className="w-7 h-7 rounded-full border border-slate-300 hover:border-slate-800 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
                          title="เพิ่มสมาชิกครอบครัวคนถัดไป"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {formData.familyMembers && formData.familyMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFamilyMember(activeFamilyIndex)}
                            className="text-[11px] text-rose-500 hover:underline ml-auto"
                          >
                            ลบสมาชิกคนที่ {activeFamilyIndex + 1}
                          </button>
                        )}
                      </div>

                      {/* ฟิลด์สมาชิกครอบครัวตาม Index ที่เลือก */}
                      {formData.familyMembers && formData.familyMembers[activeFamilyIndex] && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">
                              ความสัมพันธ์ (Relationship) <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={formData.familyMembers[activeFamilyIndex].relationshipType}
                              onChange={(e) => {
                                const list = [...(formData.familyMembers || [])];
                                list[activeFamilyIndex].relationshipType = e.target.value;
                                setFormData({ ...formData, familyMembers: list });
                              }}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                            >
                              <option value="บิดา">บิดา</option>
                              <option value="มารดา">มารดา</option>
                              <option value="คู่สมรส">คู่สมรส</option>
                              <option value="บุตร">บุตร</option>
                              <option value="พี่น้อง">พี่น้อง</option>
                            </select>
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">
                              คำนำหน้า (Prefix) <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={formData.familyMembers[activeFamilyIndex].prefix || ''}
                              onChange={(e) => {
                                const list = [...(formData.familyMembers || [])];
                                list[activeFamilyIndex].prefix = e.target.value;
                                setFormData({ ...formData, familyMembers: list });
                              }}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                            >
                              <option value="">เลือกคำนำหน้า</option>
                              <option value="นาย">นาย</option>
                              <option value="นางสาว">นางสาว</option>
                              <option value="นาง">นาง</option>
                              <option value="เด็กชาย">เด็กชาย</option>
                              <option value="เด็กหญิง">เด็กหญิง</option>
                            </select>
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">
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
                              }}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                            />
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">
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
                              }}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                            />
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">
                              เลขบัตรประชาชน (National ID) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              maxLength={13}
                              placeholder="เลขบัตรประชาชน 13 หลัก"
                              value={formData.familyMembers[activeFamilyIndex].citizenId || ''}
                              onChange={(e) => {
                                const list = [...(formData.familyMembers || [])];
                                list[activeFamilyIndex].citizenId = e.target.value;
                                setFormData({ ...formData, familyMembers: list });
                              }}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                            />
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">
                              วันเกิด (Date of Birth) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={formData.familyMembers[activeFamilyIndex].birthDate || ''}
                              onChange={(e) => {
                                const list = [...(formData.familyMembers || [])];
                                list[activeFamilyIndex].birthDate = e.target.value;
                                setFormData({ ...formData, familyMembers: list });
                              }}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* คอลัมน์ขวา: กรณีฉุกเฉินติดต่อใคร */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 pb-1">
                        กรณีฉุกเฉินติดต่อใคร
                      </h3>

                      <div className="space-y-3.5">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            ความสัมพันธ์ (Relationship) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.emergencyContact?.relationship || 'บิดา'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergencyContact: {
                                  ...(formData.emergencyContact || { firstName: '', lastName: '', primaryPhone: '' }),
                                  relationship: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                          >
                            <option value="บิดา">บิดา</option>
                            <option value="มารดา">มารดา</option>
                            <option value="คู่สมรส">คู่สมรส</option>
                            <option value="บุตร">บุตร</option>
                            <option value="ญาติ">ญาติ</option>
                            <option value="เพื่อน">เพื่อน</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            คำนำหน้า (Prefix) <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.emergencyContact?.prefix || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergencyContact: {
                                  ...(formData.emergencyContact || { firstName: '', lastName: '', primaryPhone: '' }),
                                  prefix: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                          >
                            <option value="">เลือกคำนำหน้า</option>
                            <option value="นาย">นาย</option>
                            <option value="นางสาว">นางสาว</option>
                            <option value="นาง">นาง</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            ชื่อ (First Name) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="กรอกชื่อ"
                            value={formData.emergencyContact?.firstName || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergencyContact: {
                                  ...(formData.emergencyContact || { lastName: '', primaryPhone: '' }),
                                  firstName: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            นามสกุล (Last Name) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="กรอกนามสกุล"
                            value={formData.emergencyContact?.lastName || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergencyContact: {
                                  ...(formData.emergencyContact || { firstName: '', primaryPhone: '' }),
                                  lastName: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            ที่อยู่ (Address) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="กรอกที่อยู่"
                            value={formData.emergencyContact?.address || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergencyContact: {
                                  ...(formData.emergencyContact || { firstName: '', lastName: '', primaryPhone: '' }),
                                  address: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            เบอร์โทร (Phone number) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="กรอกเบอร์โทร"
                            value={formData.emergencyContact?.primaryPhone || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergencyContact: {
                                  ...(formData.emergencyContact || { firstName: '', lastName: '' }),
                                  primaryPhone: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 sm:px-8 py-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors"
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
