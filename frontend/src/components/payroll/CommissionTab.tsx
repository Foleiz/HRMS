'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2,
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  Lock,
  Unlock,
  AlertTriangle,
  X,
  Briefcase,
  Calendar,
  Layers,
  Sparkles,
  History,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { commissionService } from '@/services/commissionService';
import { salaryService } from '@/services/salaryService';
import {
  CommissionPeriodSummary,
  CommissionRecord,
  CommissionPreviewResult,
  CommissionImportBatch,
  UpdateCommissionItemPayload,
  AddManualCommissionPayload,
} from '@/types/commission';
import { EmployeeSalaryOverview } from '@/types/payroll';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/lib/sweetalert';
import SupportedCommissionFormatsModal from './SupportedCommissionFormatsModal';

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export default function CommissionTab() {
  const { success, error, info } = useToast();
  const { user } = useAuth();

  // Period State (default to current Gregorian date)
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [defaultRate, setDefaultRate] = useState<number>(3.0);

  // Data State
  const [summary, setSummary] = useState<CommissionPeriodSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Upload & Drag-and-drop State
  const [isUploadCardOpen, setIsUploadCardOpen] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<CommissionPreviewResult | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isExecutingImport, setIsExecutingImport] = useState<boolean>(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Batch History State
  const [batches, setBatches] = useState<CommissionImportBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [batchPage, setBatchPage] = useState<number>(1);
  const [batchTotalPages, setBatchTotalPages] = useState<number>(1);
  const [batchTotalCount, setBatchTotalCount] = useState<number>(0);
  const [revertingBatchId, setRevertingBatchId] = useState<number | null>(null);

  // Modals State
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<CommissionRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Edit / Add Form State
  const [editForm, setEditForm] = useState<UpdateCommissionItemPayload>({
    salesAmount: 0,
    commissionRate: 3.0,
    specialAmount: 0,
    note: '',
  });

  const [addJobDate, setAddJobDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [addJobTitle, setAddJobTitle] = useState<string>('');

  const [addForm, setAddForm] = useState<AddManualCommissionPayload>({
    employeeId: 0,
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    salesAmount: 0,
    commissionRate: 3.0,
    specialAmount: 0,
    note: '',
  });

  // Employee list for manual add
  const [employees, setEmployees] = useState<EmployeeSalaryOverview[]>([]);
  const [empSearch, setEmpSearch] = useState<string>('');

  // Load Main Data
  const loadCommissionData = async (y = selectedYear, m = selectedMonth) => {
    try {
      setLoading(true);
      const data = await commissionService.getCommissionPeriod(y, m);
      setSummary(data);
      if (data && data.records && data.records.length > 0) {
        setDefaultRate(data.records[0].commissionRate || 3.0);
      }
    } catch (err: any) {
      error(err?.response?.data?.message || 'ไม่สามารถโหลดข้อมูลค่าคอมมิชชั่นได้');
    } finally {
      setLoading(false);
    }
  };

  // Load Batches
  const loadBatches = async (page = 1) => {
    try {
      setIsLoadingBatches(true);
      const res = await commissionService.getCommissionBatches(page, 10);
      setBatches(res.items || []);
      setBatchPage(res.page || 1);
      setBatchTotalPages(res.totalPages || 1);
      setBatchTotalCount(res.totalCount || 0);
    } catch (err) {
      console.error('Failed to load commission batches:', err);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  // Load Employees for Add Modal
  const loadEmployees = async () => {
    try {
      const data = await salaryService.getEmployeesOverview();
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to load employees for commission:', err);
    }
  };

  useEffect(() => {
    loadCommissionData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadBatches(1);
  }, []);

  // Handle Opening Add Work for Specific Employee
  const handleOpenAddWorkForEmployee = (record: CommissionRecord) => {
    loadEmployees();
    setAddJobDate(new Date().toISOString().slice(0, 10));
    setAddJobTitle('');
    setAddForm({
      employeeId: record.employeeId,
      year: selectedYear,
      month: selectedMonth,
      salesAmount: 0,
      commissionRate: record.commissionRate || defaultRate,
      specialAmount: 0,
      note: '',
    });
    setIsAddModalOpen(true);
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPeriodConfirmed) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isPeriodConfirmed) {
      error('รอบเงินเดือนนี้ถูกยืนยันหรือจ่ายแล้ว ไม่สามารถนำเข้าข้อมูลได้');
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Trigger Preview Immediately on File Pick
  const processSelectedFile = async (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      error('รองรับเฉพาะไฟล์ .xlsx, .xls หรือ .csv เท่านั้น');
      return;
    }

    try {
      setIsPreviewLoading(true);
      setSelectedFile(file);
      const preview = await commissionService.previewCommissionFile(
        file,
        selectedYear,
        selectedMonth,
        defaultRate
      );
      setPreviewData(preview);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      error(err?.response?.data?.message || 'ไม่สามารถอ่านโครงสร้างไฟล์เพื่อพรีวิวได้');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Confirm Final Import from Preview Modal
  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    try {
      setIsExecutingImport(true);
      const res = await commissionService.importCommissionFile(
        selectedFile,
        selectedYear,
        selectedMonth,
        defaultRate
      );

      setSummary(res.summary);
      success(
        `นำเข้าสำเร็จ (${res.detectedTypeLabel}): ${res.totalImported} รายการ (แทนที่รายการเดิม ${res.replacedCount} รายการ)`
      );

      if (res.warnings && res.warnings.length > 0) {
        info(`พบคำเตือน ${res.warnings.length} รายการ: ${res.warnings.slice(0, 2).join('; ')}`);
      }

      setIsPreviewModalOpen(false);
      setSelectedFile(null);
      setPreviewData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Reload Data and Batch History
      await loadCommissionData(selectedYear, selectedMonth);
      await loadBatches(1);
    } catch (err: any) {
      error(err?.response?.data?.message || 'การนำเข้าไฟล์ล้มเหลว กรุณาตรวจสอบไฟล์');
    } finally {
      setIsExecutingImport(false);
    }
  };

  // Revert Batch Handler
  const handleRevertBatch = async (batch: CommissionImportBatch) => {
    const isConfirmed = await confirmAction({
      title: `ยกเลิกชุดการนำเข้า #${batch.id}?`,
      text: `ต้องการยกเลิกชุดการนำเข้าไฟล์ "${batch.fileName || 'ไฟล์คอมมิชชั่น'}" ใช่หรือไม่?\nรายการค่าคอมมิชชั่นของชุดนี้จะถูกยกเลิก และระบบจะกู้คืนรายการเดิมที่เคยถูกแทนที่กลับมาโดยอัตโนมัติ`,
      confirmButtonText: 'ยกเลิกชุดนำเข้า',
      icon: 'warning',
    });

    if (!isConfirmed) return;

    try {
      setRevertingBatchId(batch.id);
      const result = await commissionService.revertCommissionBatch(batch.id);
      success(result.message || 'ยกเลิกชุดการนำเข้าเรียบร้อยแล้ว');
      await loadCommissionData(selectedYear, selectedMonth);
      await loadBatches(batchPage);
    } catch (err: any) {
      error(err?.response?.data?.message || 'ยกเลิกชุดการนำเข้าไม่สำเร็จ');
    } finally {
      setRevertingBatchId(null);
    }
  };

  // Download Template
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const blob = await commissionService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HRMS_Commission_Template_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
      a.rel = 'noopener';
      a.style.position = 'fixed';
      a.style.left = '-9999px';
      a.style.top = '-9999px';
      document.body.appendChild(a);
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      }, 2000);
      success('ดาวน์โหลดเทมเพลตเรียบร้อยแล้ว');
    } catch (err: any) {
      error(err?.response?.data?.message || 'ดาวน์โหลดเทมเพลตไม่สำเร็จ');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Confirm Period Handler
  const handleConfirmPeriod = async () => {
    const isConfirmed = await confirmAction({
      title: 'ยืนยันค่าคอมมิชชั่นรอบนี้?',
      text: `ต้องการยืนยันยอดค่าคอมมิชชั่นรอบเดือน ${THAI_MONTHS[selectedMonth - 1]} ${selectedYear + 543} ใช่หรือไม่? ยอดนี้จะถูกนำไปคำนวณในสลิปเงินเดือนโดยอัตโนมัติ`,
      confirmButtonText: 'ยืนยันค่าคอมมิชชั่น',
      icon: 'question',
    });

    if (!isConfirmed) return;

    try {
      setIsConfirming(true);
      const res = await commissionService.confirmCommissionPeriod(selectedYear, selectedMonth);
      setSummary(res);
      success('ยืนยันค่าคอมมิชชั่นเรียบร้อยแล้ว ยอดจะถูกดึงเข้าเงินเดือนอัตโนมัติ');
    } catch (err: any) {
      error(err?.response?.data?.message || 'ยืนยันค่าคอมมิชชั่นไม่สำเร็จ');
    } finally {
      setIsConfirming(false);
    }
  };

  // Reset Period Handler
  const handleResetPeriod = async () => {
    const isConfirmed = await confirmAction({
      title: 'ปลดล็อกเพื่อแก้ไข?',
      text: `ต้องการปลดล็อกสถานะของรอบเดือน ${THAI_MONTHS[selectedMonth - 1]} ${selectedYear + 543} กลับเป็นฉบับร่าง (DRAFT) เพื่อแก้ไขข้อมูลใช่หรือไม่?`,
      confirmButtonText: 'ปลดล็อกแก้ไข',
      icon: 'warning',
    });

    if (!isConfirmed) return;

    try {
      setLoading(true);
      const res = await commissionService.resetCommissionPeriod(selectedYear, selectedMonth);
      setSummary(res);
      success('ปลดล็อกสถานะเป็นฉบับร่างเรียบร้อยแล้ว สามารถแก้ไขข้อมูลได้');
    } catch (err: any) {
      error(err?.response?.data?.message || 'ปลดล็อกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // Save Edit Item
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      const updated = await commissionService.updateCommissionItem(editingRecord.id, editForm);
      success(`อัปเดตค่าคอมมิชชั่นของ ${updated.employeeName} สำเร็จ`);
      setEditingRecord(null);
      await loadCommissionData(selectedYear, selectedMonth);
    } catch (err: any) {
      error(err?.response?.data?.message || 'แก้ไขข้อมูลไม่สำเร็จ');
    }
  };

  // Save Add Item (Manual)
  const handleSaveAdd = async () => {
    if (!addForm.employeeId) {
      error('กรุณาเลือกพนักงาน');
      return;
    }
    if (addForm.salesAmount <= 0 && (!addForm.specialAmount || addForm.specialAmount <= 0)) {
      error('กรุณาระบุยอดขายหรือยอดเงินพิเศษ');
      return;
    }
    try {
      const formattedNote = addJobTitle.trim()
        ? `[${addJobDate}] ${addJobTitle.trim()}${addForm.note ? ` (${addForm.note.trim()})` : ''}`
        : addForm.note?.trim() || '';

      await commissionService.addManualCommission({
        ...addForm,
        year: selectedYear,
        month: selectedMonth,
        note: formattedNote,
      });
      success('บันทึกข้อมูลค่าคอมมิชชั่นเรียบร้อยแล้ว');
      setIsAddModalOpen(false);
      setAddJobTitle('');
      setAddForm({
        employeeId: 0,
        year: selectedYear,
        month: selectedMonth,
        salesAmount: 0,
        commissionRate: defaultRate,
        specialAmount: 0,
        note: '',
      });
      await loadCommissionData(selectedYear, selectedMonth);
    } catch (err: any) {
      error(err?.response?.data?.message || 'เพิ่มรายการไม่สำเร็จ');
    }
  };

  // Delete Record
  const handleDeleteRecord = async (record: CommissionRecord) => {
    const isConfirmed = await confirmAction({
      title: 'ลบรายการค่าคอมมิชชั่น?',
      text: `ต้องการลบข้อมูลค่าคอมมิชชั่นของ "${record.employeeName}" ใช่หรือไม่?`,
      confirmButtonText: 'ลบรายการ',
      icon: 'warning',
    });

    if (!isConfirmed) return;

    try {
      await commissionService.deleteCommissionItem(record.id);
      success(`ลบรายการของ ${record.employeeName} แล้ว`);
      await loadCommissionData(selectedYear, selectedMonth);
    } catch (err: any) {
      error(err?.response?.data?.message || 'ลบรายการไม่สำเร็จ');
    }
  };

  // Filter records
  const records = summary?.records || [];
  const filteredRecords = records.filter(
    (r) =>
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.departmentName && r.departmentName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isPeriodConfirmed = summary?.status === 'CONFIRMED' || summary?.status === 'PAID';

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Toolbar & Filters */}
      <div className="flex flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:px-4 sm:py-3 shadow-xs overflow-x-auto">
        {/* Left: Period & Rate Controls (Single line) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Year & Month Selector */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-1 shadow-2xs">
            <div className="flex items-center gap-1.5 pl-2.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ปี:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer py-1 pr-1"
              >
                {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {y + 543}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            <div className="flex items-center gap-1.5 pr-2.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">เดือน:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer py-1 pr-1"
              >
                {THAI_MONTHS.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Default Commission % input (clean & compact) */}
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Percent className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>อัตราเริ่มต้น:</span>
            </span>
            <div className="relative w-16">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={defaultRate}
                onChange={(e) => setDefaultRate(Number(e.target.value) || 0)}
                disabled={isPeriodConfirmed}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 pr-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 text-right"
              />
              <span className="absolute right-1.5 top-0.5 text-xs text-slate-400 font-semibold">%</span>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => {
              loadCommissionData();
              loadBatches(batchPage);
            }}
            className="flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Right: Actions (Single line) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Format Guide Button */}
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>รูปแบบไฟล์ที่รองรับ</span>
          </button>

          {/* Unified Upload Toggle Button */}
          {!isPeriodConfirmed && (
            <>
              <button
                type="button"
                onClick={() => setIsUploadCardOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer ${
                  isUploadCardOpen
                    ? 'bg-emerald-700 text-white shadow-emerald-600/20 ring-2 ring-emerald-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <UploadCloud className="h-4 w-4" />
                <span>{isUploadCardOpen ? 'ซ่อนกล่องนำเข้า' : 'นำเข้าไฟล์ค่าคอมมิชชั่น'}</span>
              </button>

              {/* Add Manual Item */}
              <button
                type="button"
                onClick={() => {
                  loadEmployees();
                  setAddJobDate(new Date().toISOString().slice(0, 10));
                  setAddJobTitle('');
                  setAddForm({
                    employeeId: 0,
                    year: selectedYear,
                    month: selectedMonth,
                    salesAmount: 0,
                    commissionRate: defaultRate,
                    specialAmount: 0,
                    note: '',
                  });
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
                title="บันทึกหรือปรับยอดรายคนด้วยตนเอง"
              >
                <Plus className="h-4 w-4" />
                <span>เพิ่มรายคน</span>
              </button>
            </>
          )}

          {/* Confirm or Reset Button */}
          {summary && summary.records.length > 0 && (
            <>
              {!isPeriodConfirmed ? (
                <button
                  type="button"
                  onClick={handleConfirmPeriod}
                  disabled={isConfirming}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B2046] dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#133066] dark:hover:bg-blue-500 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isConfirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                  <span>ยืนยันค่าคอมมิชชั่น</span>
                </button>
              ) : summary.status !== 'PAID' ? (
                <button
                  type="button"
                  onClick={handleResetPeriod}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 shadow-2xs transition active:scale-95 cursor-pointer"
                  title="ปลดล็อกกลับเป็นฉบับร่างเพื่อแก้ไข"
                >
                  <Unlock className="h-4 w-4" />
                  <span>ปลดล็อกแก้ไข</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <Lock className="h-4 w-4" />
                  <span>จ่ายในเงินเดือนแล้ว</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ยอดขายรวมทั้งบริษัท
            </span>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              ฿
              {(summary?.totalSales ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-[11px] text-slate-400">
              รอบเดือน {THAI_MONTHS[selectedMonth - 1]} {selectedYear + 543}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Total Commission */}
        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              ค่าคอมมิชชั่นรวมที่ต้องจ่าย
            </span>
            <div className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
              ฿
              {(summary?.totalCommission ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70">
              ดึงเข้าเป็นเงินได้ในงวดเงินเดือน
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Employee Count */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              พนักงานที่ได้รับค่าคอม
            </span>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {summary?.totalEmployees ?? 0}{' '}
              <span className="text-sm font-normal text-slate-500">คน</span>
            </div>
            <p className="text-[11px] text-slate-400">จากข้อมูลที่มีในงวดนี้</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4: Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              สถานะรอบคอมมิชชั่น
            </span>
            <div>
              {summary?.status === 'CONFIRMED' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> ยืนยันแล้ว (พร้อมคิดเงินเดือน)
                </span>
              ) : summary?.status === 'PAID' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                  <Lock className="h-3.5 w-3.5" /> จ่ายพร้อมเงินเดือนแล้ว
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5" /> ฉบับร่าง (ยังไม่ยืนยัน)
                </span>
              )}
            </div>
            {summary?.confirmedAt && (
              <p className="text-[10px] text-slate-400">
                ยืนยันโดย {summary.confirmedByName || 'HR'} เมื่อ{' '}
                {new Date(summary.confirmedAt).toLocaleDateString('th-TH')}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            {isPeriodConfirmed ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <AlertCircle className="h-6 w-6" />
            )}
          </div>
        </div>
      </div>

      {/* 3. Unified File Upload Dropzone (Automatic Mode Detection — No Manual Choice Cards) */}
      {!isPeriodConfirmed && (records.length === 0 || isUploadCardOpen) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all animate-in fade-in duration-200">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>นำเข้าไฟล์ค่าคอมมิชชั่น</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Sparkles className="h-3 w-3" /> ระบบตรวจจับรูปแบบอัตโนมัติ
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ลากไฟล์หรือเลือกไฟล์ Excel / CSV เพื่อพรีวิวตรวจสอบข้อมูลและแทนที่ยอดเดิมในช่วงวันที่ซ้ำให้อัตโนมัติ
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
                <span>ดาวน์โหลดเทมเพลต</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 scale-[0.99] ring-4 ring-emerald-500/10'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {isPreviewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    กำลังตรวจสอบโครงสร้างไฟล์และคำนวณผลกระทบ...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      ลากไฟล์มาวางที่นี่ หรือ{' '}
                      <span className="text-emerald-600 dark:text-emerald-400 hover:underline">
                        คลิกเพื่อเลือกไฟล์
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      รองรับไฟล์ .xlsx, .xls หรือ .csv (นำเข้าหลายคนพร้อมกันได้ทั้งแผนกหรือทั้งบริษัท)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Preview Modal (ตรวจสอบข้อมูลก่อนยืนยันนำเข้าจริง) */}
      {isPreviewModalOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      ตรวจสอบข้อมูลก่อนนำเข้า (Preview)
                    </h3>
                    {/* Detected Type Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        previewData.detectedType === 'DAY'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          : previewData.detectedType === 'RANGE'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      {previewData.detectedTypeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ไฟล์: <strong>{previewData.fileName}</strong> | แฮช:{' '}
                    <span className="font-mono text-[11px]">{previewData.fileHash.slice(0, 10)}...</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setSelectedFile(null);
                  setPreviewData(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Stat Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">รายการในไฟล์</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {previewData.validRows}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      / {previewData.totalRows} แถว
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">จำนวนพนักงาน</div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                    {previewData.employeeCount}{' '}
                    <span className="text-xs font-normal text-slate-500">คน</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">ยอดขายรวม</div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                    ฿{previewData.totalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">คอมมิชชั่นรวม</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    ฿{previewData.totalCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-3">
                  <div className="text-[11px] text-amber-800 dark:text-amber-300">
                    แทนที่รายการเดิม
                  </div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    {previewData.replacedEntriesCount}{' '}
                    <span className="text-xs font-normal text-amber-600/80">รายการ</span>
                  </div>
                </div>
              </div>

              {/* Locked Warning */}
              {previewData.isLockedPeriod && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 text-xs">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>
                    <strong>ไม่สามารถนำเข้าได้:</strong> {previewData.lockReason}
                  </span>
                </div>
              )}

              {/* General Warnings */}
              {previewData.warnings.length > 0 && (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    พบข้อควรระวัง {previewData.warnings.length} รายการ:
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {previewData.warnings.slice(0, 5).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {previewData.warnings.length > 5 && (
                      <li>และอีก {previewData.warnings.length - 5} รายการ...</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Rows Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="py-2 px-3 text-center w-10">#</th>
                        <th className="py-2 px-3">รหัสพนักงาน</th>
                        <th className="py-2 px-3">ชื่อ - นามสกุล</th>
                        <th className="py-2 px-3">แผนก</th>
                        <th className="py-2 px-3 text-center">ช่วงวันที่</th>
                        <th className="py-2 px-3 text-right">ยอดขาย (บาท)</th>
                        <th className="py-2 px-3 text-center">อัตรา %</th>
                        <th className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                          คอมมิชชั่น (บาท)
                        </th>
                        <th className="py-2 px-3 text-center">ผลกระทบ</th>
                        <th className="py-2 px-3 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {previewData.previewRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`${
                            !row.isValid
                              ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold">
                            {row.employeeCode}
                          </td>
                          <td className="py-2 px-3 font-medium">
                            {row.employeeName || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                            {row.departmentName || '-'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px]">
                            {row.dateFrom === row.dateTo ? row.dateFrom : `${row.dateFrom} - ${row.dateTo}`}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            ฿{row.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            {row.commissionRate}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            ฿{row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.existingOverlappingEntries > 0 ? (
                              <span className="inline-flex rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                                ทับรายการเดิม ({row.existingOverlappingEntries})
                              </span>
                            ) : (
                              <span className="inline-flex rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 text-[10px]">
                                รายการใหม่
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.isValid ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center justify-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> ผ่าน
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]" title={row.errorMessage || ''}>
                                {row.errorMessage || 'ข้อผิดพลาด'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                แสดงตัวอย่างสูงสุด 100 รายการแรกจากไฟล์
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setSelectedFile(null);
                    setPreviewData(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isExecutingImport || previewData.isLockedPeriod || previewData.validRows === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isExecutingImport ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังบันทึกข้อมูลและคำนวณยอด...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>ยืนยันนำเข้าข้อมูล ({previewData.validRows} รายการ)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Employee Commission Summary Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {/* Table Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 p-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารหัส, ชื่อพนักงาน หรือแผนก..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            แสดง {filteredRecords.length} จาก {records.length} รายการ
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">รหัสพนักงาน</th>
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                <th className="py-3 px-4 text-right">ยอดขายรวม (บาท)</th>
                <th className="py-3 px-4 text-center">อัตรา (%)</th>
                <th className="py-3 px-4 text-right">ค่าคอมมิชชั่น (บาท)</th>
                <th className="py-3 px-4 text-right">เงินพิเศษ (บาท)</th>
                <th className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">
                  รวมทั้งสิ้น (บาท)
                </th>
                <th className="py-3 px-4">หมายเหตุ</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                    <p className="mt-2 text-xs">กำลังโหลดข้อมูลค่าคอมมิชชั่น...</p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                    <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">
                      ยังไม่มีข้อมูลค่าคอมมิชชั่นในรอบเดือนนี้
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      ลากไฟล์ Excel/CSV มาวางในกล่องอัปโหลดด้านบน หรือกด &quot;เพิ่มรายคน&quot;
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {r.employeeCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {r.employeeName}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      <div>{r.departmentName || '-'}</div>
                      <div className="text-[11px] text-slate-400">{r.positionName}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      ฿{r.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {r.commissionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ฿{r.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400">
                      {r.specialAmount > 0
                        ? `฿${r.specialAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      ฿{r.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate">
                      {r.note || '-'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {!isPeriodConfirmed ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAddWorkForEmployee(r)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 transition cursor-pointer"
                            title="บันทึกงานเพิ่มให้พนักงานท่านนี้"
                          >
                            <Plus className="h-3 w-3" />
                            <span>+ งานเพิ่ม</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecord(r);
                              setEditForm({
                                salesAmount: r.salesAmount,
                                commissionRate: r.commissionRate,
                                specialAmount: r.specialAmount,
                                note: r.note || '',
                              });
                            }}
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition cursor-pointer"
                            title="แก้ไขยอดรวม"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r)}
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">ล็อกแล้ว</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Batch Import History Table (เหมือนหน้านำเข้าเวลางาน) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-100 dark:border-purple-900">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                ประวัติการนำเข้าไฟล์ค่าคอมมิชชั่น (Import Batches)
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  {batchTotalCount} ชุด
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                สามารถตรวจสอบย้อนหลัง หรือกดยกเลิกชุดนำเข้า (Revert) เพื่อคืนค่ายอดเดิมได้ตลอดเวลา
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadBatches(batchPage)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingBatches ? 'animate-spin' : ''}`} />
            <span>รีเฟรชประวัติ</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                <th className="py-3 px-4 text-center w-12">#ID</th>
                <th className="py-3 px-4">วันที่/เวลานำเข้า</th>
                <th className="py-3 px-4">ชื่อไฟล์</th>
                <th className="py-3 px-4 text-center">รูปแบบที่ตรวจจับ</th>
                <th className="py-3 px-4 text-center">ช่วงวันที่</th>
                <th className="py-3 px-4 text-center">พนักงาน</th>
                <th className="py-3 px-4 text-center">นำเข้าสำเร็จ</th>
                <th className="py-3 px-4 text-center">ทับยอดเดิม</th>
                <th className="py-3 px-4 text-right">ยอดรวมคอมมิชชั่น</th>
                <th className="py-3 px-4">ผู้นำเข้า</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoadingBatches ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-purple-600" />
                    <p className="mt-1 text-xs">กำลังโหลดประวัติการนำเข้า...</p>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    ยังไม่มีประวัติการนำเข้าไฟล์ในระบบ
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr
                    key={b.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200 transition-colors ${
                      b.status === 'REVERTED' ? 'opacity-60 bg-slate-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-500">
                      #{b.id}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {new Date(b.importedAt).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium max-w-xs truncate" title={b.fileName || ''}>
                      {b.fileName || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.detectedType === 'DAY'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                            : b.detectedType === 'RANGE'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {b.detectedTypeLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] whitespace-nowrap">
                      {b.dateFrom && b.dateTo
                        ? b.dateFrom === b.dateTo
                          ? b.dateFrom
                          : `${b.dateFrom} - ${b.dateTo}`
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {b.employeeCount} คน
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {b.successRows}
                      </span>{' '}
                      / {b.totalRows}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400">
                      {b.replacedEntries > 0 ? `${b.replacedEntries} รายการ` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      ฿{b.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {b.importedByUserName || '-'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {b.status === 'IMPORTED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> ใช้งานอยู่
                        </span>
                      ) : b.status === 'REVERTED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <RotateCcw className="h-3 w-3" /> ยกเลิกแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
                          {b.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {b.status === 'IMPORTED' && !isPeriodConfirmed && (
                        <button
                          type="button"
                          onClick={() => handleRevertBatch(b)}
                          disabled={revertingBatchId === b.id}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition cursor-pointer disabled:opacity-50"
                          title="ยกเลิกชุดนี้และกู้คืนยอดเดิม"
                        >
                          {revertingBatchId === b.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          <span>ยกเลิกชุดนี้</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Batch Pagination */}
        {batchTotalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              หน้า {batchPage} จาก {batchTotalPages} (ทั้งหมด {batchTotalCount} ชุด)
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => loadBatches(batchPage - 1)}
                disabled={batchPage <= 1 || isLoadingBatches}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => loadBatches(batchPage + 1)}
                disabled={batchPage >= batchTotalPages || isLoadingBatches}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Edit Item Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              แก้ไขค่าคอมมิชชั่น: {editingRecord.employeeName}
            </h3>
            <p className="text-xs text-slate-500">
              รหัสพนักงาน: {editingRecord.employeeCode} | {editingRecord.departmentName}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ยอดขายรวม (บาท)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.salesAmount}
                  onChange={(e) =>
                    setEditForm({ ...editForm, salesAmount: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    อัตรา (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.commissionRate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, commissionRate: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    เงินพิเศษเพิ่มเติม (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.specialAmount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, specialAmount: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Calculated preview */}
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex justify-between font-bold">
                  <span>คำนวณสุทธิ:</span>
                  <span>
                    ฿
                    {(
                      editForm.salesAmount * (editForm.commissionRate / 100) +
                      (editForm.specialAmount || 0)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  หมายเหตุ
                </label>
                <input
                  type="text"
                  value={editForm.note || ''}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="เช่น ยอดขายทะลุเป้า"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Add Manual Record Modal */}
      {isAddModalOpen && (() => {
        const selectedEmpRecord = records.find((r) => r.employeeId === addForm.employeeId);
        const thisJobSales = Number(addForm.salesAmount) || 0;
        const thisJobCommissionRate = Number(addForm.commissionRate) || 0;
        const thisJobCommissionAmount = thisJobSales * (thisJobCommissionRate / 100);
        const thisJobSpecial = Number(addForm.specialAmount) || 0;
        const thisJobTotal = thisJobCommissionAmount + thisJobSpecial;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span>บันทึกผลงาน / ค่าคอมมิชชั่น</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    รอบเดือน {THAI_MONTHS[selectedMonth - 1]} {selectedYear + 543}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Employee Selection */}
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    เลือกพนักงาน*
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="พิมพ์ค้นหาชื่อ หรือรหัสพนักงาน..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <select
                    value={addForm.employeeId}
                    onChange={(e) => {
                      const empId = Number(e.target.value);
                      const existing = records.find((r) => r.employeeId === empId);
                      setAddForm({
                        ...addForm,
                        employeeId: empId,
                        commissionRate: existing?.commissionRate || defaultRate,
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>-- กรุณาเลือกพนักงาน --</option>
                    {employees
                      .filter(
                        (e) =>
                          !empSearch ||
                          e.employeeName.toLowerCase().includes(empSearch.toLowerCase()) ||
                          e.employeeCode.toLowerCase().includes(empSearch.toLowerCase())
                      )
                      .map((e) => (
                        <option key={e.employeeId} value={e.employeeId}>
                          {e.employeeCode} - {e.employeeName} ({e.departmentName || 'ไม่มีแผนก'})
                        </option>
                      ))}
                  </select>

                  {selectedEmpRecord && (
                    <div className="mt-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 p-2 text-[11px] text-blue-800 dark:text-blue-300">
                      ℹ️ <strong>ยอดเดิมในงวดนี้:</strong> ฿
                      {selectedEmpRecord.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (คอมมิชชั่น ฿
                      {selectedEmpRecord.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                    </div>
                  )}
                </div>

                {/* Job Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      วันที่ทำรายการ
                    </label>
                    <input
                      type="date"
                      value={addJobDate}
                      onChange={(e) => setAddJobDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                      ชื่องาน / ออเดอร์
                    </label>
                    <input
                      type="text"
                      value={addJobTitle}
                      onChange={(e) => setAddJobTitle(e.target.value)}
                      placeholder="เช่น ออเดอร์ #PO-104"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Sales Amount */}
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    ยอดขาย (บาท)*
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addForm.salesAmount || ''}
                    placeholder="0.00"
                    onChange={(e) =>
                      setAddForm({ ...addForm, salesAmount: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Rate & Special */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      อัตราคอมมิชชั่น (%)*
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={addForm.commissionRate}
                      onChange={(e) =>
                        setAddForm({ ...addForm, commissionRate: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      เงินพิเศษ (บาท)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={addForm.specialAmount || ''}
                      placeholder="0.00"
                      onChange={(e) =>
                        setAddForm({ ...addForm, specialAmount: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Calculated preview */}
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex justify-between font-bold">
                  <span>ค่าคอมมิชชั่นที่คำนวณได้:</span>
                  <span>฿{thisJobTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                {/* Note */}
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <input
                    type="text"
                    value={addForm.note || ''}
                    onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                    placeholder="เช่น ปิดการขายโครงการ A"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdd}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 9. Supported File Formats Guide Modal */}
      <SupportedCommissionFormatsModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
