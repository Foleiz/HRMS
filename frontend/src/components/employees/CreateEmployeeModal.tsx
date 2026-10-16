'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Users,
  Phone,
  User,
  GraduationCap,
  Landmark,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { organizationService } from '@/services/organizationService';
import { bankService } from '@/services/bankService';
import { useMasterLookups, lookupId, genderOptions } from '@/hooks/useMasterLookups';
import type { Bank } from '@/types/api';
import type { Position, Team } from '@/types/organization';
import {
  Employee,
  CreateEmployeePayload,
  EmployeeEducation,
  EmployeeWorkExperience,
} from '@/types/employee';
import { NationalitySelect } from '@/components/ui/NationalitySelect';
import { useToast } from '@/context/ToastContext';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { useEmployeeTypeOptions } from '@/hooks/useEmployeeTypeOptions';
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

export type CreateModalTab = 'personal' | 'family' | 'emergency' | 'background' | 'tax';

const initialFormData: CreateEmployeePayload = {
  employeeCode: '',
  biometricId: '',
  prefix: 'นาย',
  firstName: '',
  lastName: '',
  citizenId: '',
  gender: 'ชาย',
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
  bankName: '',
  accountNumber: '',
  positionName: '',
  positionId: undefined,
  teamId: null,
  employeeType: 'พนักงานประจำ',
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

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEmployee: Employee) => void;
  existingEmployees?: Employee[];
}

