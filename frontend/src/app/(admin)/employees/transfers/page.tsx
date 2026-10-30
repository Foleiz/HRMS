'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  FileText,
  Download,
  Calendar,
} from 'lucide-react';
import { transferService } from '@/services/transferService';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button, TabBar } from '@/components/ui';
import { showError } from '@/lib/sweetalert';
import { EmployeeTransfer, TransferSummaryStats } from '@/types/transfer';
import CreateTransferModal from '@/components/transfers/CreateTransferModal';
import EmployeeTimelineModal from '@/components/contracts/EmployeeTimelineModal';

import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { AccessDenied } from '@/components/common/AccessDenied';

export default function TransfersPage() {
  const { hasPermission, hasRole } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'พนักงาน', page: 'การโอนย้ายพนักงาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Stats & List State
  const [stats, setStats] = useState<TransferSummaryStats>({
    pendingRequestsCount: 0,
    transfersThisMonthCount: 0,
    promotionsThisMonthCount: 0,
  });
  const [transfers, setTransfers] = useState<EmployeeTransfer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState<boolean>(false);
  const [selectedTimelineEmployee, setSelectedTimelineEmployee] = useState<{
    id: number | null;
    name: string;
    code: string;
  }>({ id: null, name: '', code: '' });

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, transfersData] = await Promise.all([
        transferService.getStats(),
        transferService.getAll(),
      ]);
      setStats(statsData);
      setTransfers(transfersData || []);
    } catch (err: any) {
      console.error('Failed to load transfers:', err);
      setError(err.response?.data?.message || err.message || 'ไม่สามารถโหลดข้อมูลการโยกย้ายได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (transfer: EmployeeTransfer) => {
    try {
      await transferService.downloadDocument(transfer.id, transfer.documentName);
    } catch (err: any) {
      console.error('Failed to download transfer document:', err);
      showError('ไม่สามารถดาวน์โหลดได้', err.response?.data?.message || 'ไม่พบไฟล์เอกสารหรือเกิดข้อผิดพลาดในการดาวน์โหลด');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((item) => {
      const matchSearch =
        !searchTerm ||
        (item.employeeName && item.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.employeeCode && item.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.orderNo && item.orderNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.fromPositionName && item.fromPositionName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.fromDepartmentName && item.fromDepartmentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.toPositionName && item.toPositionName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.toDepartmentName && item.toDepartmentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.fromDisplay && item.fromDisplay.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.toDisplay && item.toDisplay.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType =
        selectedType === 'ALL' || item.transferType === selectedType;

      return matchSearch && matchType;
    });
  }, [transfers, searchTerm, selectedType]);

  // Pagination slice
  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransfers.slice(start, start + pageSize);
  }, [filteredTransfers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTransfers.length / pageSize) || 1;

  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canViewProfile = hasPermission('EMP_PROFILE_VIEW') || isSuper;
  const canViewTypes = hasPermission('EMP_TYPE_VIEW') || isSuper;
  const canViewTransfers = hasPermission('EMP_TRANSFER_VIEW') || isSuper;
  const canViewContracts = hasPermission('EMP_CONTRACT_VIEW') || isSuper;
  const canViewDocs = hasPermission('EMP_DOC_VIEW') || isSuper;

  const canCreateTransfers = hasPermission('EMP_TRANSFER_CREATE') || hasPermission('EMP_MANAGE') || isSuper;

  // Sub-Navigation Tabs
  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', show: canViewProfile },
    { title: 'ประเภทพนักงาน', href: '/employees/types', show: canViewTypes },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/transfers', active: true, show: canViewTransfers },
    { title: 'สัญญาจ้าง', href: '/employees/contracts', show: canViewContracts },
    { title: 'เอกสารใกล้หมดอายุ', href: '/employees/documents', show: canViewDocs },
  ].filter((t) => t.show);

  if (!canViewTransfers) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์ดูการโอนย้าย/ปรับตำแหน่ง"
        message="ขออภัย บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงหรือดูข้อมูลการโอนย้ายและปรับตำแหน่ง กรุณาติดต่อผู้ดูแลระบบ"
      />
    );
  }

  return (
    <div className="space-y-5 font-sans pb-12">
      {/* 1. Sub-Navigation Tabs ตรงตาม Design System */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl shadow-2xs">
        <TabBar
          aria-label="เมนูพนักงาน"
          memoryKey="employees-subnav"
          items={subNavTabs.map((t) => ({ key: t.href, label: t.title, href: t.href }))}
          activeKey={subNavTabs.find((t) => t.active)?.href}
        />
      </div>

      {/* 2. Top Section: 3 Stat KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: ประวัติการโยกย้ายทั้งหมด */}
        <div className="bg-slate-100 dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-300 dark:border-slate-700 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div>
            <div className="text-slate-700 dark:text-slate-300 font-bold text-sm">
              ประวัติการโยกย้ายทั้งหมด
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-xs mt-1">บันทึกทั้งหมดในระบบ</div>
          </div>
          <div className="bg-white dark:bg-slate-700/80 shadow-xs border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 text-3xl font-black px-5 py-2 rounded-xl min-w-[56px] text-center">
            {transfers.length}
          </div>
        </div>

        {/* Card 2: ย้ายแผนกเดือนนี้ */}
        <div className="bg-amber-100 dark:bg-amber-950/60 rounded-2xl p-6 border border-amber-300 dark:border-amber-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div>
            <div className="text-amber-800 dark:text-amber-300 font-bold text-sm">
              ย้ายแผนกเดือนนี้
            </div>
            <div className="text-amber-700/80 dark:text-amber-400 text-xs mt-1">สับเปลี่ยนสังกัด/ฝ่าย</div>
          </div>
          <div className="bg-white dark:bg-amber-900/60 shadow-xs border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-200 text-3xl font-black px-5 py-2 rounded-xl min-w-[56px] text-center">
            {stats.transfersThisMonthCount}
          </div>
        </div>

        {/* Card 3: เลื่อนตำแหน่งเดือนนี้ */}
        <div className="bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl p-6 border border-emerald-300 dark:border-emerald-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <div>
            <div className="text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              เลื่อนตำแหน่งเดือนนี้
            </div>
            <div className="text-emerald-700/80 dark:text-emerald-400 text-xs mt-1">ปรับระดับ/ตำแหน่งใหม่</div>
          </div>
          <div className="bg-white dark:bg-emerald-900/60 shadow-xs border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-200 text-3xl font-black px-5 py-2 rounded-xl min-w-[56px] text-center">
            {stats.promotionsThisMonthCount}
          </div>
        </div>
      </div>

      {/* 3. Table Container: ตารางประวัติรายบุคคล/การโยกย้ายตำแหน่ง (มาตรฐานระบบแบบหน้าจัดการฝ่าย) */}
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง หรือเลขที่คำสั่ง..."
                  className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20 dark:focus:border-blue-500 transition-all"
                />
              </div>

              <CustomSelect
                value={selectedType}
                onChange={(val) => {
                  setSelectedType(String(val));
                  setCurrentPage(1);
                }}
                placeholder="ประเภททั้งหมด"
                className="min-w-[170px]"
                options={[
                  { value: 'ALL', label: 'ประเภททั้งหมด' },
                  { value: 'DEPARTMENT_TRANSFER', label: 'ย้ายแผนก' },
                  { value: 'PROMOTION', label: 'เลื่อนตำแหน่ง' },
                  { value: 'TRANSFER_AND_PROMOTION', label: 'โอนย้ายและเลื่อนตำแหน่ง' },
                  { value: 'PROMOTION_AND_SUPERVISOR', label: 'เลื่อนตำแหน่ง + เปลี่ยนหัวหน้างาน' },
                ]}
              />
            </div>

            {canCreateTransfers && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
                className="shrink-0 self-start sm:self-auto"
              >
                บันทึกคำสั่งแต่งตั้ง/โยกย้าย
              </Button>
            )}
          </div>

          {/* TABLE: เอาไว้ดูว่ามีใครย้ายตำแหน่งไหนไปไหนวันที่เท่าไหร่ */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="table-standard w-full min-w-[850px] text-left border-collapse text-xs whitespace-nowrap">
              <thead className="bg-primary text-white font-semibold">
                <tr className="whitespace-nowrap">
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">วันที่มีผล</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">พนักงาน</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">จากตำแหน่ง / แผนกเดิม</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">ไปยังตำแหน่ง / แผนกใหม่</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">ประเภทการปรับเปลี่ยน</th>
                <th className="py-3.5 px-6 font-medium whitespace-nowrap">เลขที่คำสั่ง / เอกสาร</th>
                <th className="py-3.5 px-6 font-medium text-right whitespace-nowrap">ไทม์ไลน์การทำงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-blue-400" />
                      <span>กำลังโหลดประวัติการโยกย้ายตำแหน่ง...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    ไม่พบข้อมูลประวัติการโยกย้ายตำแหน่ง
                  </td>
                </tr>
              ) : (
                paginatedTransfers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* วันที่มีผล */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{item.effectiveDateDisplay}</span>
                      </div>
                    </td>

                    {/* พนักงาน (มีใคร) */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600">
                          {item.employeeName?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTimelineEmployee({
                                id: item.employeeId,
                                name: item.employeeName,
                                code: item.employeeCode,
                              });
                              setIsTimelineModalOpen(true);
                            }}
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer text-left block"
                          >
                            {item.employeeName}
                          </button>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            รหัส: {item.employeeCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* จากตำแหน่ง/แผนกเดิม (ย้ายตำแหน่งไหน) */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {item.fromPositionName || item.fromDisplay || 'ไม่ระบุ'}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span>{item.fromDepartmentName || '-'}</span>
                        </p>
                      </div>
                    </td>

                    {/* ไปยังตำแหน่ง/แผนกใหม่ (ไปไหน) */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-blue-700 dark:text-blue-400">
                          {item.toPositionName || item.toDisplay || 'ไม่ระบุ'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{item.toDepartmentName || '-'}</span>
                        </p>
                      </div>
                    </td>

                    {/* ประเภทการปรับเปลี่ยน */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {item.transferType === 'DEPARTMENT_TRANSFER' ? (
                        <span className="bg-[#fef3c7] dark:bg-amber-950/40 text-[#92400e] dark:text-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-md inline-block border border-amber-200 dark:border-amber-800">
                          {item.transferTypeDisplay}
                        </span>
                      ) : item.transferType === 'PROMOTION' ? (
                        <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold px-2.5 py-1 rounded-md inline-block border border-emerald-200 dark:border-emerald-800">
                          {item.transferTypeDisplay}
                        </span>
                      ) : (
                        <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[11px] font-semibold px-2.5 py-1 rounded-md inline-block border border-blue-200 dark:border-blue-800">
                          {item.transferTypeDisplay}
                        </span>
                      )}
                    </td>

                    {/* เลขที่คำสั่ง / เอกสาร */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="space-y-1">
                        {item.orderNo ? (
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                            {item.orderNo}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 block">-</span>
                        )}
                        {item.hasDocument && (
                          <div>
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(item)}
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium bg-blue-50/70 dark:bg-blue-900/20 hover:bg-blue-100/70 px-2 py-0.5 rounded-md transition-colors"
                              title={item.documentName || 'ดาวน์โหลดเอกสารคำสั่ง'}
                            >
                              <FileText className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="max-w-[130px] truncate">{item.documentName || 'เอกสารคำสั่ง'}</span>
                              <Download className="w-2.5 h-2.5 text-blue-500 shrink-0 ml-0.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* ไทม์ไลน์การทำงาน / การจัดการ */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedTimelineEmployee({
                            id: item.employeeId,
                            name: item.employeeName,
                            code: item.employeeCode,
                          });
                          setIsTimelineModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 rounded-lg transition-all font-medium text-xs cursor-pointer shadow-2xs"
                        title="ดูประวัติการทำงานและสายอาชีพรายบุคคล"
                      >
                        <Clock className="w-3.5 h-3.5 text-emerald-600 hover:text-white" />
                        <span>ประวัติรายบุคคล</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

          {/* Table Footer with TablePagination มาตรฐานระบบ */}
          {filteredTransfers.length > 0 && (
            <TablePagination
              total={filteredTransfers.length}
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

      {/* 7. Create Transfer Modal */}
      <CreateTransferModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchData}
      />

      {/* 8. Career & Assignment Timeline Modal */}
      <EmployeeTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        employeeId={selectedTimelineEmployee.id}
        employeeName={selectedTimelineEmployee.name}
        employeeCode={selectedTimelineEmployee.code}
      />
    </div>
  );
}
