'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { employeeService } from '@/services/employeeService';
import { bankService } from '@/services/bankService';
import { masterDataService } from '@/services/masterDataService';
import { authService } from '@/services/authService';
import { getAvatarUrl } from '@/lib/api-client';
import { Employee, CreateEmployeePayload, FamilyMember } from '@/types/employee';
import { Bank } from '@/types/api';
import { MaritalStatusItem } from '@/types/master';
import {
  User,
  UserCheck,
  Shield,
  ShieldCheck,
  Camera,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  FileSignature,
  Upload,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  RotateCcw,
  Save,
  Loader2,
  AlertCircle,
  KeyRound,
  X,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const { success, error, warning, info } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Avatar Upload State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Digital Signature State
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [isUploadingSig, setIsUploadingSig] = useState<boolean>(false);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Tab 1 (Edit Profile)
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

  // Password Change Modal State for Tab 2 (Account Management)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Bank Master Data State
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
  const [maritalStatuses, setMaritalStatuses] = useState<MaritalStatusItem[]>([]);

  // Load Banks & Marital Statuses Master Data
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

  // Sync breadcrumb with active tab
  useEffect(() => {
    if (activeTab === 'profile') {
      setBreadcrumb({ section: 'โปรไฟล์', page: 'แก้ไขโปรไฟล์' });
    } else {
      setBreadcrumb({ section: 'โปรไฟล์', page: 'จัดการบัญชี' });
    }
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

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

    } catch (err: any) {
      console.error('Failed to load profile:', err);
      error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
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
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Reset form to original values
  const handleReset = () => {
    if (!employee) return;
    fetchEmployeeData();
    success('คืนค่าข้อมูลเดิมเรียบร้อยแล้ว');
  };

  // Save profile changes
  const handleSave = async () => {
    if (!employee) return;
    setIsSaving(true);
    try {
      // Build Family Members Payload
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
      success('บันทึกการแก้ไขข้อมูลโปรไฟล์เรียบร้อยแล้ว');
      await fetchEmployeeData();
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Avatar Change
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      error('กรุณาเลือกไฟล์ภาพ PNG หรือ JPG เท่านั้น');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      error('ขนาดไฟล์ภาพต้องไม่เกิน 2MB');
      return;
    }

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setIsUploadingAvatar(true);

    try {
      const url = await employeeService.uploadAvatar(employee.id, file);
      setAvatarPreview(getAvatarUrl(url));
      success('อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว');
      await fetchEmployeeData();
    } catch (err: any) {
      setAvatarPreview(employee.avatarUrl ? getAvatarUrl(employee.avatarUrl) : null);
      error(err.message || 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };

  // Handle Signature Upload
  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      error('กรุณาเลือกไฟล์ภาพ PNG หรือ JPG เท่านั้น');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      error('ขนาดไฟล์ต้องไม่เกิน 2MB');
      return;
    }

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setSignaturePreview(localUrl);
    setIsUploadingSig(true);

    try {
      const url = await employeeService.uploadSignature(employee.id, file);
      setSignaturePreview(getAvatarUrl(url));
      success('อัปโหลดลายเซ็นดิจิทัลเรียบร้อยแล้ว');
      await fetchEmployeeData();
    } catch (err: any) {
      setSignaturePreview(employee.signatureUrl ? getAvatarUrl(employee.signatureUrl) : null);
      error(err.message || 'อัปโหลดลายเซ็นไม่สำเร็จ');
    } finally {
      setIsUploadingSig(false);
      if (sigFileInputRef.current) {
        sigFileInputRef.current.value = '';
      }
    }
  };

  // Handle Signature Delete
  const handleDeleteSignature = async () => {
    if (!employee) return;
    if (!confirm('คุณต้องการลบลายเซ็นดิจิทัลนี้ใช่หรือไม่?')) return;

    try {
      await employeeService.deleteSignature(employee.id);
      setSignaturePreview(null);
      if (sigFileInputRef.current) {
        sigFileInputRef.current.value = '';
      }
      success('ลบลายเซ็นดิจิทัลเรียบร้อยแล้ว');
      await fetchEmployeeData();
    } catch (err: any) {
      error(err.message || 'ลบลายเซ็นไม่สำเร็จ');
    }
  };

  // Handle Change Password Submit
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      warning('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }
    if (!newPassword) {
      warning('กรุณากรอกรหัสผ่านใหม่');
      return;
    }
    if (newPassword.length < 6) {
      warning('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      warning('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      success('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      error(err.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-[#0B2046] mx-auto" />
          <p className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }

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
        {/* LEFT COLUMN: Profile Summary Card (Matching Mockup 1 & 3) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden sticky top-6">
            {/* Top Avatar Banner */}
            <div className="p-6 text-center border-b border-slate-100">
              <div className="relative inline-block mx-auto mb-4">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-50 shadow-sm bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-400">
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
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="เปลี่ยนรูปโปรไฟล์"
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#0B2046] hover:bg-[#081836] text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer border-2 border-white"
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
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 font-mono">
                  {employee?.employeeCode || 'DEV-001'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              {/* Full Name & Position */}
              <h2 className="text-base font-bold text-slate-900 mt-2">
                {employee?.prefix ? `${employee.prefix} ` : ''}
                {employee?.firstName} {employee?.lastName}
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {employee?.positionName || 'Software Engineer'}
              </p>
            </div>

            {/* Contact Information Section */}
            <div className="p-5 border-b border-slate-100 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Phone className="w-3.5 h-3.5 text-[#0B2046]" />
                ข้อมูลติดต่อ
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">อีเมล</span>
                  <span className="text-slate-800 font-medium break-all">
                    {formData.email || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">เบอร์โทรศัพท์</span>
                  <span className="text-slate-800 font-medium">
                    {formData.phone || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">ที่อยู่ปัจจุบัน</span>
                  <span className="text-slate-700 leading-relaxed block">
                    {formData.address || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Job Position Information Section */}
            <div className="p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Briefcase className="w-3.5 h-3.5 text-[#0B2046]" />
                ข้อมูลตำแหน่งงาน
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">ฝ่าย</span>
                  <span className="text-slate-800 font-medium">
                    {employee?.divisionName || 'ฝ่ายเทคโนโลยีสารสนเทศ'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">แผนก</span>
                  <span className="text-slate-800 font-medium">
                    {employee?.departmentName || 'แผนกพัฒนาซอฟต์แวร์'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">วันที่เริ่มงาน</span>
                  <span className="text-slate-800 font-medium">
                    {employee?.createdAt
                      ? new Date(employee.createdAt).toLocaleDateString('th-TH')
                      : '01/01/2023'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">โรงพยาบาลประกันสังคม</span>
                  <span className="text-slate-800 font-medium">
                    {formData.hospitalName || employee?.socialSecurity?.hospitalName || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Tabs & Editor (Matching Mockup 1, 2 & 3)    */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Tab Headers */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#0B2046] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              แก้ไขโปรไฟล์
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-[#0B2046] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Shield className="w-4 h-4" />
              จัดการบัญชี
            </button>
          </div>

          {/* TAB 1: แก้ไขโปรไฟล์ (Mockup 1 & Mockup 2) */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Card 1: ข้อมูลส่วนตัว */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0B2046]" />
                  ข้อมูลส่วนตัว
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* คำนำหน้า */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      คำนำหน้า <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.prefix}
                      onChange={(e) => handleInputChange('prefix', e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                    </select>
                  </div>

                  {/* ชื่อ */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      ชื่อ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="ชื่อจริง"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* นามสกุล */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      นามสกุล <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="นามสกุล"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* วันเกิด */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      วันเกิด
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange('birthDate', e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                      />
                    </div>
                  </div>

                  {/* เพศ */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      เพศ
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    >
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>

                  {/* สถานะภาพ */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      สถานะภาพ
                    </label>
                    <select
                      value={formData.maritalStatus}
                      onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      คู่สมรส
                    </label>
                    <input
                      type="text"
                      value={formData.spouse}
                      onChange={(e) => handleInputChange('spouse', e.target.value)}
                      placeholder="ชื่อ-นามสกุลคู่สมรส"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* จำนวนบุตร */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      จำนวนบุตร
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.numberOfChildren}
                      onChange={(e) => handleInputChange('numberOfChildren', parseInt(e.target.value) || 0)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* บิดา */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      บิดา
                    </label>
                    <input
                      type="text"
                      value={formData.father}
                      onChange={(e) => handleInputChange('father', e.target.value)}
                      placeholder="ชื่อ-นามสกุลบิดา"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* มารดา */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      มารดา
                    </label>
                    <input
                      type="text"
                      value={formData.mother}
                      onChange={(e) => handleInputChange('mother', e.target.value)}
                      placeholder="ชื่อ-นามสกุลมารดา"
                      className="w-full md:w-1/3 h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: ข้อมูลติดต่อ */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#0B2046]" />
                  ข้อมูลติดต่อ
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* อีเมล */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      อีเมล
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="example@company.com"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* เบอร์โทรศัพท์ */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="081-234-5678"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>

                  {/* ที่อยู่ปัจจุบัน */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      ที่อยู่ปัจจุบัน
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="บ้านเลขที่, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: ข้อมูลตำแหน่งงาน (Read-only ตาม Mockup) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#0B2046]" />
                    ข้อมูลตำแหน่งงาน
                  </h3>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3 text-slate-400" />
                    ฝ่ายบุคคลเป็นผู้จัดการ
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ฝ่าย */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">ฝ่าย</label>
                    <input
                      type="text"
                      disabled
                      value={employee?.divisionName || 'ฝ่ายเทคโนโลยีสารสนเทศ'}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* แผนก */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">แผนก</label>
                    <input
                      type="text"
                      disabled
                      value={employee?.departmentName || 'แผนกพัฒนาซอฟต์แวร์'}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* ทีม */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">ทีม</label>
                    <input
                      type="text"
                      disabled
                      value="Core Team"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* ตำแหน่ง */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">ตำแหน่ง</label>
                    <input
                      type="text"
                      disabled
                      value={employee?.positionName || 'Software Engineer'}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: บัญชีธนาคาร (Mockup 2) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#0B2046]" />
                  บัญชีธนาคาร
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ธนาคาร */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">ธนาคาร</label>
                    <select
                      value={formData.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      disabled={isLoadingBanks}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
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

                  {/* เลขที่บัญชี */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">เลขที่บัญชี</label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                      placeholder="123-4-56789-0"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                  </div>
                </div>
              </div>

              {/* Card 5: สิทธิประโยชน์และประกันสังคม */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0B2046]" />
                    สิทธิประโยชน์และประกันสังคม
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    สิทธิการรักษาพยาบาล (ผู้ประกันตน ม.33)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* โรงพยาบาลประกันสังคม */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      โรงพยาบาลประกันสังคม
                    </label>
                    <input
                      type="text"
                      value={formData.hospitalName}
                      onChange={(e) => handleInputChange('hospitalName', e.target.value)}
                      placeholder="เช่น โรงพยาบาลจุฬาลงกรณ์ สภากาชาดไทย"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      สถานพยาบาลหลักที่ลงทะเบียนไว้ตามสิทธิประกันสังคม (เลขประจำตัวผู้ประกันตนใช้เลขเดียวกันกับบัตรประจำตัวประชาชน)
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 6: ลายเซ็นดิจิทัล (Digital Signature - Mockup 2) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-[#0B2046]" />
                    ลายเซ็นดิจิทัล
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    อัปโหลดรูปลายเซ็นสำหรับใช้ในระบบเอกสารอิเล็กทรอนิกส์
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col md:flex-row items-center gap-6">
                  {/* Signature Preview Area */}
                  <div className="w-64 h-28 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden p-2 relative shrink-0">
                    {signaturePreview ? (
                      <img
                        src={signaturePreview}
                        alt="Digital Signature"
                        className="max-h-full max-w-full object-contain"
                        onError={() => setSignaturePreview(null)}
                      />
                    ) : (
                      <div className="text-center text-slate-400 text-xs font-medium">
                        <FileSignature className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        ยังไม่มีลายเซ็นในระบบ
                      </div>
                    )}
                  </div>

                  {/* Controls & Guideline */}
                  <div className="space-y-3 flex-1 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => sigFileInputRef.current?.click()}
                        disabled={isUploadingSig}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        {isUploadingSig ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B2046]" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
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

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      รองรับไฟล์ PNG, JPG (แนะนำไฟล์ PNG พื้นหลังโปร่งใส) ขนาดไม่เกิน 2MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar (Mockup 2) */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  คืนค่าเดิม
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
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
          )}

          {/* TAB 2: จัดการบัญชี (Mockup 3) */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">จัดการบัญชี</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    ตั้งค่าชื่อผู้ใช้งานและรหัสผ่านสำหรับเข้าสู่ระบบ
                  </p>
                </div>

                <div className="space-y-5 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#0B2046]" />
                    ชื่อผู้ใช้งานและรหัสผ่าน
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Username */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        ชื่อผู้ใช้
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          disabled
                          value={user?.username || 'user_001'}
                          className="w-full h-9.5 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-600 font-mono cursor-not-allowed"
                        />
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        รหัสผ่าน
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="password"
                            disabled
                            value="••••••••••••"
                            className="w-full h-9.5 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-600 font-mono tracking-widest cursor-not-allowed"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsPasswordModalOpen(true)}
                          className="px-4 h-9.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                        >
                          เปลี่ยนรหัสผ่าน
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* CHANGE PASSWORD MODAL                                     */}
      {/* ========================================================= */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">เปลี่ยนรหัสผ่าน</h3>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่านปัจจุบัน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                    className="w-full h-9.5 px-3 pr-10 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่านใหม่ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="ความยาวอย่างน้อย 6 ตัวอักษร"
                    className="w-full h-9.5 px-3 pr-10 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ยืนยันรหัสผ่านใหม่ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    className="w-full h-9.5 px-3 pr-10 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isChangingPassword}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
