'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Globe,
  Heart,
  Users2,
  Landmark,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Award,
  UserRound,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { confirmDelete } from '@/lib/sweetalert';
import { masterDataService } from '@/services/masterDataService';
import { bankService } from '@/services/bankService';
import {
  DocumentTypeItem,
  CreateDocumentTypeRequest,
  UpdateDocumentTypeRequest,
  NationalityItem,
  ReligionItem,
  MaritalStatusItem,
  GenderTypeItem,
  CertificateTypeItem,
} from '@/types/master';
import { Bank } from '@/types/api';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import { CodeInput } from '@/components/ui/CodeInput';
import { ActiveToggleRow } from '@/components/ui/ToggleSwitch';
import { RowActions, RowActionButton, ActiveStatus, inputClass, Modal, ModalFooter } from '@/components/ui';

type MasterTab =
  | 'document-types'
  | 'certificate-types'
  | 'nationalities'
  | 'religions'
  | 'marital-statuses'
  | 'genders'
  | 'banks';

export default function MasterDataHubPage() {
  const toast = useToast();
  const { user, hasPermission, hasRole } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const searchParams = useSearchParams();

  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canViewMasterData = hasPermission('MASTER_DATA_VIEW') || isSuper;
  const canCreateMasterData = hasPermission('MASTER_DATA_CREATE') || isSuper;
  const canEditMasterData = hasPermission('MASTER_DATA_EDIT') || isSuper;

  const initialTab = (searchParams.get('tab') as MasterTab) || 'document-types';
  const [activeTab, setActiveTab] = useState<MasterTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [nationalities, setNationalities] = useState<NationalityItem[]>([]);
  const [religions, setReligions] = useState<ReligionItem[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<MaritalStatusItem[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [genders, setGenders] = useState<GenderTypeItem[]>([]);
  const [certTypes, setCertTypes] = useState<CertificateTypeItem[]>([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [docForm, setDocForm] = useState<CreateDocumentTypeRequest>({
    documentCode: '',
    documentName: '',
    isExpiryRequired: false,
    status: 'ACTIVE',
  });
  const [simpleNameInput, setSimpleNameInput] = useState('');
  // ฟอร์ม รหัส + ชื่อ (ใช้กับ เพศ / ประเภทหนังสือรับรอง) — รหัสแก้ไม่ได้หลังสร้าง
  const [codeNameForm, setCodeNameForm] = useState({ code: '', name: '' });
  const [bankForm, setBankForm] = useState<{
    bankCode: string;
    bankName: string;
    shortName: string;
    accountDigits: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    bankCode: '',
    bankName: '',
    shortName: '',
    accountDigits: '',
    status: 'ACTIVE',
  });

  // Sync breadcrumb
  useEffect(() => {
    const tabNameMap: Record<MasterTab, string> = {
      'document-types': 'ประเภทเอกสารแนบ',
      'certificate-types': 'ประเภทหนังสือรับรอง',
      nationalities: 'สัญชาติ',
      religions: 'ศาสนา',
      'marital-statuses': 'สถานภาพสมรส',
      genders: 'เพศ',
      banks: 'ข้อมูลธนาคาร',
    };
    setBreadcrumb({ section: 'ข้อมูลหลัก', page: tabNameMap[activeTab] });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  // Load active tab data
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'document-types') {
        const data = await masterDataService.getDocumentTypes();
        setDocTypes(data);
      } else if (activeTab === 'nationalities') {
        const data = await masterDataService.getNationalities();
        setNationalities(data);
      } else if (activeTab === 'religions') {
        const data = await masterDataService.getReligions();
        setReligions(data);
      } else if (activeTab === 'marital-statuses') {
        const data = await masterDataService.getMaritalStatuses();
        setMaritalStatuses(data);
      } else if (activeTab === 'banks') {
        const data = await bankService.getAll();
        setBanks(data);
      } else if (activeTab === 'genders') {
        setGenders(await masterDataService.getGenders());
      } else if (activeTab === 'certificate-types') {
        setCertTypes(await masterDataService.getCertificateTypes());
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถโหลดข้อมูล Master Data ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canViewMasterData) return;
    loadData();
    setSearchQuery('');
  }, [activeTab, canViewMasterData]);

  // โหลดข้อมูลทุกแท็บครั้งแรกเบื้องหลัง เพื่อให้ตัวเลขบนแท็บถูกต้องตั้งแต่เปิดหน้า (เดิมเป็น 0 จนกว่าจะกดเข้าแท็บ)
  useEffect(() => {
    if (!canViewMasterData) return;
    let cancelled = false;
    Promise.allSettled([
      masterDataService.getDocumentTypes(),
      masterDataService.getNationalities(),
      masterDataService.getReligions(),
      masterDataService.getMaritalStatuses(),
      bankService.getAll(),
      masterDataService.getGenders(),
      masterDataService.getCertificateTypes(),
    ]).then(([d, n, r, m, b, g, c]) => {
      if (cancelled) return;
      if (d.status === 'fulfilled') setDocTypes(d.value);
      if (n.status === 'fulfilled') setNationalities(n.value);
      if (r.status === 'fulfilled') setReligions(r.value);
      if (m.status === 'fulfilled') setMaritalStatuses(m.value);
      if (b.status === 'fulfilled') setBanks(b.value);
      if (g.status === 'fulfilled') setGenders(g.value);
      if (c.status === 'fulfilled') setCertTypes(c.value);
    });
    return () => {
      cancelled = true;
    };
  }, [canViewMasterData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentId(null);
    if (activeTab === 'document-types') {
      setDocForm({ documentCode: '', documentName: '', isExpiryRequired: false, notifyBeforeDays: 30, validityMonths: null, status: 'ACTIVE' });
    } else if (activeTab === 'banks') {
      setBankForm({ bankCode: '', bankName: '', shortName: '', accountDigits: '', status: 'ACTIVE' });
    } else if (activeTab === 'genders' || activeTab === 'certificate-types') {
      setCodeNameForm({ code: '', name: '' });
    } else {
      setSimpleNameInput('');
    }
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: any) => {
    setModalMode('edit');
    setCurrentId(item.id);
    if (activeTab === 'document-types') {
      setDocForm({
        documentCode: item.documentCode,
        documentName: item.documentName,
        isExpiryRequired: item.isExpiryRequired,
        notifyBeforeDays: item.notifyBeforeDays ?? 30,
        validityMonths: item.validityMonths ?? null,
        status: item.status,
      });
    } else if (activeTab === 'nationalities') {
      setSimpleNameInput(item.nationalityName);
    } else if (activeTab === 'religions') {
      setSimpleNameInput(item.religionName);
    } else if (activeTab === 'marital-statuses') {
      setSimpleNameInput(item.maritalStatusName);
    } else if (activeTab === 'genders') {
      setCodeNameForm({ code: item.genderCode, name: item.genderName });
    } else if (activeTab === 'certificate-types') {
      setCodeNameForm({ code: item.certificateCode, name: item.certificateName });
    } else if (activeTab === 'banks') {
      setBankForm({
        bankCode: item.bankCode,
        bankName: item.bankName,
        shortName: item.shortName || '',
        accountDigits: item.accountDigits ? String(item.accountDigits) : '',
        status: (item.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
      });
    }
    setModalOpen(true);
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (activeTab === 'document-types') {
        if (modalMode === 'create') {
          await masterDataService.createDocumentType(docForm);
          toast.success('เพิ่มประเภทเอกสารแนบสำเร็จ');
        } else if (currentId) {
          await masterDataService.updateDocumentType(currentId, {
            documentName: docForm.documentName,
            isExpiryRequired: !!docForm.isExpiryRequired,
            notifyBeforeDays: docForm.notifyBeforeDays ?? 30,
            validityMonths: docForm.validityMonths || null,
            status: docForm.status || 'ACTIVE',
          });
          toast.success('อัปเดตประเภทเอกสารแนบสำเร็จ');
        }
      } else if (activeTab === 'nationalities') {
        if (modalMode === 'create') {
          await masterDataService.createNationality({ nationalityName: simpleNameInput.trim() });
          toast.success('เพิ่มสัญชาติสำเร็จ');
        } else if (currentId) {
          await masterDataService.updateNationality(currentId, { nationalityName: simpleNameInput.trim() });
          toast.success('อัปเดตสัญชาติสำเร็จ');
        }
      } else if (activeTab === 'religions') {
        if (modalMode === 'create') {
          await masterDataService.createReligion({ religionName: simpleNameInput.trim() });
          toast.success('เพิ่มศาสนาสำเร็จ');
        } else if (currentId) {
          await masterDataService.updateReligion(currentId, { religionName: simpleNameInput.trim() });
          toast.success('อัปเดตศาสนาสำเร็จ');
        }
      } else if (activeTab === 'marital-statuses') {
        if (modalMode === 'create') {
          await masterDataService.createMaritalStatus({ maritalStatusName: simpleNameInput.trim() });
          toast.success('เพิ่มสถานภาพสมรสสำเร็จ');
        } else if (currentId) {
          await masterDataService.updateMaritalStatus(currentId, { maritalStatusName: simpleNameInput.trim() });
          toast.success('อัปเดตสถานภาพสมรสสำเร็จ');
        }
      } else if (activeTab === 'genders') {
        if (modalMode === 'create') {
          await masterDataService.createGender({ genderCode: codeNameForm.code.trim(), genderName: codeNameForm.name.trim() });
          toast.success('เพิ่มเพศสำเร็จ');
        } else if (currentId) {
          await masterDataService.updateGender(currentId, { genderName: codeNameForm.name.trim() });
          toast.success('อัปเดตเพศสำเร็จ');
        }
      } else if (activeTab === 'certificate-types') {
        if (modalMode === 'create') {
          await masterDataService.createCertificateType({
            certificateCode: codeNameForm.code.trim(),
            certificateName: codeNameForm.name.trim(),
          });
          toast.success('เพิ่มประเภทหนังสือรับรองสำเร็จ');
        } else if (currentId) {
          await masterDataService.updateCertificateType(currentId, { certificateName: codeNameForm.name.trim() });
          toast.success('อัปเดตประเภทหนังสือรับรองสำเร็จ');
        }
      } else if (activeTab === 'banks') {
        if (modalMode === 'create') {
          await bankService.create({
            bankCode: bankForm.bankCode,
            bankName: bankForm.bankName,
            shortName: bankForm.shortName.trim() || null,
            accountDigits: bankForm.accountDigits ? Number(bankForm.accountDigits) : null,
            status: bankForm.status,
          });
          toast.success('เพิ่มธนาคารสำเร็จ');
        } else if (currentId) {
          await bankService.update(currentId, {
            bankName: bankForm.bankName,
            shortName: bankForm.shortName.trim() || null,
            accountDigits: bankForm.accountDigits ? Number(bankForm.accountDigits) : null,
            status: bankForm.status,
          });
          toast.success('อัปเดตธนาคารสำเร็จ');
        }
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: number, name: string) => {
    const isConfirmed = await confirmDelete({
      title: 'ยืนยันการลบข้อมูล',
      text: `คุณต้องการลบข้อมูล "${name}" ใช่หรือไม่?`,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
    });
    if (!isConfirmed) return;
    try {
      if (activeTab === 'document-types') {
        await masterDataService.deleteDocumentType(id);
      } else if (activeTab === 'nationalities') {
        await masterDataService.deleteNationality(id);
      } else if (activeTab === 'religions') {
        await masterDataService.deleteReligion(id);
      } else if (activeTab === 'marital-statuses') {
        await masterDataService.deleteMaritalStatus(id);
      } else if (activeTab === 'banks') {
        await bankService.delete(id);
      } else if (activeTab === 'genders') {
        await masterDataService.deleteGender(id);
      } else if (activeTab === 'certificate-types') {
        await masterDataService.deleteCertificateType(id);
      }
      toast.success('ลบข้อมูลสำเร็จ');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  // Filtered items
  const q = searchQuery.toLowerCase().trim();
  const filteredDocTypes = docTypes.filter(
    (d) => !q || d.documentCode.toLowerCase().includes(q) || d.documentName.toLowerCase().includes(q)
  );
  const filteredNationalities = nationalities.filter((n) => !q || n.nationalityName.toLowerCase().includes(q));
  const filteredReligions = religions.filter((r) => !q || r.religionName.toLowerCase().includes(q));
  const filteredMaritalStatuses = maritalStatuses.filter((m) => !q || m.maritalStatusName.toLowerCase().includes(q));
  const filteredGenders = genders.filter(
    (g) => !q || g.genderCode.toLowerCase().includes(q) || g.genderName.toLowerCase().includes(q)
  );
  const filteredCertTypes = certTypes.filter(
    (c) => !q || c.certificateCode.toLowerCase().includes(q) || c.certificateName.toLowerCase().includes(q)
  );
  const filteredBanks = banks.filter(
    (b) => !q || b.bankCode.toLowerCase().includes(q) || b.bankName.toLowerCase().includes(q)
  );

  if (!canViewMasterData) {
    return (
      <AccessDenied
        title="คุณไม่มีสิทธิ์เข้าถึงหน้าข้อมูลหลัก"
        message="ขออภัย บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงการจัดการข้อมูลหลัก (Master Data) กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การใช้งาน"
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 dark:bg-slate-800 dark:border-slate-700/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight dark:text-slate-100">การจัดการข้อมูลหลัก</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 dark:text-slate-400">
            ศูนย์กลางการกำหนดค่าตัวเลือกอ้างอิงและประเภทเอกสารประกอบในระบบ HRMS
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 text-slate-600 dark:text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
          {canCreateMasterData && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่มข้อมูลใหม่
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('document-types')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'document-types'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          ประเภทเอกสารแนบ
        </button>

        <button
          onClick={() => setActiveTab('certificate-types')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'certificate-types'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <Award className="w-4 h-4" />
          ประเภทหนังสือรับรอง
        </button>

        <button
          onClick={() => setActiveTab('nationalities')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'nationalities'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <Globe className="w-4 h-4" />
          สัญชาติ
        </button>

        <button
          onClick={() => setActiveTab('religions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'religions'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <Heart className="w-4 h-4" />
          ศาสนา
        </button>

        <button
          onClick={() => setActiveTab('marital-statuses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'marital-statuses'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <Users2 className="w-4 h-4" />
          สถานภาพสมรส
        </button>

        <button
          onClick={() => setActiveTab('genders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'genders'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <UserRound className="w-4 h-4" />
          เพศ
        </button>

        <button
          onClick={() => setActiveTab('banks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'banks'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <Landmark className="w-4 h-4" />
          ธนาคาร
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
        <input
          type="text"
          placeholder="พิมพ์คำค้นหา..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
        />
      </div>

      {/* Tab 1: Document Types Table */}
      {activeTab === 'document-types' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700/80">
          <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="table-standard w-full min-w-[700px] text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  <th className="py-3 px-4 w-16">ID</th>
                  <th className="py-3 px-4">รหัสประเภทเอกสาร</th>
                  <th className="py-3 px-4">ชื่อประเภทเอกสาร</th>
                  <th className="py-3 px-4 text-center">ต้องระบุวันหมดอายุ</th>
                  <th className="py-3 px-4 text-center">อายุเอกสาร</th>
                  <th className="py-3 px-4 text-center">แจ้งเตือนล่วงหน้า</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredDocTypes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                      ไม่พบข้อมูลประเภทเอกสารแนบ
                    </td>
                  </tr>
                ) : (
                  filteredDocTypes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{item.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700">
                          {item.documentCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{item.documentName}</td>
                      <td className="py-3.5 px-4 text-center">
                        {item.isExpiryRequired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400">
                            ต้องระบุวันหมดอายุ
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] dark:text-slate-500 dark:text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400">
                        {item.validityMonths ? `${item.validityMonths} เดือน` : <span className="text-slate-400 text-[11px] dark:text-slate-500 dark:text-slate-400">-</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400">{item.notifyBeforeDays ?? 30} วัน</td>
                      <td className="py-3.5 px-4 text-center">
                        <ActiveStatus active={item.status === 'ACTIVE'} activeText="เปิดใช้งาน" inactiveText="ปิดใช้งาน" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canEditMasterData ? (
                          <RowActions>
                            <RowActionButton action="edit" onClick={() => handleOpenEdit(item)} />
                            <RowActionButton action="delete" onClick={() => handleDelete(item.id, item.documentName)} />
                          </RowActions>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Nationalities Table */}
      {activeTab === 'nationalities' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700/80">
          <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="table-standard w-full min-w-[400px] text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">ชื่อสัญชาติ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredNationalities.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                      ไม่พบข้อมูลสัญชาติ
                    </td>
                  </tr>
                ) : (
                  filteredNationalities.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{item.id}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{item.nationalityName}</td>
                      <td className="py-3.5 px-4 text-right">
                        {canEditMasterData ? (
                          <RowActions>
                            <RowActionButton action="edit" onClick={() => handleOpenEdit(item)} />
                            <RowActionButton action="delete" onClick={() => handleDelete(item.id, item.nationalityName)} />
                          </RowActions>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Religions Table */}
      {activeTab === 'religions' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700/80">
          <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="table-standard w-full min-w-[400px] text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">ชื่อศาสนา</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredReligions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                      ไม่พบข้อมูลศาสนา
                    </td>
                  </tr>
                ) : (
                  filteredReligions.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{item.id}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{item.religionName}</td>
                      <td className="py-3.5 px-4 text-right">
                        {canEditMasterData ? (
                          <RowActions>
                            <RowActionButton action="edit" onClick={() => handleOpenEdit(item)} />
                            <RowActionButton action="delete" onClick={() => handleDelete(item.id, item.religionName)} />
                          </RowActions>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Marital Statuses Table */}
      {activeTab === 'marital-statuses' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700/80">
          <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="table-standard w-full min-w-[400px] text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">ชื่อสถานภาพสมรส</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredMaritalStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                      ไม่พบข้อมูลสถานภาพสมรส
                    </td>
                  </tr>
                ) : (
                  filteredMaritalStatuses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{item.id}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{item.maritalStatusName}</td>
                      <td className="py-3.5 px-4 text-right">
                        {canEditMasterData ? (
                          <RowActions>
                            <RowActionButton action="edit" onClick={() => handleOpenEdit(item)} />
                            <RowActionButton action="delete" onClick={() => handleDelete(item.id, item.maritalStatusName)} />
                          </RowActions>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Certificate Types */}
      {activeTab === 'certificate-types' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700/80">
          <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="table-standard w-full min-w-[500px] text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">รหัสประเภท</th>
                  <th className="py-3 px-4">ชื่อหนังสือรับรอง</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredCertTypes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                      ไม่พบข้อมูลประเภทหนังสือรับรอง
                    </td>
                  </tr>
                ) : (
                  filteredCertTypes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{item.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700">
                          {item.certificateCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{item.certificateName}</td>
                      <td className="py-3.5 px-4 text-right">
                        {canEditMasterData ? (
                          <RowActions>
                            <RowActionButton action="edit" onClick={() => handleOpenEdit(item)} />
                            <RowActionButton action="delete" onClick={() => handleDelete(item.id, item.certificateName)} />
                          </RowActions>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Genders */}
      {activeTab === 'genders' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700/80">
          <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="table-standard w-full min-w-[500px] text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">รหัสเพศ</th>
                  <th className="py-3 px-4">ชื่อเพศ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredGenders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                      ไม่พบข้อมูลเพศ
                    </td>
                  </tr>
                ) : (
                  filteredGenders.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{item.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700">
                          {item.genderCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{item.genderName}</td>
                      <td className="py-3.5 px-4 text-right">
                        {canEditMasterData ? (
                          <RowActions>
                            <RowActionButton action="edit" onClick={() => handleOpenEdit(item)} />
                            <RowActionButton action="delete" onClick={() => handleDelete(item.id, item.genderName)} />
                          </RowActions>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Banks Table */}
      {activeTab === 'banks' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700/80">
          <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="table-standard w-full min-w-[500px] text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">รหัสธนาคาร</th>
                  <th className="py-3 px-4">ชื่อธนาคาร</th>
                  <th className="py-3 px-4">ชื่อย่อ</th>
                  <th className="py-3 px-4 text-center">จำนวนหลักเลขบัญชี</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredBanks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                      ไม่พบข้อมูลธนาคาร
                    </td>
                  </tr>
                ) : (
                  filteredBanks.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{item.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700">
                          {item.bankCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{item.bankName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">{item.shortName || '-'}</td>
                      <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-300">
                        {item.accountDigits ? `${item.accountDigits} หลัก` : 'ไม่ตรวจ'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <ActiveStatus active={item.status === 'ACTIVE'} activeText="เปิดใช้งาน" inactiveText="ปิดใช้งาน" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canEditMasterData ? (
                          <RowActions>
                            <RowActionButton action="edit" onClick={() => handleOpenEdit(item)} />
                            <RowActionButton action="delete" onClick={() => handleDelete(item.id, item.bankName)} />
                          </RowActions>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog for Create & Edit */}
      {modalOpen && (
        <Modal
          isOpen
          size="sm"
          onClose={() => setModalOpen(false)}
          title={modalMode === 'create' ? 'เพิ่มข้อมูลใหม่' : 'แก้ไขข้อมูล'}
          onSubmit={handleSave}
          footer={<ModalFooter onCancel={() => setModalOpen(false)} loading={submitting} submitText="บันทึกข้อมูล" />}
        >
            {activeTab === 'document-types' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">
                    ชื่อประเภทเอกสาร <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={docForm.documentName}
                    onChange={(e) => setDocForm({ ...docForm, documentName: e.target.value })}
                    placeholder="เช่น หนังสือเดินทาง (Passport)"
                    className={inputClass}
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 dark:bg-slate-950 dark:border-slate-700/60">
                  <input
                    type="checkbox"
                    id="isExpiryRequired"
                    checked={docForm.isExpiryRequired}
                    onChange={(e) => setDocForm({ ...docForm, isExpiryRequired: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="isExpiryRequired" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none dark:text-slate-300">
                    เอกสารนี้ต้องระบุวันหมดอายุ
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">อายุเอกสาร (เดือน)</label>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={docForm.validityMonths ?? ''}
                      onChange={(e) =>
                        setDocForm({ ...docForm, validityMonths: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="ไม่กำหนด"
                      className={inputClass}
                    />
                    <p className="text-[10px] text-slate-400 mt-1 dark:text-slate-500 dark:text-slate-400">ใช้คำนวณวันหมดอายุจากวันที่ออกให้อัตโนมัติ</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">แจ้งเตือนล่วงหน้า (วัน) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      required
                      value={docForm.notifyBeforeDays ?? ''}
                      onChange={(e) =>
                        setDocForm({ ...docForm, notifyBeforeDays: e.target.value ? Number(e.target.value) : null })
                      }
                      className={inputClass}
                    />
                    <p className="text-[10px] text-slate-400 mt-1 dark:text-slate-500 dark:text-slate-400">แจ้งพนักงานและฝ่ายบุคคลก่อนหมดอายุ</p>
                  </div>
                </div>

                {modalMode === 'edit' && (
                  <ActiveToggleRow label="เปิดใช้งาน" checked={docForm.status === 'ACTIVE'} onChange={(v) => setDocForm({ ...docForm, status: (v ? 'ACTIVE' : 'INACTIVE') })} />
                )}
              </>
            )}

            {activeTab === 'nationalities' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ชื่อสัญชาติ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={simpleNameInput}
                  onChange={(e) => setSimpleNameInput(e.target.value)}
                  placeholder="เช่น ไทย, ญี่ปุ่น, อเมริกัน..."
                  className={inputClass}
                />
              </div>
            )}

            {activeTab === 'religions' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ชื่อศาสนา <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={simpleNameInput}
                  onChange={(e) => setSimpleNameInput(e.target.value)}
                  placeholder="เช่น พุทธ, คริสต์, อิสลาม..."
                  className={inputClass}
                />
              </div>
            )}

            {activeTab === 'marital-statuses' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ชื่อสถานภาพสมรส <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={simpleNameInput}
                  onChange={(e) => setSimpleNameInput(e.target.value)}
                  placeholder="เช่น โสด, สมรส, หย่าร้าง..."
                  className={inputClass}
                />
              </div>
            )}

            {(activeTab === 'genders' || activeTab === 'certificate-types') && (
              <>
                <div>
                  <CodeInput
                    type={activeTab === 'genders' ? 'gender' : 'certificate-type'}
                    prefix={activeTab === 'genders' ? 'G' : 'CERT_'}
                    digits={activeTab === 'genders' ? 2 : 3}
                    existingCodes={activeTab === 'genders' ? genders.map((x) => x.genderCode) : certTypes.map((x) => x.certificateCode)}
                    label={activeTab === 'genders' ? 'รหัสเพศ' : 'รหัสประเภทหนังสือรับรอง'}
                    required
                    mode={modalMode}
                    maxLength={activeTab === 'genders' ? 20 : 50}
                    value={codeNameForm.code}
                    onChange={(v) => setCodeNameForm((f) => ({ ...f, code: v }))}
                    labelClassName="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    inputClassName="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-blue-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                  />
                  {activeTab === 'certificate-types' && (
                    <p className="text-[10px] text-slate-400 mt-1 dark:text-slate-400">รหัสที่มีคำว่า SALARY จะแสดงเงินเดือนในหนังสือรับรอง</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {activeTab === 'genders' ? 'ชื่อเพศ' : 'ชื่อหนังสือรับรอง'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={activeTab === 'genders' ? 50 : 255}
                    value={codeNameForm.name}
                    onChange={(e) => setCodeNameForm({ ...codeNameForm, name: e.target.value })}
                    placeholder={activeTab === 'genders' ? 'เช่น ชาย, หญิง, ไม่ระบุ' : 'เช่น หนังสือรับรองการทำงาน'}
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {activeTab === 'banks' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">รหัสธนาคาร <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    value={bankForm.bankCode}
                    onChange={(e) => setBankForm({ ...bankForm, bankCode: e.target.value.toUpperCase() })}
                    placeholder="รหัสมาตรฐาน 3 หลัก เช่น 004 (กสิกรไทย), 014 (ไทยพาณิชย์)"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ชื่อธนาคาร <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    placeholder="เช่น ธนาคารกสิกรไทย"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อย่อ</label>
                    <input
                      type="text"
                      maxLength={20}
                      value={bankForm.shortName}
                      onChange={(e) => setBankForm({ ...bankForm, shortName: e.target.value.toUpperCase() })}
                      placeholder="เช่น KBANK"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">จำนวนหลักเลขบัญชี</label>
                    <input
                      type="number"
                      min={6}
                      max={20}
                      value={bankForm.accountDigits}
                      onChange={(e) => setBankForm({ ...bankForm, accountDigits: e.target.value })}
                      placeholder="เว้นว่าง = ไม่ตรวจ"
                      className={inputClass}
                    />
                  </div>
                </div>

                {modalMode === 'edit' && (
                  <ActiveToggleRow label="เปิดใช้งาน" checked={bankForm.status === 'ACTIVE'} onChange={(v) => setBankForm({ ...bankForm, status: (v ? 'ACTIVE' : 'INACTIVE') })} />
                )}
              </>
            )}
        </Modal>
      )}
    </div>
  );
}

