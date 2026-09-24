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
} from '@/types/master';
import { Bank } from '@/types/api';

type MasterTab = 'document-types' | 'nationalities' | 'religions' | 'marital-statuses' | 'banks';

export default function MasterDataHubPage() {
  const toast = useToast();
  const { setBreadcrumb } = useBreadcrumb();
  const searchParams = useSearchParams();

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
  const [bankForm, setBankForm] = useState<{ bankCode: string; bankName: string; status: 'ACTIVE' | 'INACTIVE' }>({
    bankCode: '',
    bankName: '',
    status: 'ACTIVE',
  });

  // Sync breadcrumb
  useEffect(() => {
    const tabNameMap: Record<MasterTab, string> = {
      'document-types': 'ประเภทเอกสารแนบ',
      nationalities: 'สัญชาติ',
      religions: 'ศาสนา',
      'marital-statuses': 'สถานภาพสมรส',
      banks: 'ข้อมูลธนาคาร',
    };
    setBreadcrumb({ section: 'Master Data', page: tabNameMap[activeTab] });
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
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถโหลดข้อมูล Master Data ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSearchQuery('');
  }, [activeTab]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentId(null);
    if (activeTab === 'document-types') {
      setDocForm({ documentCode: '', documentName: '', isExpiryRequired: false, status: 'ACTIVE' });
    } else if (activeTab === 'banks') {
      setBankForm({ bankCode: '', bankName: '', status: 'ACTIVE' });
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
        status: item.status,
      });
    } else if (activeTab === 'nationalities') {
      setSimpleNameInput(item.nationalityName);
    } else if (activeTab === 'religions') {
      setSimpleNameInput(item.religionName);
    } else if (activeTab === 'marital-statuses') {
      setSimpleNameInput(item.maritalStatusName);
    } else if (activeTab === 'banks') {
      setBankForm({
        bankCode: item.bankCode,
        bankName: item.bankName,
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
      } else if (activeTab === 'banks') {
        if (modalMode === 'create') {
          await bankService.create(bankForm);
          toast.success('เพิ่มธนาคารสำเร็จ');
        } else if (currentId) {
          await bankService.update(currentId, { bankName: bankForm.bankName, status: bankForm.status });
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
  const filteredBanks = banks.filter(
    (b) => !q || b.bankCode.toLowerCase().includes(q) || b.bankName.toLowerCase().includes(q)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">การจัดการข้อมูล Master Data</h1>
          <p className="text-xs text-slate-500 mt-1">
            ศูนย์กลางการกำหนดค่าตัวเลือกอ้างอิงและประเภทเอกสารประกอบในระบบ HRMS
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0B2046]' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มข้อมูลใหม่
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('document-types')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'document-types'
              ? 'bg-[#0B2046] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <FileText className="w-4 h-4" />
          ประเภทเอกสารแนบ ({docTypes.length})
        </button>

        <button
          onClick={() => setActiveTab('nationalities')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'nationalities'
              ? 'bg-[#0B2046] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <Globe className="w-4 h-4" />
          สัญชาติ ({nationalities.length})
        </button>

        <button
          onClick={() => setActiveTab('religions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'religions'
              ? 'bg-[#0B2046] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <Heart className="w-4 h-4" />
          ศาสนา ({religions.length})
        </button>

        <button
          onClick={() => setActiveTab('marital-statuses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'marital-statuses'
              ? 'bg-[#0B2046] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <Users2 className="w-4 h-4" />
          สถานภาพสมรส ({maritalStatuses.length})
        </button>

        <button
          onClick={() => setActiveTab('banks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'banks'
              ? 'bg-[#0B2046] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <Landmark className="w-4 h-4" />
          ธนาคาร ({banks.length})
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="พิมพ์คำค้นหา..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] shadow-2xs"
        />
      </div>

      {/* Tab 1: Document Types Table */}
      {activeTab === 'document-types' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-16">ID</th>
                  <th className="py-3 px-4">รหัสประเภทเอกสาร</th>
                  <th className="py-3 px-4">ชื่อประเภทเอกสาร</th>
                  <th className="py-3 px-4 text-center">ต้องระบุวันหมดอายุ</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      ไม่พบข้อมูลประเภทเอกสารแนบ
                    </td>
                  </tr>
                ) : (
                  filteredDocTypes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">{item.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.documentCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{item.documentName}</td>
                      <td className="py-3.5 px-4 text-center">
                        {item.isExpiryRequired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            ต้องระบุวันหมดอายุ
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {item.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.documentName)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">ชื่อสัญชาติ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNationalities.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      ไม่พบข้อมูลสัญชาติ
                    </td>
                  </tr>
                ) : (
                  filteredNationalities.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">{item.id}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{item.nationalityName}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.nationalityName)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">ชื่อศาสนา</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReligions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      ไม่พบข้อมูลศาสนา
                    </td>
                  </tr>
                ) : (
                  filteredReligions.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">{item.id}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{item.religionName}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.religionName)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">ชื่อสถานภาพสมรส</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaritalStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      ไม่พบข้อมูลสถานภาพสมรส
                    </td>
                  </tr>
                ) : (
                  filteredMaritalStatuses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">{item.id}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{item.maritalStatusName}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.maritalStatusName)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">รหัสธนาคาร</th>
                  <th className="py-3 px-4">ชื่อธนาคาร</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBanks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      ไม่พบข้อมูลธนาคาร
                    </td>
                  </tr>
                ) : (
                  filteredBanks.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">{item.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.bankCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{item.bankName}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {item.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.bankName)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {modalMode === 'create' ? 'เพิ่มข้อมูลใหม่' : 'แก้ไขข้อมูล'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              {activeTab === 'document-types' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      รหัสประเภทเอกสาร (Document Code) *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={modalMode === 'edit'}
                      value={docForm.documentCode}
                      onChange={(e) => setDocForm({ ...docForm, documentCode: e.target.value.toUpperCase() })}
                      placeholder="เช่น DOC_PASSPORT, DOC_CERT"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อประเภทเอกสาร (Document Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={docForm.documentName}
                      onChange={(e) => setDocForm({ ...docForm, documentName: e.target.value })}
                      placeholder="เช่น หนังสือเดินทาง (Passport)"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <input
                      type="checkbox"
                      id="isExpiryRequired"
                      checked={docForm.isExpiryRequired}
                      onChange={(e) => setDocForm({ ...docForm, isExpiryRequired: e.target.checked })}
                      className="w-4 h-4 rounded text-[#0B2046] focus:ring-[#0B2046]"
                    />
                    <label htmlFor="isExpiryRequired" className="text-xs text-slate-700 cursor-pointer select-none">
                      เอกสารนี้ต้องระบุวันหมดอายุ (Expiry Date Required)
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                    <select
                      value={docForm.status}
                      onChange={(e) => setDocForm({ ...docForm, status: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                    >
                      <option value="ACTIVE">เปิดใช้งาน</option>
                      <option value="INACTIVE">ปิดใช้งาน</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'nationalities' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อสัญชาติ *</label>
                  <input
                    type="text"
                    required
                    value={simpleNameInput}
                    onChange={(e) => setSimpleNameInput(e.target.value)}
                    placeholder="เช่น ไทย, ญี่ปุ่น, อเมริกัน..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                </div>
              )}

              {activeTab === 'religions' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อศาสนา *</label>
                  <input
                    type="text"
                    required
                    value={simpleNameInput}
                    onChange={(e) => setSimpleNameInput(e.target.value)}
                    placeholder="เช่น พุทธ, คริสต์, อิสลาม..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                </div>
              )}

              {activeTab === 'marital-statuses' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อสถานภาพสมรส *</label>
                  <input
                    type="text"
                    required
                    value={simpleNameInput}
                    onChange={(e) => setSimpleNameInput(e.target.value)}
                    placeholder="เช่น โสด, สมรส, หย่าร้าง..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                </div>
              )}

              {activeTab === 'banks' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสธนาคาร *</label>
                    <input
                      type="text"
                      required
                      disabled={modalMode === 'edit'}
                      value={bankForm.bankCode}
                      onChange={(e) => setBankForm({ ...bankForm, bankCode: e.target.value.toUpperCase() })}
                      placeholder="เช่น KBANK, SCB, BBL"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อธนาคาร *</label>
                    <input
                      type="text"
                      required
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                      placeholder="เช่น ธนาคารกสิกรไทย"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                    <select
                      value={bankForm.status}
                      onChange={(e) => setBankForm({ ...bankForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                    >
                      <option value="ACTIVE">เปิดใช้งาน</option>
                      <option value="INACTIVE">ปิดใช้งาน</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