export default function CreateEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  existingEmployees = [],
}: CreateEmployeeModalProps) {
  const toast = useToast();
  const lookups = useMasterLookups();

  const [activeTab, setActiveTab] = useState<CreateModalTab>('personal');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateEmployeePayload>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

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
  const [activeFamilyIndex, setActiveFamilyIndex] = useState<number>(0);

  // ข้อมูลตำแหน่ง, ทีม, ธนาคาร
  const [positions, setPositions] = useState<Position[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);

  const employeeTypeOptions = useEmployeeTypeOptions(formData.employeeType);

  useEffect(() => {
    if (!isOpen) return;

    organizationService
      .getPositions()
      .then((list) => setPositions(list.filter((p) => p.status === 'ACTIVE')))
      .catch(() => setPositions([]));

    organizationService
      .getTeams()
      .then((list) => setTeams(list.filter((t) => t.status === 'ACTIVE')))
      .catch(() => setTeams([]));

    bankService
      .getAll()
      .then((list) => setBanks(list.filter((b) => b.status === 'ACTIVE')))
      .catch(() => setBanks([]));
  }, [isOpen]);

  // เมื่อเปิด modal รีเซ็ตฟอร์มและดึง next employee code
  useEffect(() => {
    if (!isOpen) return;

    setFormData(initialFormData);
    setFormErrors({});
    setHasAttemptedSubmit(false);
    setActiveTab('personal');
    setActiveFamilyIndex(0);
    setEducations([]);
    setWorkExperiences([]);
    setTaxSso({
      socialSecurityNo: '',
      hospitalName: '',
      spouseHasIncome: false,
      numberOfChildren: 0,
      parentDeductionCount: 0,
      disabilityDeductionCount: 0,
    });

    const fetchNextCode = async () => {
      try {
        const nextCode = await employeeService.getNextCode();
        setFormData((prev) => ({ ...prev, employeeCode: nextCode }));
      } catch {
        let maxCode = 0;
        for (const emp of existingEmployees) {
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

    fetchNextCode();
  }, [isOpen]);

  const getRequiredBankDigits = (bankName?: string): number | null =>
    banks.find((b) => b.bankName === bankName)?.accountDigits ?? null;

  const clearFieldError = (key: string) => {
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
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
    'positionName',
    'employeeType',
    'bankName',
    'accountNumber',
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
  const familyErrorsCount = Object.keys(formErrors).filter(
    (k) => !personalErrorKeys.includes(k) && !emergencyErrorKeys.includes(k)
  ).length;

  const validateForm = (data: CreateEmployeePayload): Record<string, string> => {
    const errors: Record<string, string> = {};

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
    if (!data.militaryStatus || data.militaryStatus === 'เลือกสถานภาพทางทหาร')
      errors.militaryStatus = 'กรุณาเลือกสถานภาพทางทหาร';

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

    // ติดต่อ
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

    // ตำแหน่งงาน & ธนาคาร
    if (!data.positionName || data.positionName === 'เลือกตำแหน่ง') errors.positionName = 'กรุณาเลือกตำแหน่ง';
    if (!data.employeeType || data.employeeType === 'เลือกประเภท') errors.employeeType = 'กรุณาเลือกประเภทพนักงาน';

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

    // สมาชิกครอบครัว
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

    // กรณีฉุกเฉิน
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
    return `w-full h-10 px-3.5 bg-white dark:bg-slate-800 rounded-lg text-xs transition-all ${
      isMono ? 'font-mono' : ''
    } ${
      hasError
        ? 'border-2 border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-slate-900 dark:text-slate-100 placeholder:text-rose-300 focus:outline-none focus:border-rose-600 focus:ring-rose-500/30'
        : 'border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setHasAttemptedSubmit(true);

      const hasPersonalError = Object.keys(errors).some((k) => personalErrorKeys.includes(k));
      const hasFamilyError = Object.keys(errors).some(
        (k) => !personalErrorKeys.includes(k) && !emergencyErrorKeys.includes(k)
      );
      const hasEmergencyError = Object.keys(errors).some((k) => emergencyErrorKeys.includes(k));

      if (activeTab === 'personal' && !hasPersonalError) {
        if (hasFamilyError) setActiveTab('family');
        else if (hasEmergencyError) setActiveTab('emergency');
      } else if (activeTab === 'family' && !hasFamilyError) {
        if (hasPersonalError) setActiveTab('personal');
        else if (hasEmergencyError) setActiveTab('emergency');
      } else if (activeTab === 'emergency' && !hasEmergencyError) {
        if (hasPersonalError) setActiveTab('personal');
        else if (hasFamilyError) setActiveTab('family');
      }

      if (hasFamilyError) {
        const firstFmErrIdx = formData.familyMembers?.findIndex((_, idx) =>
          Object.keys(errors).some((k) => k.startsWith(`family_${idx}_`))
        );
        if (firstFmErrIdx !== undefined && firstFmErrIdx >= 0) {
          setActiveFamilyIndex(firstFmErrIdx);
        }
      }

      toast.warning('กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง');
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

      const selectedBank = banks.find((b) => b.bankName === formData.bankName);

      const payload: CreateEmployeePayload = {
        ...formData,
        employeeCode: formData.employeeCode.trim(),
        biometricId: formData.biometricId?.trim() || undefined,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        citizenId: formData.citizenId?.trim() || undefined,
        prefix: formData.prefix && formData.prefix !== 'เลือกคำนำหน้า' ? formData.prefix : undefined,
        gender: formData.gender && formData.gender !== 'เลือกเพศ' ? formData.gender : undefined,
        genderId:
          lookupId(lookups.genders, formData.gender) ??
          (formData.gender === 'ชาย'
            ? 1
            : formData.gender === 'หญิง'
            ? 2
            : formData.gender === 'ไม่ระบุ'
            ? 3
            : undefined),
        nationality: formData.nationality && formData.nationality !== 'เลือกสัญชาติ' ? formData.nationality : 'ไทย',
        religion: formData.religion && formData.religion !== 'เลือกศาสนา' ? formData.religion : undefined,
        religionId: lookupId(lookups.religions, formData.religion),
        maritalStatus:
          formData.maritalStatus && formData.maritalStatus !== 'เลือกสถานภาพ' ? formData.maritalStatus : undefined,
        maritalStatusId: lookupId(lookups.maritalStatuses, formData.maritalStatus),
        nationalityId: lookupId(lookups.nationalities, formData.nationality),
        militaryStatus:
          formData.militaryStatus && formData.militaryStatus !== 'เลือกสถานภาพทางทหาร'
            ? formData.militaryStatus
            : undefined,
        bankName: formData.bankName && formData.bankName !== 'เลือกธนาคาร' ? formData.bankName : undefined,
        bankId: selectedBank?.id,
        accountNumber: formData.accountNumber?.trim() ? formData.accountNumber.replace(/\D/g, '') : undefined,
        positionName:
          formData.positionName && formData.positionName !== 'เลือกตำแหน่ง' ? formData.positionName : undefined,
        positionId: formData.positionId,
        teamId: formData.teamId || null,
        setTeam: true,
        employeeType:
          formData.employeeType && formData.employeeType !== 'เลือกประเภท' ? formData.employeeType : undefined,
        addresses: [addressItem],
        educations: educations.filter((ed) => ed.educationLevel?.trim() || ed.institution?.trim()),
        workExperiences: workExperiences.filter((w) => w.companyName?.trim()),
        spouseHasIncome: taxSso.spouseHasIncome,
        numberOfChildren: taxSso.numberOfChildren,
        parentDeductionCount: taxSso.parentDeductionCount,
        disabilityDeductionCount: taxSso.disabilityDeductionCount,
        socialSecurityNo: taxSso.socialSecurityNo?.trim() || undefined,
        hospitalName: taxSso.hospitalName.trim(),
        familyMembers: formData.familyMembers
          ?.filter((f) => f.firstName?.trim())
          .map((f) => ({
            ...f,
            relationshipType: f.relationshipType || 'บิดา',
            prefix: f.prefix || undefined,
            firstName: f.firstName.trim(),
            lastName: f.lastName?.trim() || '-',
            citizenId: f.citizenId?.trim() || undefined,
            birthDate: f.birthDate?.trim() || undefined,
          })),
        emergencyContact: formData.emergencyContact?.firstName?.trim()
          ? {
              ...formData.emergencyContact,
              relationship: formData.emergencyContact.relationship || 'บิดา',
              prefix: formData.emergencyContact.prefix || undefined,
              firstName: formData.emergencyContact.firstName.trim(),
              lastName: formData.emergencyContact.lastName?.trim() || '-',
              address: formData.emergencyContact.address?.trim() || '-',
              primaryPhone: formatPhoneNumber(formData.emergencyContact.primaryPhone?.trim() || '-'),
            }
          : undefined,
      };

      const created = await employeeService.create(payload);
      const linked = created?.attendanceRowsLinked ?? 0;
      toast.success(
        linked > 0
          ? `บันทึกข้อมูลพนักงานเรียบร้อย และเชื่อมเวลาเข้างานจากไฟล์ที่นำเข้าไว้แล้ว ${linked} รายการ`
          : 'บันทึกข้อมูลพนักงานเรียบร้อย'
      );
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to create employee:', err);
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header (ตรงตามสไตล์เดียวกับ EditEmployeeModal) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B2046] text-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold">เพิ่มพนักงานใหม่</h2>
              {formData.employeeCode && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/20 font-mono font-bold">
                  {formData.employeeCode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">กรอกข้อมูลพนักงานเพื่อบันทึกประวัติเข้าสู่ระบบ</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Switcher */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 px-6 shrink-0">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar py-2 text-xs font-semibold">
            {[
              { id: 'personal', label: 'ข้อมูลส่วนตัว', icon: User, errCount: personalErrorsCount },
              { id: 'family', label: 'ข้อมูลครอบครัว', icon: Users, errCount: familyErrorsCount },
              { id: 'emergency', label: 'ผู้ติดต่อฉุกเฉิน', icon: Phone, errCount: emergencyErrorsCount },
              { id: 'background', label: 'การศึกษา & ประวัติการทำงาน', icon: GraduationCap, errCount: 0 },
              { id: 'tax', label: 'ภาษี & ประกันสังคม', icon: Landmark, errCount: 0 },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as CreateModalTab)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0B2046] text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {hasAttemptedSubmit && tab.errCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      {tab.errCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Alert สรุปข้อผิดพลาด */}
            {hasAttemptedSubmit && Object.keys(formErrors).length > 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs shadow-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold">กรุณากรอกหรือเลือกข้อมูลที่จำเป็นให้ครบทุกช่อง:</span> พบ{' '}
                  {Object.keys(formErrors).length} รายการที่ยังไม่สมบูรณ์
                </div>
              </div>
            )}

            {/* TAB 1: ข้อมูลส่วนตัว (Personal) */}
            {activeTab === 'personal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs animate-in fade-in duration-150">
                {/* --- Column 1 --- */}
                <div className="space-y-4">
                  {/* รหัสพนักงาน */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        รหัสพนักงาน (Employee Code) <span className="text-rose-500">*</span>
                      </span>
                      <span className="ml-2 text-[10px] font-normal text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5">
                        สร้างให้อัตโนมัติ
                      </span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formData.employeeCode}
                      className="w-full h-10 px-3.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-mono font-semibold cursor-not-allowed select-none"
                    />
                    {renderFieldError('employeeCode')}
                  </div>

                  {/* รหัสเครื่องสแกนนิ้ว */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>รหัสเครื่องสแกนนิ้ว (Biometric ID)</span>
                      <FieldInfoTooltip text="รหัสพนักงานในเครื่องสแกนนิ้ว/ทาบบัตร (สำหรับเชื่อมต่อเวลากับไฟล์ Excel อัตโนมัติ)" />
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
                    {renderFieldError('biometricId')}
                  </div>

                  {/* ตำแหน่งงาน */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        ตำแหน่ง <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <CustomSelect
                      value={formData.positionId ?? ''}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : undefined;
                        const pos = positions.find((p) => p.id === id);
                        setFormData({ ...formData, positionId: id, positionName: pos?.positionName || '' });
                        clearFieldError('positionName');
                      }}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
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
                                  ? ` (${p.filledCount ?? 0}/${p.headcountPlan}${
                                      (p.vacantCount ?? 0) === 0 ? ' เต็ม' : ''
                                    })`
                                  : ''}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </CustomSelect>
                    {renderFieldError('positionName')}
                  </div>

                  {/* ประเภทพนักงาน */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        ประเภทพนักงาน <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <CustomSelect
                      value={formData.employeeType}
                      onChange={(e) => {
                        setFormData({ ...formData, employeeType: e.target.value });
                        clearFieldError('employeeType');
                      }}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
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

                  {/* ทีมที่สังกัด */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>ทีมที่สังกัด (Team)</span>
                      <FieldInfoTooltip text="เมื่อเลือกทีม ระบบจะผูกหัวหน้างานของพนักงานเข้ากับหัวหน้าทีมโดยอัตโนมัติ" />
                    </label>
                    <CustomSelect
                      value={formData.teamId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        setFormData((prev) => ({ ...prev, teamId: val }));
                      }}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    >
                      <option value="">ไม่มีสังกัดทีม (ไม่ได้ระบุ)</option>
                      {(() => {
                        const selectedPos = positions.find(
                          (p) => p.id === formData.positionId || p.positionName === formData.positionName
                        );
                        const relevantTeams = selectedPos?.departmentId
                          ? teams.filter((t) => t.departmentId === selectedPos.departmentId)
                          : teams;
                        return relevantTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.teamName}
                          </option>
                        ));
                      })()}
                    </CustomSelect>
                    {(() => {
                      const currentTeam = teams.find((t) => t.id === formData.teamId);
                      if (!currentTeam) return null;
                      return (
                        <div className="mt-1.5 p-2 rounded-lg bg-blue-50/70 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-300">หัวหน้าทีม:</span>
                          <span className="font-semibold text-[#0B2046] dark:text-blue-300">
                            {currentTeam.leadEmployeeName || 'ยังไม่มีหัวหน้าทีม'}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* คำนำหน้า */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        คำนำหน้า (Prefix) <span className="text-rose-500">*</span>
                      </span>
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
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="นาง">นาง</option>
                    </CustomSelect>
                    {renderFieldError('prefix')}
                  </div>

                  {/* ชื่อ */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        ชื่อ (First Name) <span className="text-rose-500">*</span>
                      </span>
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

                  {/* นามสกุล */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        นามสกุล (Last Name) <span className="text-rose-500">*</span>
                      </span>
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
                </div>

                {/* --- Column 2 --- */}
                <div className="space-y-4">
                  {/* เลขบัตรประชาชน */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        เลขบัตรประชาชน (National ID) <span className="text-rose-500">*</span>
                      </span>
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

                  {/* วันเกิด */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        วันเกิด (Date of Birth) <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <ThaiDatePicker
                      value={formData.birthDate}
                      onChange={(val) => {
                        setFormData({ ...formData, birthDate: val });
                        clearFieldError('birthDate');
                      }}
                      maxDate={new Date().toISOString().split('T')[0]}
                      error={hasAttemptedSubmit && Boolean(formErrors['birthDate'])}
                      className="w-full"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    />
                    {renderFieldError('birthDate')}
                  </div>

                  {/* เพศ */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        เพศ (Gender) <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <CustomSelect
                      value={formData.gender}
                      onChange={(e) => {
                        setFormData({ ...formData, gender: e.target.value });
                        clearFieldError('gender');
                      }}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    >
                      {genderOptions(lookups.genders, formData.gender).map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </CustomSelect>
                    {renderFieldError('gender')}
                  </div>

                  {/* สัญชาติ */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        สัญชาติ (Nationality) <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <NationalitySelect
                      value={formData.nationality}
                      onChange={(val) => {
                        setFormData({ ...formData, nationality: val });
                        clearFieldError('nationality');
                      }}
                      className="!h-10"
                      hasError={hasAttemptedSubmit && Boolean(formErrors.nationality)}
                    />
                    {renderFieldError('nationality')}
                  </div>

                  {/* ศาสนา */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>ศาสนา (Religion) (ไม่บังคับ)</span>
                    </label>
                    <CustomSelect
                      value={formData.religion}
                      onChange={(e) => {
                        setFormData({ ...formData, religion: e.target.value });
                        clearFieldError('religion');
                      }}
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
                    {renderFieldError('religion')}
                  </div>

                  {/* สถานภาพสมรส */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        สถานภาพสมรส (Marital Status) <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <CustomSelect
                      value={formData.maritalStatus}
                      onChange={(e) => {
                        setFormData({ ...formData, maritalStatus: e.target.value });
                        clearFieldError('maritalStatus');
                      }}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    >
                      <option value="">เลือกสถานภาพ</option>
                      <option value="โสด">โสด</option>
                      <option value="สมรส">สมรส</option>
                      <option value="หย่าร้าง">หย่าร้าง</option>
                      <option value="หม้าย">หม้าย</option>
                    </CustomSelect>
                    {renderFieldError('maritalStatus')}
                  </div>

                  {/* สถานภาพทางทหาร */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        สถานภาพทางทหาร (Military Status) <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <CustomSelect
                      value={formData.militaryStatus}
                      onChange={(e) => {
                        setFormData({ ...formData, militaryStatus: e.target.value });
                        clearFieldError('militaryStatus');
                      }}
                      className="w-full cursor-pointer"
                      buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                    >
                      <option value="">เลือกสถานภาพทางทหาร</option>
                      <option value="ได้รับการยกเว้น">ได้รับการยกเว้น</option>
                      <option value="ผ่านการเกณฑ์ทหารแล้ว">ผ่านการเกณฑ์ทหารแล้ว</option>
                      <option value="ศึกษาวิชาทหาร (รด.)">ศึกษาวิชาทหาร (รด.)</option>
                      <option value="ยังไม่ได้รับการเกณฑ์">ยังไม่ได้รับการเกณฑ์</option>
                    </CustomSelect>
                    {renderFieldError('militaryStatus')}
                  </div>
                </div>

                {/* --- Column 3 --- */}
                <div className="space-y-4">
                  {/* อีเมลส่วนตัว */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        อีเมล (E-mail) <span className="text-rose-500">*</span>
                      </span>
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

                  {/* อีเมลองค์กร */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        อีเมลองค์กร (Organization email) <span className="text-rose-500">*</span>
                      </span>
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

                  {/* เบอร์โทรศัพท์ส่วนตัว */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-1 text-xs">
                      <span>
                        เบอร์โทรศัพท์ส่วนตัว (Phone number) <span className="text-rose-500">*</span>
                      </span>
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

                  {/* ข้อมูลที่อยู่ */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block text-xs">
                      ที่อยู่ (Address) <span className="text-rose-500">*</span>
                    </label>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1.5">ประเภทที่อยู่</span>
                      <div className="grid grid-cols-2 gap-2">
                        {['อาศัยกับครอบครัว', 'บ้านตัวเอง', 'บ้านเช่า', 'หอพัก'].map((t) => (
                          <label key={t} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="create_addressType"
                              value={t}
                              checked={formData.addressType === t}
                              onChange={(e) => {
                                setFormData({ ...formData, addressType: e.target.value });
                                clearFieldError('addressType');
                              }}
                              className="text-[#0B2046] focus:ring-[#0B2046]"
                            />
                            <span>{t}</span>
                          </label>
                        ))}
                      </div>
                      {renderFieldError('addressType')}
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                        บ้านเลขที่ / อาคาร <span className="text-rose-500">*</span>
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

                  {/* ข้อมูลบัญชีธนาคาร */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block text-xs">
                      บัญชีธนาคาร (Bank Account) <span className="text-rose-500">*</span>
                    </label>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">
                        ชื่อธนาคาร <span className="text-rose-500">*</span>
                      </span>
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
                        className="w-full cursor-pointer"
                        buttonClassName="!h-10 !rounded-lg !text-xs !px-3.5"
                      >
                        <option value="">เลือกธนาคาร</option>
                        {banks.map((b) => (
                          <option key={b.id} value={b.bankName}>
                            {b.bankName}
                          </option>
                        ))}
                      </CustomSelect>
                      {renderFieldError('bankName')}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          เลขที่บัญชี <span className="text-rose-500">*</span>
                        </span>
                        {getRequiredBankDigits(formData.bankName) != null && (
                          <span
                            className={`text-[11px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                              formData.accountNumber?.length === (getRequiredBankDigits(formData.bankName) ?? -1)
                                ? 'bg-emerald-50 text-emerald-600 font-medium'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {formData.accountNumber?.length || 0} / {getRequiredBankDigits(formData.bankName)} หลัก
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
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
            )}

            {/* TAB 2: ข้อมูลครอบครัว (Family) */}
            {activeTab === 'family' && (
              <div className="w-full space-y-6 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Users className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">สมาชิกในครอบครัว</h3>
                  <span className="text-slate-400 font-normal text-[11px]">(ไม่บังคับ)</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    {formData.familyMembers?.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveFamilyIndex(idx)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                          activeFamilyIndex === idx
                            ? 'bg-[#0B2046] text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddFamilyMember}
                      className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 hover:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center transition-all cursor-pointer"
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
                            clearFieldError(`family_${activeFamilyIndex}_relationshipType`);
                          }}
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                        >
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
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
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
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
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
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                        />
                        {renderFieldError(`family_${activeFamilyIndex}_lastName`)}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          เลขบัตรประชาชน
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
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                        />
                        {renderFieldError(`family_${activeFamilyIndex}_citizenId`)}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">วันเกิด</label>
                        <ThaiDatePicker
                          value={formData.familyMembers[activeFamilyIndex].birthDate || ''}
                          onChange={(val) => {
                            const list = [...(formData.familyMembers || [])];
                            list[activeFamilyIndex].birthDate = val;
                            setFormData({ ...formData, familyMembers: list });
                            clearFieldError(`family_${activeFamilyIndex}_birthDate`);
                          }}
                          maxDate={new Date().toISOString().split('T')[0]}
                        />
                        {renderFieldError(`family_${activeFamilyIndex}_birthDate`)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: กรณีฉุกเฉินติดต่อใคร (Emergency) */}
            {activeTab === 'emergency' && (
              <div className="w-full space-y-6 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Phone className="w-4 h-4 text-[#0B2046] dark:text-blue-400" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    กรณีฉุกเฉินติดต่อใคร (Emergency Contact)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-sky-50/40 dark:bg-sky-950/30 p-5 border border-sky-100 dark:border-sky-900/60 rounded-xl">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      ความสัมพันธ์ (Relationship) <span className="text-rose-500">*</span>
                    </label>
                    <CustomSelect
                      value={formData.emergencyContact?.relationship || 'บิดา'}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            relationship: e.target.value,
                            firstName: formData.emergencyContact?.firstName || '',
                            lastName: formData.emergencyContact?.lastName || '',
                            primaryPhone: formData.emergencyContact?.primaryPhone || '',
                          },
                        });
                        clearFieldError('emergency_relationship');
                      }}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
                    >
                      <option value="บิดา">บิดา</option>
                      <option value="มารดา">มารดา</option>
                      <option value="คู่สมรส">คู่สมรส</option>
                      <option value="พี่น้อง">พี่น้อง</option>
                      <option value="ญาติ">ญาติ</option>
                      <option value="เพื่อน">เพื่อน</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </CustomSelect>
                    {renderFieldError('emergency_relationship')}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      คำนำหน้า <span className="text-rose-500">*</span>
                    </label>
                    <CustomSelect
                      value={formData.emergencyContact?.prefix || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            prefix: e.target.value,
                            firstName: formData.emergencyContact?.firstName || '',
                            lastName: formData.emergencyContact?.lastName || '',
                            primaryPhone: formData.emergencyContact?.primaryPhone || '',
                          },
                        });
                        clearFieldError('emergency_prefix');
                      }}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer"
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
                      ชื่อผู้ติดต่อ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="กรอกชื่อผู้ติดต่อฉุกเฉิน"
                      value={formData.emergencyContact?.firstName || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            firstName: e.target.value,
                            lastName: formData.emergencyContact?.lastName || '',
                            primaryPhone: formData.emergencyContact?.primaryPhone || '',
                          },
                        });
                        clearFieldError('emergency_firstName');
                      }}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                    {renderFieldError('emergency_firstName')}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      นามสกุลผู้ติดต่อ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="กรอกนามสกุล"
                      value={formData.emergencyContact?.lastName || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            firstName: formData.emergencyContact?.firstName || '',
                            lastName: e.target.value,
                            primaryPhone: formData.emergencyContact?.primaryPhone || '',
                          },
                        });
                        clearFieldError('emergency_lastName');
                      }}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                    {renderFieldError('emergency_lastName')}
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
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            firstName: formData.emergencyContact?.firstName || '',
                            lastName: formData.emergencyContact?.lastName || '',
                            primaryPhone: autoFormatPhone(e.target.value),
                          },
                        });
                        clearFieldError('emergency_primaryPhone');
                      }}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046] font-mono"
                    />
                    {renderFieldError('emergency_primaryPhone')}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      ที่อยู่ผู้ติดต่อ <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ที่อยู่สำหรับติดต่อกรณีฉุกเฉิน"
                      value={formData.emergencyContact?.address || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            firstName: formData.emergencyContact?.firstName || '',
                            lastName: formData.emergencyContact?.lastName || '',
                            primaryPhone: formData.emergencyContact?.primaryPhone || '',
                            address: e.target.value,
                          },
                        });
                        clearFieldError('emergency_address');
                      }}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                    />
                    {renderFieldError('emergency_address')}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: การศึกษา & ประวัติการทำงาน (Background) */}
            {activeTab === 'background' && (
              <div className="w-full animate-in fade-in duration-150">
                <EmployeeBackgroundEditor
                  educations={educations}
                  onEducationsChange={setEducations}
                  workExperiences={workExperiences}
                  onWorkExperiencesChange={setWorkExperiences}
                />
              </div>
            )}

            {/* TAB 5: ภาษี & ประกันสังคม (Tax & SSO) */}
            {activeTab === 'tax' && (
              <div className="w-full animate-in fade-in duration-150">
                <EmployeeTaxSsoEditor values={taxSso} onChange={setTaxSso} />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#0B2046] text-white text-xs font-semibold hover:bg-[#153468] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs"
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
