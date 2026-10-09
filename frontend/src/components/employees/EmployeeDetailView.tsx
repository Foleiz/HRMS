'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Mail,
  Phone,
  Home,
  Users,
  Shield,
  Loader2,
  AlertCircle,
  Camera,
  CheckCircle2,
  CreditCard,
  FileSignature,
  Upload,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  X,
  Pencil,
  User,
} from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { authService } from '@/services/authService';
import { Employee } from '@/types/employee';
import { useToast } from '@/context/ToastContext';
import { getAvatarUrl } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { confirmDelete } from '@/lib/sweetalert';
import EmployeeDocumentsTab from '@/components/employees/EmployeeDocumentsTab';
import { EmployeeBackgroundView, EmployeeTaxSsoView } from '@/components/employees/EmployeeBackgroundView';
import EmployeeChangeHistoryTab from '@/components/employees/EmployeeChangeHistoryTab';
import { MaskedDataViewer } from '@/components/common/MaskedDataViewer';
import { formatRoleName } from '@/lib/roleUtils';

const formatThaiDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch {
    return dateStr;
  }
};

const formatMaskedCitizenId = (val?: string): string => {
  if (!val) return '-';
  const clean = val.trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 13 && !clean.includes('x') && !clean.includes('*')) {
    return `${digits[0]}-${digits.substring(1, 5)}-xxxxx-xx-${digits[12]}`;
  }
  return clean;
};

