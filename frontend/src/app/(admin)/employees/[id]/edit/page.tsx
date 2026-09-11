'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Employee, CreateEmployeePayload, FamilyMember } from '@/types/employee';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { NATIONALITIES } from '@/constants/nationalities';

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

export default function EmployeeEditPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = Number(params.id);

  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb({ section: 'พนักงาน', page: 'แก้ไขข้อมูลพนักงาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Loading & Feedback states
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active Tab: ข้อมูลส่วนตัว vs ข้อมูลครอบครัว
  const [activeTab, setActiveTab] = useState<'personal' | 'family'>('personal');
  const [activeFamilyIndex, setActiveFamilyIndex] = useState<number>(0);

  // Sub-Navigation Tabs ด้านบนตามภาพ Figma
  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', active: true },
    { title: 'ประเภทพนักงาน', href: '/organization' },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees' },
    { title: 'แผนผังองค์กร', href: '/organization' },
    { title: 'สัญญาจ้าง', href: '/employees' },
  ];

  // Form State
  const [formData, setFormData] = useState<CreateEmployeePayload>({
    employeeCode: '',
    prefix: '',
    firstName: '',
    lastName: '',
    citizenId: '',
    gender: '',
    nationality: 'ไทย (Thai)',
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
  });

  // โหลดข้อมูลพนักงานเดิม
  useEffect(() => {
    if (!employeeId || isNaN(employeeId)) {
      setErrorMessage('รหัสพนักงานไม่ถูกต้อง');
      setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const emp = await employeeService.getById(employeeId);

        const primaryAddress = emp.addresses?.find((a) => a.isCurrent) || emp.addresses?.[0];
        const primaryEducation = emp.educations?.[0];
        const primaryEmergency = emp.emergencyContacts?.find((c) => c.isPrimary) || emp.emergencyContacts?.[0];

        setFormData({
          employeeCode: emp.employeeCode || '',
          prefix: emp.prefix || '',
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          citizenId: emp.citizenIdMasked || '',
          gender: emp.gender || (emp.genderId === 1 || emp.prefix === 'นาย' ? 'ชาย' : (emp.genderId === 2 || emp.prefix === 'นางสาว' || emp.prefix === 'นาง' ? 'หญิง' : '')),
          nationality: emp.nationality === 'ไทย' ? 'ไทย (Thai)' : (emp.nationality || 'ไทย (Thai)'),
          religion: emp.religion || 'พุทธ',
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
          bankName: '',
          accountNumber: '',
          positionName: '',
          employeeType: '',
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
        setErrorMessage(error?.message || 'ไม่สามารถโหลดข้อมูลพนักงานได้');
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
    setErrorMessage(null);
    setSuccessMessage(null);

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
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        citizenId: cleanCitizenId,
        birthDate: formData.birthDate?.trim() || undefined,
        prefix: formData.prefix && formData.prefix !== 'เลือกคำนำหน้า' ? formData.prefix : undefined,
        gender: formData.gender && formData.gender !== 'เลือกเพศ' ? formData.gender : undefined,
        genderId: formData.gender === 'ชาย' ? 1 : (formData.gender === 'หญิง' ? 2 : (formData.gender === 'ไม่ระบุ' ? 3 : undefined)),
        nationality: formData.nationality && formData.nationality !== 'เลือกสัญชาติ' ? formData.nationality : 'ไทย (Thai)',
        religion: formData.religion && formData.religion !== 'เลือกศาสนา' ? formData.religion : 'พุทธ',
        maritalStatus: formData.maritalStatus && formData.maritalStatus !== 'เลือกสถานภาพ' ? formData.maritalStatus : undefined,
        militaryStatus: formData.militaryStatus && formData.militaryStatus !== 'เลือกสถานภาพทางทหาร' ? formData.militaryStatus : undefined,
        educationLevel: formData.educationLevel && formData.educationLevel !== 'เลือกวุฒิการศึกษา' ? formData.educationLevel : undefined,
        institution: formData.institution && formData.institution !== 'เลือกสถาบันการศึกษา' ? formData.institution : undefined,
        major: formData.major?.trim() || undefined,
        graduationYear: formData.graduationYear ? Number(formData.graduationYear) : undefined,
        gpa:
          formData.gpa !== undefined && formData.gpa !== null && !isNaN(Number(formData.gpa)) && Number(formData.gpa) > 0
            ? Number(formData.gpa)
            : undefined,
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

      await employeeService.update(employeeId, payload);
      setSuccessMessage('บันทึกการแก้ไขข้อมูลพนักงานสำเร็จ');

      // รอ 800ms แล้วนำทางกลับไปยังหน้ารายละเอียดพนักงาน
      setTimeout(() => {
        router.push(`/employees/${employeeId}`);
      }, 800);
    } catch (err: unknown) {
      console.error('Failed to update employee:', err);
      const error = err as { message?: string };
      setErrorMessage(error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-500 font-sans">
        <Loader2 className="w-9 h-9 animate-spin text-[#0B2046] mb-3" />
        <p className="text-sm font-medium">กำลังโหลดข้อมูลสำหรับแก้ไข...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans pb-12">
      {/* 1. Sub-Navigation Tabs (ตรงตามแถบด้านบนของ Figma) */}
      <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl shadow-2xs">
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

      {/* Message Notifications */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage} (กำลังนำทางกลับ...)</span>
        </div>
      )}

      {/* 2. Main Edit Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 lg:p-8 shadow-xs min-h-[calc(100vh-210px)] flex flex-col justify-between">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Card Tabs: ข้อมูลส่วนตัว vs ข้อมูลครอบครัว */}
            <div className="flex items-center gap-8 border-b border-slate-100 pb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`pb-2 transition-all border-b-2 cursor-pointer ${
                  activeTab === 'personal'
                    ? 'border-[#0B2046] text-[#0B2046] font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                ข้อมูลส่วนตัว
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('family')}
                className={`pb-2 transition-all border-b-2 cursor-pointer ${
                  activeTab === 'family'
                    ? 'border-[#0B2046] text-[#0B2046] font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                ข้อมูลครอบครัว
              </button>
            </div>

            {/* ============================================================ */}
            {/* TAB 1: ข้อมูลส่วนตัว (Personal Info) - 3 Columns Layout      */}
            {/* ============================================================ */}
            {activeTab === 'personal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 text-xs animate-in fade-in duration-150">
                {/* --- คอลัมน์ที่ 1 --- */}
                <div className="space-y-4">
                  {/* รหัสพนักงาน */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      รหัสพนักงาน (Employee Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น EMP001"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                    />
                  </div>

                  {/* คำนำหน้า */}
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

                  {/* ชื่อ */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      ชื่อ (First Name) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="กรอกชื่อ"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* นามสกุล */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      นามสกุล (Last Name) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="กรอกนามสกุล"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* เลขบัตรประชาชน */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      เลขบัตรประชาชน (National ID) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={17}
                      placeholder="เลขบัตรประชาชน 13 หลัก"
                      value={formData.citizenId || ''}
                      onChange={(e) => setFormData({ ...formData, citizenId: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      ข้อมูลถูกปกปิด (Masked) ตาม PDPA หากไม่ต้องการเปลี่ยนให้คงค่าเดิมไว้
                    </p>
                  </div>

                  {/* เพศ */}
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
                      <option value="ไม่ระบุ">ไม่ระบุ</option>
                    </select>
                  </div>

                  {/* สัญชาติ */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      สัญชาติ (Nationality) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                    >
                      <option value="">เลือกสัญชาติ</option>
                      {NATIONALITIES.map((n) => (
                        <option key={n.id} value={n.name}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ศาสนา */}
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

                {/* --- คอลัมน์ที่ 2 --- */}
                <div className="space-y-4">
                  {/* วันเกิด */}
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

                  {/* สถานภาพสมรส */}
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

                  {/* สถานภาพทางทหาร */}
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
                      <span className="text-slate-500 text-[11px] block mb-1.5">ประเภทที่อยู่</span>
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

                    {/* บ้านเลขที่ */}
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

                    {/* ตำบล / แขวง */}
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

                    {/* อำเภอ / เขต */}
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

                    {/* จังหวัด และ รหัสไปรษณีย์ */}
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
                          maxLength={5}
                          placeholder="10240"
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- คอลัมน์ที่ 3 --- */}
                <div className="space-y-4">
                  {/* อีเมล์ */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      อีเมล์ (E-mail) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="test001@gmail.com"
                      value={formData.personalEmail}
                      onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* อีเมลองค์กร */}
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

                  {/* เบอร์โทรศัพท์ส่วนตัว */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      เบอร์โทรศัพท์ส่วนตัว (Phone number) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="08X-XXX-XXXX"
                      value={formData.personalPhone}
                      onChange={(e) => setFormData({ ...formData, personalPhone: autoFormatPhone(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                    />
                  </div>

                  {/* ระดับวุฒิการศึกษา */}
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

                  {/* ชื่อสถาบันการศึกษา */}
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

                  {/* สาขาวิชา */}
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

                  {/* ปีที่สำเร็จการศึกษา */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      ปีที่สำเร็จการศึกษา (Graduation year) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.graduationYear}
                      onChange={(e) => setFormData({ ...formData, graduationYear: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                    >
                      {[2570, 2569, 2568, 2567, 2566, 2565, 2564, 2563, 2562, 2561, 2560, 2559, 2558].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* เกรดเฉลี่ยสะสม */}
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
            )}

            {/* ============================================================ */}
            {/* TAB 2: ข้อมูลครอบครัว (Family Info)                          */}
            {/* ============================================================ */}
            {activeTab === 'family' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start text-xs animate-in fade-in duration-150">
                {/* คอลัมน์ซ้าย: สมาชิกในครอบครัว */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0B2046]" />
                    <h3 className="font-bold text-slate-800 text-sm">สมาชิกในครอบครัว</h3>
                  </div>

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
                        className="text-[11px] text-rose-500 hover:underline ml-auto cursor-pointer"
                      >
                        ลบสมาชิกคนที่ {activeFamilyIndex + 1}
                      </button>
                    )}
                  </div>

                  {/* ฟิลด์สมาชิกครอบครัวตาม Index ที่เลือก */}
                  {formData.familyMembers && formData.familyMembers[activeFamilyIndex] && (
                    <div className="space-y-3.5 bg-slate-50/70 p-4 border border-slate-200/80 rounded-xl">
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
                        <label className="font-semibold text-slate-700 block mb-1">เลขบัตรประชาชน</label>
                        <input
                          type="text"
                          placeholder="เลขบัตรประชาชน 13 หลัก"
                          value={formData.familyMembers[activeFamilyIndex].citizenId || ''}
                          onChange={(e) => {
                            const list = [...(formData.familyMembers || [])];
                            list[activeFamilyIndex].citizenId = e.target.value;
                            setFormData({ ...formData, familyMembers: list });
                          }}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">วันเกิด</label>
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
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#0B2046]" />
                    <h3 className="font-bold text-slate-800 text-sm">กรณีฉุกเฉินติดต่อใคร (Emergency Contact)</h3>
                  </div>

                  <div className="space-y-3.5 bg-sky-50/50 p-4 border border-sky-100 rounded-xl">
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
                              ...formData.emergencyContact,
                              relationship: e.target.value,
                              firstName: formData.emergencyContact?.firstName || '',
                              lastName: formData.emergencyContact?.lastName || '',
                              primaryPhone: formData.emergencyContact?.primaryPhone || '',
                            },
                          })
                        }
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                      >
                        <option value="บิดา">บิดา</option>
                        <option value="มารดา">มารดา</option>
                        <option value="คู่สมรส">คู่สมรส</option>
                        <option value="พี่น้อง">พี่น้อง</option>
                        <option value="ญาติ">ญาติ</option>
                        <option value="เพื่อน">เพื่อน</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">คำนำหน้า</label>
                      <select
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
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
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
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
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
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">ที่อยู่ผู้ติดต่อ</label>
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
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions Bar (ยกเลิก & บันทึกข้อมูล) ตรงตาม Figma */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push(`/employees/${employeeId}`)}
              className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
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
