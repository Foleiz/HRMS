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
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { contractService } from '@/services/contractService';
import { employeeService } from '@/services/employeeService';
import { EmploymentContract, ContractSummaryStats, CreateContractRequest } from '@/types/contract';
import { Employee } from '@/types/employee';
import CreateContractModal from '@/components/contracts/CreateContractModal';
import ContractDetailModal from '@/components/contracts/ContractDetailModal';
import EmployeeTimelineModal from '@/components/contracts/EmployeeTimelineModal';

export default function ContractsPage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();

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
  const [actionMenuOpenId, setActionMenuOpenId] = useState<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Breadcrumbs
  useEffect(() => {
    setBreadcrumb({
      section: 'พนักงาน',
      page: 'สัญญาจ้าง',
    });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Click outside listener for action menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setErrorMessage(err.message || 'ไม่สามารถโหลดข้อมูลสัญญาจ้างได้');
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
    setSuccessMessage('สร้างสัญญาจ้างงานใหม่สำเร็จเรียบร้อย');
    setTimeout(() => setSuccessMessage(null), 4000);
    await fetchData();
  };

  // Handle Terminate Contract
  const handleTerminateContract = async (id: number, reason: string) => {
    await contractService.terminate(id, reason);
    setSuccessMessage('บันทึกสิ้นสุดสัญญาจ้างงานสำเร็จ');
    setTimeout(() => setSuccessMessage(null), 4000);
    await fetchData();
  };

  // Pagination logic
  const totalPages = Math.ceil(contracts.length / pageSize) || 1;
  const paginatedContracts = contracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Sub-Navigation Tabs matching Mockup
  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees' },
    { title: 'ประเภทพนักงาน', href: '/organization' },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/contracts' },
    { title: 'แผนผังองค์กร', href: '/organization' },
    { title: 'สัญญาจ้าง', href: '/employees/contracts', active: true },
  ];

  return (
    <div className="space-y-5 font-sans pb-12">
      {/* 1. Sub-Navigation Tabs ตรงตาม Figma & Mockup */}
      <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl shadow-2xs">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {subNavTabs.map((tab) => (
            <Link
              key={tab.title}
              href={tab.href}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium ${
                tab.active
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.title}
            </Link>
          ))}
        </nav>
      </div>

      {/* 2. Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs shadow-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Header Action Bar */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B2046] hover:bg-[#07152d] text-white text-sm font-medium rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างสัญญาใหม่</span>
        </button>
      </div>

      {/* 4. KPI Stat Cards (3 Cards ตรงตาม Mockup) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: ทดลองงาน */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-1">ทดลองงาน</h4>
            <p className="text-xs text-slate-400">พนักงานที่อยู่ระหว่างทดลองงาน</p>
          </div>
          <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl font-bold text-2xl tracking-tight">
            {stats.probationCount}
          </div>
        </div>

        {/* Card 2: ประจำ */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-1">ประจำ</h4>
            <p className="text-xs text-slate-400">พนักงานประจำที่ได้รับการบรรจุ</p>
          </div>
          <div className="bg-rose-50 text-rose-500 px-4 py-1.5 rounded-xl font-bold text-2xl tracking-tight">
            {stats.permanentCount}
          </div>
        </div>

        {/* Card 3: ใกล้ครบทดลองงาน (7 วัน) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-1">ใกล้ครบทดลองงาน (7 วัน)</h4>
            <p className="text-xs text-slate-400">ต้องประเมินผลการผ่านงานใน 7 วัน</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-xl font-bold text-2xl tracking-tight">
            {stats.probationExpiring7DaysCount}
          </div>
        </div>
      </div>

      {/* 5. Sub-Tabs & Filter / Search Controls */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Tab Header ตรงตาม Mockup */}
        <div className="border-b border-slate-200 px-6 pt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex space-x-8 text-sm font-medium">
            <button
              className="pb-3 border-b-2 border-[#0B2046] text-[#0B2046] font-bold"
            >
              คำขอย้าย/เลื่อนตำแหน่ง
            </button>
          </div>

          {/* Search & Filter Inputs (ข้อเสนอแนะที่ได้รับอนุมัติ) */}
          <div className="flex items-center gap-3 pb-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
              />
            </div>

            <select
              value={selectedContractType}
              onChange={(e) => setSelectedContractType(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
            >
              <option value="ALL">ประเภทสัญญาทั้งหมด</option>
              <option value="PROBATION">ทดลองงาน</option>
              <option value="PERMANENT">ประจำ</option>
              <option value="FIXED_TERM">สัญญาจ้าง</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="ACTIVE">ใช้งาน</option>
              <option value="PENDING_APPROVAL">รออนุมัติ</option>
              <option value="TERMINATED">สิ้นสุดแล้ว</option>
            </select>
          </div>
        </div>

        {/* 6. Contracts Table ตรงตาม Mockup 100% */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-normal">
                <th className="py-3.5 px-6 font-medium">พนักงาน</th>
                <th className="py-3.5 px-6 font-medium">ประเภทสัญญา</th>
                <th className="py-3.5 px-6 font-medium">เริ่มสัญญา</th>
                <th className="py-3.5 px-6 font-medium">สิ้นสุด / ครบทดลองงาน</th>
                <th className="py-3.5 px-6 font-medium">สถานะ</th>
                <th className="py-3.5 px-6 font-medium text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#0B2046]" />
                      <span>กำลังโหลดข้อมูลสัญญาจ้างงาน...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    ไม่พบข้อมูลสัญญาจ้างงาน
                  </td>
                </tr>
              ) : (
                paginatedContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* พนักงาน: อรวรรณ ใจดี · EMP-0142 */}
                    <td className="py-4 px-6 text-slate-800 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/employees/${contract.employeeId}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {contract.employeeName}
                        </Link>
                        <span className="text-slate-400 font-normal">·</span>
                        <span className="text-slate-500 font-normal text-xs">{contract.employeeCode}</span>
                      </div>
                    </td>

                    {/* ประเภทสัญญา: ทดลองงาน, ประจำ, สัญญาจ้าง */}
                    <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                      {contract.contractTypeDisplay}
                    </td>

                    {/* เริ่มสัญญา: 01/07/2569 */}
                    <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                      {contract.startDateDisplay}
                    </td>

                    {/* สิ้นสุด / ครบทดลองงาน: 30/09/2569, - */}
                    <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
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
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          สิ้นสุดแล้ว
                        </span>
                      )}
                    </td>

                    {/* 3-Dots Action Menu (ข้อเสนอแนะที่ได้รับอนุมัติ) */}
                    <td className="py-4 px-6 text-right whitespace-nowrap relative">
                      <div className="inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setActionMenuOpenId(actionMenuOpenId === contract.id ? null : contract.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {actionMenuOpenId === contract.id && (
                          <div
                            ref={actionMenuRef}
                            className="absolute right-6 mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20 animate-in fade-in zoom-in-95 text-left text-xs"
                          >
                            <button
                              onClick={() => {
                                setSelectedTimelineEmployee({
                                  id: contract.employeeId,
                                  name: contract.employeeName,
                                  code: contract.employeeCode,
                                });
                                setIsTimelineModalOpen(true);
                                setActionMenuOpenId(null);
                              }}
                              className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ประวัติรายบุคคล</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedContract(contract);
                                setIsDetailModalOpen(true);
                                setActionMenuOpenId(null);
                              }}
                              className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>ดูรายละเอียด</span>
                            </button>
                            {contract.status === 'ACTIVE' && (
                              <button
                                onClick={() => {
                                  setSelectedContract(contract);
                                  setIsDetailModalOpen(true);
                                  setActionMenuOpenId(null);
                                }}
                                className="w-full px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                              >
                                <X className="w-3.5 h-3.5 text-rose-500" />
                                <span>สิ้นสุดสัญญา</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 7. Pagination Footer ตรงตาม Mockup (< 1 2 3 4 >) */}
        <div className="py-4 px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            แสดง {paginatedContracts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} ถึง{' '}
            {Math.min(currentPage * pageSize, contracts.length)} จาก {contracts.length} รายการ
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                  page === currentPage
                    ? 'bg-[#0B2046] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
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
    </div>
  );
}
