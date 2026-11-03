'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Eye, Download, Clock } from 'lucide-react';
import { transferService } from '@/services/transferService';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button, TabBar, TableToolbar, ActionDropdown, type ActionDropdownItem } from '@/components/ui';
import { showError } from '@/lib/sweetalert';
import { EmployeeTransfer, TransferSummaryStats } from '@/types/transfer';
import CreateTransferModal from '@/components/transfers/CreateTransferModal';
import TransferDetailModal from '@/components/transfers/TransferDetailModal';
import { TransferTypeBadges, parseTransferTypes } from '@/components/transfers/TransferTypeBadges';
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
  const [detailTransfer, setDetailTransfer] = useState<EmployeeTransfer | null>(null);
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
        selectedType === 'ALL' || parseTransferTypes(item.transferType, item.transferTypes).includes(selectedType as any);

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
          <TableToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="ค้นหาคำสั่งโอนย้าย, รหัส, ชื่อพนักงาน..."
            filters={
              <CustomSelect
                value={selectedType}
                onChange={(val) => setSelectedType(String(val))}
                placeholder="ประเภทการโอนย้ายทั้งหมด"
                className="min-w-[190px]"
                options={[
                  { value: 'ALL', label: 'ประเภทการโอนย้ายทั้งหมด' },
                  { value: 'DEPARTMENT_TRANSFER', label: 'ย้ายแผนก' },
                  { value: 'PROMOTION', label: 'เลื่อนตำแหน่ง' },
                  { value: 'POSITION_CHANGE', label: 'เปลี่ยนตำแหน่ง' },
                  { value: 'DEMOTION', label: 'ลดตำแหน่ง' },
                ]}
              />
            }
            actions={
              canCreateTransfers ? (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  icon={<Plus className="w-4 h-4" />}
                  className="shrink-0 self-start sm:self-auto"
                >
                  บันทึกคำสั่งโยกย้าย
                </Button>
              ) : null
            }
          />

          {/* ตาราง: ใคร ย้ายจากไหนไปไหน มีผลเมื่อไร */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="table-standard w-full min-w-[900px] text-left border-collapse text-xs">
              <thead className="bg-primary text-white font-semibold">
                <tr className="whitespace-nowrap">
                  <th className="py-3.5 px-5 font-medium">วันที่มีผล</th>
                  <th className="py-3.5 px-5 font-medium">พนักงาน</th>
                  <th className="py-3.5 px-5 font-medium">ก่อน → หลัง</th>
                  <th className="py-3.5 px-5 font-medium">ประเภท</th>
                  <th className="py-3.5 px-5 font-medium">เลขที่คำสั่ง</th>
                  <th className="py-3.5 px-5 font-medium text-center w-20">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-blue-400" />
                        <span>กำลังโหลดประวัติการโยกย้าย...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      ไม่พบข้อมูลประวัติการโยกย้าย
                    </td>
                  </tr>
                ) : (
                  paginatedTransfers.map((item) => {
                    const deptChanged = (item.fromDepartmentName || '') !== (item.toDepartmentName || '');
                    const menu: ActionDropdownItem[] = [
                      { id: 'detail', label: 'ดูรายละเอียด', icon: <Eye className="w-4 h-4" />, onClick: () => setDetailTransfer(item) },
                      ...(item.hasDocument
                        ? [{ id: 'doc', label: 'ดาวน์โหลดเอกสาร', icon: <Download className="w-4 h-4" />, onClick: () => handleDownloadDocument(item) }]
                        : []),
                      {
                        id: 'timeline',
                        label: 'ประวัติรายบุคคล',
                        icon: <Clock className="w-4 h-4" />,
                        onClick: () => {
                          setSelectedTimelineEmployee({ id: item.employeeId, name: item.employeeName, code: item.employeeCode });
                          setIsTimelineModalOpen(true);
                        },
                      },
                    ];
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-5 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                          {item.effectiveDateDisplay}
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{item.employeeName}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">{item.employeeCode}</div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">{item.fromPositionName || '-'}</span>
                            <span className="mx-1.5 text-slate-400">→</span>
                            <b className="text-primary dark:text-blue-300">{item.toPositionName || '-'}</b>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {deptChanged ? (
                              <>
                                {item.fromDepartmentName || '-'} → {item.toDepartmentName || '-'}
                              </>
                            ) : (
                              item.toDepartmentName || '-'
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <TransferTypeBadges types={parseTransferTypes(item.transferType, item.transferTypes)} />
                          {item.status && item.status !== 'APPROVED' && (
                            <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{item.statusDisplay}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          {item.orderNo ? (
                            <span className="font-medium text-slate-800 dark:text-slate-200">{item.orderNo}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <ActionDropdown
                            menuClassName="w-52"
                            title="การจัดการ"
                            triggerClassName="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center justify-center transition-colors cursor-pointer"
                            items={menu}
                          />
                        </td>
                      </tr>
                    );
                  })
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

      <TransferDetailModal
        transfer={detailTransfer}
        onClose={() => setDetailTransfer(null)}
        onDownload={handleDownloadDocument}
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