const formatPhoneNumber = (val?: string | null): string => {
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

export type EmployeeDetailTab =
  | 'personal'
  | 'family'
  | 'emergency'
  | 'background'
  | 'tax'
  | 'user'
  | 'documents'
  | 'history';

interface EmployeeDetailViewProps {
  employee: Employee;
  onEmployeeUpdate?: (updated: Employee) => void;
  isProfilePage?: boolean;
  onEditClick?: () => void;
  editButtonLabel?: string;
}

/** แปลงประเภทที่อยู่ที่เป็นรหัส (จากข้อมูลตั้งต้น) เป็นข้อความไทย — ค่าที่กรอกจากฟอร์มเป็นภาษาไทยอยู่แล้ว */
const ADDRESS_TYPE_LABELS: Record<string, string> = {
  CURRENT: 'ที่อยู่ปัจจุบัน',
  REGISTERED: 'ที่อยู่ตามทะเบียนบ้าน',
  HOME: 'บ้านตัวเอง',
  RENT: 'บ้านเช่า',
  DORMITORY: 'หอพัก',
  FAMILY: 'อาศัยกับครอบครัว',
};
const formatAddressType = (t?: string | null) => (t ? ADDRESS_TYPE_LABELS[t.toUpperCase()] ?? t : '-');

export default function EmployeeDetailView({
  employee,
  onEmployeeUpdate,
  isProfilePage = false,
  onEditClick,
  editButtonLabel = 'แก้ไขข้อมูล',
}: EmployeeDetailViewProps) {
  const toast = useToast();
  const router = useRouter();
  const [bankRejecting, setBankRejecting] = useState(false);
  const [bankRejectReason, setBankRejectReason] = useState('');
  const [bankReviewing, setBankReviewing] = useState(false);

  const handleReviewBank = async (approve: boolean) => {
    const target = employee.bankAccounts?.find((b) => b.status === 'PENDING_VERIFY');
    if (!target) return;
    if (!approve && !bankRejectReason.trim()) {
      toast.warning('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
      return;
    }
    try {
      setBankReviewing(true);
      const updated = await employeeService.reviewBankAccount(employee.id, target.id, approve, bankRejectReason.trim() || undefined);
      onEmployeeUpdate?.(updated);
      setBankRejecting(false);
      setBankRejectReason('');
      toast.success(approve ? 'ยืนยันบัญชีรับเงินเดือนใหม่แล้ว' : 'ไม่อนุมัติบัญชีใหม่แล้ว');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setBankReviewing(false);
    }
  };
  const searchParams = useSearchParams();
  const { hasRole, hasPermission, user } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<EmployeeDetailTab>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'documents') return 'documents';
    if (tabParam === 'history') return 'history';
    if (tabParam === 'user' || tabParam === 'account') return 'user';
    if (tabParam === 'family') return 'family';
    if (tabParam === 'emergency') return 'emergency';
    if (tabParam === 'background') return 'background';
    if (tabParam === 'tax') return 'tax';
    return 'personal';
  });

  // ใช้รหัสสิทธิ์เดียวกับ backend (EMP_DOC_CREATE / EMP_DOC_EDIT)
  const canManageDocuments =
    hasRole('ADMIN') || hasRole('SYSTEM_SUPER') || hasPermission('EMP_DOC_CREATE') || hasPermission('EMP_DOC_EDIT');

  const canEditEmployee =
    isProfilePage ||
    hasPermission('EMP_PROFILE_EDIT') ||
    hasPermission('EMP_EDIT');

  // Custom Avatar
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Digital Signature State
  const [customSig, setCustomSig] = useState<string | null>(null);
  const [isUploadingSig, setIsUploadingSig] = useState<boolean>(false);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  const handleAvatarClick = () => {
    if (!isUploadingAvatar) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, WebP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning('ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const newAvatarUrl = await employeeService.uploadAvatar(employee.id, file);
      setCustomAvatar(newAvatarUrl);
      const updated = await employeeService.getById(employee.id);
      onEmployeeUpdate?.(updated);
      toast.success('เปลี่ยนรูปโปรไฟล์เรียบร้อย');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.warning('กรุณาเลือกไฟล์ภาพ PNG หรือ JPG เท่านั้น');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.warning('ขนาดไฟล์ต้องไม่เกิน 2MB');
      return;
    }

    try {
      setIsUploadingSig(true);
      const url = await employeeService.uploadSignature(employee.id, file);
      setCustomSig(getAvatarUrl(url));
      const updated = await employeeService.getById(employee.id);
      onEmployeeUpdate?.(updated);
      toast.success('อัปโหลดลายเซ็นดิจิทัลเรียบร้อยแล้ว');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'อัปโหลดลายเซ็นไม่สำเร็จ');
    } finally {
      setIsUploadingSig(false);
      if (sigFileInputRef.current) {
        sigFileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteSignature = async () => {
    const isConfirmed = await confirmDelete({
      title: 'ยืนยันการลบลายเซ็น',
      text: 'คุณต้องการลบลายเซ็นดิจิทัลนี้ใช่หรือไม่?',
      confirmButtonText: 'ลบลายเซ็น',
      cancelButtonText: 'ยกเลิก',
    });
    if (!isConfirmed) return;

    try {
      await employeeService.deleteSignature(employee.id);
      setCustomSig(null);
      const updated = await employeeService.getById(employee.id);
      onEmployeeUpdate?.(updated);
      toast.success('ลบลายเซ็นดิจิทัลเรียบร้อยแล้ว');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'ลบลายเซ็นไม่สำเร็จ');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.warning('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }
    if (!newPassword) {
      toast.warning('กรุณากรอกรหัสผ่านใหม่');
      return;
    }
    if (newPassword.length < 8) {
      toast.warning('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEditClick = () => {
    if (onEditClick) {
      onEditClick();
    } else {
      router.push(`/employees/${employee.id}/edit`);
    }
  };

  const primaryAddress = employee.addresses?.find((a) => a.isCurrent) || employee.addresses?.[0];
  const primaryEducation = employee.educations?.[0];
  const primaryBank =
    employee.bankAccounts?.find((b) => b.status === 'ACTIVE' && b.isPrimary) ||
    employee.bankAccounts?.find((b) => b.status === 'ACTIVE');
  const pendingBank = employee.bankAccounts?.find((b) => b.status === 'PENDING_VERIFY');
  const rejectedBank = employee.bankAccounts?.find((b) => b.status === 'REJECTED');
  const rawAvatarUrl = customAvatar || employee.avatarUrl;
  const avatarUrl = rawAvatarUrl ? getAvatarUrl(rawAvatarUrl) : null;
  const rawSigUrl = customSig || employee.signatureUrl;
  const signatureUrl = rawSigUrl ? getAvatarUrl(rawSigUrl) : null;

  const TABS = [
    { id: 'personal', label: 'ข้อมูลส่วนตัว' },
    { id: 'family', label: 'ข้อมูลครอบครัว' },
    { id: 'emergency', label: 'ผู้ติดต่อกรณีฉุกเฉิน' },
    { id: 'background', label: 'การศึกษา & ประวัติการทำงาน' },
    { id: 'tax', label: 'ภาษี & ประกันสังคม' },
    { id: 'user', label: 'ข้อมูลผู้ใช้งาน' },
    { id: 'documents', label: 'เอกสาร' },
    { id: 'history', label: 'ประวัติการเปลี่ยนแปลง' },
  ] as const;

  return (
    <div className="font-sans space-y-3.5">
      {/* Hidden file inputs for avatar & signature */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
      />
      <input
        type="file"
        ref={sigFileInputRef}
        onChange={handleSignatureFileChange}
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
      />

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[calc(100vh-128px)]">
        {/* ============================================================ */}
        {/* ซ้าย: Employee Summary Card                                  */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-6 shadow-xs flex flex-col h-full">
          {/* Avatar โปรไฟล์ */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3 group/avatar">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
                className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-slate-100 dark:ring-slate-700 shadow-md bg-[#0B2046] flex items-center justify-center cursor-pointer transition-all duration-300 group-hover/avatar:ring-[#0B2046]/40 group-hover/avatar:shadow-xl focus:outline-none block"
                title="คลิกเพื่อแก้ไขรูปโปรไฟล์"
              >
                {isUploadingAvatar ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B2046]/80 text-white">
                    <Loader2 className="w-8 h-8 animate-spin mb-1 text-white" />
                    <span className="text-[10px] font-medium">กำลังบันทึก...</span>
                  </div>
                ) : (
                  <>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={employee.fullName}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/avatar:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span className={`w-full h-full ${avatarUrl ? 'absolute inset-0 -z-10' : ''} flex items-center justify-center text-3xl font-bold bg-[#0B2046] text-white`}>
                      {employee.firstName?.charAt(0) || 'U'}
                    </span>

                    {/* Overlay แสดงเมื่อโฮเวอร์ */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover/avatar:opacity-100 transition-all duration-200 flex flex-col items-center justify-center text-white z-10 pointer-events-none">
                      <Camera className="w-6 h-6 mb-1 text-white drop-shadow animate-in zoom-in-75 duration-150" />
                      <span className="text-[11px] font-medium text-white tracking-tight drop-shadow">
                        แก้ไขรูปภาพ
                      </span>
                    </div>
                  </>
                )}
              </button>

              {/* ปุ่มกล้องเล็กที่มุมล่างขวา */}
              <button
                type="button"
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#0B2046] text-white border-2 border-white dark:border-slate-800 shadow-md flex items-center justify-center hover:bg-[#153468] hover:scale-110 transition-all cursor-pointer z-20"
                title="แก้ไขรูปโปรไฟล์"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Badges: Employee Code & Status */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold rounded-full font-mono">
                {employee.employeeCode || 'EMP0001'}
              </span>
              {employee.employmentStatus?.toUpperCase() === 'INACTIVE' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-semibold rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  ไม่ได้ทำงาน
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ทำงานอยู่
                </span>
              )}
            </div>

            {/* Full Name & Position */}
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center tracking-tight">
              {employee.prefix ? `${employee.prefix} ` : ''}{employee.firstName} {employee.lastName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
              {employee.positionName || '-'}
            </p>
          </div>

          <hr className="my-5 border-slate-100 dark:border-slate-700/60" />

          {/* Section: การติดต่อ */}
          <div className="space-y-3.5">
            <h2 className="text-[13px] font-bold text-slate-900 dark:text-slate-100">การติดต่อ</h2>

            {/* อีเมล */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">อีเมล</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-all">
                  {employee.contact?.organizationEmail || employee.contact?.personalEmail || '-'}
                </p>
                {employee.contact?.organizationEmail && employee.contact?.personalEmail && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 break-all">
                    ส่วนตัว: {employee.contact.personalEmail}
                  </p>
                )}
              </div>
            </div>

            {/* เบอร์โทรศัพท์ */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 mt-0.5">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">เบอร์โทรศัพท์</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {formatPhoneNumber(employee.contact?.personalPhone)}
                </p>
              </div>
            </div>

            {/* ที่อยู่ */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 mt-0.5">
                <Home className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">ที่อยู่</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                  {primaryAddress
                    ? `${primaryAddress.addressLine || ''} ${primaryAddress.subDistrict || ''} ${primaryAddress.district || ''} ${primaryAddress.province || ''} ${primaryAddress.postalCode || ''}`.trim() || '-'
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          <hr className="my-5 border-slate-100 dark:border-slate-700/60" />

          {/* Section: ข้อมูลตำแหน่งงาน */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-bold text-slate-900 dark:text-slate-100">ข้อมูลตำแหน่งงาน</h2>

            <div className="space-y-2.5">
              {/* ฝ่าย */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                  ฝ
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">ฝ่าย</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{employee.divisionName || '-'}</p>
                </div>
              </div>

              {/* แผนก */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                  ผ
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">แผนก</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{employee.departmentName || '-'}</p>
                </div>
              </div>

              {/* หัวหน้างานโดยตรง */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                  ห
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">หัวหน้างานโดยตรง</p>
                  {employee.managerEmployeeId ? (
                    <Link href={`/employees/${employee.managerEmployeeId}`} className="text-xs font-semibold text-[#0B2046] dark:text-blue-400 hover:underline">
                      {employee.managerName || '-'}
                    </Link>
                  ) : (
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">ยังไม่ได้กำหนด</p>
                  )}
                </div>
              </div>

              {/* ตำแหน่ง */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                  ต
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">ตำแหน่ง</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{employee.positionName || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ขวา: Detail Content with Merged Tabs                         */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-6 shadow-xs flex flex-col h-full">
          {/* Top Bar: Tabs & Icon-Only Edit Button */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3.5 gap-3">
            <div className="flex items-center gap-x-5 gap-y-2 text-xs font-medium overflow-x-auto scrollbar-none flex-1 min-w-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-1 transition-all border-b-2 font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'border-[#0B2046] text-[#0B2046] dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ปุ่มแก้ไขข้อมูล: ตำแหน่งเดิม แต่มีเฉพาะ icon อย่างเดียว */}
            {canEditEmployee && (
              <button
                type="button"
                onClick={handleEditClick}
                className="w-8 h-8 rounded-lg bg-[#0B2046] hover:bg-[#153468] text-white flex items-center justify-center transition-all shadow-2xs cursor-pointer shrink-0 active:scale-95"
                title="แก้ไขข้อมูล"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ============================================================ */}
          {/* TAB 1: ข้อมูลส่วนตัว (Personal Info) - 3 Columns Layout      */}
          {/* ============================================================ */}
          {activeTab === 'personal' && (
            <div className="pt-6 flex-1 w-full space-y-4 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ข้อมูลส่วนตัว (Personal Info)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-7 gap-x-8">
              {/* --- คอลัมน์ที่ 1 --- */}
              <div className="space-y-5">
                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">รหัสพนักงาน (Employee Code)</p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono">{employee.employeeCode || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">รหัสเครื่องสแกน (Biometric ID)</p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono">{employee.biometricId || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">คำนำหน้า (Prefix)</p>
                  <p className="text-slate-600 dark:text-slate-400">{employee.prefix || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">ชื่อ (First Name)</p>
                  <p className="text-slate-600 dark:text-slate-400">{employee.firstName || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">นามสกุล (Last Name)</p>
                  <p className="text-slate-600 dark:text-slate-400">{employee.lastName || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">เลขบัตรประชาชน (National ID)</p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono">{formatMaskedCitizenId(employee.citizenIdMasked)}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">เพศ (Gender)</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {employee.gender || (employee.genderId === 1 || employee.prefix === 'นาย' ? 'ชาย' : (employee.genderId === 2 || employee.prefix === 'นางสาว' || employee.prefix === 'นาง' ? 'หญิง' : '-'))}
                  </p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">สัญชาติ (Nationality)</p>
                  <p className="text-slate-600 dark:text-slate-400">{employee.nationality || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">ศาสนา (Religion)</p>
                  <p className="text-slate-600 dark:text-slate-400">{employee.religion || '-'}</p>
                </div>
              </div>

              {/* --- คอลัมน์ที่ 2 --- */}
              <div className="space-y-5">
                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">วันเกิด (Date of Birth)</p>
                  <p className="text-slate-600 dark:text-slate-400">{formatThaiDate(employee.birthDate)}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">สถานภาพสมรส (Marital Status)</p>
                  <p className="text-slate-600 dark:text-slate-400">{employee.maritalStatus || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">สถานภาพทางทหาร (Military Status)</p>
                  <p className="text-slate-600 dark:text-slate-400">{employee.militaryStatus || '-'}</p>
                </div>

                {/* ที่อยู่แบบเจาะลึก */}
                <div className="space-y-3 pt-1">
                  <p className="text-slate-800 dark:text-slate-200 font-bold">ที่อยู่ (Address)</p>

                  <div className="space-y-3 pl-0.5">
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">ประเภทที่อยู่</p>
                      <p className="text-slate-600 dark:text-slate-400">{formatAddressType(primaryAddress?.addressType)}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">บ้านเลขที่</p>
                      <p className="text-slate-600 dark:text-slate-400">{primaryAddress?.addressLine || '-'}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">ตำบล / แขวง</p>
                      <p className="text-slate-600 dark:text-slate-400">{primaryAddress?.subDistrict || '-'}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">อำเภอ / เขต</p>
                      <p className="text-slate-600 dark:text-slate-400">{primaryAddress?.district || '-'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">จังหวัด</p>
                        <p className="text-slate-600 dark:text-slate-400">{primaryAddress?.province || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">รหัสไปรษณีย์</p>
                        <p className="text-slate-600 dark:text-slate-400 font-mono">{primaryAddress?.postalCode || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* บัญชีธนาคาร (Bank Account) - Merged from Profile */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold">
                    <CreditCard className="w-3.5 h-3.5 text-[#0B2046] dark:text-blue-400" />
                    <span>บัญชีธนาคาร (Bank Account)</span>
                  </div>

                  <div className="space-y-2.5 pl-0.5">
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">ธนาคาร</p>
                      <p className="text-slate-700 dark:text-slate-300 font-semibold">{primaryBank?.bankName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">เลขที่บัญชี</p>
                      <div className="text-slate-700 dark:text-slate-300 font-mono font-semibold">
                        <MaskedDataViewer value={primaryBank?.accountNumber} type="bankAccount" />
                      </div>
                    </div>
                    {primaryBank?.accountName && (
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">ชื่อบัญชี</p>
                        <p className="text-slate-700 dark:text-slate-300">{primaryBank.accountName}</p>
                      </div>
                    )}
                    {pendingBank && (
                      <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 space-y-1.5">
                        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">บัญชีใหม่รอยืนยัน</p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          {pendingBank.bankName} <MaskedDataViewer value={pendingBank.accountNumber} type="bankAccount" />
                          {pendingBank.requestedAt ? ` · ขอเมื่อ ${new Date(pendingBank.requestedAt).toLocaleDateString('th-TH')}` : ''}
                        </p>
                        <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80">ระหว่างรอ เงินเดือนยังโอนเข้าบัญชีเดิม</p>
                        {pendingBank.canVerify && (
                          <div className="space-y-1.5 pt-1">
                            {bankRejecting ? (
                              <>
                                <textarea
                                  value={bankRejectReason}
                                  onChange={(e) => setBankRejectReason(e.target.value)}
                                  rows={2}
                                  placeholder="เหตุผลที่ไม่อนุมัติ"
                                  className="w-full px-2 py-1.5 text-[11px] rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    disabled={bankReviewing}
                                    onClick={() => handleReviewBank(false)}
                                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                                  >
                                    ยืนยันไม่อนุมัติ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBankRejecting(false)}
                                    className="px-2.5 py-1 text-[11px] rounded-md text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  disabled={bankReviewing}
                                  onClick={() => handleReviewBank(true)}
                                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                                >
                                  ยืนยันบัญชีใหม่
                                </button>
                                <button
                                  type="button"
                                  disabled={bankReviewing}
                                  onClick={() => setBankRejecting(true)}
                                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 cursor-pointer"
                                >
                                  ไม่อนุมัติ
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {!pendingBank && rejectedBank && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        คำขอเปลี่ยนเป็นบัญชี <MaskedDataViewer value={rejectedBank.accountNumber} type="bankAccount" /> ไม่ได้รับอนุมัติ
                        {rejectedBank.rejectReason ? `: ${rejectedBank.rejectReason}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* --- คอลัมน์ที่ 3 --- */}
              <div className="space-y-5">
                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">อีเมล์ (E-mail)</p>
                  <p className="text-slate-600 dark:text-slate-400 break-all">{employee.contact?.personalEmail || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">อีเมล์องค์กร (Organization email)</p>
                  <p className="text-slate-600 dark:text-slate-400 break-all">{employee.contact?.organizationEmail || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">เบอร์โทรศัพท์ส่วนตัว (Phone number)</p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono">{formatPhoneNumber(employee.contact?.personalPhone)}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">ระดับวุฒิการศึกษา (Education level)</p>
                  <p className="text-slate-600 dark:text-slate-400">{primaryEducation?.educationLevel || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">ชื่อสถาบันการศึกษา (Institution)</p>
                  <p className="text-slate-600 dark:text-slate-400">{primaryEducation?.institution || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">สาขาวิชา (Major)</p>
                  <p className="text-slate-600 dark:text-slate-400">{primaryEducation?.major || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">ปีที่สำเร็จการศึกษา (Graduation year)</p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono">{primaryEducation?.graduationYear ? primaryEducation.graduationYear.toString() : '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold mb-1">เกรดเฉลี่ยสะสม (GPA)</p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono">{primaryEducation?.gpa ? Number(primaryEducation.gpa).toFixed(2) : '-'}</p>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: ข้อมูลครอบครัว (Family Info)                          */}
          {/* ============================================================ */}
          {activeTab === 'family' && (
            <div className="pt-6 flex-1 w-full space-y-4 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ข้อมูลครอบครัว (Family Members)</h3>
              </div>

              {!employee.familyMembers || employee.familyMembers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  ยังไม่มีข้อมูลสมาชิกครอบครัว
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employee.familyMembers.map((member, idx) => (
                    <div
                      key={member.id || idx}
                      className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <span className="font-bold text-[#0B2046] dark:text-blue-400">
                          ลำดับที่ {idx + 1}: {member.relationshipType}
                        </span>
                        {member.maritalStatus && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{member.maritalStatus}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <p className="text-slate-400 dark:text-slate-500">ชื่อ-นามสกุล</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {member.prefix ? `${member.prefix} ` : ''}{member.firstName} {member.lastName || ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-500">เลขบัตรประชาชน</p>
                          <p className="font-mono text-slate-800 dark:text-slate-200">{member.citizenIdMasked || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-500">วันเกิด</p>
                          <p className="text-slate-800 dark:text-slate-200">{formatThaiDate(member.birthDate)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-500">สถานะการศึกษา</p>
                          <p className="text-slate-800 dark:text-slate-200">{member.educationStatus || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: กรณีฉุกเฉินติดต่อใคร (Emergency Contact)             */}
          {/* ============================================================ */}
          {activeTab === 'emergency' && (
            <div className="pt-6 flex-1 w-full space-y-4 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">กรณีฉุกเฉินติดต่อใคร (Emergency Contact)</h3>
              </div>

              {!employee.emergencyContacts || employee.emergencyContacts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  ยังไม่มีข้อมูลผู้ติดต่อฉุกเฉิน
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employee.emergencyContacts.map((contact, idx) => (
                    <div
                      key={contact.id || idx}
                      className="p-5 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-sky-200/60 dark:border-sky-900/60">
                        <span className="font-bold text-[#0B2046] dark:text-sky-300">
                          {contact.relationship ? `ความสัมพันธ์: ${contact.relationship}` : 'ผู้ติดต่อฉุกเฉิน'}
                        </span>
                        {contact.isPrimary && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] font-bold">
                            ติดต่อหลัก
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-[11px]">
                        <div>
                          <p className="text-slate-400 dark:text-slate-500">ชื่อ-นามสกุล</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {contact.prefix ? `${contact.prefix} ` : ''}{contact.firstName} {contact.lastName}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400 dark:text-slate-500">เบอร์โทรศัพท์ฉุกเฉิน</p>
                          <p className="font-mono text-sm font-bold text-[#0B2046] dark:text-sky-400">
                            {formatPhoneNumber(contact.primaryPhone)}
                          </p>
                        </div>

                        {contact.secondaryPhone && (
                          <div>
                            <p className="text-slate-400 dark:text-slate-500">เบอร์โทรศัพท์สำรอง</p>
                            <p className="font-mono text-slate-700 dark:text-slate-300">{formatPhoneNumber(contact.secondaryPhone)}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-slate-400 dark:text-slate-500">ที่อยู่ผู้ติดต่อ</p>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{contact.address || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: การศึกษา & ประวัติการทำงาน                            */}
          {/* ============================================================ */}
          {activeTab === 'background' && <EmployeeBackgroundView employee={employee} />}

          {/* ============================================================ */}
          {/* TAB 5: ภาษี & ประกันสังคม                                    */}
          {/* ============================================================ */}
          {activeTab === 'tax' && <EmployeeTaxSsoView employee={employee} />}

          {/* ============================================================ */}
          {/* TAB 6: ข้อมูลผู้ใช้งาน & จัดการบัญชี (User Account & Signature) */}
          {/* ============================================================ */}
          {activeTab === 'user' && (
            <div className="pt-6 flex-1 w-full space-y-6 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ข้อมูลบัญชีผู้ใช้งานในระบบ (System Account)</h3>
              </div>

              {employee.userAccount ? (
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px]">ชื่อบัญชีผู้ใช้ (Username)</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm font-mono mt-0.5">
                        {employee.userAccount.username}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px]">สถานะบัญชี</p>
                      {employee.userAccount.status?.toUpperCase() === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full font-semibold text-[11px] mt-1 border border-emerald-200/60 dark:border-emerald-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          เปิดใช้งาน (Active)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full font-semibold text-[11px] mt-1 border border-rose-200 dark:border-rose-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          ระงับการใช้งาน ({employee.userAccount.status})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px]">บทบาทในระบบ (Role)</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {employee.userAccount.roleNames && employee.userAccount.roleNames.length > 0
                          ? employee.userAccount.roleNames.join(', ')
                          : employee.userAccount.roles && employee.userAccount.roles.length > 0
                          ? employee.userAccount.roles.map((r) => formatRoleName(r)).join(', ')
                          : 'พนักงานทั่วไป (Employee)'}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px]">สิทธิ์การเข้าถึง (Access Scope)</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {employee.userAccount.accessScope || 'SELF (ดูข้อมูลตนเอง)'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px]">เข้าสู่ระบบล่าสุด</p>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                        {employee.userAccount.lastLoginAt
                          ? formatThaiDate(employee.userAccount.lastLoginAt)
                          : 'ยังไม่เคยเข้าสู่ระบบ'}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px]">ปรับปรุงข้อมูลล่าสุด</p>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">{formatThaiDate(employee.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">ยังไม่มีบัญชีผู้ใช้งานในระบบสำหรับพนักงานท่านนี้</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">สามารถสร้างบัญชีผู้ใช้งานได้ที่เมนูตั้งค่าผู้ใช้งาน</p>
                </div>
              )}

              {/* จัดการรหัสผ่าน (Merged from Profile) */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#0B2046] dark:text-blue-400" />
                      รหัสผ่านสำหรับเข้าสู่ระบบ
                    </h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      เปลี่ยนรหัสผ่านใหม่เพื่อความปลอดภัยของบัญชีผู้ใช้
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>เปลี่ยนรหัสผ่าน</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="password"
                      disabled
                      value="••••••••••••"
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-mono tracking-widest cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* ลายเซ็นดิจิทัล (Digital Signature - Merged from Profile) */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 space-y-4">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <FileSignature className="w-3.5 h-3.5 text-[#0B2046] dark:text-blue-400" />
                    ลายเซ็นดิจิทัล (Digital Signature)
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    อัปโหลดรูปลายเซ็นสำหรับใช้ในระบบเอกสารอิเล็กทรอนิกส์และใบอนุมัติ
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Preview box */}
                  <div className="w-56 h-24 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 flex items-center justify-center p-2 relative shrink-0">
                    {signatureUrl ? (
                      <img
                        src={signatureUrl}
                        alt="Digital Signature"
                        className="max-h-full max-w-full object-contain"
                        onError={() => setCustomSig(null)}
                      />
                    ) : (
                      <div className="text-center text-slate-400 text-xs font-medium">
                        <FileSignature className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                        <span>ยังไม่มีลายเซ็นในระบบ</span>
                      </div>
                    )}
                  </div>

                  {/* Upload & Delete buttons */}
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => sigFileInputRef.current?.click()}
                        disabled={isUploadingSig}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        {isUploadingSig ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B2046]" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        )}
                        <span>{signatureUrl ? 'เปลี่ยนลายเซ็น' : 'อัปโหลดลายเซ็น'}</span>
                      </button>

                      {signatureUrl && (
                        <button
                          type="button"
                          onClick={handleDeleteSignature}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบ</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      รองรับไฟล์ PNG, JPG (แนะนำไฟล์ PNG พื้นหลังโปร่งใส) ขนาดไม่เกิน 2MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 7: แฟ้มเอกสารพนักงาน (Employee Documents)               */}
          {/* ============================================================ */}
          {activeTab === 'documents' && (
            <EmployeeDocumentsTab employeeId={employee.id} canManage={canManageDocuments} />
          )}

          {/* ============================================================ */}
          {/* TAB 8: ประวัติการเปลี่ยนแปลง (Change History) - Merged        */}
          {/* ============================================================ */}
          {activeTab === 'history' && (
            <EmployeeChangeHistoryTab employeeId={employee.id} />
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* CHANGE PASSWORD MODAL                                        */}
      {/* ============================================================ */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0B2046]/10 dark:bg-[#0B2046]/30 text-[#0B2046] dark:text-blue-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">เปลี่ยนรหัสผ่าน</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รหัสผ่านปัจจุบัน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                    className="w-full h-9.5 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รหัสผ่านใหม่ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="ความยาวอย่างน้อย 8 ตัวอักษร"
                    className="w-full h-9.5 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ยืนยันรหัสผ่านใหม่ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    className="w-full h-9.5 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isChangingPassword}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#153468] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>บันทึกรหัสผ่านใหม่</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
