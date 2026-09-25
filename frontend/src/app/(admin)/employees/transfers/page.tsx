'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
  Building2,
  UserCheck,
  FileText,
  Download,
  GitPullRequest,
  Archive,
  XCircle,
} from 'lucide-react';
import { transferService } from '@/services/transferService';
import { employeeService } from '@/services/employeeService';
import { confirmAction, showError, hrmsSwal } from '@/lib/sweetalert';
import { EmployeeTransfer, TransferSummaryStats } from '@/types/transfer';
import { Employee } from '@/types/employee';
import CreateTransferModal from '@/components/transfers/CreateTransferModal';
import EmployeeTimelineModal from '@/components/contracts/EmployeeTimelineModal';
import { ApprovalTimelineModal, GenericApprovalRequestInfo } from '@/components/approvals/ApprovalTimelineModal';
import { ActionDropdown } from '@/components/ui/ActionDropdown';

import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { AccessDenied } from '@/components/common/AccessDenied';

export default function TransfersPage() {
  const { hasPermission } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const [activeTab, setActiveTab] = useState<'transfers' | 'timeline'>('transfers');

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState<boolean>(false);
  const [selectedTimelineEmployee, setSelectedTimelineEmployee] = useState<{
    id: number | null;
    name: string;
    code: string;
  }>({ id: null, name: '', code: '' });

  // Approval Timeline Modal State
  const [selectedApprovalInfo, setSelectedApprovalInfo] = useState<GenericApprovalRequestInfo | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, transfersData, empsData] = await Promise.all([
        transferService.getStats(),
        transferService.getAll(),
        employeeService.getAll(),
      ]);
      setStats(statsData);
      setTransfers(transfersData || []);
      setEmployees(empsData || []);
    } catch (err: any) {
      console.error('Failed to load transfers:', err);
      setError(err.response?.data?.message || err.message || 'ไม่สามารถโหลดข้อมูลการโยกย้ายได้');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    const isConfirmed = await confirmAction({
      title: 'ยืนยันการอนุมัติคำขอย้ายงาน',
      text: 'ยืนยันการอนุมัติคำขอนี้ใช่หรือไม่? ระบบจะปรับปรุงตำแหน่ง/สังกัดของพนักงานทันที',
      confirmButtonText: 'อนุมัติคำขอ',
      cancelButtonText: 'ยกเลิก',
    });
    if (!isConfirmed) return;

    try {
      await transferService.approve(id);
      fetchData();
    } catch (err: any) {
      console.error('Failed to approve transfer:', err);
      showError('ไม่สามารถอนุมัติคำขอได้', err.response?.data?.message);
    }
  };

  const handleReject = async (id: number) => {
    const { value: reason, isConfirmed } = await hrmsSwal.fire({
      title: 'ระบุเหตุผลที่ไม่อนุมัติ',
      input: 'textarea',
      inputPlaceholder: 'กรอกเหตุผลที่ไม่อนุมัติ (ถ้ามี)...',
      showCancelButton: true,
      confirmButtonText: 'ปฏิเสธคำขอ',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 p-6',
        title: 'text-lg font-bold text-slate-800 dark:text-slate-100 pt-2',
        confirmButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 cursor-pointer',
        cancelButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 active:scale-95 transition-all mr-3 border border-slate-300 cursor-pointer',
        input: 'rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 w-full',
        actions: 'gap-3 mt-4 w-full flex justify-end',
      },
    });
    if (!isConfirmed) return;

    try {
      await transferService.reject(id, reason);
      fetchData();
    } catch (err: any) {
      console.error('Failed to reject transfer:', err);
      showError('ไม่สามารถปฏิเสธคำขอได้', err.response?.data?.message);
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

  const handleViewApprovalTimeline = (transfer: EmployeeTransfer) => {
    setSelectedApprovalInfo({
      id: transfer.id,
      requestNo: transfer.requestNo,
      employeeName: transfer.employeeName,
      subtitle: `ประเภท: ${transfer.transferTypeDisplay} • ย้ายไป: ${transfer.toDisplay} (มีผล: ${transfer.effectiveDateDisplay})`,
      fetchTimeline: (id: number) => transferService.getApprovalTimeline(id),
    });
    setIsApprovalModalOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);




  // Filtered Transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.requestNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType =
        selectedType === 'ALL' || item.transferType === selectedType;

      const matchStatus =
        selectedStatus === 'ALL' || item.status === selectedStatus;

      return matchSearch && matchType && matchStatus;
    });
  }, [transfers, searchTerm, selectedType, selectedStatus]);

  // Filtered Employees for Tab 2
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const code = emp.employeeCode.toLowerCase();
      const dept = (emp.departmentName || '').toLowerCase();
      const pos = (emp.positionName || '').toLowerCase();
      return name.includes(term) || code.includes(term) || dept.includes(term) || pos.includes(term);
    });
  }, [employees, searchTerm]);

  // Pagination slice
  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransfers.slice(start, start + pageSize);
  }, [filteredTransfers, currentPage]);

  const totalPages = Math.ceil(
    (activeTab === 'transfers' ? filteredTransfers.length : filteredEmployees.length) / pageSize
  ) || 1;

  const canViewProfile = hasPermission('EMP_PROFILE_VIEW') || hasPermission('EMP_VIEW');
  const canViewTypes = hasPermission('EMP_TYPE_VIEW') || hasPermission('EMP_VIEW');
  const canViewTransfers = hasPermission('EMP_TRANSFER_VIEW') || hasPermission('EMP_VIEW');
  const canViewOrg = hasPermission('ORG_STRUCT_VIEW') || hasPermission('ORG_VIEW');
  const canViewContracts = hasPermission('EMP_CONTRACT_VIEW') || hasPermission('EMP_VIEW');

  // Sub-Navigation Tabs
  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', show: canViewProfile },
    { title: 'ประเภทพนักงาน', href: '/employees/types', show: canViewTypes },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/transfers', active: true, show: canViewTransfers },
    { title: 'สัญญาจ้าง', href: '/employees/contracts', show: canViewContracts },
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
      {/* 1. Sub-Navigation Tabs ตรงตามภาพและ Design System */}
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

      {/* 2. Top Section: 3 Stat KPI Cards ตรงตาม Mockup 100% */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: คำขอรออนุมัติ */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="text-slate-600 font-medium text-sm">
            คำขอรออนุมัติ
          </div>
          <div className="bg-slate-100/90 text-slate-800 text-3xl font-semibold px-5 py-2 rounded-xl min-w-[56px] text-center">
            {stats.pendingRequestsCount}
          </div>
        </div>

        {/* Card 2: ย้ายแผนกเดือนนี้ */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="bg-[#fef3c7] text-[#92400e] text-xs font-semibold px-2 py-0.5 rounded-md">
              ย้ายแผนก
            </span>
            <span className="text-slate-600 font-medium text-sm">เดือนนี้</span>
          </div>
          <div className="bg-slate-100/90 text-slate-800 text-3xl font-semibold px-5 py-2 rounded-xl min-w-[56px] text-center">
            {stats.transfersThisMonthCount}
          </div>
        </div>

        {/* Card 3: เลื่อนตำแหน่งเดือนนี้ */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="text-slate-600 font-medium text-sm">
            เลื่อนตำแหน่งเดือนนี้
          </div>
          <div className="bg-slate-100/90 text-[#16a34a] text-3xl font-semibold px-5 py-2 rounded-xl min-w-[56px] text-center">
            {stats.promotionsThisMonthCount}
          </div>
        </div>
      </div>

      {/* 3. Primary Action Button (+ สร้างคำขอย้าย) ทางขวาตรงตาม Mockup */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="h-10 px-5 bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-medium rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างคำขอย้าย</span>
        </button>
      </div>

      {/* 4. Sub-Tabs & Filter / Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Tab Switcher: คำขอย้าย/เลื่อนตำแหน่ง vs ประวัติรายบุคคล ตรงตาม Mockup */}
        <div className="border-b border-slate-200 px-6 pt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex space-x-8 text-sm font-medium">
            <button
              onClick={() => {
                setActiveTab('transfers');
                setCurrentPage(1);
              }}
              className={`pb-3 transition-all cursor-pointer ${
                activeTab === 'transfers'
                  ? 'border-b-2 border-[#0B2046] text-[#0B2046] font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              คำขอย้าย/เลื่อนตำแหน่ง
            </button>
            <button
              onClick={() => {
                setActiveTab('timeline');
                setCurrentPage(1);
              }}
              className={`pb-3 transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'border-b-2 border-[#0B2046] text-[#0B2046] font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ประวัติรายบุคคล
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-3 pb-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={
                  activeTab === 'transfers'
                    ? 'ค้นหาชื่อ, รหัส หรือ เลขที่คำขอ...'
                    : 'ค้นหาชื่อ, รหัส หรือ แผนก...'
                }
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
              />
            </div>

            {activeTab === 'transfers' && (
              <>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ALL">ประเภททั้งหมด</option>
                  <option value="DEPARTMENT_TRANSFER">ย้ายแผนก</option>
                  <option value="PROMOTION">เลื่อนตำแหน่ง</option>
                  <option value="TRANSFER_AND_PROMOTION">โอนย้ายและเลื่อนตำแหน่ง</option>
                  <option value="PROMOTION_AND_SUPERVISOR">เลื่อนตำแหน่ง + เปลี่ยนหัวหน้างาน</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ALL">สถานะทั้งหมด</option>
                  <option value="PENDING">รอดำเนินการ</option>
                  <option value="APPROVED">อนุมัติแล้ว</option>
                  <option value="REJECTED">ปฏิเสธ</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* 5. TAB 1 CONTENT: Table ตรงตาม Mockup 100% */}
        {activeTab === 'transfers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-normal">
                  <th className="py-3.5 px-6 font-medium">เลขที่คำขอ</th>
                  <th className="py-3.5 px-6 font-medium">พนักงาน</th>
                  <th className="py-3.5 px-6 font-medium">จาก</th>
                  <th className="py-3.5 px-6 font-medium">ไปยัง</th>
                  <th className="py-3.5 px-6 font-medium">ประเภท</th>
                  <th className="py-3.5 px-6 font-medium">วันที่มีผล</th>
                  <th className="py-3.5 px-6 font-medium">สถานะ</th>
                  <th className="py-3.5 px-6 font-medium text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#0B2046]" />
                        <span>กำลังโหลดข้อมูลการโยกย้าย...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      ไม่พบข้อมูลคำขอย้าย/เลื่อนตำแหน่ง
                    </td>
                  </tr>
                ) : (
                  paginatedTransfers.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* เลขที่คำขอ และ ประเภทการบันทึก */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              setSelectedTimelineEmployee({
                                id: item.employeeId,
                                name: item.employeeName,
                                code: item.employeeCode,
                              });
                              setIsTimelineModalOpen(true);
                            }}
                            className="hover:underline hover:text-blue-700 cursor-pointer font-bold text-slate-900"
                          >
                            {item.requestNo}
                          </button>
                          {item.recordType === 'ARCHIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Archive className="w-2.5 h-2.5" />
                              คำสั่งย้อนหลัง
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <GitPullRequest className="w-2.5 h-2.5" />
                              ขออนุมัติ
                            </span>
                          )}
                        </div>

                        {item.orderNo && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            เลขที่: <span className="font-medium text-slate-700">{item.orderNo}</span>
                          </p>
                        )}

                        {item.hasDocument && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(item)}
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium bg-blue-50/70 hover:bg-blue-100/70 px-2 py-0.5 rounded-md transition-colors"
                              title={item.documentName || 'ดาวน์โหลดเอกสารคำสั่ง'}
                            >
                              <FileText className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="max-w-[150px] truncate">{item.documentName || 'เอกสารคำสั่งย้าย'}</span>
                              <Download className="w-2.5 h-2.5 text-blue-500 shrink-0 ml-0.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* พนักงาน */}
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-800">{item.employeeName}</span>
                        <span className="text-slate-400 font-normal"> · {item.employeeCode}</span>
                      </td>

                      {/* จาก */}
                      <td className="py-4 px-6 text-slate-600 font-normal">
                        {item.fromDisplay}
                      </td>

                      {/* ไปยัง */}
                      <td className="py-4 px-6 text-slate-800 font-medium">
                        {item.toDisplay}
                      </td>

                      {/* ประเภท (Badge หลากสีตรงตาม Mockup) */}
                      <td className="py-4 px-6">
                        {item.transferType === 'DEPARTMENT_TRANSFER' ? (
                          <span className="bg-[#fef3c7] text-[#92400e] text-[11px] font-semibold px-2.5 py-1 rounded-md inline-block">
                            {item.transferTypeDisplay}
                          </span>
                        ) : item.transferType === 'PROMOTION' ? (
                          <span className="text-slate-800 text-xs font-medium">
                            {item.transferTypeDisplay}
                          </span>
                        ) : (
                          <span className="text-slate-800 text-xs font-medium">
                            {item.transferTypeDisplay}
                          </span>
                        )}
                      </td>

                      {/* วันที่มีผล */}
                      <td className="py-4 px-6 text-slate-600 font-normal">
                        {item.effectiveDateDisplay}
                      </td>

                      {/* สถานะ (Bullet Indicator ตรงตาม Mockup) */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {item.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            รอดำเนินการ
                          </span>
                        ) : item.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1.5 text-[#16a34a] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                            อนุมัติแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            ปฏิเสธ
                          </span>
                        )}
                      </td>

                      {/* การจัดการ / Action Menu */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <ActionDropdown
                          menuClassName="w-52"
                          items={[
                            ...(item.recordType === 'REQUEST' || item.approvalInstanceId
                              ? [
                                  {
                                    label: 'ดูผังการอนุมัติ (Workflow)',
                                    icon: <GitPullRequest className="w-3.5 h-3.5 text-blue-600" />,
                                    onClick: () => handleViewApprovalTimeline(item),
                                  },
                                ]
                              : []),
                            ...(item.hasDocument
                              ? [
                                  {
                                    label: 'ดาวน์โหลดเอกสารคำสั่ง',
                                    icon: <Download className="w-3.5 h-3.5 text-indigo-600" />,
                                    onClick: () => handleDownloadDocument(item),
                                  },
                                ]
                              : []),
                            {
                              label: 'ประวัติรายบุคคล',
                              icon: <Clock className="w-3.5 h-3.5 text-emerald-600" />,
                              onClick: () => {
                                setSelectedTimelineEmployee({
                                  id: item.employeeId,
                                  name: item.employeeName,
                                  code: item.employeeCode,
                                });
                                setIsTimelineModalOpen(true);
                              },
                            },
                            ...(item.status === 'PENDING'
                              ? [
                                  {
                                    label: 'อนุมัติคำขอ',
                                    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
                                    className: 'text-[#16a34a] hover:bg-emerald-50',
                                    onClick: () => handleApprove(item.id),
                                  },
                                  {
                                    label: 'ไม่อนุมัติคำขอ',
                                    icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
                                    danger: true,
                                    onClick: () => handleReject(item.id),
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
        )}

        {/* 6. TAB 2 CONTENT: ประวัติรายบุคคล (ทำเหมือนหน้าสัญญาจ้างงาน 100%) */}
        {activeTab === 'timeline' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-normal">
                  <th className="py-3.5 px-6 font-medium">รหัสพนักงาน</th>
                  <th className="py-3.5 px-6 font-medium">ชื่อ-นามสกุล</th>
                  <th className="py-3.5 px-6 font-medium">แผนก / สังกัด</th>
                  <th className="py-3.5 px-6 font-medium">ตำแหน่งปัจจุบัน</th>
                  <th className="py-3.5 px-6 font-medium text-right">ไทม์ไลน์การทำงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#0B2046]" />
                        <span>กำลังโหลดรายชื่อพนักงาน...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      ไม่พบข้อมูลพนักงาน
                    </td>
                  </tr>
                ) : (
                  filteredEmployees
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          {emp.employeeCode}
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-800">
                          {emp.firstName} {emp.lastName}
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          {emp.departmentName || '-'}
                        </td>
                        <td className="py-4 px-6 text-slate-800 font-medium">
                          {emp.positionName || '-'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setSelectedTimelineEmployee({
                                id: emp.id,
                                name: `${emp.firstName} ${emp.lastName}`,
                                code: emp.employeeCode,
                              });
                              setIsTimelineModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#0B2046] hover:text-white text-slate-700 rounded-lg transition-all font-medium cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-emerald-600 hover:text-white" />
                            <span>ดูประวัติรายบุคคล</span>
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. Pagination Footer (< 1 2 3 4 >) ตรงตาม Mockup 100% */}
        <div className="py-4 px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            แสดง{' '}
            {activeTab === 'transfers'
              ? paginatedTransfers.length > 0
                ? (currentPage - 1) * pageSize + 1
                : 0
              : filteredEmployees.length > 0
              ? (currentPage - 1) * pageSize + 1
              : 0}{' '}
            ถึง{' '}
            {activeTab === 'transfers'
              ? Math.min(currentPage * pageSize, filteredTransfers.length)
              : Math.min(currentPage * pageSize, filteredEmployees.length)}{' '}
            จาก{' '}
            {activeTab === 'transfers'
              ? filteredTransfers.length
              : filteredEmployees.length}{' '}
            รายการ
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#0B2046] text-white font-bold'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 8. Create Transfer Modal ตรงตาม Mockup 2 */}
      <CreateTransferModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchData}
      />

      {/* 9. Career & Assignment Timeline Modal (ทำเหมือนหน้าสัญญาจ้างงาน 100%) */}
      <EmployeeTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        employeeId={selectedTimelineEmployee.id}
        employeeName={selectedTimelineEmployee.name}
        employeeCode={selectedTimelineEmployee.code}
      />

      {/* 10. Approval Workflow Timeline Modal */}
      <ApprovalTimelineModal
        isOpen={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setSelectedApprovalInfo(null);
        }}
        requestInfo={selectedApprovalInfo}
      />
    </div>
  );
}

