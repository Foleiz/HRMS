'use client';

import { ModalShell } from '@/components/ui/ModalShell';
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
  Eye,
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
  CommissionBatchEntry,
  CommissionMonthlyPeriod,
  UpdateCommissionItemPayload,
  AddManualCommissionPayload,
  OverlapResolutionMode,
} from '@/types/commission';
import { EmployeeSalaryOverview } from '@/types/payroll';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { confirmAction, hrmsSwal, showError } from '@/lib/sweetalert';
import { TablePagination } from '@/components/ui/TablePagination';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { getSmartYearRange } from '@/lib/yearUtils';
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
  const [summaryPage, setSummaryPage] = useState<number>(1);
  const [summaryPageSize, setSummaryPageSize] = useState<number>(10);

  // Upload & Drag-and-drop State
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<CommissionPreviewResult | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isExecutingImport, setIsExecutingImport] = useState<boolean>(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const [isRecalculatingRate, setIsRecalculatingRate] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Batch History State
  const [batches, setBatches] = useState<CommissionImportBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [batchPage, setBatchPage] = useState<number>(1);
  const [batchPageSize, setBatchPageSize] = useState<number>(10);
  const [batchTotalPages, setBatchTotalPages] = useState<number>(1);
  const [batchTotalCount, setBatchTotalCount] = useState<number>(0);
  const [revertingBatchId, setRevertingBatchId] = useState<number | null>(null);

  // Batch Records Popup State
  const [selectedBatchForDetails, setSelectedBatchForDetails] = useState<CommissionImportBatch | null>(null);
  const [batchRecords, setBatchRecords] = useState<CommissionBatchEntry[]>([]);
  const [isLoadingBatchRecords, setIsLoadingBatchRecords] = useState<boolean>(false);
  const [batchRecordsSearch, setBatchRecordsSearch] = useState<string>('');
  const [batchRecordsPage, setBatchRecordsPage] = useState<number>(1);
  const [batchRecordsPageSize, setBatchRecordsPageSize] = useState<number>(10);

  // Monthly Periods Summary Rows State (เหมือนประวัติแต่เป็นงวดเดือน)
  const [monthlyPeriods, setMonthlyPeriods] = useState<CommissionMonthlyPeriod[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState<boolean>(false);
  const [periodsSearch, setPeriodsSearch] = useState<string>('');
  const [periodsPage, setPeriodsPage] = useState<number>(1);
  const [periodsPageSize, setPeriodsPageSize] = useState<number>(10);
  const [selectedPeriodForDetails, setSelectedPeriodForDetails] = useState<CommissionMonthlyPeriod | null>(null);
  const [periodSummaryForDetails, setPeriodSummaryForDetails] = useState<CommissionPeriodSummary | null>(null);
  const [periodAllEntriesForDetails, setPeriodAllEntriesForDetails] = useState<CommissionBatchEntry[]>([]);
  const [isLoadingPeriodModal, setIsLoadingPeriodModal] = useState<boolean>(false);
  const [periodModalTab, setPeriodModalTab] = useState<'EMPLOYEES' | 'ALL_DAYS'>('EMPLOYEES');
  const [periodModalSearch, setPeriodModalSearch] = useState<string>('');
  const [periodModalPage, setPeriodModalPage] = useState<number>(1);
  const [periodModalPageSize, setPeriodModalPageSize] = useState<number>(10);

  // Employee Sub-entries Modal State
  const [selectedEmployeeForEntries, setSelectedEmployeeForEntries] = useState<CommissionRecord | null>(null);
  const [selectedEmployeePeriodInfo, setSelectedEmployeePeriodInfo] = useState<{ year: number; month: number } | null>(null);
  const [employeeEntries, setEmployeeEntries] = useState<CommissionBatchEntry[]>([]);
  const [isLoadingEmployeeEntries, setIsLoadingEmployeeEntries] = useState<boolean>(false);

  // Overlap Resolution Modal State
  const [showOverlapModal, setShowOverlapModal] = useState<boolean>(false);
  const [pendingOverlapPreview, setPendingOverlapPreview] = useState<CommissionPreviewResult | null>(null);
  const [overlapMode, setOverlapMode] = useState<OverlapResolutionMode>('USE_NEW');

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

  // Recalculate Period with Current Default Rate
  const handleApplyDefaultRate = async () => {
    if (isPeriodConfirmed) return;
    try {
      setIsRecalculatingRate(true);
      const res = await commissionService.recalculatePeriod(selectedYear, selectedMonth, defaultRate);
      setSummary(res);
      success(`คำนวณยอดค่าคอมมิชชั่นทั้งงวดใหม่ด้วยอัตรา ${defaultRate}% สำเร็จ`);
      await loadMonthlyPeriods(selectedYear);
    } catch (err: any) {
      error(err?.response?.data?.message || 'คำนวณใหม่ไม่สำเร็จ');
    } finally {
      setIsRecalculatingRate(false);
    }
  };

  // Load Monthly Periods
  const loadMonthlyPeriods = async (y = selectedYear) => {
    try {
      setIsLoadingPeriods(true);
      const data = await commissionService.getMonthlyPeriods(y);
      setMonthlyPeriods(data || []);
    } catch (err) {
      console.error('Failed to load monthly periods:', err);
    } finally {
      setIsLoadingPeriods(false);
    }
  };

  // Open Monthly Period Details Popup Modal
  const handleOpenPeriodDetails = async (period: CommissionMonthlyPeriod) => {
    setSelectedPeriodForDetails(period);
    setPeriodModalTab('EMPLOYEES');
    setPeriodModalSearch('');
    setPeriodModalPage(1);
    setIsLoadingPeriodModal(true);
    try {
      const [sum, entries] = await Promise.all([
        commissionService.getCommissionPeriod(period.year, period.month),
        commissionService.getPeriodAllEntries(period.year, period.month),
      ]);
      setPeriodSummaryForDetails(sum);
      setPeriodAllEntriesForDetails(entries || []);
    } catch {
      error('ไม่สามารถโหลดรายละเอียดของงวดเดือนนี้ได้');
    } finally {
      setIsLoadingPeriodModal(false);
    }
  };

  // Load Batches
  const loadBatches = async (page = 1, size = batchPageSize) => {
    try {
      setIsLoadingBatches(true);
      const res = await commissionService.getCommissionBatches(page, size);
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
    loadMonthlyPeriods(selectedYear);
    loadBatches(1);
    setSummaryPage(1);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    setSummaryPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setPeriodsPage(1);
  }, [periodsSearch]);

  // Handle Opening Add Work for Specific Employee
  const handleOpenAddWorkForEmployee = (
    record: CommissionRecord,
    year: number = selectedYear,
    month: number = selectedMonth
  ) => {
    loadEmployees();
    setAddJobDate(new Date().toISOString().slice(0, 10));
    setAddJobTitle('');
    setAddForm({
      employeeId: record.employeeId,
      year: year,
      month: month,
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

  // Select File Handler (No auto modal popup, show selected file state like Picture 2)
  const processSelectedFile = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      error('รองรับเฉพาะไฟล์ .xlsx, .xls หรือ .csv เท่านั้น');
      return;
    }
    setSelectedFile(file);
  };

  // Open Batch Details Popup Modal
  const handleOpenBatchDetails = async (batch: CommissionImportBatch) => {
    setSelectedBatchForDetails(batch);
    setBatchRecordsSearch('');
    setBatchRecordsPage(1);
    setIsLoadingBatchRecords(true);
    try {
      const records = await commissionService.getBatchRecords(batch.id);
      setBatchRecords(records || []);
    } catch {
      error('ไม่สามารถโหลดรายการข้อมูลในชุดนำเข้าได้');
      setBatchRecords([]);
    } finally {
      setIsLoadingBatchRecords(false);
    }
  };

  // Open Employee Sub-entries Breakdown Modal
  const handleOpenEmployeeEntries = async (
    record: CommissionRecord,
    year: number = selectedYear,
    month: number = selectedMonth
  ) => {
    setSelectedEmployeeForEntries(record);
    setSelectedEmployeePeriodInfo({ year, month });
    setIsLoadingEmployeeEntries(true);
    try {
      const data = await commissionService.getEmployeePeriodEntries(
        record.employeeId,
        year,
        month
      );
      setEmployeeEntries(data || []);
    } catch {
      error('ไม่สามารถโหลดรายการย่อยของพนักงานได้');
      setEmployeeEntries([]);
    } finally {
      setIsLoadingEmployeeEntries(false);
    }
  };

  // Execute Actual Import with Overlap Resolution Mode
  const executeImport = async (mode: OverlapResolutionMode = 'USE_NEW') => {
    if (!selectedFile) return;

    try {
      setIsExecutingImport(true);
      setShowOverlapModal(false);

      const res = await commissionService.importCommissionFile(
        selectedFile,
        selectedYear,
        selectedMonth,
        defaultRate,
        mode
      );

      setSummary(res.summary);

      let msg = `นำเข้าสำเร็จ (${res.detectedTypeLabel}): ${res.totalImported} รายการ`;
      if (mode === 'USE_NEW' && res.replacedCount > 0) {
        msg += ` (แทนที่ข้อมูลเดิม ${res.replacedCount} รายการ)`;
      } else if (mode === 'USE_OLD' && res.skippedCount > 0) {
        msg += ` (ข้ามข้อมูลวันที่ซ้ำเดิม ${res.skippedCount} รายการ)`;
      } else if (mode === 'COMBINE_ALL') {
        msg += ` (สะสมยอดรวมทั้งหมด)`;
      }
      success(msg);

      if (res.warnings && res.warnings.length > 0) {
        info(`พบคำเตือน ${res.warnings.length} รายการ: ${res.warnings.slice(0, 2).join('; ')}`);
      }

      setIsPreviewModalOpen(false);
      setSelectedFile(null);
      setPreviewData(null);
      setPendingOverlapPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Reload Data and Batch History
      await loadCommissionData(selectedYear, selectedMonth);
      await loadMonthlyPeriods(selectedYear);
      await loadBatches(1);
    } catch (err: any) {
      error(err?.response?.data?.message || 'การนำเข้าไฟล์ล้มเหลว กรุณาตรวจสอบไฟล์');
    } finally {
      setIsExecutingImport(false);
    }
  };

  // Confirm Final Import (Checks for Overlapping Dates first)
  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    try {
      setIsExecutingImport(true);

      // 1. Pre-check file using preview API to detect overlaps & locked status
      let preview: CommissionPreviewResult | null = null;
      try {
        preview = await commissionService.previewCommissionFile(
          selectedFile,
          selectedYear,
          selectedMonth,
          defaultRate
        );
      } catch (err: any) {
        error(err?.response?.data?.message || 'ไม่สามารถตรวจสอบไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์');
        setIsExecutingImport(false);
        return;
      }

      // Check if period is locked (PAID)
      if (preview.isLockedPeriod) {
        setIsExecutingImport(false);
        await showError(
          'ไม่สามารถนำเข้าข้อมูลได้',
          preview.lockReason || 'งวดนี้มีสถานะจ่ายเงินแล้ว (PAID) ไม่สามารถนำเข้าข้อมูลทับได้'
        );
        return;
      }

      // 2. If overlapping dates detected, prompt user to choose resolution mode
      if (preview.hasOverlappingEntries || (preview.overlappingCount ?? 0) > 0 || preview.replacedEntriesCount > 0) {
        setIsExecutingImport(false);
        setPendingOverlapPreview(preview);
        setOverlapMode('USE_NEW');
        setShowOverlapModal(true);
        return;
      }

      // 3. No overlap -> proceed directly with default USE_NEW
      await executeImport('USE_NEW');
    } catch (err: any) {
      error(err?.response?.data?.message || 'การนำเข้าไฟล์ล้มเหลว กรุณาตรวจสอบไฟล์');
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
      await loadMonthlyPeriods(selectedYear);
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
      await loadMonthlyPeriods(selectedYear);
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
      await loadMonthlyPeriods(selectedYear);
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
      await loadMonthlyPeriods(selectedYear);

      if (selectedPeriodForDetails) {
        const [sum, entries] = await Promise.all([
          commissionService.getCommissionPeriod(selectedPeriodForDetails.year, selectedPeriodForDetails.month),
          commissionService.getPeriodAllEntries(selectedPeriodForDetails.year, selectedPeriodForDetails.month),
        ]);
        setPeriodSummaryForDetails(sum);
        setPeriodAllEntriesForDetails(entries || []);
      }
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

      const targetYear = addForm.year || selectedYear;
      const targetMonth = addForm.month || selectedMonth;

      await commissionService.addManualCommission({
        ...addForm,
        year: targetYear,
        month: targetMonth,
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
      await loadMonthlyPeriods(selectedYear);

      if (selectedPeriodForDetails) {
        const [sum, entries] = await Promise.all([
          commissionService.getCommissionPeriod(selectedPeriodForDetails.year, selectedPeriodForDetails.month),
          commissionService.getPeriodAllEntries(selectedPeriodForDetails.year, selectedPeriodForDetails.month),
        ]);
        setPeriodSummaryForDetails(sum);
        setPeriodAllEntriesForDetails(entries || []);
      }
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
      await loadMonthlyPeriods(selectedYear);
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

  const totalSummaryPages = Math.max(1, Math.ceil(filteredRecords.length / summaryPageSize));
  const safeSummaryPage = Math.min(Math.max(1, summaryPage), totalSummaryPages);
  const pagedRecords = filteredRecords.slice(
    (safeSummaryPage - 1) * summaryPageSize,
    safeSummaryPage * summaryPageSize
  );

  const isPeriodConfirmed = summary?.status === 'CONFIRMED' || summary?.status === 'PAID';

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Batch Records Filter & Pagination (for Batch Details Popup Modal)
  const filteredBatchRecords = batchRecords.filter((r) => {
    if (!batchRecordsSearch.trim()) return true;
    const q = batchRecordsSearch.toLowerCase();
    return (
      r.employeeCode.toLowerCase().includes(q) ||
      r.employeeName.toLowerCase().includes(q) ||
      (r.departmentName && r.departmentName.toLowerCase().includes(q))
    );
  });
  const totalBatchRecordsPages = Math.max(1, Math.ceil(filteredBatchRecords.length / batchRecordsPageSize));
  const safeBatchRecordsPage = Math.min(Math.max(1, batchRecordsPage), totalBatchRecordsPages);
  const pagedBatchRecords = filteredBatchRecords.slice(
    (safeBatchRecordsPage - 1) * batchRecordsPageSize,
    safeBatchRecordsPage * batchRecordsPageSize
  );

  // Filter & Pagination for Monthly Periods Overview (Section 5)
  const filteredMonthlyPeriods = monthlyPeriods.filter((p) => {
    // ซ่อนงวดฉบับร่างที่ไม่มีข้อมูลใดๆ หลงเหลืออยู่ (เช่น หลังกดยกเลิกไฟล์ทั้งหมด)
    if (
      p.status === 'DRAFT' &&
      p.batchCount === 0 &&
      p.totalEmployees === 0 &&
      p.totalSalesAmount === 0 &&
      p.totalCommissionAmount === 0
    ) {
      return false;
    }

    if (!periodsSearch.trim()) return true;
    const q = periodsSearch.toLowerCase().trim();
    const matchLabel = p.monthLabel.toLowerCase().includes(q);
    const matchMonthNum = p.month.toString() === q || p.month.toString().padStart(2, '0') === q;
    const matchYear = p.year.toString().includes(q) || (p.year + 543).toString().includes(q);
    const matchDateRange = p.dateRange.toLowerCase().includes(q);
    const statusLabel =
      p.status === 'CONFIRMED'
        ? 'ยืนยันแล้ว confirmed'
        : p.status === 'PAID'
        ? 'จ่ายเงินแล้ว paid'
        : 'ฉบับร่าง draft สะสมยอดเพิ่มได้';
    const matchStatus = statusLabel.toLowerCase().includes(q);
    return matchLabel || matchMonthNum || matchYear || matchDateRange || matchStatus;
  });

  const totalPeriodsPages = Math.max(1, Math.ceil(filteredMonthlyPeriods.length / periodsPageSize));
  const safePeriodsPage = Math.min(Math.max(1, periodsPage), totalPeriodsPages);
  const pagedMonthlyPeriods = filteredMonthlyPeriods.slice(
    (safePeriodsPage - 1) * periodsPageSize,
    safePeriodsPage * periodsPageSize
  );

  // Filter & Pagination for Monthly Period Details Modal
  const modalRecords = periodSummaryForDetails?.records || [];
  const filteredModalRecords = modalRecords.filter(
    (r) =>
      r.employeeName.toLowerCase().includes(periodModalSearch.toLowerCase()) ||
      r.employeeCode.toLowerCase().includes(periodModalSearch.toLowerCase()) ||
      (r.departmentName && r.departmentName.toLowerCase().includes(periodModalSearch.toLowerCase()))
  );

  const filteredModalEntries = periodAllEntriesForDetails.filter(
    (e) =>
      e.employeeName.toLowerCase().includes(periodModalSearch.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(periodModalSearch.toLowerCase()) ||
      (e.departmentName && e.departmentName.toLowerCase().includes(periodModalSearch.toLowerCase())) ||
      (e.batchFileName && e.batchFileName.toLowerCase().includes(periodModalSearch.toLowerCase())) ||
      e.dateFrom.includes(periodModalSearch) ||
      e.dateTo.includes(periodModalSearch)
  );

  const modalActiveListCount = periodModalTab === 'EMPLOYEES' ? filteredModalRecords.length : filteredModalEntries.length;
  const totalModalPages = Math.max(1, Math.ceil(modalActiveListCount / periodModalPageSize));
  const safeModalPage = Math.min(Math.max(1, periodModalPage), totalModalPages);

  const pagedModalRecords = filteredModalRecords.slice(
    (safeModalPage - 1) * periodModalPageSize,
    safeModalPage * periodModalPageSize
  );

  const pagedModalEntries = filteredModalEntries.slice(
    (safeModalPage - 1) * periodModalPageSize,
    safeModalPage * periodModalPageSize
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Toolbar & Filters */}
      <div className="flex flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:px-4 sm:py-3 shadow-xs overflow-x-auto">
        {/* Left: Period & Rate Controls (Single line) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Year & Month Selector */}
          <div className="flex items-center gap-2">
            {/* Year Selector */}
            <div className="w-28 sm:w-32">
              <CustomSelect
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                numbered={false}
                size="sm"
                className="w-full text-xs font-bold"
                title="เลือกปี พ.ศ."
              >
                {getSmartYearRange({
                  forwardYears: 1,
                  backYears: 4,
                  historicalYears: monthlyPeriods.map((p) => p.year),
                  selectedYear,
                }).map((y) => (
                  <option key={y} value={y}>
                    ปี {y + 543}
                  </option>
                ))}
              </CustomSelect>
            </div>

            {/* Month Selector */}
            <div className="w-32 sm:w-36">
              <CustomSelect
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                numbered={false}
                size="sm"
                className="w-full text-xs font-bold"
                title="เลือกเดือน"
              >
                {THAI_MONTHS.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </CustomSelect>
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
            {!isPeriodConfirmed && summary && summary.records && summary.records.length > 0 && (
              <button
                type="button"
                onClick={handleApplyDefaultRate}
                disabled={isRecalculatingRate}
                title={`นำอัตรา ${defaultRate}% ไปคำนวณใหม่กับทุกรายการในงวดนี้`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs ml-1"
              >
                {isRecalculatingRate ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>คำนวณใหม่</span>}
              </button>
            )}
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

          {/* Add Manual Item */}
          {!isPeriodConfirmed && (
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
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800/80 bg-blue-100/60 dark:bg-blue-950/40 p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              ยอดขายรวมทั้งบริษัท
            </span>
            <div className="text-2xl font-bold tracking-tight text-blue-950 dark:text-white">
              ฿
              {(summary?.totalSalesAmount ?? summary?.totalSales ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-[11px] text-blue-600/80 dark:text-blue-400 font-medium">
              รอบเดือน {THAI_MONTHS[selectedMonth - 1]} {selectedYear + 543}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Total Commission */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-100/60 dark:bg-emerald-950/40 p-5 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              ค่าคอมมิชชั่นรวมที่ต้องจ่าย
            </span>
            <div className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-white">
              ฿
              {(summary?.totalCommissionAmount ?? summary?.totalCommission ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300 font-medium">
              ดึงเข้าเป็นเงินได้ในงวดเงินเดือน
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Employee Count */}
        <div className="rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-purple-100/60 dark:bg-purple-950/40 p-5 shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
              พนักงานที่ได้รับค่าคอม
            </span>
            <div className="text-2xl font-bold tracking-tight text-purple-950 dark:text-white">
              {summary?.totalEmployees ?? 0}{' '}
              <span className="text-sm font-normal text-purple-700 dark:text-purple-300">คน</span>
            </div>
            <p className="text-[11px] text-purple-600/80 dark:text-purple-400 font-medium">จากข้อมูลที่มีในงวดนี้</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/80 shadow-2xs">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4: Status */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/80 bg-amber-100/60 dark:bg-amber-950/40 p-5 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition-all flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              สถานะรอบคอมมิชชั่น
            </span>
            <div>
              {summary?.status === 'CONFIRMED' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> ยืนยันแล้ว (พร้อมคิดเงินเดือน)
                </span>
              ) : summary?.status === 'PAID' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
                  <Lock className="h-3.5 w-3.5 text-blue-600" /> จ่ายพร้อมเงินเดือนแล้ว
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> ฉบับร่าง (ยังไม่ยืนยัน)
                </span>
              )}
            </div>
            {summary?.confirmedAt && (
              <p className="text-[10px] text-amber-700/80 dark:text-amber-400 font-medium">
                ยืนยันโดย {summary.confirmedByName || 'HR'} เมื่อ{' '}
                {new Date(summary.confirmedAt).toLocaleDateString('th-TH')}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-amber-200/80 dark:border-amber-800/80 shadow-2xs">
            {isPeriodConfirmed ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-600" />
            )}
          </div>
        </div>
      </div>

      {/* 3. Unified File Upload Dropzone (Automatic Mode Detection — No Manual Choice Cards) */}
      {!isPeriodConfirmed && (
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

              <button
                type="button"
                disabled={!selectedFile || isExecutingImport}
                onClick={handleConfirmImport}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-all ${
                  !selectedFile || isExecutingImport
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-[0.98] cursor-pointer'
                }`}
              >
                {isExecutingImport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังนำเข้าและประมวลผล...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>เริ่มประมวลผลนำเข้าไฟล์</span>
                  </>
                )}
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
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
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

              {selectedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ขนาด: {formatFileSize(selectedFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>ยกเลิกเลือกไฟล์</span>
                  </button>
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

      {/* 5. Monthly Periods Overview Section (Table similar to History) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-h-9">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900 shadow-2xs">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                สรุปค่าคอมมิชชั่นประจำงวดเดือน (Monthly Periods Overview)
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  {filteredMonthlyPeriods.length} {filteredMonthlyPeriods.length !== monthlyPeriods.length ? `จาก ${monthlyPeriods.length} ` : ''}งวด
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                รวมข้อมูลทุกไฟล์ที่นำเข้าในแต่ละงวดเดือน (กด &quot;ดูรายการสรุป&quot; เพื่อดูรายละเอียดรวมทุกวันในเดือนนั้น)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Search Input */}
            <div className="relative w-56 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหางวดเดือน, วันที่, สถานะ..."
                value={periodsSearch}
                onChange={(e) => setPeriodsSearch(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition shadow-2xs"
              />
              {periodsSearch && (
                <button
                  type="button"
                  onClick={() => setPeriodsSearch('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => loadMonthlyPeriods(selectedYear)}
              disabled={isLoadingPeriods}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingPeriods ? 'animate-spin' : ''}`} />
              <span>รีเฟรชงวด</span>
            </button>
          </div>
        </div>

        {/* Table inside inner container with rounded corners */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-standard w-full text-left text-xs border-collapse whitespace-nowrap">
              <thead className="bg-[#0B2046] text-white font-semibold">
                <tr className="whitespace-nowrap">
                  <th className="py-3.5 px-4 font-semibold">งวดเดือน</th>
                  <th className="py-3.5 px-4 text-center font-semibold">ช่วงวันที่ที่มีข้อมูล</th>
                  <th className="py-3.5 px-4 text-center font-semibold">จำนวนไฟล์นำเข้า</th>
                  <th className="py-3.5 px-4 text-center font-semibold">จำนวนพนักงาน</th>
                  <th className="py-3.5 px-4 text-right font-semibold">ยอดขายรวม (บาท)</th>
                  <th className="py-3.5 px-4 text-right font-bold">ยอดรวมคอมมิชชั่น (บาท)</th>
                  <th className="py-3.5 px-4 text-center font-semibold">สถานะ</th>
                  <th className="py-3.5 px-4 text-center font-semibold">จัดการ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {isLoadingPeriods ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                      <p className="mt-2 text-xs">กำลังโหลดข้อมูลงวดค่าคอมมิชชั่น...</p>
                    </td>
                  </tr>
                ) : filteredMonthlyPeriods.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                      <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">
                        {periodsSearch ? 'ไม่พบงวดเดือนที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลค่าคอมมิชชั่นในปีนี้'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {periodsSearch
                          ? 'ลองเปลี่ยนคำค้นหา หรือกดล้างการค้นหา'
                          : 'สามารถนำเข้าไฟล์ Excel/CSV ในกล่องอัปโหลดด้านบนเพื่อเริ่มบันทึกข้อมูล'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  pagedMonthlyPeriods.map((p) => (
                    <tr
                      key={`${p.year}-${p.month}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                            {p.month}
                          </div>
                          <span>{p.monthLabel}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {p.dateRange !== '-' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{p.dateRange}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                          <span>{p.batchCount} ไฟล์</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {p.totalEmployees} คน
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        ฿{p.totalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs whitespace-nowrap">
                        ฿{p.totalCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            p.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : p.status === 'PAID'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {p.status === 'CONFIRMED'
                            ? 'ยืนยันแล้ว'
                            : p.status === 'PAID'
                            ? 'จ่ายเงินแล้ว'
                            : 'ฉบับร่าง (สะสมยอดเพิ่มได้)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenPeriodDetails(p)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 shadow-2xs transition active:scale-95 cursor-pointer"
                          title="ดูรายการสรุปรวมทั้งเดือน (รวมทุกไฟล์และทุกวัน)"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>ดูรายการสรุป</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Periods Pagination */}
        <TablePagination
          total={filteredMonthlyPeriods.length}
          page={safePeriodsPage}
          pageSize={periodsPageSize}
          onPageChange={(p) => setPeriodsPage(p)}
          onPageSizeChange={(newSize) => {
            setPeriodsPageSize(newSize);
            setPeriodsPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>

      {/* 6. Batch Import History Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-h-9">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-100 dark:border-purple-900 shadow-2xs">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingBatches ? 'animate-spin' : ''}`} />
            <span>รีเฟรชประวัติ</span>
          </button>
        </div>

        {/* Table inside inner container with rounded corners */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-standard w-full min-w-[900px] text-left text-xs border-collapse whitespace-nowrap">
              <thead className="bg-[#0B2046] text-white font-semibold">
                <tr className="whitespace-nowrap">
                  <th className="py-3.5 px-4 text-center w-12">#ID</th>
                  <th className="py-3.5 px-4">วันที่/เวลานำเข้า</th>
                  <th className="py-3.5 px-4">ชื่อไฟล์</th>
                  <th className="py-3.5 px-4 text-center">รูปแบบที่ตรวจจับ</th>
                  <th className="py-3.5 px-4 text-center">ช่วงวันที่</th>
                  <th className="py-3.5 px-4 text-center">พนักงาน</th>
                  <th className="py-3.5 px-4 text-center">นำเข้าสำเร็จ</th>
                  <th className="py-3.5 px-4 text-center">ทับยอดเดิม</th>
                  <th className="py-3.5 px-4 text-right">ยอดรวมคอมมิชชั่น</th>
                  <th className="py-3.5 px-4">ผู้นำเข้า</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-center">จัดการ</th>
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
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-500">
                      #{b.id}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {new Date(b.importedAt).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-medium max-w-xs truncate text-slate-900 dark:text-slate-100" title={b.fileName || ''}>
                      {b.fileName || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
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
                    <td className="py-3.5 px-4 text-center font-mono text-[11px] whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {b.dateFrom && b.dateTo
                        ? b.dateFrom === b.dateTo
                          ? b.dateFrom
                          : `${b.dateFrom} - ${b.dateTo}`
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium">
                      {b.employeeCount} คน
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {b.successRows}
                      </span>{' '}
                      / {b.totalRows}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-amber-600 dark:text-amber-400 font-medium">
                      {b.replacedEntries > 0 ? `${b.replacedEntries} รายการ` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                      ฿{b.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {b.importedByUserName || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {b.status === 'IMPORTED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
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
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenBatchDetails(b)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-2xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900 transition cursor-pointer"
                          title="ดูรายการข้อมูลในชุดนี้"
                        >
                          <Eye className="h-3 w-3" />
                          <span>ดูรายการ</span>
                        </button>
                        {b.status === 'IMPORTED' && !isPeriodConfirmed && (
                          <button
                            type="button"
                            onClick={() => handleRevertBatch(b)}
                            disabled={revertingBatchId === b.id}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-2xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition cursor-pointer disabled:opacity-50"
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Pagination */}
      <TablePagination
        total={batchTotalCount}
        page={batchPage}
        pageSize={batchPageSize}
        onPageChange={(p) => loadBatches(p, batchPageSize)}
        onPageSizeChange={(newSize) => {
          setBatchPageSize(newSize);
          loadBatches(1, newSize);
        }}
        pageSizeOptions={[10, 20, 50]}
      />
    </div>

      {/* 7. Edit Item Modal */}
      {editingRecord && (
        <ModalShell className="z-[70] bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
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

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  อัตราคอมมิชชั่น (%)
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

              {/* Calculated preview */}
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex justify-between font-bold">
                  <span>ค่าคอมมิชชั่นคำนวณสุทธิ:</span>
                  <span>
                    ฿
                    {(
                      editForm.salesAmount * (editForm.commissionRate / 100)
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
        </ModalShell>
      )}

      {/* 8. Add Manual Record Modal */}
      {isAddModalOpen && (() => {
        const selectedEmpRecord = records.find((r) => r.employeeId === addForm.employeeId);
        const thisJobSales = Number(addForm.salesAmount) || 0;
        const thisJobCommissionRate = Number(addForm.commissionRate) || 0;
        const thisJobCommissionAmount = thisJobSales * (thisJobCommissionRate / 100);
        const thisJobTotal = thisJobCommissionAmount;

        return (
          <ModalShell className="z-[70] bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
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
                  <CustomSelect
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
                    numbered={false}
                    className="w-full text-xs font-semibold"
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
                  </CustomSelect>

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

                {/* Rate */}
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
          </ModalShell>
        );
      })()}

      {/* 8. Batch Records Detail Popup Modal */}
      {selectedBatchForDetails && (
        <ModalShell className="z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 flex items-center justify-center shadow-xs">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      รายการข้อมูลค่าคอมมิชชั่นในชุดนำเข้า #{selectedBatchForDetails.id}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        selectedBatchForDetails.status === 'IMPORTED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : selectedBatchForDetails.status === 'REVERTED'
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {selectedBatchForDetails.status === 'IMPORTED' ? 'ใช้งานอยู่' : selectedBatchForDetails.status === 'REVERTED' ? 'ยกเลิกแล้ว' : selectedBatchForDetails.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ไฟล์: <strong>{selectedBatchForDetails.fileName || '-'}</strong> | วันที่นำเข้า: {new Date(selectedBatchForDetails.importedAt).toLocaleString('th-TH')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedBatchForDetails(null);
                  setBatchRecords([]);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Stat Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">จำนวนรายการ</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {batchRecords.length}{' '}
                    <span className="text-xs font-normal text-slate-500">แถว</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">จำนวนพนักงาน</div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                    {new Set(batchRecords.map((r) => r.employeeId)).size}{' '}
                    <span className="text-xs font-normal text-slate-500">คน</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">ยอดขายรวม</div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                    ฿{batchRecords.reduce((sum, r) => sum + r.salesAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">คอมมิชชั่นรวม</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    ฿{batchRecords.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 min-h-9">
                <div className="relative flex-1 sm:max-w-xs w-full">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหารหัส, ชื่อพนักงาน หรือแผนก..."
                    value={batchRecordsSearch}
                    onChange={(e) => {
                      setBatchRecordsSearch(e.target.value);
                      setBatchRecordsPage(1);
                    }}
                    className="w-full h-9 pl-9 pr-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  แสดง {filteredBatchRecords.length} จาก {batchRecords.length} รายการ
                </div>
              </div>

              {/* Table inside inner container with rounded corners */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-standard w-full min-w-[900px] text-left text-xs border-collapse whitespace-nowrap">
                    <thead className="bg-[#0B2046] text-white font-semibold">
                      <tr className="whitespace-nowrap">
                        <th className="py-3.5 px-4 font-semibold">รหัสพนักงาน</th>
                        <th className="py-3.5 px-4 font-semibold">ชื่อ-นามสกุล</th>
                        <th className="py-3.5 px-4 font-semibold">แผนก / ตำแหน่ง</th>
                        <th className="py-3.5 px-4 text-center">ช่วงวันที่</th>
                        <th className="py-3.5 px-4 text-right font-semibold">ยอดขายรวม (บาท)</th>
                        <th className="py-3.5 px-4 text-center font-semibold">อัตรา (%)</th>
                        <th className="py-3.5 px-4 text-right font-bold">ค่าคอมมิชชั่น (บาท)</th>
                        <th className="py-3.5 px-4 font-semibold">หมายเหตุ</th>
                        <th className="py-3.5 px-4 text-center font-semibold">สถานะ</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {isLoadingBatchRecords ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                            <p className="mt-2 text-xs">กำลังโหลดรายการข้อมูลในชุดนำเข้า...</p>
                          </td>
                        </tr>
                      ) : filteredBatchRecords.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                            <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">
                              ไม่พบรายการข้อมูลในชุดนี้
                            </p>
                          </td>
                        </tr>
                      ) : (
                        pagedBatchRecords.map((r) => (
                          <tr
                            key={r.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {r.employeeCode}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {r.employeeName}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{r.departmentName || '-'}</div>
                              <div className="text-[11px] text-slate-400 font-normal">{r.positionName || '-'}</div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {r.dateFrom === r.dateTo ? r.dateFrom : `${r.dateFrom} ถึง ${r.dateTo}`}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              ฿{r.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className="inline-flex items-center justify-center min-w-10 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-slate-800 dark:text-slate-200 shadow-2xs">
                                {r.commissionRate}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs whitespace-nowrap">
                              ฿{r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {r.note ? (
                                <span className="inline-block px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs max-w-xs truncate" title={r.note}>
                                  {r.note}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  r.status === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : r.status === 'SUPERSEDED'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {r.status === 'ACTIVE' ? 'ใช้งานอยู่' : r.status === 'SUPERSEDED' ? 'ถูกแทนที่' : r.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <TablePagination
                total={filteredBatchRecords.length}
                page={safeBatchRecordsPage}
                pageSize={batchRecordsPageSize}
                onPageChange={setBatchRecordsPage}
                onPageSizeChange={setBatchRecordsPageSize}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                รวมทั้งหมด {batchRecords.length} รายการ
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBatchForDetails(null);
                  setBatchRecords([]);
                }}
                className="rounded-xl px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 8.5. Employee Sub-entries Breakdown Modal */}
      {selectedEmployeeForEntries && (
        <ModalShell className="z-[70] bg-black/70 backdrop-blur-sm animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      ที่มาและรายการย่อยค่าคอมมิชชั่น
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {selectedEmployeeForEntries.employeeCode} - {selectedEmployeeForEntries.employeeName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    แสดงรายการย่อยทั้งหมดในรอบเดือน {THAI_MONTHS[(selectedEmployeePeriodInfo?.month ?? selectedMonth) - 1]} {(selectedEmployeePeriodInfo?.year ?? selectedYear) + 543} (รวมยอดจากทุกไฟล์นำเข้าและงานเพิ่ม)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedEmployeeForEntries(null);
                  setSelectedEmployeePeriodInfo(null);
                  setEmployeeEntries([]);
                }}
                className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Stat Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">ยอดขายรวมทั้งเดือน</div>
                  <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    ฿{selectedEmployeeForEntries.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">อัตรา (%)</div>
                  <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                    {selectedEmployeeForEntries.commissionRate}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">ค่าคอมมิชชั่นสุทธิรวม</div>
                  <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    ฿{selectedEmployeeForEntries.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-standard w-full text-left text-xs border-collapse whitespace-nowrap">
                    <thead className="bg-[#0B2046] text-white font-semibold">
                      <tr className="whitespace-nowrap">
                        <th className="py-3.5 px-4 font-semibold">ช่วงวันที่</th>
                        <th className="py-3.5 px-4 font-semibold">ที่มา / ไฟล์</th>
                        <th className="py-3.5 px-4 text-right font-semibold">ยอดขาย (บาท)</th>
                        <th className="py-3.5 px-4 text-center font-semibold">อัตรา (%)</th>
                        <th className="py-3.5 px-4 text-right font-bold">ค่าคอมมิชชั่น (บาท)</th>
                        <th className="py-3.5 px-4 font-semibold">หมายเหตุ</th>
                        <th className="py-3.5 px-4 text-center font-semibold">วันที่นำเข้า</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {isLoadingEmployeeEntries ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                            <p className="mt-2 text-xs">กำลังโหลดที่มาและรายการย่อย...</p>
                          </td>
                        </tr>
                      ) : employeeEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                            <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">
                              ไม่พบรายการย่อย
                            </p>
                          </td>
                        </tr>
                      ) : (
                        employeeEntries.map((e) => (
                          <tr
                            key={e.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {e.dateFrom === e.dateTo ? e.dateFrom : `${e.dateFrom} ถึง ${e.dateTo}`}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {e.batchFileName ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-xs">
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{e.batchFileName}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs">
                                  <Plus className="w-3 h-3" />
                                  <span>บันทึกด้วยตนเอง</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              ฿{e.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className="inline-flex items-center justify-center min-w-10 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                                {e.commissionRate}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs whitespace-nowrap">
                              ฿{e.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {e.note ? (
                                <span className="inline-block px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs max-w-xs truncate" title={e.note}>
                                  {e.note}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-500 dark:text-slate-400 text-xs font-mono whitespace-nowrap">
                              {new Date(e.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                รวมทั้งหมด {employeeEntries.length} รายการย่อย
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployeeForEntries(null);
                  setSelectedEmployeePeriodInfo(null);
                  setEmployeeEntries([]);
                }}
                className="rounded-xl px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 8.8. Monthly Period Details Popup Modal (รวมวันในเดือนนั้น & สรุปรายคน) */}
      {selectedPeriodForDetails && (
        <ModalShell className="z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 flex items-center justify-center shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      สรุปค่าคอมมิชชั่นประจำงวดเดือน {selectedPeriodForDetails.monthLabel}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        selectedPeriodForDetails.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : selectedPeriodForDetails.status === 'PAID'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {selectedPeriodForDetails.status === 'CONFIRMED'
                        ? 'ยืนยันแล้ว'
                        : selectedPeriodForDetails.status === 'PAID'
                        ? 'จ่ายเงินแล้ว'
                        : 'ฉบับร่าง (สะสมยอดเพิ่มได้เรื่อยๆ)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    รวบรวมข้อมูลจากทุกไฟล์ที่นำเข้า ({selectedPeriodForDetails.batchCount} ไฟล์) และรายการที่บันทึกเพิ่ม — ครอบคลุมช่วงวันที่ {selectedPeriodForDetails.dateRange}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPeriodForDetails(null);
                  setPeriodSummaryForDetails(null);
                  setPeriodAllEntriesForDetails([]);
                }}
                className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Stat Summary Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">ยอดขายรวมทั้งเดือน</div>
                  <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    ฿{selectedPeriodForDetails.totalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">ค่าคอมมิชชั่นสุทธิรวม</div>
                  <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    ฿{selectedPeriodForDetails.totalCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">จำนวนพนักงาน</div>
                  <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                    {selectedPeriodForDetails.totalEmployees} คน
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">ไฟล์ที่นำเข้าในเดือนนี้</div>
                  <div className="text-base font-bold font-mono text-purple-600 dark:text-purple-400">
                    {selectedPeriodForDetails.batchCount} ไฟล์
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs & Search Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodModalTab('EMPLOYEES');
                      setPeriodModalPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      periodModalTab === 'EMPLOYEES'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>สรุปรายพนักงาน ({periodSummaryForDetails?.records.length || 0} คน)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodModalTab('ALL_DAYS');
                      setPeriodModalPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      periodModalTab === 'ALL_DAYS'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>รายการทุกวันในเดือน ({periodAllEntriesForDetails.length} รายการ)</span>
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative flex-1 sm:max-w-xs w-full">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหารหัส, ชื่อพนักงาน หรือไฟล์..."
                    value={periodModalSearch}
                    onChange={(e) => {
                      setPeriodModalSearch(e.target.value);
                      setPeriodModalPage(1);
                    }}
                    className="w-full h-9 pl-9 pr-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Table Content */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  {periodModalTab === 'EMPLOYEES' ? (
                    /* Tab 1: Employee Summary */
                    <table className="table-standard w-full text-left text-xs border-collapse whitespace-nowrap">
                      <thead className="bg-[#0B2046] text-white font-semibold">
                        <tr className="whitespace-nowrap">
                          <th className="py-3.5 px-4 font-semibold">รหัสพนักงาน</th>
                          <th className="py-3.5 px-4 font-semibold">ชื่อ-นามสกุล</th>
                          <th className="py-3.5 px-4 font-semibold">แผนก / ตำแหน่ง</th>
                          <th className="py-3.5 px-4 text-right font-semibold">ยอดขายรวมทั้งเดือน (บาท)</th>
                          <th className="py-3.5 px-4 text-center font-semibold">อัตรา (%)</th>
                          <th className="py-3.5 px-4 text-right font-bold">ค่าคอมมิชชั่นสุทธิ (บาท)</th>
                          <th className="py-3.5 px-4 font-semibold">หมายเหตุ</th>
                          <th className="py-3.5 px-4 text-center font-semibold">ที่มา</th>
                          <th className="py-3.5 px-4 text-center font-semibold">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {isLoadingPeriodModal ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400">
                              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                              <p className="mt-2 text-xs">กำลังโหลดสรุปยอดรายคน...</p>
                            </td>
                          </tr>
                        ) : pagedModalRecords.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400">
                              <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                              <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">
                                ไม่พบข้อมูลพนักงานในงวดนี้
                              </p>
                            </td>
                          </tr>
                        ) : (
                          pagedModalRecords.map((r) => (
                            <tr
                              key={r.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                {r.employeeCode}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                {r.employeeName}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                <div className="font-bold text-slate-800 dark:text-slate-200">{r.departmentName || '-'}</div>
                                <div className="text-[11px] text-slate-400 font-normal">{r.positionName || '-'}</div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                ฿{r.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className="inline-flex items-center justify-center min-w-10 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                                  {r.commissionRate}%
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs whitespace-nowrap">
                                ฿{r.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {r.note ? (
                                  <span className="inline-block px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs max-w-xs truncate" title={r.note}>
                                    {r.note}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEmployeeEntries(r, selectedPeriodForDetails.year, selectedPeriodForDetails.month)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-2xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 transition cursor-pointer"
                                  title="ดูรายการย่อยที่ประกอบเป็นยอดนี้"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>ดูที่มา</span>
                                </button>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {selectedPeriodForDetails.status !== 'CONFIRMED' && selectedPeriodForDetails.status !== 'PAID' ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAddWorkForEmployee(r, selectedPeriodForDetails.year, selectedPeriodForDetails.month)}
                                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 transition cursor-pointer"
                                      title="บันทึกงานเพิ่มให้พนักงานท่านนี้"
                                    >
                                      <Plus className="h-3 w-3" />
                                      <span>+ งานเพิ่ม</span>
                                    </button>
                                    <ActionDropdown
                                      menuClassName="w-32"
                                      items={[
                                        {
                                          label: 'แก้ไขยอด',
                                          icon: <Edit2 className="w-3.5 h-3.5 text-blue-500" />,
                                          onClick: () => {
                                            setEditingRecord(r);
                                            setEditForm({
                                              salesAmount: r.salesAmount,
                                              commissionRate: r.commissionRate,
                                              specialAmount: 0,
                                              note: r.note || '',
                                            });
                                          },
                                        },
                                        {
                                          label: 'ลบรายการ',
                                          icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
                                          danger: true,
                                          onClick: async () => {
                                            await handleDeleteRecord(r);
                                            // Refresh modal
                                            const [sum, entries] = await Promise.all([
                                              commissionService.getCommissionPeriod(selectedPeriodForDetails.year, selectedPeriodForDetails.month),
                                              commissionService.getPeriodAllEntries(selectedPeriodForDetails.year, selectedPeriodForDetails.month),
                                            ]);
                                            setPeriodSummaryForDetails(sum);
                                            setPeriodAllEntriesForDetails(entries || []);
                                          },
                                        },
                                      ]}
                                    />
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
                  ) : (
                    /* Tab 2: All Days / Entries in Month */
                    <table className="table-standard w-full text-left text-xs border-collapse whitespace-nowrap">
                      <thead className="bg-[#0B2046] text-white font-semibold">
                        <tr className="whitespace-nowrap">
                          <th className="py-3.5 px-4 font-semibold">ช่วงวันที่</th>
                          <th className="py-3.5 px-4 font-semibold">รหัสพนักงาน</th>
                          <th className="py-3.5 px-4 font-semibold">ชื่อ-นามสกุล</th>
                          <th className="py-3.5 px-4 font-semibold">ที่มา / ไฟล์</th>
                          <th className="py-3.5 px-4 text-right font-semibold">ยอดขาย (บาท)</th>
                          <th className="py-3.5 px-4 text-center font-semibold">อัตรา (%)</th>
                          <th className="py-3.5 px-4 text-right font-bold">ค่าคอมมิชชั่น (บาท)</th>
                          <th className="py-3.5 px-4 font-semibold">หมายเหตุ</th>
                          <th className="py-3.5 px-4 text-center font-semibold">วันที่นำเข้า</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {isLoadingPeriodModal ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400">
                              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                              <p className="mt-2 text-xs">กำลังโหลดรายการทุกวันในเดือน...</p>
                            </td>
                          </tr>
                        ) : pagedModalEntries.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400">
                              <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                              <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">
                                ไม่พบรายการในงวดนี้
                              </p>
                            </td>
                          </tr>
                        ) : (
                          pagedModalEntries.map((e) => (
                            <tr
                              key={e.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs">
                                  {e.dateFrom === e.dateTo ? e.dateFrom : `${e.dateFrom} ถึง ${e.dateTo}`}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                {e.employeeCode}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                {e.employeeName}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {e.batchFileName ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-xs">
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{e.batchFileName}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs">
                                    <Plus className="w-3 h-3" />
                                    <span>บันทึกด้วยตนเอง</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                ฿{e.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className="inline-flex items-center justify-center min-w-10 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                                  {e.commissionRate}%
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs whitespace-nowrap">
                                ฿{e.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {e.note ? (
                                  <span className="inline-block px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs max-w-xs truncate" title={e.note}>
                                    {e.note}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center text-slate-500 dark:text-slate-400 text-xs font-mono whitespace-nowrap">
                                {new Date(e.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Pagination */}
              <TablePagination
                total={modalActiveListCount}
                page={safeModalPage}
                pageSize={periodModalPageSize}
                onPageChange={setPeriodModalPage}
                onPageSizeChange={setPeriodModalPageSize}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                รวมทั้งหมด {modalActiveListCount} รายการ | รวมค่าคอมมิชชั่นสุทธิ ฿{selectedPeriodForDetails.totalCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2">
                {selectedPeriodForDetails.status !== 'CONFIRMED' && selectedPeriodForDetails.status !== 'PAID' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirmAction({
                        title: `ยืนยันค่าคอมมิชชั่นงวด ${selectedPeriodForDetails.monthLabel}?`,
                        text: `ระบบจะล็อกยอดรวม ฿${selectedPeriodForDetails.totalCommissionAmount.toLocaleString()} เพื่อส่งไปคำนวณเงินเดือน`,
                        confirmButtonText: 'ยืนยันงวดนี้',
                        icon: 'question',
                      });
                      if (!ok) return;
                      try {
                        const res = await commissionService.confirmCommissionPeriod(selectedPeriodForDetails.year, selectedPeriodForDetails.month);
                        success(`ยืนยันค่าคอมมิชชั่นงวด ${selectedPeriodForDetails.monthLabel} สำเร็จ`);
                        setSelectedPeriodForDetails(prev => prev ? { ...prev, status: 'CONFIRMED' } : null);
                        setPeriodSummaryForDetails(res);
                        await loadCommissionData(selectedYear, selectedMonth);
                        await loadMonthlyPeriods(selectedYear);
                      } catch (err: any) {
                        error(err?.response?.data?.message || 'ยืนยันงวดไม่สำเร็จ');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B2046] dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#133066] dark:hover:bg-blue-500 transition active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>ยืนยันค่าคอมมิชชั่นงวดนี้</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeriodForDetails(null);
                    setPeriodSummaryForDetails(null);
                    setPeriodAllEntriesForDetails([]);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 8.9. Overlap Resolution Choice Modal */}
      {showOverlapModal && pendingOverlapPreview && (
        <ModalShell className="z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-amber-50/70 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    ตรวจพบข้อมูลวันที่ซ้ำกันในระบบ
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    ไฟล์ใหม่มีช่วงวันที่ซ้ำกับข้อมูลที่มีอยู่แล้วในระบบ กรุณาเลือกวิธีจัดการข้อมูลในวันที่ซ้ำ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOverlapModal(false);
                  setPendingOverlapPreview(null);
                }}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Overlap Info Badge */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">วันที่ซ้ำกัน:</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                    {pendingOverlapPreview.overlappingDates && pendingOverlapPreview.overlappingDates.length > 0
                      ? pendingOverlapPreview.overlappingDates.join(', ')
                      : 'พบช่วงวันซ้ำ'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">พนักงานที่ได้รับผลกระทบ:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {pendingOverlapPreview.overlappingEmployeesCount ?? 0} คน ({pendingOverlapPreview.overlappingCount ?? pendingOverlapPreview.replacedEntriesCount} รายการ)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">ไฟล์ที่กำลังนำเข้า:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                    {selectedFile?.name}
                  </span>
                </div>
              </div>

              {/* Radio Options */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  เลือกวิธีจัดการข้อมูลวันที่ซ้ำ:
                </p>

                {/* Option 1: USE_NEW */}
                <label
                  onClick={() => setOverlapMode('USE_NEW')}
                  className={`block p-3.5 rounded-xl border transition-all cursor-pointer ${
                    overlapMode === 'USE_NEW'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="overlapMode"
                      value="USE_NEW"
                      checked={overlapMode === 'USE_NEW'}
                      onChange={() => setOverlapMode('USE_NEW')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          1. ใช้ข้อมูลจากไฟล์ใหม่ล่าสุด (แนะนำ)
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          แทนที่เฉพาะวันซ้ำ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        นำเข้าข้อมูลวันใหม่ทั้งหมด และในวันที่ซ้ำจะใช้ยอดจากไฟล์ใหม่นี้แทนที่ข้อมูลเดิม (วันอื่นๆ ที่ไม่ซ้ำจากไฟล์เดิมยังคงอยู่ครบและสะสมยอดต่อ)
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option 2: USE_OLD */}
                <label
                  onClick={() => setOverlapMode('USE_OLD')}
                  className={`block p-3.5 rounded-xl border transition-all cursor-pointer ${
                    overlapMode === 'USE_OLD'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="overlapMode"
                      value="USE_OLD"
                      checked={overlapMode === 'USE_OLD'}
                      onChange={() => setOverlapMode('USE_OLD')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          2. คงข้อมูลจากไฟล์เดิมไว้
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          ข้ามวันซ้ำในไฟล์ใหม่
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        คงยอดเดิมที่มีอยู่แล้วในระบบ และนำเข้าเฉพาะข้อมูลวันที่ใหม่ที่ยังไม่เคยมีในระบบเท่านั้น
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option 3: COMBINE_ALL */}
                <label
                  onClick={() => setOverlapMode('COMBINE_ALL')}
                  className={`block p-3.5 rounded-xl border transition-all cursor-pointer ${
                    overlapMode === 'COMBINE_ALL'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="overlapMode"
                      value="COMBINE_ALL"
                      checked={overlapMode === 'COMBINE_ALL'}
                      onChange={() => setOverlapMode('COMBINE_ALL')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          3. รวมยอดทั้งสองไฟล์เข้าด้วยกัน
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          สะสมยอดทั้งหมด
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        นำเข้าข้อมูลทั้งหมดและรวมยอดเข้าด้วยกัน โดยไม่ตัดหรือแทนที่ข้อมูลใดออก
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/70 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => {
                  setShowOverlapModal(false);
                  setPendingOverlapPreview(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isExecutingImport}
                onClick={() => executeImport(overlapMode)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0B2046] hover:bg-[#133066] dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isExecutingImport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังนำเข้า...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>ยืนยันการนำเข้า</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 9. Supported File Formats Guide Modal */}
      <SupportedCommissionFormatsModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
