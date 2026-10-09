'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Phone,
  Calendar,
} from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { bankService } from '@/services/bankService';
import { useMasterLookups, lookupId } from '@/hooks/useMasterLookups';
import type { Bank } from '@/types/api';
import { Employee, CreateEmployeePayload, FamilyMember, EmployeeEducation, EmployeeWorkExperience, EmployeeBankAccount } from '@/types/employee';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { NATIONALITIES } from '@/constants/nationalities';
import { NationalitySelect } from '@/components/ui/NationalitySelect';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { useEmployeeTypeOptions } from '@/hooks/useEmployeeTypeOptions';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';
import EmployeeBackgroundEditor from '@/components/employees/EmployeeBackgroundEditor';
import EmployeeTaxSsoEditor, { TaxSsoValues } from '@/components/employees/EmployeeTaxSsoEditor';
import { CustomSelect } from '@/components/ui/CustomSelect';

const formatPhoneNumber = (val?: string | null): string => {
  if (!val) return '';
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

const autoFormatPhone = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length > 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return digits;
};

function FieldInfoTooltip({
  text,
  align = 'left',
}: {
  text: string;
  align?: 'left' | 'center' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const alignClass =
    align === 'right'
      ? 'right-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'left-0';

  const arrowClass =
    align === 'right'
      ? 'right-2'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'left-2';

  return (
    <span ref={ref} className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 transition-colors cursor-pointer text-[10px] font-bold shrink-0 focus:outline-none shadow-2xs"
        title="คลิกเพื่อดูคำอธิบาย"
        aria-label="คลิกเพื่อดูคำอธิบาย"
      >
        !
      </button>

      {open && (
        <span
          className={`absolute bottom-full mb-2 z-50 w-64 p-2.5 bg-slate-900/95 dark:bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg shadow-xl backdrop-blur-sm border border-slate-700 pointer-events-auto animate-in fade-in zoom-in-95 duration-150 normal-case font-normal text-left ${alignClass}`}
        >
          <span className="flex items-start gap-1.5">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black shrink-0 mt-0.5">
              !
            </span>
            <span className="font-normal text-slate-100">{text}</span>
          </span>
          <span
            className={`absolute top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900/95 dark:border-t-slate-800 ${arrowClass}`}
          />
        </span>
      )}
    </span>
  );
}

export default function EmployeeEditPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-9 h-9 animate-spin text-[#0B2046] mx-auto" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      }
    >
      <EmployeeEditPageContent />
    </React.Suspense>
  );
}

function EmployeeEditPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const employeeId = Number(params.id);
  const isFromProfile = searchParams.get('from') === 'profile';
  const returnUrl = searchParams.get('returnUrl') || (isFromProfile ? '/profile' : `/employees/${employeeId}`);

  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    if (isFromProfile) {
      setBreadcrumb({ section: 'โปรไฟล์', page: 'แก้ไขข้อมูลพนักงาน' });
    } else {
      setBreadcrumb({ section: 'พนักงาน', page: 'แก้ไขข้อมูลพนักงาน' });
    }
    return () => setBreadcrumb(null);
  }, [isFromProfile, setBreadcrumb]);

  // Loading & Feedback states
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active Tab: ข้อมูลส่วนตัว vs ข้อมูลครอบครัว vs ผู้ติดต่อกรณีฉุกเฉิน
  const [activeTab, setActiveTab] = useState<'personal' | 'family' | 'emergency' | 'background' | 'tax'>('personal');

  // การศึกษา / ประวัติการทำงาน / ภาษีและประกันสังคม
  const [educations, setEducations] = useState<EmployeeEducation[]>([]);
  const [workExperiences, setWorkExperiences] = useState<EmployeeWorkExperience[]>([]);
  const [taxSso, setTaxSso] = useState<TaxSsoValues>({
    socialSecurityNo: '',
    hospitalName: '',
    spouseHasIncome: false,
    numberOfChildren: 0,
    parentDeductionCount: 0,
    disabilityDeductionCount: 0,
  });
  const [ssoMasked, setSsoMasked] = useState<string | null>(null);
  const [activeFamilyIndex, setActiveFamilyIndex] = useState<number>(0);

  // Sub-Navigation Tabs ด้านบนตามภาพ Figma
  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', active: true },
    { title: 'ประเภทพนักงาน', href: '/employees/types' },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/transfers' },
    { title: 'สัญญาจ้าง', href: '/employees/contracts' },
  ];

  // Form State
  // หัวหน้างานโดยตรง
  const [managerId, setManagerId] = useState<number | ''>('');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // สัญชาติ / ศาสนา / สถานภาพสมรส จากเมนู ข้อมูลหลัก
  const lookups = useMasterLookups();

  // ธนาคารจากข้อมูลหลัก + บัญชีที่รอยืนยัน (ถ้ามี)
  const [banks, setBanks] = useState<Bank[]>([]);
  const [pendingBank, setPendingBank] = useState<EmployeeBankAccount | null>(null);
  const [rejectedBank, setRejectedBank] = useState<EmployeeBankAccount | null>(null);
  useEffect(() => {
    bankService
      .getAll()
      .then((list) => setBanks(list.filter((b) => b.status === 'ACTIVE')))
      .catch(() => setBanks([]));
  }, []);
  const [formData, setFormData] = useState<CreateEmployeePayload>({
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
  });

  const { hasPermission } = useAuth();
  const canEditEmployeeType =
    hasPermission('EMP_PROFILE_EDIT') || hasPermission('EMP_EDIT') || hasPermission('EMP_MANAGE');
  const employeeTypeOptions = useEmployeeTypeOptions(formData.employeeType);

  // โหลดข้อมูลพนักงานเดิม
  useEffect(() => {
    if (!employeeId || isNaN(employeeId)) {
      toast.error('รหัสพนักงานไม่ถูกต้อง');
      setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const emp = await employeeService.getById(employeeId);
        setManagerId(emp.managerEmployeeId ?? '');
        setEducations((emp.educations ?? []).map((e) => ({ ...e, gpa: e.gpa != null ? Number(e.gpa) : undefined })));
        setWorkExperiences(emp.workExperiences ?? []);
        setTaxSso({
          socialSecurityNo: '',
          hospitalName: emp.socialSecurity?.hospitalName ?? '',
          spouseHasIncome: !!emp.spouseHasIncome,
          numberOfChildren: emp.numberOfChildren ?? 0,
          parentDeductionCount: emp.parentDeductionCount ?? 0,
          disabilityDeductionCount: emp.disabilityDeductionCount ?? 0,
        });
        setSsoMasked(emp.socialSecurity?.socialSecurityNoMasked ?? null);
        // รายชื่อพนักงานสำหรับเลือกหัวหน้างาน (โหลดไม่ได้ก็ยังแก้ข้อมูลอื่นได้)
        employeeService
          .getAll()
          .then(setAllEmployees)
          .catch((e) => console.error('Failed to load employees for manager select:', e));

        const primaryAddress = emp.addresses?.find((a) => a.isCurrent) || emp.addresses?.[0];
        const primaryEducation = emp.educations?.[0];
        const primaryEmergency = emp.emergencyContacts?.find((c) => c.isPrimary) || emp.emergencyContacts?.[0];
        const primaryBank =
          emp.bankAccounts?.find((b) => b.status === 'ACTIVE' && b.isPrimary) ||
          emp.bankAccounts?.find((b) => b.status === 'ACTIVE');
        setPendingBank(emp.bankAccounts?.find((b) => b.status === 'PENDING_VERIFY') ?? null);
        setRejectedBank(emp.bankAccounts?.find((b) => b.status === 'REJECTED') ?? null);

        setFormData({
          employeeCode: emp.employeeCode || '',
          biometricId: emp.biometricId || '',
          prefix: emp.prefix || '',
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          citizenId: emp.citizenIdMasked || '',
          gender: emp.gender || (emp.genderId === 1 || emp.prefix === 'นาย' ? 'ชาย' : (emp.genderId === 2 || emp.prefix === 'นางสาว' || emp.prefix === 'นาง' ? 'หญิง' : '')),
          nationality: emp.nationality === 'ไทย' ? 'ไทย (Thai)' : (emp.nationality || 'ไทย (Thai)'),
          religion: emp.religion || '',
          birthDate: emp.birthDate ? emp.birthDate.substring(0, 10) : '',
          maritalStatus: emp.maritalStatus || '',
          militaryStatus: emp.militaryStatus || '',
          addressType: primaryAddress?.addressType || 'บ้านตัวเอง',
          addressLine: primaryAddress?.addressLine || '',
          subDistrict: primaryAddress?.subDistrict || '',
          district: primaryAddress?.district || '',
          province: primaryAddress?.province || '',
          postalCode: primaryAddress?.postalCode || '',
          personalEmail: emp.contact?.personalEmail || '',
          organizationEmail: emp.contact?.organizationEmail || '',
          personalPhone: formatPhoneNumber(emp.contact?.personalPhone) || '',
          educationLevel: primaryEducation?.educationLevel || '',
          institution: primaryEducation?.institution || '',
          major: primaryEducation?.major || '',
          graduationYear: primaryEducation?.graduationYear || 2569,
          gpa: primaryEducation?.gpa ? Number(primaryEducation.gpa) : undefined,
          bankId: primaryBank?.bankId,
          bankName: primaryBank?.bankName || '',
          accountNumber: primaryBank?.accountNumber || '',
          positionId: emp.positionId,
          positionName: emp.positionName || '',
          employeeType: emp.employeeType || '',
          familyMembers:
            emp.familyMembers && emp.familyMembers.length > 0
              ? emp.familyMembers.map((fm) => ({
                  relationshipType: fm.relationshipType || 'บิดา',
                  prefix: fm.prefix || '',
                  firstName: fm.firstName || '',
                  lastName: fm.lastName || '',
                  citizenId: fm.citizenIdMasked || '',
                  birthDate: fm.birthDate ? fm.birthDate.substring(0, 10) : '',
                  maritalStatus: fm.maritalStatus,
                  educationStatus: fm.educationStatus,
                }))
              : [
                  {
                    relationshipType: 'บิดา',
                    prefix: '',
                    firstName: '',
                    lastName: '',
                    citizenId: '',
                    birthDate: '',
                  },
                ],
          emergencyContact: primaryEmergency
            ? {
                relationship: primaryEmergency.relationship || 'บิดา',
                prefix: primaryEmergency.prefix || '',
                firstName: primaryEmergency.firstName || '',
                lastName: primaryEmergency.lastName || '',
                address: primaryEmergency.address || '',
                primaryPhone: formatPhoneNumber(primaryEmergency.primaryPhone) || '',
                secondaryPhone: formatPhoneNumber(primaryEmergency.secondaryPhone) || '',
              }
            : {
                relationship: 'บิดา',
                prefix: '',
                firstName: '',
                lastName: '',
                address: '',
                primaryPhone: '',
              },
        });
      } catch (err: unknown) {
        console.error('Failed to load employee for editing:', err);
        const error = err as { message?: string };
        toast.error(error?.message || 'ไม่สามารถโหลดข้อมูลพนักงานได้');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId]);

  // Family Members handler
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // ตรวจสอบ CitizenId ว่าถูก Mask หรือไม่สมบูรณ์หรือไม่ หากเป็น Masked ไม่ต้องส่งไปอัปเดตทับ
      const rawDigits = formData.citizenId ? formData.citizenId.replace(/\D/g, '') : '';
      const isMaskedOrIncomplete = !formData.citizenId ||
        formData.citizenId.includes('x') ||
        formData.citizenId.includes('X') ||
        formData.citizenId.includes('*') ||
        rawDigits.length !== 13;
      const cleanCitizenId = isMaskedOrIncomplete ? undefined : rawDigits;

      const payload: Partial<CreateEmployeePayload> = {
        ...formData,
        employeeCode: formData.employeeCode.trim(),
        setManager: true,
        managerEmployeeId: managerId === '' ? null : managerId,
        // ประวัติการศึกษา/การทำงานส่งทั้งชุด (แทนช่องวุฒิการศึกษาเดี่ยวแบบเดิม)
        educations: educations.filter((e) => e.educationLevel?.trim() || e.institution?.trim()),
        workExperiences: workExperiences.filter((w) => w.companyName?.trim()),
        // ภาษีและประกันสังคม
        spouseHasIncome: taxSso.spouseHasIncome,
        numberOfChildren: taxSso.numberOfChildren,
        parentDeductionCount: taxSso.parentDeductionCount,
        disabilityDeductionCount: taxSso.disabilityDeductionCount,
        socialSecurityNo: taxSso.socialSecurityNo?.trim() || undefined,
        hospitalName: taxSso.hospitalName.trim(),
        biometricId: formData.biometricId?.trim() ? formData.biometricId.trim() : '',
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        citizenId: cleanCitizenId,
        birthDate: formData.birthDate?.trim() || undefined,
        prefix: formData.prefix && formData.prefix !== 'เลือกคำนำหน้า' ? formData.prefix : undefined,
        gender: formData.gender && formData.gender !== 'เลือกเพศ' ? formData.gender : undefined,
        genderId: formData.gender === 'ชาย' ? 1 : (formData.gender === 'หญิง' ? 2 : (formData.gender === 'ไม่ระบุ' ? 3 : undefined)),
        nationality: formData.nationality && formData.nationality !== 'เลือกสัญชาติ' ? formData.nationality : 'ไทย (Thai)',
        // ศาสนาเป็นข้อมูลอ่อนไหว (PDPA) → ไม่บังคับ และไม่ใส่ค่าให้เอง
        religion: formData.religion && formData.religion !== 'เลือกศาสนา' ? formData.religion : undefined,
        religionId: lookupId(lookups.religions, formData.religion),
        maritalStatus: formData.maritalStatus && formData.maritalStatus !== 'เลือกสถานภาพ' ? formData.maritalStatus : undefined,
        maritalStatusId: lookupId(lookups.maritalStatuses, formData.maritalStatus),
        militaryStatus: formData.militaryStatus && formData.militaryStatus !== 'เลือกสถานภาพทางทหาร' ? formData.militaryStatus : undefined,
        educationLevel: undefined,
        institution: undefined,
        major: undefined,
        graduationYear: undefined,
        gpa: undefined,
        familyMembers: formData.familyMembers
          ?.filter((f) => f.firstName?.trim())
          .map((f) => ({
            relationshipType: f.relationshipType || 'บิดา',
            prefix: f.prefix || undefined,
            firstName: f.firstName.trim(),
            lastName: f.lastName?.trim() || '-',
            citizenId: f.citizenId && !f.citizenId.includes('x') ? f.citizenId.trim() : undefined,
            birthDate: f.birthDate?.trim() || undefined,
          })),
        emergencyContact: formData.emergencyContact?.firstName?.trim()
          ? {
              relationship: formData.emergencyContact.relationship || 'บิดา',
              prefix: formData.emergencyContact.prefix || undefined,
              firstName: formData.emergencyContact.firstName.trim(),
              lastName: formData.emergencyContact.lastName?.trim() || '-',
              primaryPhone: formData.emergencyContact.primaryPhone?.trim() || '-',
              address: formData.emergencyContact.address?.trim() || undefined,
            }
          : undefined,
      };

      const updated = await employeeService.update(employeeId, payload);
      const linked = updated?.attendanceRowsLinked ?? 0;
      toast.success(
        linked > 0
          ? `บันทึกการแก้ไขข้อมูลพนักงานสำเร็จ และเชื่อมเวลาเข้างานจากไฟล์ที่นำเข้าไว้แล้ว ${linked} รายการ`
          : 'บันทึกการแก้ไขข้อมูลพนักงานสำเร็จ'
      );

      // รอ 800ms แล้วนำทางกลับไปยังหน้ารายละเอียดพนักงาน หรือ หน้าโปรไฟล์
      setTimeout(() => {
        router.push(returnUrl);
      }, 800);
    } catch (err: unknown) {
      console.error('Failed to update employee:', err);
      const error = err as { message?: string };
      toast.error(error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-500 dark:text-slate-400 font-sans">
        <Loader2 className="w-9 h-9 animate-spin text-[#0B2046] mb-3" />
        <p className="text-sm font-medium">กำลังโหลดข้อมูลสำหรับแก้ไข...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans pb-12">
      {/* 1. Sub-Navigation Tabs (ตรงตามแถบด้านบนของ Figma) */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl shadow-2xs">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {subNavTabs.map((tab) => {
            const isActive = tab.active;
            return (
              <button
                key={tab.title}
                type="button"
                onClick={() => router.push(tab.href)}
                className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                  isActive
                    ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300'
                }`}
              >
                {tab.title}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 2. Main Edit Card Container */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 p-6 lg:p-8 shadow-xs min-h-[calc(100vh-210px)] flex flex-col justify-between">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Card Tabs: ข้อมูลส่วนตัว vs ข้อมูลครอบครัว */}
            <div className="flex items-center gap-8 border-b border-slate-100 dark:border-slate-700/60 pb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`pb-2 transition-all border-b-2 cursor-pointer ${
                  activeTab === 'personal'
                    ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-300'
                }`}
              >
                ข้อมูลส่วนตัว
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('family')}
                className={`pb-2 transition-all border-b-2 cursor-pointer ${
                  activeTab === 'family'
                    ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-300'
                }`}
              >
                ข้อมูลครอบครัว
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('emergency')}
                className={`pb-2 transition-all border-b-2 cursor-pointer ${
                  activeTab === 'emergency'
                    ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-300'
                }`}
              >
                ผู้ติดต่อกรณีฉุกเฉิน
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('background')}
                className={`pb-2 transition-all border-b-2 cursor-pointer ${
                  activeTab === 'background'
                    ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-300'
                }`}
              >
                การศึกษา & ประวัติการทำงาน
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tax')}
                className={`pb-2 transition-all border-b-2 cursor-pointer ${
                  activeTab === 'tax'
                    ? 'border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-300'
                }`}
              >
                ภาษี & ประกันสังคม
              </button>
            </div>

            {activeTab === 'background' && (
              <EmployeeBackgroundEditor
                educations={educations}
                onEducationsChange={setEducations}
                workExperiences={workExperiences}
                onWorkExperiencesChange={setWorkExperiences}
              />
            )}

            {activeTab === 'tax' && (
              <EmployeeTaxSsoEditor values={taxSso} onChange={setTaxSso} currentSocialSecurityMasked={ssoMasked} />
            )}

            {/* ============================================================ */}
            {/* TAB 1: ข้อมูลส่วนตัว (Personal Info) - 3 Columns Layout      */}
            {/* ============================================================ */}
            {activeTab === 'personal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 text-xs animate-in fade-in duration-150">
                {/* --- คอลัมน์ที่ 1 --- */}
                <div className="space-y-4">
                  {/* รหัสพนักงาน */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>รหัสพนักงาน (Employee Code) <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น EMP001"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                    />
                  </div>

                  {/* รหัสเครื่องสแกนนิ้ว (Biometric ID) */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>รหัสเครื่องสแกนนิ้ว (Biometric ID)</span>
                      <FieldInfoTooltip text="รหัสพนักงานในเครื่องสแกนนิ้ว/ทาบบัตร (สำหรับเชื่อมต่อเวลากับไฟล์ Excel อัตโนมัติ)" />
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 100001"
                      value={formData.biometricId || ''}
                      onChange={(e) => setFormData({ ...formData, biometricId: e.target.value })}
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                    />
                  </div>

                  {/* หัวหน้างานโดยตรง */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>หัวหน้างานโดยตรง</span>
                      <FieldInfoTooltip text='ใช้กับขั้นอนุมัติ "หัวหน้างานตรง" ในสายการอนุมัติ' />
                    </label>
                    <EmployeeSelect
                      employees={allEmployees}
                      value={managerId}
                      onChange={(empId) => setManagerId(empId)}
                      emptyLabel="ไม่มีหัวหน้างาน"
                      placeholder="เลือกหัวหน้างาน หรือพิมพ์ค้นหา..."
                      excludeEmployeeIds={[employeeId]}
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    />
                  </div>

                  {/* ประเภทพนักงาน — แก้ได้เฉพาะผู้มีสิทธิ์แก้ไขข้อมูลพนักงาน */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>ประเภทพนักงาน</span>
                      <FieldInfoTooltip
                        text={canEditEmployeeType
                          ? 'เมื่อสัญญาจ้างฉบับใหม่มีผล ระบบจะอัปเดตประเภทตามสัญญาให้อัตโนมัติ'
                          : 'ไม่มีสิทธิ์แก้ไข — ประเภทจะอัปเดตตามสัญญาจ้างที่มีผล'}
                      />
                    </label>
                    {canEditEmployeeType ? (
                      <CustomSelect
                        value={formData.employeeType || ''}
                        onChange={(e) => setFormData({ ...formData, employeeType: e.target.value })}
                        className="w-full cursor-pointer"
                        buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                      >
                        {!formData.employeeType && <option value="">เลือกประเภท</option>}
                        {employeeTypeOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </CustomSelect>
                    ) : (
                      <div className="w-full h-10 px-3.5 flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                        {formData.employeeType || '-'}
                      </div>
                    )}
                  </div>

                  {/* คำนำหน้า */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>คำนำหน้า (Prefix) <span className="text-rose-500">*</span></span>
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
                      }}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="นาง">นาง</option>
                    </CustomSelect>
                  </div>

                  {/* ชื่อ */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>ชื่อ (First Name) <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      placeholder="กรอกชื่อ"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* นามสกุล */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>นามสกุล (Last Name) <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      placeholder="กรอกนามสกุล"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>
                </div>

                {/* --- คอลัมน์ที่ 2 --- */}
                <div className="space-y-4">
                  {/* เลขบัตรประชาชน */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>เลขบัตรประชาชน (National ID) <span className="text-rose-500">*</span></span>
                      <FieldInfoTooltip text="ข้อมูลถูกปกปิด (Masked) ตาม PDPA หากไม่ต้องการเปลี่ยนให้คงค่าเดิมไว้" />
                    </label>
                    <input
                      type="text"
                      maxLength={17}
                      placeholder="เลขบัตรประชาชน 13 หลัก"
                      value={formData.citizenId || ''}
                      onChange={(e) => setFormData({ ...formData, citizenId: e.target.value })}
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                    />
                  </div>

                  {/* วันเกิด */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>วันเกิด (Date of Birth) <span className="text-rose-500">*</span></span>
                    </label>
                    <ThaiDatePicker
                      value={formData.birthDate}
                      onChange={(val) => setFormData({ ...formData, birthDate: val })}
                      className="w-full"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    />
                  </div>

                  {/* เพศ */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>เพศ (Gender) <span className="text-rose-500">*</span></span>
                    </label>
                    <CustomSelect
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    >
                      <option value="">เลือกเพศ</option>
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </CustomSelect>
                  </div>

                  {/* สัญชาติ */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>สัญชาติ (Nationality) <span className="text-rose-500">*</span></span>
                    </label>
                    <NationalitySelect
                      value={formData.nationality}
                      onChange={(val) => setFormData({ ...formData, nationality: val })}
                      className="!h-10"
                    />
                  </div>

                  {/* ศาสนา */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>ศาสนา (Religion) (ไม่บังคับ)</span>
                    </label>
                    <CustomSelect
                      value={formData.religion}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    >
                      <option value="">ไม่ระบุ</option>
                      <option value="พุทธ">พุทธ</option>
                      <option value="คริสต์">คริสต์</option>
                      <option value="อิสลาม">อิสลาม</option>
                      <option value="ฮินดู">ฮินดู</option>
                      <option value="ซิกข์">ซิกข์</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </CustomSelect>
                  </div>

                  {/* สถานภาพสมรส */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>สถานภาพสมรส (Marital Status) <span className="text-rose-500">*</span></span>
                    </label>
                    <CustomSelect
                      value={formData.maritalStatus}
                      onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    >
                      <option value="">เลือกสถานภาพ</option>
                      <option value="โสด">โสด</option>
                      <option value="สมรส">สมรส</option>
                      <option value="หย่าร้าง">หย่าร้าง</option>
                      <option value="หม้าย">หม้าย</option>
                    </CustomSelect>
                  </div>

                  {/* สถานภาพทางทหาร */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>สถานภาพทางทหาร (Military Status) <span className="text-rose-500">*</span></span>
                    </label>
                    <CustomSelect
                      value={formData.militaryStatus}
                      onChange={(e) => setFormData({ ...formData, militaryStatus: e.target.value })}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    >
                      <option value="">เลือกสถานภาพทางทหาร</option>
                      <option value="ได้รับการยกเว้น">ได้รับการยกเว้น</option>
                      <option value="ผ่านการเกณฑ์ทหารแล้ว">ผ่านการเกณฑ์ทหารแล้ว</option>
                      <option value="ศึกษาวิชาทหาร (รด.)">ศึกษาวิชาทหาร (รด.)</option>
                      <option value="ยังไม่ได้รับการเกณฑ์">ยังไม่ได้รับการเกณฑ์</option>
                    </CustomSelect>
                  </div>
                </div>

                {/* --- คอลัมน์ที่ 3 --- */}
                <div className="space-y-4">
                  {/* อีเมลส่วนตัว */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>อีเมล (E-mail) <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="email"
                      placeholder="test001@gmail.com"
                      value={formData.personalEmail}
                      onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* อีเมลองค์กร */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>อีเมลองค์กร (Organization email) <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={formData.organizationEmail}
                      onChange={(e) => setFormData({ ...formData, organizationEmail: e.target.value })}
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* เบอร์โทรศัพท์ส่วนตัว */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>เบอร์โทรศัพท์ส่วนตัว (Phone number) <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="08X-XXX-XXXX"
                      value={formData.personalPhone}
                      onChange={(e) => setFormData({ ...formData, personalPhone: autoFormatPhone(e.target.value) })}
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                    />
                  </div>

                  {/* ข้อมูลที่อยู่ (Address) */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block text-xs">
                      ที่อยู่ (Address) <span className="text-rose-500">*</span>
                    </label>

                    {/* ประเภทที่อยู่ */}
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1.5">
                        ประเภทที่อยู่
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['อาศัยกับครอบครัว', 'บ้านตัวเอง', 'บ้านเช่า', 'หอพัก'].map((t) => (
                          <label key={t} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="addressType"
                              value={t}
                              checked={formData.addressType === t}
                              onChange={(e) => setFormData({ ...formData, addressType: e.target.value })}
                              className="text-[#0B2046] focus:ring-[#0B2046]"
                            />
                            <span>{t}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* ที่อยู่ตามทะเบียนบ้าน */}
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                        บ้านเลขที่ / อาคาร <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="text"
                        placeholder="บ้านเลขที่ 4"
                        value={formData.addressLine}
                        onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                        className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                      />
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                        ตำบล / แขวง <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="text"
                        placeholder="แขวงหัวหมาก"
                        value={formData.subDistrict}
                        onChange={(e) => setFormData({ ...formData, subDistrict: e.target.value })}
                        className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                      />
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                        อำเภอ / เขต <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="text"
                        placeholder="บางกะปิ"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                      />
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
                          onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                          className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                        />
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
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ข้อมูลบัญชีธนาคาร (Bank Account) */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center text-xs">
                      <span>บัญชีธนาคาร (Bank Account)</span>
                      <FieldInfoTooltip
                        text="เปลี่ยนบัญชีแล้วต้องให้ HR หรือฝ่ายการเงินอีกคนยืนยันก่อน จึงจะใช้รับเงินเดือน (ระหว่างรอ ยังจ่ายเข้าบัญชีเดิม)"
                        align="right"
                      />
                    </label>
                    {pendingBank && (
                      <div className="text-[11px] px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300">
                        มีบัญชีใหม่รอยืนยัน: {pendingBank.bankName} {pendingBank.accountNumber}
                        {pendingBank.requestedAt ? ` (ขอเมื่อ ${new Date(pendingBank.requestedAt).toLocaleDateString('th-TH')})` : ''}
                      </div>
                    )}
                    {!pendingBank && rejectedBank && (
                      <div className="text-[11px] px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
                        คำขอเปลี่ยนเป็นบัญชี {rejectedBank.accountNumber} ไม่ได้รับอนุมัติ
                        {rejectedBank.rejectReason ? `: ${rejectedBank.rejectReason}` : ''}
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                        ชื่อธนาคาร
                      </span>
                      <CustomSelect
                        value={formData.bankId ?? ''}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : undefined;
                          const bank = banks.find((b) => b.id === id);
                          setFormData({ ...formData, bankId: id, bankName: bank?.bankName || '' });
                        }}
                        className="w-full cursor-pointer"
                        buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                      >
                        <option value="">เลือกธนาคาร</option>
                        {banks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName}
                            {b.shortName ? ` (${b.shortName})` : ''}
                          </option>
                        ))}
                      </CustomSelect>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center mb-1">
                        <span>
                          เลขที่บัญชี
                          {banks.find((b) => b.id === formData.bankId)?.accountDigits
                            ? ` (${banks.find((b) => b.id === formData.bankId)?.accountDigits} หลัก)`
                            : ''}
                        </span>
                        <FieldInfoTooltip
                          text="เว้นว่างหรือไม่แก้ = ใช้บัญชีเดิม"
                          align="right"
                        />
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="กรอกเฉพาะตัวเลข"
                        value={formData.accountNumber || ''}
                        onFocus={() => {
                          // เลขที่ซ่อนไว้ (xxxx1234) — คลิกเพื่อกรอกเลขใหม่ทั้งหมด
                          if ((formData.accountNumber || '').toLowerCase().includes('x')) {
                            setFormData({ ...formData, accountNumber: '' });
                          }
                        }}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/[^0-9]/g, '') })}
                        className="w-full h-10 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* ============================================================ */}
            {/* TAB 2: ข้อมูลครอบครัว (Family Info)                          */}
            {/* ============================================================ */}
            {activeTab === 'family' && (
              <div className="w-full space-y-6 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Users className="w-4 h-4 text-[#0B2046]" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">สมาชิกในครอบครัว</h3>
                </div>

                <div className="space-y-4">
                  {/* Family Member Switcher Tabs */}
                  <div className="flex items-center gap-2 mb-2">
                    {formData.familyMembers?.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveFamilyIndex(idx)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                          activeFamilyIndex === idx
                            ? 'bg-[#0B2046] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}

                    {/* ปุ่ม + เพิ่มสมาชิกครอบครัว */}
                    <button
                      type="button"
                      onClick={handleAddFamilyMember}
                      className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 hover:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100 flex items-center justify-center transition-all cursor-pointer"
                      title="เพิ่มสมาชิกครอบครัวคนถัดไป"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {formData.familyMembers && formData.familyMembers.length > 1 && (
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
                  {formData.familyMembers && formData.familyMembers[activeFamilyIndex] && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-950/70 p-5 border border-slate-200/80 dark:border-slate-700/80 rounded-xl">
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
                          }}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                        >
                          <option value="บิดา">บิดา</option>
                          <option value="มารดา">มารดา</option>
                          <option value="คู่สมรส">คู่สมรส</option>
                          <option value="บุตร">บุตร</option>
                          <option value="พี่น้อง">พี่น้อง</option>
                        </CustomSelect>
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
                          }}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                        >
                          <option value="">เลือกคำนำหน้า</option>
                          <option value="นาย">นาย</option>
                          <option value="นางสาว">นางสาว</option>
                          <option value="นาง">นาง</option>
                          <option value="เด็กชาย">เด็กชาย</option>
                          <option value="เด็กหญิง">เด็กหญิง</option>
                        </CustomSelect>
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
                          }}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                        />
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
                          }}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">เลขบัตรประชาชน</label>
                        <input
                          type="text"
                          placeholder="เลขบัตรประชาชน 13 หลัก"
                          value={formData.familyMembers[activeFamilyIndex].citizenId || ''}
                          onChange={(e) => {
                            const list = [...(formData.familyMembers || [])];
                            list[activeFamilyIndex].citizenId = e.target.value;
                            setFormData({ ...formData, familyMembers: list });
                          }}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">วันเกิด</label>
                        <ThaiDatePicker
                          value={formData.familyMembers[activeFamilyIndex].birthDate || ''}
                          onChange={(val) => {
                            const list = [...(formData.familyMembers || [])];
                            list[activeFamilyIndex].birthDate = val;
                            setFormData({ ...formData, familyMembers: list });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB 3: กรณีฉุกเฉินติดต่อใคร (Emergency Contact)             */}
            {/* ============================================================ */}
            {activeTab === 'emergency' && (
              <div className="w-full space-y-6 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Phone className="w-4 h-4 text-[#0B2046]" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">กรณีฉุกเฉินติดต่อใคร (Emergency Contact)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-sky-50/40 p-5 border border-sky-100 rounded-xl">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      ความสัมพันธ์ (Relationship) <span className="text-rose-500">*</span>
                    </label>
                    <CustomSelect
                      value={formData.emergencyContact?.relationship || 'บิดา'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            relationship: e.target.value,
                            firstName: formData.emergencyContact?.firstName || '',
                            lastName: formData.emergencyContact?.lastName || '',
                            primaryPhone: formData.emergencyContact?.primaryPhone || '',
                          },
                        })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                    >
                      <option value="บิดา">บิดา</option>
                      <option value="มารดา">มารดา</option>
                      <option value="คู่สมรส">คู่สมรส</option>
                      <option value="พี่น้อง">พี่น้อง</option>
                      <option value="ญาติ">ญาติ</option>
                      <option value="เพื่อน">เพื่อน</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </CustomSelect>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">คำนำหน้า</label>
                    <CustomSelect
                      value={formData.emergencyContact?.prefix || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            prefix: e.target.value,
                            firstName: formData.emergencyContact?.firstName || '',
                            lastName: formData.emergencyContact?.lastName || '',
                            primaryPhone: formData.emergencyContact?.primaryPhone || '',
                          },
                        })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                    >
                      <option value="">เลือกคำนำหน้า</option>
                      <option value="นาย">นาย</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="นาง">นาง</option>
                    </CustomSelect>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      ชื่อผู้ติดต่อ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="กรอกชื่อผู้ติดต่อฉุกเฉิน"
                      value={formData.emergencyContact?.firstName || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            firstName: e.target.value,
                            lastName: formData.emergencyContact?.lastName || '',
                            primaryPhone: formData.emergencyContact?.primaryPhone || '',
                          },
                        })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      นามสกุลผู้ติดต่อ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="กรอกนามสกุล"
                      value={formData.emergencyContact?.lastName || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            firstName: formData.emergencyContact?.firstName || '',
                            lastName: e.target.value,
                            primaryPhone: formData.emergencyContact?.primaryPhone || '',
                          },
                        })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      เบอร์โทรศัพท์ฉุกเฉิน <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="08X-XXX-XXXX"
                      value={formData.emergencyContact?.primaryPhone || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            firstName: formData.emergencyContact?.firstName || '',
                            lastName: formData.emergencyContact?.lastName || '',
                            primaryPhone: autoFormatPhone(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">ที่อยู่ผู้ติดต่อ</label>
                    <textarea
                      rows={2}
                      placeholder="ที่อยู่สำหรับติดต่อกรณีฉุกเฉิน"
                      value={formData.emergencyContact?.address || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            firstName: formData.emergencyContact?.firstName || '',
                            lastName: formData.emergencyContact?.lastName || '',
                            primaryPhone: formData.emergencyContact?.primaryPhone || '',
                            address: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions Bar (ยกเลิก & บันทึกข้อมูล) ตรงตาม Figma */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push(returnUrl)}
              className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-xl bg-[#0B2046] text-white text-xs font-semibold hover:bg-[#153468] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>บันทึกข้อมูล</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
