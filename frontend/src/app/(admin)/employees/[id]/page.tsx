'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types/employee';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

// รูปโปรไฟล์ตัวอย่างสอดคล้องกับตารางหน้าแรก
const mockAvatarImages = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', // EMP-001 (ชาย)
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80', // EMP-002 (หญิง)
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', // EMP-003 (ชาย)
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', // EMP-004 (หญิง)
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80', // EMP-005 (หญิง)
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80', // EMP-006 (หญิง)
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80', // EMP-007 (ชาย)
];

const formatThaiDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = Number(params.id);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'family' | 'user'>('personal');

  // Custom Avatar & Photo Feedback
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // โหลดรูปโปรไฟล์ที่เคยอัปโหลดไว้จาก localStorage
  useEffect(() => {
    if (employeeId && !isNaN(employeeId) && typeof window !== 'undefined') {
      const savedAvatar = localStorage.getItem(`hrms_employee_avatar_${employeeId}`);
      if (savedAvatar) {
        setCustomAvatar(savedAvatar);
      }
    }
  }, [employeeId]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCustomAvatar(base64);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`hrms_employee_avatar_${employeeId}`, base64);
      }
      setPhotoFeedback('เปลี่ยนรูปโปรไฟล์เรียบร้อย');
      setTimeout(() => setPhotoFeedback(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb({ section: 'พนักงาน', page: 'ดูข้อมูลพนักงาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

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
        const data = await employeeService.getById(employeeId);
        setEmployee(data);
      } catch (err: unknown) {
        console.error('Failed to load employee details:', err);
        const error = err as { message?: string };
        setErrorMessage(error?.message || 'ไม่สามารถโหลดข้อมูลพนักงานได้');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-500 font-sans">
        <Loader2 className="w-9 h-9 animate-spin text-[#0B2046] mb-3" />
        <p className="text-sm font-medium">กำลังโหลดข้อมูลพนักงาน...</p>
      </div>
    );
  }

  if (errorMessage || !employee) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto text-center font-sans">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1.5">ไม่พบข้อมูลพนักงาน</h2>
        <p className="text-xs text-slate-500 mb-6">{errorMessage || 'ไม่พบรายการข้อมูลพนักงานที่ต้องการดูในระบบ'}</p>
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2046] text-white text-xs rounded-xl font-medium hover:bg-[#153468] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>กลับไปยังหน้ารายชื่อพนักงาน</span>
        </Link>
      </div>
    );
  }

  const primaryAddress = employee.addresses?.find((a) => a.isCurrent) || employee.addresses?.[0];
  const primaryEducation = employee.educations?.[0];
  const avatarUrl = customAvatar || mockAvatarImages[(employee.id - 1) % mockAvatarImages.length];

  return (
    <div className="font-sans">
      {/* 2-Column Layout (ขยายความสูงให้พอดีกันและขอบล่างเท่ากัน 100%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[calc(100vh-128px)]">
        {/* ============================================================ */}
        {/* ซ้าย: Employee Summary Card                                  */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col h-full">
          {/* Avatar โปรไฟล์ พร้อมฟังก์ชันโฮเวอร์เพื่อแก้ไขรูป */}
          <div className="flex flex-col items-center">
            {/* ซ่อน File Input ไว้เปิดเมื่อคลิก */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />

            {/* Avatar Container พร้อม Hover Overlay ตามความต้องการของผู้ใช้ */}
            <div className="relative mb-3 group/avatar">
              <button
                type="button"
                onClick={handleAvatarClick}
                className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-slate-100 shadow-md bg-slate-100 flex items-center justify-center cursor-pointer transition-all duration-300 group-hover/avatar:ring-[#0B2046]/40 group-hover/avatar:shadow-xl focus:outline-none block"
                title="คลิกเพื่อแก้ไขรูปโปรไฟล์"
              >
                <img
                  src={avatarUrl}
                  alt={employee.fullName}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover/avatar:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="w-full h-full absolute inset-0 flex items-center justify-center text-3xl font-bold bg-[#0B2046] text-white -z-10">
                  {employee.firstName?.charAt(0) || 'U'}
                </span>

                {/* Overlay แสดงเมื่อเอา mouse ไป hold (hover) ที่รูปโปรไฟล์ */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover/avatar:opacity-100 transition-all duration-200 flex flex-col items-center justify-center text-white z-10 pointer-events-none">
                  <Camera className="w-6 h-6 mb-1 text-white drop-shadow animate-in zoom-in-75 duration-150" />
                  <span className="text-[11px] font-medium text-white tracking-tight drop-shadow">
                    แก้ไขรูปภาพ
                  </span>
                </div>
              </button>

              {/* ปุ่มกล้องเล็ก ๆ ที่มุมล่างขวาเพื่อความชัดเจน */}
              <button
                type="button"
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#0B2046] text-white border-2 border-white shadow-md flex items-center justify-center hover:bg-[#153468] hover:scale-110 transition-all cursor-pointer z-20"
                title="แก้ไขรูปโปรไฟล์"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Notification ข้อความแจ้งเตือนเมื่อเปลี่ยนรูปเสร็จ */}
            {photoFeedback && (
              <div className="mb-2 px-3 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded-full border border-emerald-200 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{photoFeedback}</span>
              </div>
            )}

            {/* Badges: Employee Code & Active Status */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-full">
                {employee.employeeCode}
              </span>
              <span className="px-3 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-semibold rounded-full">
                Active
              </span>
            </div>

            {/* Full Name & Position */}
            <h1 className="text-lg font-bold text-slate-900 text-center tracking-tight">
              {employee.prefix ? `${employee.prefix} ` : ''}{employee.firstName} {employee.lastName}
            </h1>
            <p className="text-xs text-slate-400 text-center mt-0.5">
              {employee.positionName || '-'}
            </p>
          </div>

          <hr className="my-5 border-slate-100" />

          {/* Section: การติดต่อ */}
          <div className="space-y-3.5">
            <h2 className="text-[13px] font-bold text-slate-900">การติดต่อ</h2>

            {/* อีเมล */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-500 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-medium">อีเมล</p>
                <p className="text-xs font-semibold text-slate-800 break-all">
                  {employee.contact?.organizationEmail || employee.contact?.personalEmail || '-'}
                </p>
                {employee.contact?.organizationEmail && employee.contact?.personalEmail && (
                  <p className="text-[10px] text-slate-400 mt-0.5 break-all">
                    ส่วนตัว: {employee.contact.personalEmail}
                  </p>
                )}
              </div>
            </div>

            {/* เบอร์โทรศัพท์ */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-500 mt-0.5">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-medium">เบอร์โทรศัพท์</p>
                <p className="text-xs font-semibold text-slate-800 font-mono">
                  {formatPhoneNumber(employee.contact?.personalPhone)}
                </p>
              </div>
            </div>

            {/* ที่อยู่ */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-500 mt-0.5">
                <Home className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-medium">ที่อยู่</p>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {primaryAddress
                    ? `${primaryAddress.addressLine || ''} ${primaryAddress.subDistrict || ''} ${primaryAddress.district || ''} ${primaryAddress.province || ''} ${primaryAddress.postalCode || ''}`.trim() || '-'
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          <hr className="my-5 border-slate-100" />

          {/* Section: ข้อมูลตำแหน่งงาน */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-bold text-slate-900">ข้อมูลตำแหน่งงาน</h2>

            <div className="space-y-2.5">
              {/* ฝ่าย */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 text-[10px] font-bold">
                  ฝ
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">ฝ่าย</p>
                  <p className="text-xs font-semibold text-slate-800">{employee.divisionName || '-'}</p>
                </div>
              </div>

              {/* แผนก */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 text-[10px] font-bold">
                  ผ
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">แผนก</p>
                  <p className="text-xs font-semibold text-slate-800">{employee.departmentName || '-'}</p>
                </div>
              </div>

              {/* ทีม */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 text-[10px] font-bold">
                  ท
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">ทีม</p>
                  <p className="text-xs font-semibold text-slate-800">-</p>
                </div>
              </div>

              {/* ตำแหน่ง */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 text-[10px] font-bold">
                  ต
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">ตำแหน่ง</p>
                  <p className="text-xs font-semibold text-slate-800">{employee.positionName || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ขวา: Detail Content with Tabs                                */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col h-full">
          {/* Top Bar: Tabs & Action Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3.5 gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-6 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`pb-1 transition-all border-b-2 font-semibold cursor-pointer ${
                  activeTab === 'personal'
                    ? 'border-[#0B2046] text-[#0B2046]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                ข้อมูลส่วนตัว
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('family')}
                className={`pb-1 transition-all border-b-2 font-semibold cursor-pointer ${
                  activeTab === 'family'
                    ? 'border-[#0B2046] text-[#0B2046]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                ข้อมูลครอบครัว
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('user')}
                className={`pb-1 transition-all border-b-2 font-semibold cursor-pointer ${
                  activeTab === 'user'
                    ? 'border-[#0B2046] text-[#0B2046]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                ข้อมูลผู้ใช้งาน
              </button>
            </div>

            {/* แก้ไขข้อมูล Button */}
            <button
              type="button"
              onClick={() => router.push(`/employees/${employee.id}/edit`)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0B2046] text-white text-xs font-medium rounded-lg hover:bg-[#153468] transition-colors shadow-2xs cursor-pointer"
            >
              <span>แก้ไขข้อมูล</span>
            </button>
          </div>

          {/* ============================================================ */}
          {/* TAB 1: ข้อมูลส่วนตัว (Personal Info) - 3 Columns Layout      */}
          {/* ============================================================ */}
          {activeTab === 'personal' && (
            <div className="pt-6 flex-1 grid grid-cols-1 md:grid-cols-3 gap-y-7 gap-x-8 text-xs animate-in fade-in duration-150">
              {/* --- คอลัมน์ที่ 1 --- */}
              <div className="space-y-5">
                <div>
                  <p className="text-slate-800 font-bold mb-1">รหัสพนักงาน (Employee Code)</p>
                  <p className="text-slate-600 font-mono">{employee.employeeCode || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">คำนำหน้า (Prefix)</p>
                  <p className="text-slate-600">{employee.prefix || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">ชื่อ (First Name)</p>
                  <p className="text-slate-600">{employee.firstName || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">นามสกุล (Last Name)</p>
                  <p className="text-slate-600">{employee.lastName || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">เลขบัตรประชาชน (National ID)</p>
                  <p className="text-slate-600 font-mono">{formatMaskedCitizenId(employee.citizenIdMasked)}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">เพศ (Gender)</p>
                  <p className="text-slate-600">
                    {employee.gender || (employee.genderId === 1 || employee.prefix === 'นาย' ? 'ชาย' : (employee.genderId === 2 || employee.prefix === 'นางสาว' || employee.prefix === 'นาง' ? 'หญิง' : '-'))}
                  </p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">สัญชาติ (Nationality)</p>
                  <p className="text-slate-600">{employee.nationality || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">ศาสนา (Religion)</p>
                  <p className="text-slate-600">{employee.religion || '-'}</p>
                </div>
              </div>

              {/* --- คอลัมน์ที่ 2 --- */}
              <div className="space-y-5">
                <div>
                  <p className="text-slate-800 font-bold mb-1">วันเกิด (Date of Birth)</p>
                  <p className="text-slate-600">{formatThaiDate(employee.birthDate)}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">สถานภาพสมรส (Marital Status)</p>
                  <p className="text-slate-600">{employee.maritalStatus || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">สถานภาพทางทหาร (Military Status)</p>
                  <p className="text-slate-600">{employee.militaryStatus || '-'}</p>
                </div>

                {/* ที่อยู่แบบเจาะลึก */}
                <div className="space-y-3 pt-1">
                  <p className="text-slate-800 font-bold">ที่อยู่ (Address)</p>

                  <div className="space-y-3 pl-0.5">
                    <div>
                      <p className="text-[11px] text-slate-500 font-medium mb-0.5">ประเภทที่อยู่</p>
                      <p className="text-slate-600">{primaryAddress?.addressType || 'บ้านตัวเอง'}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 font-medium mb-0.5">บ้านเลขที่</p>
                      <p className="text-slate-600">{primaryAddress?.addressLine || '-'}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 font-medium mb-0.5">ตำบล / แขวง</p>
                      <p className="text-slate-600">{primaryAddress?.subDistrict || '-'}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 font-medium mb-0.5">อำเภอ / เขต</p>
                      <p className="text-slate-600">{primaryAddress?.district || '-'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium mb-0.5">จังหวัด</p>
                        <p className="text-slate-600">{primaryAddress?.province || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium mb-0.5">รหัสไปรษณีย์</p>
                        <p className="text-slate-600 font-mono">{primaryAddress?.postalCode || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- คอลัมน์ที่ 3 --- */}
              <div className="space-y-5">
                <div>
                  <p className="text-slate-800 font-bold mb-1">อีเมล์ (E-mail)</p>
                  <p className="text-slate-600 break-all">{employee.contact?.personalEmail || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">อีเมล์องค์กร (Organization email)</p>
                  <p className="text-slate-600 break-all">{employee.contact?.organizationEmail || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">เบอร์โทรศัพท์ส่วนตัว (Phone number)</p>
                  <p className="text-slate-600 font-mono">{formatPhoneNumber(employee.contact?.personalPhone)}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">ระดับวุฒิการศึกษา (Education level)</p>
                  <p className="text-slate-600">{primaryEducation?.educationLevel || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">ชื่อสถาบันการศึกษา (Institution)</p>
                  <p className="text-slate-600">{primaryEducation?.institution || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">สาขาวิชา (Major)</p>
                  <p className="text-slate-600">{primaryEducation?.major || '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">ปีที่สำเร็จการศึกษา (Graduation year)</p>
                  <p className="text-slate-600 font-mono">{primaryEducation?.graduationYear ? primaryEducation.graduationYear.toString() : '-'}</p>
                </div>

                <div>
                  <p className="text-slate-800 font-bold mb-1">เกรดเฉลี่ยสะสม (GPA)</p>
                  <p className="text-slate-600 font-mono">{primaryEducation?.gpa ? Number(primaryEducation.gpa).toFixed(2) : '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: ข้อมูลครอบครัว (Family Info)                          */}
          {/* ============================================================ */}
          {activeTab === 'family' && (
            <div className="pt-6 flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs animate-in fade-in duration-150">
              {/* ซ้าย: สมาชิกในครอบครัว */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-[#0B2046]" />
                  <h3 className="font-bold text-slate-800 text-sm">ข้อมูลครอบครัว (Family Members)</h3>
                </div>

                {!employee.familyMembers || employee.familyMembers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    ยังไม่มีข้อมูลสมาชิกครอบครัว
                  </div>
                ) : (
                  employee.familyMembers.map((member, idx) => (
                    <div
                      key={member.id || idx}
                      className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <span className="font-bold text-[#0B2046]">
                          ลำดับที่ {idx + 1}: {member.relationshipType}
                        </span>
                        {member.maritalStatus && (
                          <span className="text-[11px] text-slate-500">{member.maritalStatus}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <p className="text-slate-400">ชื่อ-นามสกุล</p>
                          <p className="font-semibold text-slate-800">
                            {member.prefix ? `${member.prefix} ` : ''}{member.firstName} {member.lastName || ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">เลขบัตรประชาชน</p>
                          <p className="font-mono text-slate-800">{member.citizenIdMasked || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">วันเกิด</p>
                          <p className="text-slate-800">{formatThaiDate(member.birthDate)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">สถานะการศึกษา</p>
                          <p className="text-slate-800">{member.educationStatus || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ขวา: กรณีฉุกเฉินติดต่อใคร */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-[#0B2046]" />
                  <h3 className="font-bold text-slate-800 text-sm">กรณีฉุกเฉินติดต่อใคร (Emergency Contact)</h3>
                </div>

                {!employee.emergencyContacts || employee.emergencyContacts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    ยังไม่มีข้อมูลผู้ติดต่อฉุกเฉิน
                  </div>
                ) : (
                  employee.emergencyContacts.map((contact, idx) => (
                    <div
                      key={contact.id || idx}
                      className="p-5 bg-sky-50/50 border border-sky-100 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-sky-200/60">
                        <span className="font-bold text-[#0B2046]">
                          {contact.relationship ? `ความสัมพันธ์: ${contact.relationship}` : 'ผู้ติดต่อฉุกเฉิน'}
                        </span>
                        {contact.isPrimary && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">
                            ติดต่อหลัก
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-[11px]">
                        <div>
                          <p className="text-slate-400">ชื่อ-นามสกุล</p>
                          <p className="font-semibold text-slate-800 text-xs">
                            {contact.prefix ? `${contact.prefix} ` : ''}{contact.firstName} {contact.lastName}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">เบอร์โทรศัพท์ฉุกเฉิน</p>
                          <p className="font-mono text-sm font-bold text-[#0B2046]">
                            {formatPhoneNumber(contact.primaryPhone)}
                          </p>
                        </div>

                        {contact.secondaryPhone && (
                          <div>
                            <p className="text-slate-400">เบอร์โทรศัพท์สำรอง</p>
                            <p className="font-mono text-slate-700">{formatPhoneNumber(contact.secondaryPhone)}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-slate-400">ที่อยู่ผู้ติดต่อ</p>
                          <p className="text-slate-700 leading-relaxed">{contact.address || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: ข้อมูลผู้ใช้งาน (User Account)                        */}
          {/* ============================================================ */}
          {activeTab === 'user' && (
            <div className="pt-6 flex-1 max-w-xl space-y-5 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#0B2046]" />
                <h3 className="font-bold text-slate-800 text-sm">ข้อมูลบัญชีผู้ใช้งานในระบบ (System Account)</h3>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-[11px]">ชื่อบัญชีผู้ใช้ (Username)</p>
                    <p className="font-bold text-slate-800 text-sm font-mono mt-0.5">
                      {employee.employeeCode.toLowerCase()}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-[11px]">สถานะบัญชี</p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-semibold text-[11px] mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      เปิดใช้งาน (Active)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                  <div>
                    <p className="text-slate-400 text-[11px]">บทบาทในระบบ (Role)</p>
                    <p className="font-semibold text-slate-800 mt-0.5">พนักงานทั่วไป (Employee)</p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-[11px]">สิทธิ์การเข้าถึง (Access Scope)</p>
                    <p className="font-semibold text-slate-800 mt-0.5">SELF (ดูข้อมูลตนเอง)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                  <div>
                    <p className="text-slate-400 text-[11px]">วันที่สร้างข้อมูล</p>
                    <p className="text-slate-600 mt-0.5">{formatThaiDate(employee.createdAt)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-[11px]">ปรับปรุงข้อมูลล่าสุด</p>
                    <p className="text-slate-600 mt-0.5">{formatThaiDate(employee.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
