'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { confirmDelete } from '@/lib/sweetalert';
import { employeeService } from '@/services/employeeService';
import { bankService } from '@/services/bankService';
import { masterDataService } from '@/services/masterDataService';
import { getAvatarUrl } from '@/lib/api-client';
import { Employee, CreateEmployeePayload, FamilyMember } from '@/types/employee';
import { Bank } from '@/types/api';
import { MaritalStatusItem } from '@/types/master';
import EmployeeDetailView from '@/components/employees/EmployeeDetailView';
import {
  User,
  ShieldCheck,
  Camera,
  Phone,
  Briefcase,
  CreditCard,
  FileSignature,
  Upload,
  Trash2,
  Lock,
  RotateCcw,
  Save,
  Loader2,
  Eye,
  AlertCircle,
} from 'lucide-react';

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-9 h-9 animate-spin text-[#0B2046] mx-auto" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดข้อมูลโปรไฟล์...</p>
          </div>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // isEditing: false = แสดงหน้าดูข้อมูลพนักงาน (View Mode ตาม Mockup 1 & 3), true = หน้าฟอร์มแก้ไข (Edit Mode)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Avatar Upload State (สำหรับ Edit Mode)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Digital Signature State (สำหรับ Edit Mode)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [isUploadingSig, setIsUploadingSig] = useState<boolean>(false);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Edit Mode
  const [formData, setFormData] = useState({
    prefix: 'นาย',
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'ชาย',
    maritalStatus: 'โสด',
    spouse: '',
    numberOfChildren: 0,
    father: '',
    mother: '',
    email: '',
    phone: '',
    address: '',
    bankName: '',
    accountNumber: '',
    hospitalName: '',
  });

  // Bank Master Data State
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
  const [maritalStatuses, setMaritalStatuses] = useState<MaritalStatusItem[]>([]);

  // โหลด Master Data สำหรับฟอร์มแก้ไข
  useEffect(() => {
    const loadMasterData = async () => {
      setIsLoadingBanks(true);
      try {
        const [bankList, msList] = await Promise.all([
          bankService.getAll().catch(() => []),
          masterDataService.getMaritalStatuses().catch(() => []),
        ]);
        setBanks(bankList.filter((b) => b.status === 'ACTIVE'));
        setMaritalStatuses(msList);
      } catch (err) {
        console.error('Failed to load master data:', err);
      } finally {
        setIsLoadingBanks(false);
      }
    };
    loadMasterData();
  }, []);

  // Sync breadcrumb with view/edit state
  useEffect(() => {
    if (isEditing) {
      setBreadcrumb({ section: 'โปรไฟล์', page: 'แก้ไขโปรไฟล์' });
    } else {
      setBreadcrumb({ section: 'โปรไฟล์', page: 'ข้อมูลพนักงาน' });
    }
    return () => setBreadcrumb(null);
  }, [isEditing, setBreadcrumb]);

  // Load employee details
  const fetchEmployeeData = async () => {
    setIsLoading(true);
    try {
      const targetId = user?.employeeId || 1;
      const data = await employeeService.getById(targetId);
      setEmployee(data);

      // Extract family members
      const spouseMember = data.familyMembers?.find(
        (f) => f.relationshipType === 'SPOUSE' || f.relationshipType === 'คู่สมรส'
      );
      const fatherMember = data.familyMembers?.find(
        (f) => f.relationshipType === 'FATHER' || f.relationshipType === 'บิดา'
      );
      const motherMember = data.familyMembers?.find(
        (f) => f.relationshipType === 'MOTHER' || f.relationshipType === 'มารดา'
      );

      // Extract current address
      const currentAddr = data.addresses?.find((a) => a.isCurrent) || data.addresses?.[0];
      const addressString = currentAddr
        ? [currentAddr.addressLine, currentAddr.subDistrict, currentAddr.district, currentAddr.province, currentAddr.postalCode]
            .filter(Boolean)
            .join(' ')
        : '';

      // Extract primary bank account
      const primaryBank = data.bankAccounts?.find((b) => b.isPrimary) || data.bankAccounts?.[0];

      setFormData({
        prefix: data.prefix || 'นาย',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
        gender: data.gender || 'ชาย',
        maritalStatus: data.maritalStatus || 'โสด',
        spouse: spouseMember ? `${spouseMember.prefix ? spouseMember.prefix + ' ' : ''}${spouseMember.firstName} ${spouseMember.lastName || ''}`.trim() : '',
        numberOfChildren: data.numberOfChildren || 0,
        father: fatherMember ? `${fatherMember.prefix ? fatherMember.prefix + ' ' : ''}${fatherMember.firstName} ${fatherMember.lastName || ''}`.trim() : '',
        mother: motherMember ? `${motherMember.prefix ? motherMember.prefix + ' ' : ''}${motherMember.firstName} ${motherMember.lastName || ''}`.trim() : '',
        email: data.contact?.personalEmail || data.contact?.organizationEmail || '',
        phone: data.contact?.personalPhone || '',
        address: addressString,
        bankName: primaryBank?.bankName || '',
        accountNumber: primaryBank?.accountNumber || '',
        hospitalName: data.socialSecurity?.hospitalName || '',
      });

      if (data.avatarUrl) {
        setAvatarPreview(getAvatarUrl(data.avatarUrl));
      } else {
        setAvatarPreview(null);
      }
      if (data.signatureUrl) {
        setSignaturePreview(getAvatarUrl(data.signatureUrl));
      } else {
        setSignaturePreview(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load profile:', err);
      toast.error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      fetchEmployeeData();
    }
  }, [user?.employeeId, isAuthLoading]);

  // Handle Input Changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Reset form to original values
  const handleReset = () => {
    if (!employee) return;
    fetchEmployeeData();
    toast.success('คืนค่าข้อมูลเดิมเรียบร้อยแล้ว');
  };

  // Save profile changes
  const handleSave = async () => {
    if (!employee) return;
    setIsSaving(true);
    try {
      const familyMembersPayload: FamilyMember[] = [];

      if (formData.spouse.trim()) {
        const parts = formData.spouse.trim().split(' ');
        familyMembersPayload.push({
          relationshipType: 'SPOUSE',
          firstName: parts[0],
          lastName: parts.slice(1).join(' ') || undefined,
        });
      }

      if (formData.father.trim()) {
        const parts = formData.father.trim().split(' ');
        familyMembersPayload.push({
          relationshipType: 'FATHER',
          firstName: parts[0],
          lastName: parts.slice(1).join(' ') || undefined,
        });
      }

      if (formData.mother.trim()) {
        const parts = formData.mother.trim().split(' ');
        familyMembersPayload.push({
          relationshipType: 'MOTHER',
          firstName: parts[0],
          lastName: parts.slice(1).join(' ') || undefined,
        });
      }

      const payload: Partial<CreateEmployeePayload> = {
        employeeCode: employee.employeeCode,
        prefix: formData.prefix,
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthDate: formData.birthDate || undefined,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        numberOfChildren: Number(formData.numberOfChildren) || 0,
        personalEmail: formData.email,
        personalPhone: formData.phone,
        addressLine: formData.address,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        hospitalName: formData.hospitalName,
        familyMembers: familyMembersPayload,
      };

      await employeeService.update(employee.id, payload);
      toast.success('บันทึกการแก้ไขข้อมูลโปรไฟล์เรียบร้อยแล้ว');
      await fetchEmployeeData();
      setIsEditing(false); // สลับกลับไปยังหน้าดูข้อมูลโปรไฟล์
    } catch (err: unknown) {
      console.error('Failed to save profile:', err);
      const error = err as Error;
      toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Avatar Change in Edit Mode
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.warning('กรุณาเลือกไฟล์ภาพ PNG หรือ JPG เท่านั้น');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning('ขนาดไฟล์ภาพต้องไม่เกิน 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const url = await employeeService.uploadAvatar(employee.id, file);
      setAvatarPreview(getAvatarUrl(url));
      toast.success('อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว');
      await fetchEmployeeData();
    } catch (err: unknown) {
      setAvatarPreview(employee.avatarUrl ? getAvatarUrl(employee.avatarUrl) : null);
      const error = err as Error;
      toast.error(error.message || 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };

  // Handle Signature Upload in Edit Mode
  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.warning('กรุณาเลือกไฟล์ภาพ PNG หรือ JPG เท่านั้น');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.warning('ขนาดไฟล์ต้องไม่เกิน 2MB');
      return;
    }

    setIsUploadingSig(true);
    try {
      const url = await employeeService.uploadSignature(employee.id, file);
      setSignaturePreview(getAvatarUrl(url));
      toast.success('อัปโหลดลายเซ็นดิจิทัลเรียบร้อยแล้ว');
      await fetchEmployeeData();
    } catch (err: unknown) {
      setSignaturePreview(employee.signatureUrl ? getAvatarUrl(employee.signatureUrl) : null);
      const error = err as Error;
      toast.error(error.message || 'อัปโหลดลายเซ็นไม่สำเร็จ');
    } finally {
      setIsUploadingSig(false);
      if (sigFileInputRef.current) {
        sigFileInputRef.current.value = '';
      }
    }
  };

  // Handle Signature Delete in Edit Mode
  const handleDeleteSignature = async () => {
    if (!employee) return;
    const isConfirmed = await confirmDelete({
      title: 'ยืนยันการลบลายเซ็น',
      text: 'คุณต้องการลบลายเซ็นดิจิทัลนี้ใช่หรือไม่?',
      confirmButtonText: 'ลบลายเซ็น',
      cancelButtonText: 'ยกเลิก',
    });
    if (!isConfirmed) return;

    try {
      await employeeService.deleteSignature(employee.id);
      setSignaturePreview(null);
      if (sigFileInputRef.current) {
        sigFileInputRef.current.value = '';
      }
      toast.success('ลบลายเซ็นดิจิทัลเรียบร้อยแล้ว');
      await fetchEmployeeData();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'ลบลายเซ็นไม่สำเร็จ');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-[#0B2046] mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto text-center font-sans">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1.5">ไม่พบข้อมูลโปรไฟล์</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">ไม่สามารถโหลดข้อมูลโปรไฟล์ผู้ใช้งานได้</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: แสดงหน้าเหมือนกับหน้าดูข้อมูลพนักงาน (EmployeeDetailView) 100%
  // =========================================================================
  if (!isEditing) {
    return (
      <EmployeeDetailView
        employee={employee}
        onEmployeeUpdate={setEmployee}
        isProfilePage={true}
        onEditClick={() => setIsEditing(true)}
        editButtonLabel="แก้ไขข้อมูล"
      />
    );
  }

  // =========================================================================
  // EDIT MODE: หน้าฟอร์มแก้ไขโปรไฟล์ (เมื่อกดปุ่ม "แก้ไขข้อมูล")
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={avatarFileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
      />
      <input
        type="file"
        ref={sigFileInputRef}
        onChange={handleSignatureFileChange}
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Profile Summary Card                         */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden sticky top-6">
            {/* Top Avatar Banner */}
            <div className="p-6 text-center border-b border-slate-100 dark:border-slate-700/60">
              <div className="relative inline-block mx-auto mb-4">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-sm bg-[#0B2046] flex items-center justify-center text-3xl font-bold text-white">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="รูปโปรไฟล์"
                      className="w-full h-full object-cover"
                      onError={() => setAvatarPreview(null)}
                    />
                  ) : (
                    <span>
                      {employee?.firstName ? employee.firstName.charAt(0) : 'U'}
                    </span>
                  )}
                </div>

                {/* Camera upload badge button */}
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="เปลี่ยนรูปโปรไฟล์"
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#0B2046] hover:bg-[#153468] text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer border-2 border-white dark:border-slate-800"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Employee Code & Status Badges */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                  {employee?.employeeCode || 'EMP0001'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-green-900/20 text-emerald-700 dark:text-green-400 border border-emerald-200/70 dark:border-green-800/50 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              {/* Full Name & Position */}
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                {employee?.prefix ? `${employee.prefix} ` : ''}
                {employee?.firstName} {employee?.lastName}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {employee?.positionName || '-'}
              </p>
            </div>

            {/* Contact Information Section */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700/60 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Phone className="w-3.5 h-3.5 text-[#0B2046] dark:text-blue-400" />
                ข้อมูลติดต่อ
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">อีเมล</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium break-all">
                    {formData.email || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">เบอร์โทรศัพท์</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {formData.phone || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">ที่อยู่ปัจจุบัน</span>
                  <span className="text-slate-700 dark:text-slate-300 leading-relaxed block">
                    {formData.address || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Job Position Information Section */}
            <div className="p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Briefcase className="w-3.5 h-3.5 text-[#0B2046] dark:text-blue-400" />
                ข้อมูลตำแหน่งงาน
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">ฝ่าย</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {employee?.divisionName || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">แผนก</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {employee?.departmentName || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">ตำแหน่ง</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {employee?.positionName || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Edit Form                                   */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header Bar: Switch back to View Mode */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 px-6 py-4 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">แก้ไขข้อมูลโปรไฟล์</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ปรับปรุงข้อมูลส่วนตัว ข้อมูลติดต่อ และบัญชีธนาคารของคุณ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>ดูข้อมูลโปรไฟล์</span>
            </button>
          </div>

          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Card 1: ข้อมูลส่วนตัว */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                ข้อมูลส่วนตัว
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* คำนำหน้า */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    คำนำหน้า <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.prefix}
                    onChange={(e) => handleInputChange('prefix', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>

                {/* ชื่อ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ชื่อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="ชื่อจริง"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                </div>

                {/* นามสกุล */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="นามสกุล"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                </div>

                {/* วันเกิด */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    วันเกิด
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                </div>

                {/* เพศ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    เพศ
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  >
                    <option value="ชาย">ชาย</option>
                    <option value="หญิง">หญิง</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                {/* สถานะภาพสมรส */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    สถานะภาพสมรส
                  </label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  >
                    {maritalStatuses.length > 0 ? (
                      maritalStatuses.map((m) => (
                        <option key={m.id} value={m.maritalStatusName}>
                          {m.maritalStatusName}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="โสด">โสด</option>
                        <option value="สมรส">สมรส</option>
                        <option value="หย่าร้าง">หย่าร้าง</option>
                        <option value="หม้าย">หม้าย</option>
                      </>
                    )}
                  </select>
                </div>

                {/* คู่สมรส */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    คู่สมรส
                  </label>
                  <input
                    type="text"
                    value={formData.spouse}
                    onChange={(e) => handleInputChange('spouse', e.target.value)}
                    placeholder="ชื่อ-นามสกุลคู่สมรส"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                </div>

                {/* จำนวนบุตร */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    จำนวนบุตร
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.numberOfChildren}
                    onChange={(e) => handleInputChange('numberOfChildren', parseInt(e.target.value) || 0)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                </div>

                {/* บิดา */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    บิดา
                  </label>
                  <input
                    type="text"
                    value={formData.father}
                    onChange={(e) => handleInputChange('father', e.target.value)}
                    placeholder="ชื่อ-นามสกุลบิดา"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                </div>

                {/* มารดา */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    มารดา
                  </label>
                  <input
                    type="text"
                    value={formData.mother}
                    onChange={(e) => handleInputChange('mother', e.target.value)}
                    placeholder="ชื่อ-นามสกุลมารดา"
                    className="w-full md:w-1/3 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: ข้อมูลติดต่อ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                ข้อมูลติดต่อ
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* อีเมล */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="example@company.com"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                </div>

                {/* เบอร์โทรศัพท์ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="081-234-5678"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                </div>

                {/* ที่อยู่ปัจจุบัน */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ที่อยู่ปัจจุบัน
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="บ้านเลขที่, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: ข้อมูลตำแหน่งงาน (Read-only) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                  ข้อมูลตำแหน่งงาน
                </h3>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <Lock className="w-3 h-3 text-slate-400" />
                  ฝ่ายบุคคลเป็นผู้จัดการ
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">ฝ่าย</label>
                  <input
                    type="text"
                    disabled
                    value={employee?.divisionName || '-'}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">แผนก</label>
                  <input
                    type="text"
                    disabled
                    value={employee?.departmentName || '-'}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">ทีม</label>
                  <input
                    type="text"
                    disabled
                    value="-"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">ตำแหน่ง</label>
                  <input
                    type="text"
                    disabled
                    value={employee?.positionName || '-'}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Card 4: บัญชีธนาคาร */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                บัญชีธนาคาร
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ธนาคาร</label>
                  <select
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    disabled={isLoadingBanks}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046] disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                  >
                    <option value="">-- เลือกธนาคาร --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.bankName}>
                        {b.bankName}
                      </option>
                    ))}
                    {formData.bankName && !banks.some((b) => b.bankName === formData.bankName) && (
                      <option value={formData.bankName}>{formData.bankName}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">เลขที่บัญชี</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    placeholder="123-4-56789-0"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                </div>
              </div>
            </div>

            {/* Card 5: สิทธิประโยชน์และประกันสังคม */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                  สิทธิประโยชน์และประกันสังคม
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  สิทธิการรักษาพยาบาล (ผู้ประกันตน ม.33)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    โรงพยาบาลประกันสังคม
                  </label>
                  <input
                    type="text"
                    value={formData.hospitalName}
                    onChange={(e) => handleInputChange('hospitalName', e.target.value)}
                    placeholder="เช่น โรงพยาบาลจุฬาลงกรณ์ สภากาชาดไทย"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    สถานพยาบาลหลักที่ลงทะเบียนไว้ตามสิทธิประกันสังคม
                  </p>
                </div>
              </div>
            </div>

            {/* Card 6: ลายเซ็นดิจิทัล */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                  ลายเซ็นดิจิทัล
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  อัปโหลดรูปลายเซ็นสำหรับใช้ในระบบเอกสารอิเล็กทรอนิกส์
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col md:flex-row items-center gap-6">
                <div className="w-64 h-28 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden p-2 relative shrink-0">
                  {signaturePreview ? (
                    <img
                      src={signaturePreview}
                      alt="Digital Signature"
                      className="max-h-full max-w-full object-contain"
                      onError={() => setSignaturePreview(null)}
                    />
                  ) : (
                    <div className="text-center text-slate-400 text-xs font-medium">
                      <FileSignature className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                      ยังไม่มีลายเซ็นในระบบ
                    </div>
                  )}
                </div>

                <div className="space-y-3 flex-1 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => sigFileInputRef.current?.click()}
                      disabled={isUploadingSig}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      {isUploadingSig ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B2046]" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      )}
                      อัปโหลดลายเซ็นใหม่
                    </button>

                    {signaturePreview && (
                      <button
                        type="button"
                        onClick={handleDeleteSignature}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        ลบ
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    รองรับไฟล์ PNG, JPG (แนะนำไฟล์ PNG พื้นหลังโปร่งใส) ขนาดไม่เกิน 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                คืนค่าเดิม
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 rounded-xl bg-[#0B2046] hover:bg-[#153468] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
