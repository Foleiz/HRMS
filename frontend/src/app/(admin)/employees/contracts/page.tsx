'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Eye,
  Trash2,
  Clock,
  Briefcase,
  Layers,
  X,
  Loader2,
  Paperclip,
  Download,
  Upload,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { contractService } from '@/services/contractService';
import { employeeService } from '@/services/employeeService';
import { EmploymentContract, ContractSummaryStats, CreateContractRequest } from '@/types/contract';
import { Employee } from '@/types/employee';
import CreateContractModal from '@/components/contracts/CreateContractModal';
import ContractDetailModal from '@/components/contracts/ContractDetailModal';
import EmployeeTimelineModal from '@/components/contracts/EmployeeTimelineModal';
import AttachContractModal from '@/components/contracts/AttachContractModal';
import ContractDocumentPreviewModal from '@/components/contracts/ContractDocumentPreviewModal';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { Button, TabBar } from '@/components/ui';

import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/common/AccessDenied';

export default function ContractsPage() {
  const router = useRouter();
  const { hasPermission, hasRole } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();

  // Data States
  const [contracts, setContracts] = useState<EmploymentContract[]>([]);
  const [stats, setStats] = useState<ContractSummaryStats>({
    probationCount: 0,
    permanentCount: 0,
    probationExpiring7DaysCount: 0,
    totalActiveCount: 0,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContractType, setSelectedContractType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'requests'>('requests');

  // Modals & Actions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<EmploymentContract | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedTimelineEmployee, setSelectedTimelineEmployee] = useState<{
    id: number;
    name: string;
    code: string;
  } | null>(null);

  // Document Attach & Preview Modals
  const [selectedContractForAttach, setSelectedContractForAttach] = useState<EmploymentContract | null>(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [selectedContractForDocPreview, setSelectedContractForDocPreview] = useState<EmploymentContract | null>(null);
  const [isDocPreviewModalOpen, setIsDocPreviewModalOpen] = useState(false);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Breadcrumbs
  useEffect(() => {
    setBreadcrumb({
      section: 'พนักงาน',
      page: 'สัญญาจ้าง',
    });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, statsData, employeesData] = await Promise.all([
        contractService.getAll({
          search: searchTerm || undefined,
          contractType: selectedContractType !== 'ALL' ? selectedContractType : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        }),
        contractService.getStats(),
        employeeService.getAll(),
      ]);

      setContracts(contractsData);
      setStats(statsData);
      setEmployees(employeesData);
    } catch (err: any) {
      console.error('Failed to load contracts data:', err);
      toast.error(err.message || 'ไม่สามารถโหลดข้อมูลสัญญาจ้างได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, selectedContractType, selectedStatus]);

  // Handle Create Contract
  const handleCreateContract = async (payload: CreateContractRequest) => {
    await contractService.create(payload);
    toast.success('สร้างสัญญาจ้างงานใหม่สำเร็จเรียบร้อย');
    await fetchData();
  };

  // Handle Terminate Contract
  const handleTerminateContract = async (id: number, reason: string) => {
    await contractService.terminate(id, reason);
    toast.success('บันทึกสิ้นสุดสัญญาจ้างงานสำเร็จ');
    await fetchData();
  };

  // Pagination logic
  const totalPages = Math.ceil(contracts.length / pageSize) || 1;
  const paginatedContracts = contracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canViewProfile = hasPermission('EMP_PROFILE_VIEW') || isSuper;
  const canViewTypes = hasPermission('EMP_TYPE_VIEW') || isSuper;
  const canViewTransfers = hasPermission('EMP_TRANSFER_VIEW') || isSuper;
  const canViewContracts = hasPermission('EMP_CONTRACT_VIEW') || isSuper;
  const canViewDocs = hasPermission('EMP_DOC_VIEW') || isSuper;

  const canCreateContracts = hasPermission('EMP_CONTRACT_CREATE') || hasPermission('EMP_MANAGE') || isSuper;
  const canEditContracts = hasPermission('EMP_CONTRACT_EDIT') || hasPermission('EMP_MANAGE') || isSuper;

  // Sub-Navigation Tabs matching Mockup
  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', show: canViewProfile },
    { title: 'ประเภทพนักงาน', href: '/employees/types', show: canViewTypes },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/transfers', show: canViewTransfers },
    { title: 'สัญญาจ้าง', href: '/employees/contracts', active: true, show: canViewContracts },
    { title: 'เอกสารใกล้หมดอายุ', href: '/employees/documents', show: canViewDocs },
  ].filter((t) => t.show);

  if (!canViewContracts) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์ดูข้อมูลสัญญาจ้าง"
        message="ขออภัย บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงหรือดูข้อมูลสัญญาจ้างงาน กรุณาติดต่อผู้ดูแลระบบ"
      />
    );
  }

  return (
    <div className="space-y-5 font-sans pb-12">
      {/* 1. Sub-Navigation Tabs ตรงตาม Figma & Mockup */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl shadow-2xs">
        <TabBar
          aria-label="เมนูพนักงาน"
          memoryKey="employees-subnav"
          items={subNavTabs.map((t) => ({ key: t.href, label: t.title, href: t.href }))}
          activeKey={subNavTabs.find((t) => t.active)?.href}
        />
      </div>



      {/* 4. KPI Stat Cards (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: ทดลองงาน */}
        <div className="bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-sky-800 dark:text-sky-300 mb-1">ทดลองงาน</h4>
            <p className="text-xs text-sky-700/80 dark:text-sky-400">พนักงานที่อยู่ระหว่างทดลองงาน</p>
          </div>
          <div className="bg-white dark:bg-sky-900/60 shadow-xs border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-200 px-4 py-1.5 rounded-xl font-black text-2xl tracking-tight">
            {stats.probationCount}
          </div>
        </div>

        {/* Card 2: ประจำ */}
        <div className="bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-1">ประจำ</h4>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400">พนักงานประจำที่ได้รับการบรรจุ</p>
          </div>
          <div className="bg-white dark:bg-emerald-900/60 shadow-xs border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-200 px-4 py-1.5 rounded-xl font-black text-2xl tracking-tight">
            {stats.permanentCount}
          </div>
        </div>

        {/* Card 3: ใกล้ครบทดลองงาน (7 วัน) */}
        <div className="bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">ใกล้ครบทดลองงาน (7 วัน)</h4>
            <p className="text-xs text-amber-700/80 dark:text-amber-400">ต้องประเมินผลการผ่านงานใน 7 วัน</p>
          </div>
          <div className="bg-white dark:bg-amber-900/60 shadow-xs border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-200 px-4 py-1.5 rounded-xl font-black text-2xl tracking-tight">
            {stats.probationExpiring7DaysCount}
          </div>
        </div>
      </div>

      {/* 5. Main Card Container with Filters & Table (มาตรฐานระบบแบบหน้าจัดการฝ่าย) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="space-y-4">
          {/* Toolbar: ค้นหา & ฟิลเตอร์ด้านซ้าย, ปุ่มเพิ่มด้านขวา */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              {/* Search Input มาตรฐานระบบ */}
              <div className="relative max-w-sm w-full shrink-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
                  className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20 dark:focus:border-blue-500 transition-all"
                />
              </div>

              <CustomSelect
                value={selectedContractType}
                onChange={(val) => setSelectedContractType(String(val))}
                placeholder="ประเภทสัญญาทั้งหมด"
                className="min-w-[170px]"
                options={[
                  { value: 'ALL', label: 'ประเภทสัญญาทั้งหมด' },
                  { value: 'PROBATION', label: 'ทดลองงาน' },
                  { value: 'PERMANENT', label: 'ประจำ' },
                  { value: 'FIXED_TERM', label: 'สัญญาจ้าง' },
                  { value: 'OTHER', label: 'อื่นๆ / ฝึกงาน' },
                ]}
              />

              <CustomSelect
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(String(val))}
                placeholder="สถานะทั้งหมด"
                className="min-w-[150px]"
                options={[
                  { value: 'ALL', label: 'สถานะทั้งหมด' },
                  { value: 'ACTIVE', label: 'ใช้งาน' },
                  { value: 'PENDING_APPROVAL', label: 'รออนุมัติ' },
                  { value: 'TERMINATED', label: 'สิ้นสุดแล้ว' },
                ]}
              />
            </div>

            {canCreateContracts && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
                className="shrink-0 self-start sm:self-auto"
              >
                สร้างสัญญาใหม่
              </Button>
            )}
          </div>

          {/* Contracts Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="table-standard w-full min-w-[850px] text-left border-collapse text-xs whitespace-nowrap">
              <thead className="bg-primary text-white font-semibold">
                <tr className="whitespace-nowrap">
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">พนักงาน</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">ประเภทสัญญา</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">เริ่มสัญญา</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">สิ้นสุด / ครบทดลองงาน</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">สถานะ</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">เอกสารสัญญา</th>
                <th className="py-3.5 px-6 font-medium text-right whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span>กำลังโหลดข้อมูลสัญญาจ้างงาน...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    ไม่พบข้อมูลสัญญาจ้างงาน
                  </td>
                </tr>
              ) : (
                paginatedContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* พนักงาน: อรวรรณ ใจดี · EMP-0142 */}
                    <td className="py-4 px-6 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/employees/${contract.employeeId}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {contract.employeeName}
                        </Link>
                        <span className="text-slate-400 dark:text-slate-500 font-normal">·</span>
                        <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">{contract.employeeCode}</span>
                      </div>
                    </td>

                    {/* ประเภทสัญญา: ทดลองงาน, ประจำ, สัญญาจ้าง, ฝึกงาน */}
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {contract.employeeTypeName || contract.contractTypeDisplay}
                    </td>

                    {/* เริ่มสัญญา: 01/07/2569 */}
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {contract.startDateDisplay}
                    </td>

                    {/* สิ้นสุด / ครบทดลองงาน: 30/09/2569, - */}
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {contract.effectiveEndDateDisplay || '-'}
                    </td>

                    {/* สถานะ: • ใช้งาน (เขียว), • สิ้นสุดแล้ว (เทา), • รออนุมัติ (ส้ม) */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {contract.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          ใช้งาน
                        </span>
                      ) : contract.status === 'PENDING_APPROVAL' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          รออนุมัติ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          สิ้นสุดแล้ว
                        </span>
                      )}
                    </td>

                    {/* เอกสารสัญญา: แนบไฟล์แล้ว (ดูตัวอย่าง 1-Click) หรือ ยังไม่แนบ (+ แนบเอกสาร) */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {contract.hasDocument ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedContractForDocPreview(contract);
                            setIsDocPreviewModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer group shadow-2xs"
                          title={contract.documentFileName ? `คลิกเพื่อดูเอกสาร: ${contract.documentFileName}` : 'ดูเอกสารสัญญา'}
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{contract.documentFileName || 'ดูเอกสารสัญญา'}</span>
                          <Eye className="w-3 h-3 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedContractForAttach(contract);
                            setIsAttachModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
                          title={`แนบเอกสารสัญญาจ้างสำหรับ ${contract.employeeName}`}
                        >
                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          <span>แนบเอกสาร</span>
                        </button>
                      )}
                    </td>

                    {/* 3-Dots Action Menu */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <ActionDropdown
                        menuClassName="w-44"
                        items={[
                          {
                            label: 'ประวัติรายบุคคล',
                            icon: <Clock className="w-3.5 h-3.5 text-emerald-600" />,
                            onClick: () => {
                              setSelectedTimelineEmployee({
                                id: contract.employeeId,
                                name: contract.employeeName,
                                code: contract.employeeCode,
                              });
                              setIsTimelineModalOpen(true);
                            },
                          },
                          {
                            label: 'ดูรายละเอียด',
                            icon: <Eye className="w-3.5 h-3.5 text-blue-600" />,
                            onClick: () => {
                              setSelectedContract(contract);
                              setIsDetailModalOpen(true);
                            },
                          },
                          ...(canEditContracts
                            ? [
                                {
                                  label: contract.hasDocument ? 'เปลี่ยนเอกสารสัญญา' : 'แนบเอกสารสัญญา',
                                  icon: <Paperclip className="w-3.5 h-3.5 text-indigo-600" />,
                                  onClick: () => {
                                    setSelectedContractForAttach(contract);
                                    setIsAttachModalOpen(true);
                                  },
                                },
                              ]
                            : []),
                          ...(contract.hasDocument
                            ? [
                                {
                                  label: 'ดูเอกสารสัญญา',
                                  icon: <FileText className="w-3.5 h-3.5 text-blue-600" />,
                                  onClick: () => {
                                    setSelectedContractForDocPreview(contract);
                                    setIsDocPreviewModalOpen(true);
                                  },
                                },
                                {
                                  label: 'ดาวน์โหลดเอกสาร',
                                  icon: <Download className="w-3.5 h-3.5 text-emerald-600" />,
                                  onClick: async () => {
                                    try {
                                      const res = await contractService.getDocumentBlob(contract.id, false);
                                      const url = URL.createObjectURL(res.blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = contract.documentFileName || res.fileName;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                      toast.success('เริ่มดาวน์โหลดเอกสารสัญญา');
                                    } catch {
                                      toast.error('ไม่สามารถดาวน์โหลดเอกสารได้');
                                    }
                                  },
                                },
                              ]
                            : []),
                          ...(contract.status === 'ACTIVE' && canEditContracts
                            ? [
                                {
                                  label: 'สิ้นสุดสัญญา',
                                  icon: <X className="w-3.5 h-3.5 text-rose-500" />,
                                  danger: true,
                                  onClick: () => {
                                    setSelectedContract(contract);
                                    setIsDetailModalOpen(true);
                                  },
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

        </div>

          {/* Table Footer with TablePagination มาตรฐานระบบ */}
          {contracts.length > 0 && (
            <TablePagination
              total={contracts.length}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* 8. Modals */}
      <CreateContractModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateContract}
        employees={employees}
      />

      <ContractDetailModal
        contract={selectedContract}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedContract(null);
        }}
        onTerminate={handleTerminateContract}
        onUpdateContract={(updated) => {
          setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedContract(updated);
        }}
      />

      <EmployeeTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => {
          setIsTimelineModalOpen(false);
          setSelectedTimelineEmployee(null);
        }}
        employeeId={selectedTimelineEmployee?.id ?? null}
        employeeName={selectedTimelineEmployee?.name ?? ''}
        employeeCode={selectedTimelineEmployee?.code ?? ''}
      />

      {/* 9. แนบเอกสารสัญญาจ้างงานรายบุคคล */}
      <AttachContractModal
        contract={selectedContractForAttach}
        isOpen={isAttachModalOpen}
        onClose={() => {
          setIsAttachModalOpen(false);
          setSelectedContractForAttach(null);
        }}
        onSuccess={(updated) => {
          setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          fetchData();
        }}
      />

      {/* 10. ดูตัวอย่างเอกสารสัญญาจ้างงาน */}
      <ContractDocumentPreviewModal
        contractId={selectedContractForDocPreview?.id ?? null}
        fileName={selectedContractForDocPreview?.documentFileName}
        isOpen={isDocPreviewModalOpen}
        onClose={() => {
          setIsDocPreviewModalOpen(false);
          setSelectedContractForDocPreview(null);
        }}
      />
    </div>
  );
}
