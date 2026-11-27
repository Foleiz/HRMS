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
  Award,
  UserRound,
  Database,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { confirmDelete } from '@/lib/sweetalert';
import { masterDataService } from '@/services/masterDataService';
import { bankService } from '@/services/bankService';
import {
  DocumentTypeItem,
  CreateDocumentTypeRequest,
  NationalityItem,
  CertificateTypeItem,
} from '@/types/master';
import { Bank } from '@/types/api';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import { CodeInput } from '@/components/ui/CodeInput';
import { ActiveToggleRow } from '@/components/ui/ToggleSwitch';
import { Button, RowActions, RowActionButton, ActiveStatus, inputClass, Modal, ModalFooter, TabBar, TablePagination , TableToolbar } from '@/components/ui';
import { TableEmpty } from '@/components/ui/TableState';

type MasterTab =
  | 'document-types'
  | 'certificate-types'
  | 'nationalities'
  | 'banks';

const TAB_NAME_MAP: Record<MasterTab, string> = {
  'document-types': 'ประเภทเอกสารแนบ',
  'certificate-types': 'ประเภทหนังสือรับรอง',
  nationalities: 'สัญชาติ',
  banks: 'ข้อมูลธนาคาร',
};

export default function MasterDataHubPage() {
  const toast = useToast();
  const { user, hasPermission, hasRole } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const searchParams = useSearchParams();

  const isSuper = false;
  const canViewMasterData = hasPermission('MASTER_DATA_VIEW') || isSuper;
  const canCreateMasterData = hasPermission('MASTER_DATA_CREATE') || isSuper;
  const canEditMasterData = hasPermission('MASTER_DATA_EDIT') || isSuper;

  const initialTabParam = searchParams.get('tab') as MasterTab;
  const validTabs: MasterTab[] = ['document-types', 'certificate-types', 'nationalities', 'banks'];
  const initialTab: MasterTab = validTabs.includes(initialTabParam) ? initialTabParam : 'document-types';
  const [activeTab, setActiveTab] = useState<MasterTab>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as MasterTab;
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (tabParam) {
      setActiveTab('document-types');
    }
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  // Data states
  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [nationalities, setNationalities] = useState<NationalityItem[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
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
  // อายุหนังสือรับรอง (เดือน) — เฉพาะแท็บประเภทหนังสือรับรอง
  const [certValidity, setCertValidity] = useState<string>('3');
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
    setBreadcrumb({ section: 'ข้อมูลหลัก', page: TAB_NAME_MAP[activeTab] });
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
      } else if (activeTab === 'banks') {
        const data = await bankService.getAll();
        setBanks(data);
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

  // โหลดข้อมูลทุกแท็บครั้งแรกเบื้องหลัง
  useEffect(() => {
    if (!canViewMasterData) return;
    let cancelled = false;
    Promise.allSettled([
      masterDataService.getDocumentTypes(),
      masterDataService.getNationalities(),
      bankService.getAll(),
      masterDataService.getCertificateTypes(),
    ]).then(([d, n, b, c]) => {
      if (cancelled) return;
      if (d.status === 'fulfilled') setDocTypes(d.value);
      if (n.status === 'fulfilled') setNationalities(n.value);
      if (b.status === 'fulfilled') setBanks(b.value);
      if (c.status === 'fulfilled') setCertTypes(c.value);
    });
    return () => {
      cancelled = true;
    };
  }, [canViewMasterData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    if (activeTab === 'certificate-types') return;
    setModalMode('create');
    setCurrentId(null);
    if (activeTab === 'document-types') {
      setDocForm({ documentCode: '', documentName: '', isExpiryRequired: false, notifyBeforeDays: 30, validityMonths: null, status: 'ACTIVE' });
    } else if (activeTab === 'banks') {
      setBankForm({ bankCode: '', bankName: '', shortName: '', accountDigits: '', status: 'ACTIVE' });
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
    } else if (activeTab === 'certificate-types') {
      setCodeNameForm({ code: item.certificateCode, name: item.certificateName });
      setCertValidity(item.validityMonths ? String(item.validityMonths) : '');
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
      } else if (activeTab === 'certificate-types') {
        if (currentId) {
          await masterDataService.updateCertificateType(currentId, {
            certificateName: codeNameForm.name.trim(),
            validityMonths: certValidity ? Number(certValidity) : null,
          });
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
      } else if (activeTab === 'banks') {
        await bankService.delete(id);
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
  const filteredCertTypes = certTypes.filter(
    (c) => !q || c.certificateCode.toLowerCase().includes(q) || c.certificateName.toLowerCase().includes(q)
  );
  const filteredBanks = banks.filter(
    (b) => !q || b.bankCode.toLowerCase().includes(q) || b.bankName.toLowerCase().includes(q)
  );

  const pagedDocTypes = filteredDocTypes.slice((page - 1) * pageSize, page * pageSize);
  const pagedNationalities = filteredNationalities.slice((page - 1) * pageSize, page * pageSize);
  const pagedCertTypes = filteredCertTypes.slice((page - 1) * pageSize, page * pageSize);
  const pagedBanks = filteredBanks.slice((page - 1) * pageSize, page * pageSize);

  if (!canViewMasterData) {
    return (
      <AccessDenied
        title="คุณไม่มีสิทธิ์เข้าถึงหน้าข้อมูลหลัก"
        message="ขออภัย บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงการจัดการข้อมูลหลัก (Master Data) กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การใช้งาน"
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">


      {/* 2. Main Card Container (มาตรฐานระบบแบบหน้าจัดการฝ่าย) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="space-y-4">
          {/* Toolbar: ค้นหาด้านซ้าย, ปุ่มเพิ่มด้านขวา */}
          <TableToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={`ค้นหา${TAB_NAME_MAP[activeTab] || 'ข้อมูล'}...`}
            pageSizeControl={{
              pageSize,
              onPageSizeChange: (newSize) => {
                setPageSize(newSize);
                setPage(1);
              },
            }}
            actions={
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="p-2 text-slate-600 dark:text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                  title="รีเฟรช"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
                </button>
                {canCreateMasterData && activeTab !== 'certificate-types' && (
                  <Button
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleOpenCreate}
                  >
                    เพิ่มข้อมูลใหม่
                  </Button>
                )}
              </div>
            }
          />

          {/* Tab 1: Document Types Table */}
      {activeTab === 'document-types' && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                  <TableEmpty colSpan={8} text="ไม่พบข้อมูลประเภทเอกสารแนบ" />
                ) : (
                  pagedDocTypes.map((item) => (
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

          {filteredDocTypes.length > 0 && (
            <TablePagination
              total={filteredDocTypes.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              hidePageSizeSelector
            />
          )}
        </>
      )}

      {/* Tab 2: Nationalities Table */}
      {activeTab === 'nationalities' && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                  <TableEmpty colSpan={3} text="ไม่พบข้อมูลสัญชาติ" />
                ) : (
                  pagedNationalities.map((item) => (
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

          {filteredNationalities.length > 0 && (
            <TablePagination
              total={filteredNationalities.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              hidePageSizeSelector
            />
          )}
        </>
      )}

      {/* Tab: Certificate Types */}
      {activeTab === 'certificate-types' && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="table-standard w-full min-w-[500px] text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">รหัสประเภท</th>
                  <th className="py-3 px-4">ชื่อหนังสือรับรอง</th>
                  <th className="py-3 px-4 text-center">อายุหนังสือ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredCertTypes.length === 0 ? (
                  <TableEmpty colSpan={5} text="ไม่พบข้อมูลประเภทหนังสือรับรอง" />
                ) : (
                  pagedCertTypes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{item.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700">
                          {item.certificateCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{item.certificateName}</td>
                      <td className="py-3.5 px-4 text-center text-slate-700 dark:text-slate-300">
                        {item.validityMonths ? `${item.validityMonths} เดือน` : <span className="text-slate-400">ไม่กำหนด</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canEditMasterData ? (
                          <RowActions>
                            <RowActionButton action="edit" onClick={() => handleOpenEdit(item)} />
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

          {filteredCertTypes.length > 0 && (
            <TablePagination
              total={filteredCertTypes.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              hidePageSizeSelector
            />
          )}
        </>
      )}

      {/* Tab 5: Banks Table */}
      {activeTab === 'banks' && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                  <TableEmpty colSpan={7} text="ไม่พบข้อมูลธนาคาร" />
                ) : (
                  pagedBanks.map((item) => (
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

          {filteredBanks.length > 0 && (
            <TablePagination
              total={filteredBanks.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              hidePageSizeSelector
            />
          )}
        </>
      )}

        </div>
      </div>

      {/* Modal Dialog for Create & Edit */}
      {modalOpen && (
        <Modal
          icon={Database}
          isOpen
          size="sm"
          onClose={() => setModalOpen(false)}
          title={modalMode === 'create' ? 'เพิ่มข้อมูลใหม่' : 'แก้ไขข้อมูล'}
          onSubmit={handleSave}
          footer={<ModalFooter onCancel={() => setModalOpen(false)} loading={submitting} submitText="บันทึก" />}
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

            {activeTab === 'certificate-types' && (
              <>
                <div>
                  <CodeInput
                    type="certificate-type"
                    prefix="CERT_"
                    digits={3}
                    existingCodes={certTypes.map((x) => x.certificateCode)}
                    label="รหัสประเภทหนังสือรับรอง"
                    required
                    mode="edit"
                    maxLength={50}
                    value={codeNameForm.code}
                    onChange={(v) => setCodeNameForm((f) => ({ ...f, code: v }))}
                    labelClassName="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    inputClassName="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-blue-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 dark:text-slate-400">รหัสประเภทถูกล็อกตามเทมเพลตเอกสารของระบบ</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อหนังสือรับรอง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={255}
                    value={codeNameForm.name}
                    onChange={(e) => setCodeNameForm({ ...codeNameForm, name: e.target.value })}
                    placeholder="เช่น หนังสือรับรองการทำงาน"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="cert-validity" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    อายุหนังสือรับรอง (เดือน)
                  </label>
                  <input
                    id="cert-validity"
                    type="number"
                    min={1}
                    max={24}
                    value={certValidity}
                    onChange={(e) => setCertValidity(e.target.value)}
                    placeholder="เว้นว่าง = ไม่กำหนดวันหมดอายุ"
                    className={inputClass}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 dark:text-slate-400">
                    นับจากวันที่ออกหนังสือ (วันที่อนุมัติ) และพิมพ์ "ใช้ได้ถึงวันที่" ในหนังสือให้อัตโนมัติ
                  </p>
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

