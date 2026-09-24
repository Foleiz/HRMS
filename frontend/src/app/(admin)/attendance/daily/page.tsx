'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
  X,
  Sunrise,
  Sun,
  Moon,
  Building2,
  UploadCloud,
  FileSpreadsheet,
  HardDrive,
  FileText,
  ArrowRight,
  Eye,
  Trash2,
  ClipboardCheck,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Download,
  Zap,
  Plus,
} from 'lucide-react';
import { attendanceService } from '@/services/attendanceService';
import { attendanceImportService } from '@/services/attendanceImportService';
import { attendanceAdjustmentService } from '@/services/attendanceAdjustmentService';
import { organizationService } from '@/services/organizationService';
import { shiftService } from '@/services/shiftService';
import {
  AttendanceDaily,
  DailyAttendanceSummary,
  UpdateAttendanceRequest,
  MonthlyAttendanceOverview,
  MonthlyEmployeeAttendance,
} from '@/types/attendance';
import {
  AttendanceAdjustment,
  CreateAttendanceAdjustmentRequest,
  ReviewAttendanceAdjustmentRequest,
  AdjustmentStatus,
} from '@/types/attendanceAdjustment';
import {
  AttendanceImportBatch,
  AttendanceImportResult,
  AttendanceImportError,
  AttendanceImportFilterQuery,
  BatchAttendanceRecord,
} from '@/types/attendanceImport';
import { Department } from '@/types/organization';
import { Shift } from '@/types/shift';
import ThaiTimePicker from '@/components/common/ThaiTimePicker';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import { confirmAction } from '@/lib/sweetalert';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function DailyAttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { hasPermission, hasRole } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  const canViewDaily = hasPermission('TIME_DAILY_VIEW') || hasPermission('TIME_VIEW') || hasRole('ADMIN');
  const canViewImport = hasPermission('TIME_IMPORT_VIEW') || hasPermission('TIME_VIEW') || hasRole('ADMIN');
  const canViewAnyTime = canViewDaily || canViewImport;

  // Active Tab: 'daily' | 'import' | 'adjustments' | 'monthly'
  const initialTab = (searchParams.get('tab') as 'daily' | 'import' | 'adjustments' | 'monthly') || (canViewDaily ? 'daily' : 'import');
  const [activeTab, setActiveTab] = useState<'daily' | 'import' | 'adjustments' | 'monthly'>(
    initialTab === 'import' || initialTab === 'adjustments' || initialTab === 'monthly' ? initialTab : (canViewDaily ? 'daily' : 'import')
  );

  // Sync breadcrumb with activeTab
  useEffect(() => {
    const getPageTitle = () => {
      switch (activeTab) {
        case 'daily':
          return 'ตรวจบันทึกเวลาประจำวัน';
        case 'import':
          return 'นำเข้าไฟล์บันทึกเวลา';
        case 'adjustments':
          return 'คำขอปรับปรุงเวลา';
        default:
          return 'ตรวจบันทึกเวลาประจำวัน';
      }
    };
    setBreadcrumb({ section: 'ตรวจบันทึกเวลา', page: getPageTitle() });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  const handleTabChange = (tab: 'daily' | 'import' | 'adjustments' | 'monthly') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/attendance/daily?${params.toString()}`, { scroll: false });
  };

  // State: Date selection (Default to date param or today in YYYY-MM-DD)
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  // Sync state if URL searchParams change externally
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'import' || tabParam === 'daily' || tabParam === 'adjustments' || tabParam === 'monthly') {
      setActiveTab(tabParam as 'daily' | 'import' | 'adjustments' | 'monthly');
    }
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setSelectedDate(dateParam);
    }
  }, [searchParams]);

  // Allowed date range based on imported document (min/max locking)
  const [allowedDateRange, setAllowedDateRange] = useState<{
    min?: string | null;
    max?: string | null;
    batchName?: string | null;
    batchId?: number | null;
  }>({});
  const [hasAnyBatch, setHasAnyBatch] = useState<boolean | null>(null);

  // Data States (Daily Records)
  const [summary, setSummary] = useState<DailyAttendanceSummary | null>(null);
  const [records, setRecords] = useState<AttendanceDaily[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter States (Daily Records)
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceDaily | null>(null);
  const [editForm, setEditForm] = useState<{
    shiftId?: number;
    actualInTime: string;
    actualOutTime: string;
    status: string;
    isAbsent: boolean;
  }>({
    shiftId: undefined,
    actualInTime: '',
    actualOutTime: '',
    status: 'PRESENT',
    isAbsent: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick Manual Punch Modal State
  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [clockModalType, setClockModalType] = useState<'in' | 'out'>('in');
  const [clockEmpId, setClockEmpId] = useState<number>(0);
  const [clockTime, setClockTime] = useState('08:30');
  const [savingClock, setSavingClock] = useState(false);

  // -------------------------------------------------------------
  // Import Tab States
  // -------------------------------------------------------------
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<AttendanceImportResult | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);

  // Batches Table State
  const [batches, setBatches] = useState<AttendanceImportBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [batchPage, setBatchPage] = useState<number>(1);
  const [batchTotalPages, setBatchTotalPages] = useState<number>(1);
  const [batchTotalCount, setBatchTotalCount] = useState<number>(0);
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterBatchStatus, setFilterBatchStatus] = useState<string>('ALL');
  const [batchSearchQuery, setBatchSearchQuery] = useState<string>('');

  // Error Log Modal State
  const [selectedBatchForErrors, setSelectedBatchForErrors] = useState<AttendanceImportBatch | null>(null);
  const [errorLogs, setErrorLogs] = useState<AttendanceImportError[]>([]);
  const [isLoadingErrors, setIsLoadingErrors] = useState<boolean>(false);
  const [errorPage, setErrorPage] = useState<number>(1);
  const [errorTotalPages, setErrorTotalPages] = useState<number>(1);
  const [errorTotalCount, setErrorTotalCount] = useState<number>(0);

  // Revert / Delete Batch Modal State
  const [revertModalOpen, setRevertModalOpen] = useState<boolean>(false);
  const [batchToRevert, setBatchToRevert] = useState<AttendanceImportBatch | null>(null);
  const [isRevertingBatch, setIsRevertingBatch] = useState<boolean>(false);

  // Time Review Modal State (ตรวจเวลา)
  const [selectedBatchForReview, setSelectedBatchForReview] = useState<AttendanceImportBatch | null>(null);
  const [batchRecords, setBatchRecords] = useState<BatchAttendanceRecord[]>([]);
  const [isLoadingBatchRecords, setIsLoadingBatchRecords] = useState<boolean>(false);
  const [batchRecordPage, setBatchRecordPage] = useState<number>(1);
  const [batchRecordTotalPages, setBatchRecordTotalPages] = useState<number>(1);
  const [batchRecordTotalCount, setBatchRecordTotalCount] = useState<number>(0);

  // Attendance Adjustment Requests State (Sprint 7)
  const [adjustments, setAdjustments] = useState<AttendanceAdjustment[]>([]);
  const [adjustmentsTotalCount, setAdjustmentsTotalCount] = useState(0);
  const [adjustmentsTotalPages, setAdjustmentsTotalPages] = useState(1);
  const [adjustmentsPage, setAdjustmentsPage] = useState(1);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [pendingAdjustmentsCount, setPendingAdjustmentsCount] = useState(0);
  const [filterAdjustmentStatus, setFilterAdjustmentStatus] = useState<string>('ALL');
  const [adjustmentSearch, setAdjustmentSearch] = useState('');

  // Adjustment Create Modal
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [targetRecordForAdjustment, setTargetRecordForAdjustment] = useState<AttendanceDaily | null>(null);
  const [adjustmentInTime, setAdjustmentInTime] = useState('');
  const [adjustmentOutTime, setAdjustmentOutTime] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Adjustment Review Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAdjustmentForReview, setSelectedAdjustmentForReview] = useState<AttendanceAdjustment | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // Monthly Attendance Summary State
  // -------------------------------------------------------------
  const [monthlyYear, setMonthlyYear] = useState<number>(() => new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [monthlyDepartment, setMonthlyDepartment] = useState<number | 'ALL'>('ALL');
  const [monthlySearch, setMonthlySearch] = useState<string>('');
  const [monthlyData, setMonthlyData] = useState<MonthlyAttendanceOverview | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(false);
  const [monthlyProcessing, setMonthlyProcessing] = useState<boolean>(false);
  const [monthlyExporting, setMonthlyExporting] = useState<boolean>(false);

  // Fetch Monthly Attendance Summary Data
  const loadMonthlySummary = useCallback(async () => {
    try {
      setMonthlyLoading(true);
      const deptId = monthlyDepartment === 'ALL' ? undefined : Number(monthlyDepartment);
      const data = await attendanceService.getMonthlyAttendanceSummary(monthlyYear, monthlyMonth, deptId);
      setMonthlyData(data);
    } catch (err: any) {
      console.error('Failed to load monthly summary:', err);
      toast.error('ไม่สามารถโหลดข้อมูลสรุปสถิติประจำเดือนได้', err?.response?.data?.message || err?.message);
    } finally {
      setMonthlyLoading(false);
    }
  }, [monthlyYear, monthlyMonth, monthlyDepartment, toast]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      loadMonthlySummary();
    }
  }, [activeTab, loadMonthlySummary]);

  const handleProcessMonthlySummary = async () => {
    try {
      setMonthlyProcessing(true);
      const res = await attendanceService.processMonthlyAttendanceSummary(monthlyYear, monthlyMonth);
      setMonthlyData(res);
      toast.success('ประมวลผลสรุปยอดเวลาประจำเดือนสำเร็จ', `บันทึกข้อมูลสรุปสถิติเดือน ${THAI_MONTHS[monthlyMonth - 1]} เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Failed to process monthly summary:', err);
      toast.error('เกิดข้อผิดพลาดในการประมวลผล', err?.response?.data?.message || err?.message);
    } finally {
      setMonthlyProcessing(false);
    }
  };

  const handleExportMonthlyCsv = async () => {
    try {
      setMonthlyExporting(true);
      const deptId = monthlyDepartment === 'ALL' ? undefined : Number(monthlyDepartment);
      const blob = await attendanceService.exportMonthlyAttendanceCsv(monthlyYear, monthlyMonth, deptId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monthly_attendance_summary_${monthlyYear}_${String(monthlyMonth).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('ดาวน์โหลดไฟล์สำเร็จ', 'ระบบส่งออกไฟล์ CSV สรุปเวลาทำงานเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      toast.error('ไม่สามารถดาวน์โหลดไฟล์ได้', err?.message);
    } finally {
      setMonthlyExporting(false);
    }
  };

  const filteredMonthlyEmployees = (monthlyData?.employees || []).filter((emp) => {
    if (!monthlySearch.trim()) return true;
    const q = monthlySearch.trim().toLowerCase();
    return (
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.employeeName.toLowerCase().includes(q) ||
      (emp.departmentName && emp.departmentName.toLowerCase().includes(q)) ||
      (emp.positionName && emp.positionName.toLowerCase().includes(q))
    );
  });

  // Load Initial Reference Data
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [deptData, shiftData] = await Promise.all([
          organizationService.getDepartments(),
          shiftService.getShifts(),
        ]);
        setDepartments(deptData || []);
        setShifts(shiftData || []);
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    };
    loadMasterData();
  }, []);

  // Fetch Daily Attendance Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumData, pagedResult] = await Promise.all([
        attendanceService.getDailySummary(selectedDate),
        attendanceService.getDailyAttendance({
          date: selectedDate,
          departmentId: selectedDepartment === 'ALL' ? undefined : selectedDepartment,
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          search: searchKeyword.trim() || undefined,
          page: currentPage,
          pageSize: 20,
        }),
      ]);

      setSummary(sumData);
      setRecords(pagedResult.items || []);
      setTotalPages(pagedResult.totalPages || 1);
      setTotalCount(pagedResult.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
      toast.error('ไม่สามารถโหลดข้อมูลบันทึกเวลาได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedDepartment, selectedStatus, searchKeyword, currentPage]);

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchData();
    }
  }, [fetchData, activeTab]);

  // Fetch Batches for Import Tab
  const loadBatches = async () => {
    try {
      setIsLoadingBatches(true);
      const res = await attendanceImportService.getBatches({
        page: batchPage,
        pageSize: 10,
        source: filterSource,
        status: filterBatchStatus,
        search: batchSearchQuery || undefined,
      });
      setBatches(res.items);
      setBatchTotalPages(res.totalPages);
      setBatchTotalCount(res.totalCount);
      const valid = res.items.filter((b) => b.dateFrom && b.dateTo && b.status !== 'FAILED');
      if (valid.length > 0) {
        setHasAnyBatch(true);
      } else if (res.totalCount === 0) {
        setHasAnyBatch(false);
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'import') {
      loadBatches();
    }
  }, [activeTab, batchPage, filterSource, filterBatchStatus]);

  // Fetch initial batch info on mount to restrict calendar to document date range
  useEffect(() => {
    const fetchLatestBatchRange = async () => {
      try {
        const res = await attendanceImportService.getBatches({ page: 1, pageSize: 10 });
        if (res.items && res.items.length > 0) {
          const validBatch = res.items.find((b) => b.dateFrom && b.dateTo && b.status !== 'FAILED');
          if (validBatch && validBatch.dateFrom && validBatch.dateTo) {
            setHasAnyBatch(true);
            setAllowedDateRange({
              min: validBatch.dateFrom,
              max: validBatch.dateTo,
              batchName: validBatch.fileName || undefined,
              batchId: validBatch.id,
            });

            setSelectedDate((curr) => {
              if (curr < validBatch.dateFrom! || curr > validBatch.dateTo!) {
                return validBatch.dateFrom!;
              }
              return curr;
            });
            return;
          }
        }
        setHasAnyBatch(false);
        setAllowedDateRange({});
      } catch (err) {
        console.error('Failed to fetch batch date range:', err);
        setHasAnyBatch(false);
      }
    };

    fetchLatestBatchRange();
  }, []);

  // Date Navigation
  const adjustDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
    setCurrentPage(1);
  };

  const formatThaiDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const thaiYear = y + 543;
      return `${d} ${THAI_MONTHS[m - 1]} ${thaiYear}`;
    } catch {
      return dateStr;
    }
  };

  // Recalculate
  const handleRecalculate = async () => {
    try {
      setRefreshing(true);
      const res = await attendanceService.recalculateDaily(selectedDate);
      toast.success('คำนวณเวลาเข้างานและสถานะใหม่เรียบร้อยแล้ว');
      await fetchData();
    } catch (err) {
      console.error('Failed to recalculate:', err);
      toast.error('ไม่สามารถคำนวณเวลาใหม่ได้');
    } finally {
      setRefreshing(false);
    }
  };

  // Edit Modal Handlers
  const handleOpenEditModal = (rec: AttendanceDaily) => {
    setEditingRecord(rec);

    const parseTimeToHHmm = (isoStr?: string) => {
      if (!isoStr) return '';
      const dt = new Date(isoStr);
      const h = String(dt.getHours()).padStart(2, '0');
      const m = String(dt.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };

    setEditForm({
      shiftId: rec.shiftId,
      actualInTime: parseTimeToHHmm(rec.actualIn),
      actualOutTime: parseTimeToHHmm(rec.actualOut),
      status: rec.status,
      isAbsent: rec.isAbsent,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      setSavingEdit(true);

      const combineDateAndTime = (timeStr: string) => {
        if (!timeStr) return undefined;
        const [h, m] = timeStr.split(':');
        const dt = new Date(selectedDate);
        dt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        return dt.toISOString();
      };

      const req: UpdateAttendanceRequest = {
        shiftId: editForm.shiftId,
        actualIn: editForm.actualInTime ? combineDateAndTime(editForm.actualInTime) : undefined,
        actualOut: editForm.actualOutTime ? combineDateAndTime(editForm.actualOutTime) : undefined,
        status: editForm.status,
        isAbsent: editForm.isAbsent,
      };

      await attendanceService.updateAttendance(editingRecord.id, req);
      toast.success('แก้ไขข้อมูลบันทึกเวลาเรียบร้อยแล้ว');
      setEditModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to update attendance:', err);
      toast.error('ไม่สามารถบันทึกการแก้ไขได้ กรุณาตรวจสอบข้อมูล');
    } finally {
      setSavingEdit(false);
    }
  };

  // Manual Punch Handlers
  const openQuickClockModal = (type: 'in' | 'out', empId: number = 0) => {
    setClockModalType(type);
    setClockEmpId(empId);
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setClockTime(`${h}:${m}`);
    setClockModalOpen(true);
  };

  const handleSaveQuickClock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clockEmpId <= 0) {
      toast.warning('กรุณาเลือกพนักงาน');
      return;
    }

    try {
      setSavingClock(true);
      const [h, m] = clockTime.split(':');
      const dt = new Date(selectedDate);
      dt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);

      if (clockModalType === 'in') {
        await attendanceService.clockIn({
          employeeId: clockEmpId,
          workDate: selectedDate,
          clockInTime: dt.toISOString(),
        });
        toast.success('บันทึกเวลาเข้างานเรียบร้อย');
      } else {
        await attendanceService.clockOut({
          employeeId: clockEmpId,
          workDate: selectedDate,
          clockOutTime: dt.toISOString(),
        });
        toast.success('บันทึกเวลาออกงานเรียบร้อย');
      }

      setClockModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed manual punch:', err);
      toast.error('ไม่สามารถบันทึกเวลาได้ กรุณาตรวจสอบข้อมูล');
    } finally {
      setSavingClock(false);
    }
  };

  // -------------------------------------------------------------
  // Import Handlers
  // -------------------------------------------------------------
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      setImportErrorMessage('ระบบรองรับเฉพาะไฟล์นามสกุล .xlsx, .xls หรือ .csv เท่านั้น');
      setSelectedFile(null);
      return;
    }
    setImportErrorMessage(null);
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setImportErrorMessage(null);

      const fileExt = selectedFile.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'EXCEL';
      const res = await attendanceImportService.uploadFile(
        selectedFile,
        fileExt,
        undefined,
        false,
        (percent) => setUploadProgress(percent)
      );

      if (res.success && res.data) {
        setUploadResult(res.data);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (res.data.failedRecords > 0) {
          const errMsg = `แจ้งเตือนข้อผิดพลาด: พบข้อมูล ${res.data.failedRecords} รายการที่รหัสพนักงานในไฟล์ไม่ตรงกับข้อมูลในระบบ (นำเข้าสำเร็จ ${res.data.successRecords} รายการ)`;
          setImportErrorMessage(errMsg);
          toast.warning(`พบข้อมูล ${res.data.failedRecords} รายการที่รหัสพนักงานไม่ตรงกับในระบบ (สำเร็จ ${res.data.successRecords} รายการ)`);
        } else {
          toast.success(`นำเข้าข้อมูลสำเร็จครบถ้วน (${res.data.successRecords} รายการ)`);
        }

        if (res.data.status !== 'FAILED' && res.data.dateFrom && res.data.dateTo) {
          setHasAnyBatch(true);
          setAllowedDateRange({
            min: res.data.dateFrom,
            max: res.data.dateTo,
            batchName: res.data.fileName,
            batchId: res.data.batchId,
          });
          setSelectedDate(res.data.dateFrom);
        }
        loadBatches();
      } else {
        const errorMsg = res.message || 'เกิดข้อผิดพลาด: รหัสพนักงานในไฟล์ไม่ตรงกับข้อมูลในระบบ';
        setImportErrorMessage(errorMsg);
        toast.error(errorMsg);
        if (res.data) setUploadResult(res.data);
        loadBatches();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      setImportErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenErrors = async (batch: AttendanceImportBatch) => {
    setSelectedBatchForErrors(batch);
    setErrorPage(1);
    await loadErrorLogs(batch.id, 1);
  };

  const loadErrorLogs = async (batchId: number, targetPage: number) => {
    try {
      setIsLoadingErrors(true);
      const res = await attendanceImportService.getBatchErrors(batchId, targetPage, 20);
      setErrorLogs(res.items);
      setErrorTotalPages(res.totalPages);
      setErrorTotalCount(res.totalCount);
    } catch (err) {
      console.error('Failed to load error logs:', err);
    } finally {
      setIsLoadingErrors(false);
    }
  };

  const handleOpenRevertModal = (batch: AttendanceImportBatch) => {
    setBatchToRevert(batch);
    setRevertModalOpen(true);
  };

  const handleOpenTimeReview = async (batch: AttendanceImportBatch) => {
    setSelectedBatchForReview(batch);
    setBatchRecordPage(1);
    await loadBatchRecords(batch.id, 1);
  };

  const loadBatchRecords = async (batchId: number, targetPage: number) => {
    try {
      setIsLoadingBatchRecords(true);
      const res = await attendanceImportService.getBatchRecords(batchId, targetPage, 20);
      setBatchRecords(res.items);
      setBatchRecordTotalPages(res.totalPages);
      setBatchRecordTotalCount(res.totalCount);
    } catch (err) {
      console.error('Failed to load batch records:', err);
      toast.error('ไม่สามารถโหลดข้อมูลบันทึกเวลาได้');
    } finally {
      setIsLoadingBatchRecords(false);
    }
  };

  const handleConfirmRevertBatch = async () => {
    if (!batchToRevert) return;
    try {
      setIsRevertingBatch(true);
      const res = await attendanceImportService.revertBatch(batchToRevert.id);
      if (res.success) {
        const successMsg =
          res.message ||
          `ยกเลิกและลบชุดข้อมูล #${batchToRevert.id} (${batchToRevert.fileName}) พร้อมข้อมูลบันทึกเวลาเรียบร้อยแล้ว`;
        toast.success(successMsg);
        if (allowedDateRange.batchId === batchToRevert.id) {
          const remaining = batches.filter((b) => b.id !== batchToRevert.id && b.status !== 'FAILED');
          if (remaining.length > 0 && remaining[0].dateFrom && remaining[0].dateTo) {
            setHasAnyBatch(true);
            setAllowedDateRange({
              min: remaining[0].dateFrom,
              max: remaining[0].dateTo,
              batchName: remaining[0].fileName || undefined,
              batchId: remaining[0].id,
            });
            setSelectedDate(remaining[0].dateFrom);
          } else {
            setHasAnyBatch(false);
            setAllowedDateRange({});
          }
        }
        setRevertModalOpen(false);
        setBatchToRevert(null);
        await loadBatches();
        await fetchData();
      } else {
        toast.error(res.message || 'ไม่สามารถยกเลิกชุดข้อมูลนี้ได้');
      }
    } catch (err: any) {
      console.error('Failed to revert batch:', err);
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการยกเลิกชุดข้อมูล';
      toast.error(msg);
    } finally {
      setIsRevertingBatch(false);
    }
  };

  // -------------------------------------------------------------
  // Attendance Adjustments Handlers (Sprint 7)
  // -------------------------------------------------------------
  const loadPendingCount = useCallback(async () => {
    try {
      const count = await attendanceAdjustmentService.getPendingCount();
      setPendingAdjustmentsCount(count);
    } catch (err) {
      console.error('Failed to load pending adjustment count:', err);
    }
  }, []);

  const loadAdjustments = useCallback(async () => {
    try {
      setAdjustmentsLoading(true);
      const res = await attendanceAdjustmentService.getAdjustments({
        status: filterAdjustmentStatus === 'ALL' ? undefined : filterAdjustmentStatus,
        search: adjustmentSearch.trim() || undefined,
        page: adjustmentsPage,
        pageSize: 20,
      });
      setAdjustments(res.items || []);
      setAdjustmentsTotalPages(res.totalPages || 1);
      setAdjustmentsTotalCount(res.totalCount || 0);
    } catch (err) {
      console.error('Failed to load adjustments:', err);
      toast.error('ไม่สามารถโหลดรายการคำขอปรับปรุงเวลาได้');
    } finally {
      setAdjustmentsLoading(false);
    }
  }, [filterAdjustmentStatus, adjustmentSearch, adjustmentsPage]);

  // Trigger loads on tab change or filter
  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  useEffect(() => {
    if (activeTab === 'adjustments') {
      loadAdjustments();
    }
  }, [activeTab, loadAdjustments]);

  // Open Create Adjustment Modal
  const handleOpenAdjustmentModal = (rec: AttendanceDaily) => {
    setTargetRecordForAdjustment(rec);
    const parseTime = (iso?: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };
    setAdjustmentInTime(parseTime(rec.actualIn));
    setAdjustmentOutTime(parseTime(rec.actualOut));
    setAdjustmentReason('');
    setAdjustmentModalOpen(true);
  };

  // Submit Create Adjustment
  const handleCreateAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRecordForAdjustment) return;
    if (!adjustmentReason.trim()) {
      toast.warning('กรุณาระบุเหตุผลในการขอปรับปรุงเวลา');
      return;
    }

    try {
      setIsSubmittingAdjustment(true);
      const workDate = targetRecordForAdjustment.workDate;

      let adjInUtc: string | null = null;
      if (adjustmentInTime) {
        const [h, m] = adjustmentInTime.split(':').map(Number);
        const d = new Date(`${workDate}T00:00:00`);
        d.setHours(h, m, 0, 0);
        adjInUtc = d.toISOString();
      }

      let adjOutUtc: string | null = null;
      if (adjustmentOutTime) {
        const [h, m] = adjustmentOutTime.split(':').map(Number);
        const d = new Date(`${workDate}T00:00:00`);
        d.setHours(h, m, 0, 0);
        adjOutUtc = d.toISOString();
      }

      await attendanceAdjustmentService.createAdjustment({
        attendanceId: targetRecordForAdjustment.id,
        adjustedClockIn: adjInUtc,
        adjustedClockOut: adjOutUtc,
        reason: adjustmentReason.trim(),
      });

      toast.success('ยื่นคำขอปรับปรุงเวลาเข้า-ออกงานเรียบร้อยแล้ว รอการอนุมัติ');
      setAdjustmentModalOpen(false);
      setTargetRecordForAdjustment(null);
      await loadPendingCount();
      if (activeTab === 'adjustments') {
        await loadAdjustments();
      }
    } catch (err: any) {
      console.error('Failed to submit adjustment:', err);
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการยื่นคำขอ';
      toast.error(msg);
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // Open Review Modal
  const handleOpenReviewModal = (adj: AttendanceAdjustment, action: 'APPROVED' | 'REJECTED') => {
    setSelectedAdjustmentForReview(adj);
    setReviewAction(action);
    setReviewNote('');
    setReviewModalOpen(true);
  };

  // Submit Review (Approve / Reject)
  const handleReviewSubmit = async () => {
    if (!selectedAdjustmentForReview) return;
    try {
      setIsSubmittingReview(true);
      await attendanceAdjustmentService.reviewAdjustment(selectedAdjustmentForReview.id, {
        status: reviewAction,
        reviewNote: reviewNote.trim() || undefined,
      });
      const msg =
        reviewAction === 'APPROVED'
          ? 'อนุมัติคำขอปรับปรุงเวลาและคำนวณเวลาใหม่อัตโนมัติเรียบร้อยแล้ว'
          : 'ปฏิเสธคำขอปรับปรุงเวลาเรียบร้อยแล้ว';
      if (reviewAction === 'APPROVED') {
        toast.success(msg);
      } else {
        toast.info(msg);
      }
      setReviewModalOpen(false);
      setSelectedAdjustmentForReview(null);
      await loadAdjustments();
      await loadPendingCount();
      await fetchData();
    } catch (err: any) {
      console.error('Failed to review adjustment:', err);
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการดำเนินการ';
      toast.error(msg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Cancel Adjustment
  const handleCancelAdjustment = async (id: number) => {
    const isConfirmed = await confirmAction({
      title: 'ยืนยันการยกเลิกคำขอ',
      text: 'คุณต้องการยกเลิกคำขอนี้ใช่หรือไม่?',
      confirmButtonText: 'ยกเลิกคำขอ',
      cancelButtonText: 'ปิด',
      isDestructive: true,
    });
    if (!isConfirmed) return;
    try {
      await attendanceAdjustmentService.cancelAdjustment(id);
      toast.success('ยกเลิกคำขอปรับปรุงเวลาเรียบร้อยแล้ว');
      await loadAdjustments();
      await loadPendingCount();
    } catch (err: any) {
      console.error('Failed to cancel adjustment:', err);
      const msg = err.response?.data?.message || err.message || 'ไม่สามารถยกเลิกได้';
      toast.error(msg);
    }
  };

  // Helper formatters
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDateTimeThai = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' น.';
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: string, isAbsent: boolean) => {
    if (status === 'LEAVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>ลา</span>
        </span>
      );
    }

    if (isAbsent || status === 'ABSENT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>ขาดงาน</span>
        </span>
      );
    }

    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>ตรงเวลา</span>
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>มาสาย</span>
          </span>
        );
      case 'EARLY_LEAVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>ออกก่อนเวลา</span>
          </span>
        );
      case 'LATE_AND_EARLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>สายและออกก่อน</span>
          </span>
        );
      case 'HOLIDAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>วันหยุดประเพณี</span>
          </span>
        );
      case 'OFF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>วันหยุดสัปดาห์</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>รอดำเนินการ</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getBatchStatusBadge = (status: string) => {
    switch (status) {
      case 'IMPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            สำเร็จครบถ้วน
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            สำเร็จบางส่วน
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            ล้มเหลว
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getSourceLabel = (src?: string | null) => {
    switch (src) {
      case 'FINGERPRINT':
        return 'เครื่องสแกนลายนิ้วมือ';
      case 'FACE_SCAN':
        return 'เครื่องสแกนใบหน้า';
      case 'EXCEL':
        return 'ไฟล์ Excel บันทึกเวลา';
      case 'CSV':
        return 'ไฟล์ CSV';
      case 'EXTERNAL':
        return 'ระบบภายนอก';
      default:
        return src || '-';
    }
  };

  const formatTimeStr = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m} น.`;
    } catch {
      return '-';
    }
  };

  if (!canViewAnyTime) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์ตรวจบันทึกเวลา"
        message="ขออภัย บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงหรือดูข้อมูลตรวจบันทึกเวลาประจำวัน กรุณาติดต่อผู้ดูแลระบบ"
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* ------------------------------------------------------------- */}
      {/* Sub-menu Tabs (รูปแบบเดียวกับเมนูพนักงาน) */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {/* Tab 1: ตรวจบันทึกเวลาประจำวัน */}
          {canViewDaily && (
            <button
              onClick={() => handleTabChange('daily')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'daily'
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              ตรวจบันทึกเวลาประจำวัน
            </button>
          )}

          {/* Tab 2: นำเข้าไฟล์บันทึกเวลา */}
          {canViewImport && (
            <button
              onClick={() => handleTabChange('import')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'import'
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              นำเข้าไฟล์บันทึกเวลา
            </button>
          )}

          {/* Tab 3: คำขอปรับปรุงเวลา (Sprint 7) */}
          {canViewDaily && (
            <button
              onClick={() => handleTabChange('adjustments')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'adjustments'
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <span>คำขอปรับปรุงเวลา</span>
              {pendingAdjustmentsCount > 0 && (
                <span className="px-1.5 py-0.5 text-2xs font-bold rounded-full bg-amber-500 text-white animate-pulse">
                  {pendingAdjustmentsCount}
                </span>
              )}
            </button>
          )}

          {/* Tab 4: สรุปสถิติประจำเดือน */}
          {canViewDaily && (
            <button
              onClick={() => handleTabChange('monthly')}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                activeTab === 'monthly'
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              สรุปสถิติประจำเดือน
            </button>
          )}
        </nav>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ตรวจบันทึกเวลาประจำวัน (DAILY ATTENDANCE) */}
      {/* ========================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {hasAnyBatch === false ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center my-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0B2046] flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">ยังไม่มีข้อมูลบันทึกเวลาในระบบ</h3>
              <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
                ระบบยังไม่มีข้อมูลการนำเข้าไฟล์บันทึกเวลา กรุณาอัปโหลดไฟล์ Excel หรือไฟล์จากเครื่องสแกนเพื่อเริ่มตรวจบันทึกเวลา
              </p>
              <button
                type="button"
                onClick={() => handleTabChange('import')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B2046] hover:bg-[#15336c] text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>ไปที่หน้านำเข้าไฟล์บันทึกเวลา</span>
              </button>
            </div>
          ) : (
            <>
              {/* Filter & Toolbar Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 overflow-x-auto">
            {/* Left: Search, Filters & Date Stepper */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Search */}
              <div className="relative w-56 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัส หรือชื่อกะ..."
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDepartment(val === 'ALL' ? 'ALL' : Number(val));
                  setCurrentPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="ALL">ทุกแผนก / สังกัด</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.departmentName}
                  </option>
                ))}
              </select>

              {/* Date Picker with Min/Max Locking */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  min={allowedDateRange.min ?? undefined}
                  max={allowedDateRange.max ?? undefined}
                  value={selectedDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (allowedDateRange.min && newDate < allowedDateRange.min) return;
                    if (allowedDateRange.max && newDate > allowedDateRange.max) return;
                    setSelectedDate(newDate);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium text-slate-700 cursor-pointer"
                  title={
                    allowedDateRange.min && allowedDateRange.max
                      ? `เลือกได้เฉพาะช่วง ${formatThaiDate(allowedDateRange.min)} ถึง ${formatThaiDate(allowedDateRange.max)} ตามเอกสารที่นำเข้า`
                      : 'เลือกวันที่ต้องการตรวจบันทึกเวลา'
                  }
                />

                {allowedDateRange.min && allowedDateRange.max && (
                  <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg whitespace-nowrap hidden sm:inline-flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#0B2046]" />
                    <span>ช่วงข้อมูลในไฟล์: {formatThaiDate(allowedDateRange.min)} - {formatThaiDate(allowedDateRange.max)}</span>
                  </span>
                )}
              </div>

              {/* Recalculate Button */}
              <button
                onClick={handleRecalculate}
                disabled={refreshing}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition disabled:opacity-50 cursor-pointer"
                title="ประมวลผลคำนวณเวลาใหม่"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0B2046]' : ''}`} />
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleTabChange('import')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0B2046] hover:bg-[#15336c] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>นำเข้าไฟล์เวลา</span>
              </button>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Employees */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">พนักงานทั้งหมด</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-slate-900">{summary?.totalEmployees ?? 0}</div>
                <div className="text-2xs text-slate-500 mt-0.5">ในระบบวันนี้</div>
              </div>
            </div>

            {/* 2. Present */}
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-xs font-medium">มาตรงเวลา</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-emerald-600">{summary?.presentCount ?? 0}</div>
                <div className="text-2xs text-emerald-600/80 mt-0.5">คน ({summary?.attendanceRate ?? 0}%)</div>
              </div>
            </div>

            {/* 3. Late */}
            <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-medium">มาสาย</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-amber-600">{summary?.lateCount ?? 0}</div>
                <div className="text-2xs text-amber-600/80 mt-0.5">เกินระยะเวลาผ่อนปรน</div>
              </div>
            </div>

            {/* 4. Early Leave */}
            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-purple-700">
                <span className="text-xs font-medium">ออกก่อนเวลา</span>
                <LogOut className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-purple-600">{summary?.earlyLeaveCount ?? 0}</div>
                <div className="text-2xs text-purple-600/80 mt-0.5">ก่อนเวลาสิ้นสุดกะ</div>
              </div>
            </div>

            {/* 5. Absent */}
            <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-xs font-medium">ขาดงาน</span>
                <XCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-rose-600">{summary?.absentCount ?? 0}</div>
                <div className="text-2xs text-rose-600/80 mt-0.5">ไม่มีบันทึกเวลา</div>
              </div>
            </div>

            {/* 6. Holiday / Off */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">วันหยุด</span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-slate-800">{summary?.holidayOrOffCount ?? 0}</div>
                <div className="text-2xs text-slate-500 mt-0.5">วันหยุดบริษัท / ประจำสัปดาห์</div>
              </div>
            </div>
          </div>

          {/* Daily Table with whitespace-nowrap */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold tracking-wider">
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสพนักงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อ-นามสกุล</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">แผนก / ตำแหน่ง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">กะการทำงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">เวลาตามกะ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">เวลาเข้าจริง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">เวลาออกจริง</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ทำงานจริง</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">สาย</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ออกก่อน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        กำลังโหลดข้อมูลบันทึกเวลา...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        ไม่พบข้อมูลบันทึกเวลาสำหรับวันที่เลือก ({formatThaiDate(selectedDate)})
                        <div className="mt-3">
                          <button
                            onClick={() => handleTabChange('import')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            นำเข้าไฟล์บันทึกเวลาทันที
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {rec.employeeCode}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {rec.employeeName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <div>{rec.departmentName || '-'}</div>
                          <div className="text-2xs text-slate-400">{rec.positionName || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          {rec.shiftName ? (
                            <span className="font-semibold">{rec.shiftName}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {rec.shiftTimeWindow || '-'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {rec.actualIn ? (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                              {formatTimeStr(rec.actualIn)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {rec.actualOut ? (
                            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                              {formatTimeStr(rec.actualOut)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700 whitespace-nowrap">
                          {rec.workedMinutes > 0 ? (
                            <span>{Math.floor(rec.workedMinutes / 60)} ชม. {rec.workedMinutes % 60} น.</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {rec.lateMinutes > 0 ? (
                            <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                              {rec.lateMinutes} นาที
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {rec.earlyLeaveMinutes > 0 ? (
                            <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                              {rec.earlyLeaveMinutes} นาที
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(rec.status, rec.isAbsent)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenAdjustmentModal(rec)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                              title="ยื่นคำขอปรับปรุงเวลาเข้า-ออกงาน"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>ขอปรับเวลา</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(rec)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>แก้ไข</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                แสดงหน้า <span className="font-bold text-slate-800">{currentPage}</span> จาก{' '}
                <span className="font-bold text-slate-800">{totalPages || 1}</span> หน้า (รวม {totalCount} รายการ)
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: นำเข้าไฟล์บันทึกเวลา (BIOMETRIC & EXCEL BATCH IMPORT) */}
      {/* ========================================================= */}
      {activeTab === 'import' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Upload Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  อัปโหลดไฟล์ข้อมูลเวลาเข้างาน
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  นำเข้าไฟล์ Excel (.xlsx, .xls) หรือ CSV จากเครื่องสแกนเพื่อคำนวณเวลาเข้า-ออกงานให้อัตโนมัติ
                </p>
              </div>
              <button
                type="button"
                disabled={!selectedFile || isUploading}
                onClick={handleUploadSubmit}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-all ${
                  !selectedFile || isUploading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-[0.98] cursor-pointer'
                }`}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังประมวลผล...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>เริ่มประมวลผลนำเข้าไฟล์</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">ขนาด: {formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      ยกเลิกเลือกไฟล์
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        ลากไฟล์มาวางที่นี่ หรือ <span className="text-blue-600 hover:underline">คลิกเพื่อเลือกไฟล์</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        รองรับไฟล์ประเภท .xlsx, .xls หรือ .csv (ขนาดไม่เกิน 20MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      กำลังส่งข้อมูลและประมวลผลกะการทำงาน...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Result Card */}
          {uploadResult && (
            <div className={`p-6 rounded-2xl border shadow-sm ${
              uploadResult.status === 'IMPORTED'
                ? 'bg-emerald-50/50 border-emerald-200'
                : uploadResult.status === 'PARTIAL'
                ? 'bg-amber-50/50 border-amber-200'
                : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    {uploadResult.status === 'IMPORTED' && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                    {uploadResult.status === 'PARTIAL' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                    {uploadResult.status === 'FAILED' && <AlertCircle className="w-6 h-6 text-rose-600" />}
                    <h3 className="text-base font-bold text-slate-900">
                      {uploadResult.status === 'IMPORTED' && 'นำเข้าข้อมูลเวลาสำเร็จครบถ้วน!'}
                      {uploadResult.status === 'PARTIAL' && 'นำเข้าข้อมูลสำเร็จบางส่วน (พบข้อผิดพลาดบางรายการ)'}
                      {uploadResult.status === 'FAILED' && 'การนำเข้าล้มเหลว ไม่พบข้อมูลที่ถูกต้อง'}
                    </h3>
                    {getBatchStatusBadge(uploadResult.status)}
                  </div>
                  <p className="text-xs text-slate-600">
                    ไฟล์: <span className="font-semibold text-slate-900">{uploadResult.fileName}</span> | ชุดที่: #{uploadResult.batchId}
                    {uploadResult.dateFrom && uploadResult.dateTo && (
                      <> | ช่วงวันที่: <span className="font-semibold">{uploadResult.dateFrom} ถึง {uploadResult.dateTo}</span></>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {uploadResult.failedRecords > 0 && (
                    <button
                      onClick={() => {
                        const mockBatch: AttendanceImportBatch = {
                          id: uploadResult.batchId,
                          fileName: uploadResult.fileName,
                          fileHash: uploadResult.fileHash,
                          source: uploadResult.source,
                          deviceName: null,
                          unitName: null,
                          dateFrom: uploadResult.dateFrom,
                          dateTo: uploadResult.dateTo,
                          importedByUserId: null,
                          importedByUserName: null,
                          importedAt: new Date().toISOString(),
                          totalRecords: uploadResult.totalRecords,
                          successRecords: uploadResult.successRecords,
                          failedRecords: uploadResult.failedRecords,
                          status: uploadResult.status,
                        };
                        handleOpenErrors(mockBatch);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-100/80 hover:bg-rose-200 border border-rose-300 transition-colors"
                    >
                      <AlertCircle className="w-4 h-4" />
                      ดูข้อผิดพลาด ({uploadResult.failedRecords} รายการ)
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (uploadResult.dateFrom && uploadResult.dateTo) {
                        setAllowedDateRange({
                          min: uploadResult.dateFrom,
                          max: uploadResult.dateTo,
                          batchName: uploadResult.fileName,
                          batchId: uploadResult.batchId,
                        });
                        setSelectedDate(uploadResult.dateFrom);
                      } else if (uploadResult.dateFrom) {
                        setSelectedDate(uploadResult.dateFrom);
                      }
                      handleTabChange('daily');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-300 transition-colors cursor-pointer"
                  >
                    ดูข้อมูลที่นำเข้าในหน้าตรวจบันทึกเวลา
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setUploadResult(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
                    title="ปิดกล่องแจ้งเตือนนี้"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200/60">
                <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 text-center">
                  <p className="text-xs font-semibold text-slate-500">จำนวนแถวทั้งหมด</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{uploadResult.totalRecords.toLocaleString()} แถว</p>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 text-center">
                  <p className="text-xs font-semibold text-emerald-700">สำเร็จ</p>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">{uploadResult.successRecords.toLocaleString()} รายการ</p>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-rose-200 text-center">
                  <p className="text-xs font-semibold text-rose-700">ข้อผิดพลาด</p>
                  <p className="text-xl font-black text-rose-600 mt-0.5">{uploadResult.failedRecords.toLocaleString()} รายการ</p>
                </div>
              </div>
            </div>
          )}

          {/* Batch History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  ประวัติการนำเข้าไฟล์ย้อนหลัง
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  รายการชุดข้อมูลไฟล์บันทึกเวลาทั้งหมดที่เคยนำเข้าสู่ระบบ ({batchTotalCount.toLocaleString()} รายการ)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อไฟล์, อุปกรณ์..."
                    value={batchSearchQuery}
                    onChange={(e) => setBatchSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setBatchPage(1);
                        loadBatches();
                      }
                    }}
                    className="pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-56"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <select
                  value={filterSource}
                  onChange={(e) => {
                    setFilterSource(e.target.value);
                    setBatchPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                >
                  <option value="ALL">แหล่งที่มา: ทั้งหมด</option>
                  <option value="FINGERPRINT">เครื่องสแกนลายนิ้วมือ</option>
                  <option value="FACE_SCAN">เครื่องสแกนใบหน้า</option>
                  <option value="EXCEL">ไฟล์ Excel</option>
                  <option value="CSV">ไฟล์ CSV</option>
                </select>

                <select
                  value={filterBatchStatus}
                  onChange={(e) => {
                    setFilterBatchStatus(e.target.value);
                    setBatchPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                >
                  <option value="ALL">สถานะ: ทั้งหมด</option>
                  <option value="IMPORTED">สำเร็จครบถ้วน</option>
                  <option value="PARTIAL">สำเร็จบางส่วน</option>
                  <option value="FAILED">ล้มเหลว</option>
                </select>

                <button
                  onClick={() => {
                    setBatchPage(1);
                    loadBatches();
                  }}
                  className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                  title="รีเฟรชตาราง"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingBatches ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold tracking-wider">
                    <th className="py-3.5 px-4 whitespace-nowrap">ชุดที่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">วันที่นำเข้า</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อไฟล์</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">แหล่งที่มา</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">เครื่องสแกน / อุปกรณ์</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ช่วงวันที่ข้อมูล</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">รวม (แถว)</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">สำเร็จ</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ผิดพลาด</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ผู้นำเข้า</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingBatches ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        กำลังโหลดข้อมูลประวัติการนำเข้า...
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        ไม่พบรายการประวัติการนำเข้าไฟล์
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          #{batch.id}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          {formatDateTimeThai(batch.importedAt)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate whitespace-nowrap" title={batch.fileName || ''}>
                          {batch.fileName || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg text-slate-700 bg-slate-100 border border-slate-200 text-2xs font-semibold">
                            {getSourceLabel(batch.source)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {batch.deviceName || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {batch.dateFrom && batch.dateTo ? (
                            <span>{batch.dateFrom} ถึง {batch.dateTo}</span>
                          ) : batch.dateFrom ? (
                            <span>{batch.dateFrom}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800 whitespace-nowrap">
                          {batch.totalRecords.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                          {batch.successRecords.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold whitespace-nowrap">
                          {batch.failedRecords > 0 ? (
                            <span className="text-rose-600">{batch.failedRecords.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getBatchStatusBadge(batch.status)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {batch.importedByUserName || 'ระบบอัตโนมัติ'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {batch.failedRecords > 0 && (
                              <button
                                onClick={() => handleOpenErrors(batch)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                ดูข้อผิดพลาด
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenTimeReview(batch)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                              title="ดูข้อมูลบันทึกเวลาที่นำเข้าในชุดนี้"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              ตรวจเวลา
                            </button>
                            <button
                              onClick={() => handleOpenRevertModal(batch)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                              title="ยกเลิกการนำเข้าและลบข้อมูลเวลานี้ออกจากระบบ"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              ลบชุดข้อมูล
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                แสดงหน้า <span className="font-bold text-slate-800">{batchPage}</span> จาก{' '}
                <span className="font-bold text-slate-800">{batchTotalPages || 1}</span> หน้า
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={batchPage <= 1}
                  onClick={() => setBatchPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={batchPage >= batchTotalPages}
                  onClick={() => setBatchPage((p) => Math.min(batchTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: คำขอปรับปรุงเวลาเข้า-ออกงาน (ATTENDANCE ADJUSTMENTS) */}
      {/* ========================================================= */}
      {activeTab === 'adjustments' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Toolbar & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Left: Search & Status Filter */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัส หรือเหตุผล..."
                  value={adjustmentSearch}
                  onChange={(e) => {
                    setAdjustmentSearch(e.target.value);
                    setAdjustmentsPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 text-slate-800"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterAdjustmentStatus}
                onChange={(e) => {
                  setFilterAdjustmentStatus(e.target.value);
                  setAdjustmentsPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="ALL">สถานะทั้งหมด</option>
                <option value="PENDING">รอพิจารณา (Pending)</option>
                <option value="APPROVED">อนุมัติแล้ว (Approved)</option>
                <option value="REJECTED">ไม่อนุมัติ (Rejected)</option>
                <option value="CANCELLED">ยกเลิกแล้ว (Cancelled)</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => {
                  loadAdjustments();
                  loadPendingCount();
                }}
                disabled={adjustmentsLoading}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${adjustmentsLoading ? 'animate-spin text-[#0B2046]' : ''}`} />
              </button>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 self-end md:self-auto">
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>รอพิจารณา: {pendingAdjustmentsCount} รายการ</span>
              </span>
              <span className="text-slate-400">|</span>
              <span>ทั้งหมด {adjustmentsTotalCount} รายการ</span>
            </div>
          </div>

          {/* Adjustments Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-2xs">
                    <th className="py-3 px-4">วันที่ยื่น / รหัสคำขอ</th>
                    <th className="py-3 px-4">พนักงาน</th>
                    <th className="py-3 px-4">วันที่ทำงาน & กะงาน</th>
                    <th className="py-3 px-4">เวลาเดิม (เข้า - ออก)</th>
                    <th className="py-3 px-4">เวลาที่ขอปรับ (เข้า - ออก)</th>
                    <th className="py-3 px-4">เหตุผลในการขอปรับ</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4">การพิจารณา</th>
                    <th className="py-3 px-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {adjustmentsLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-[#0B2046]" />
                          <span>กำลังโหลดรายการคำขอ...</span>
                        </div>
                      </td>
                    </tr>
                  ) : adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ClipboardCheck className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-700">ไม่พบคำขอปรับปรุงเวลา</p>
                          <p className="text-2xs text-slate-400">ยังไม่มีคำขอปรับปรุงเวลาที่ตรงตามเงื่อนไขค้นหา</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((adj) => (
                      <tr key={adj.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* ID & Submitted At */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">REQ-{adj.id.toString().padStart(5, '0')}</div>
                          <div className="text-2xs text-slate-400 mt-0.5">{formatDateTimeThai(adj.createdAt)}</div>
                        </td>

                        {/* Employee */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{adj.employeeName}</div>
                          <div className="text-2xs text-slate-400">
                            {adj.employeeCode} {adj.departmentName ? `• ${adj.departmentName}` : ''}
                          </div>
                        </td>

                        {/* Work Date & Shift */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{formatThaiDate(adj.workDate)}</div>
                          <div className="text-2xs text-slate-400">{adj.shiftName || 'ไม่ระบุกะ'}</div>
                        </td>

                        {/* Original Times */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-2xs text-slate-600">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                              เข้า: {adj.originalClockIn ? formatTimeStr(adj.originalClockIn) : '-'}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                              ออก: {adj.originalClockOut ? formatTimeStr(adj.originalClockOut) : '-'}
                            </span>
                          </div>
                        </td>

                        {/* Adjusted Times */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-2xs font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              เข้า: {adj.adjustedClockIn ? formatTimeStr(adj.adjustedClockIn) : '-'}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                              ออก: {adj.adjustedClockOut ? formatTimeStr(adj.adjustedClockOut) : '-'}
                            </span>
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-xs text-slate-700 truncate" title={adj.reason}>
                            {adj.reason}
                          </p>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {adj.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>รอพิจารณา</span>
                            </span>
                          )}
                          {adj.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>อนุมัติแล้ว</span>
                            </span>
                          )}
                          {adj.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <X className="w-3 h-3 text-rose-600" />
                              <span>ไม่อนุมัติ</span>
                            </span>
                          )}
                          {adj.status === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span>ยกเลิกแล้ว</span>
                            </span>
                          )}
                        </td>

                        {/* Reviewer / Review Note */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-2xs text-slate-500">
                          {adj.reviewedAt ? (
                            <div>
                              <div className="font-semibold text-slate-700">{adj.reviewedByEmployeeName || 'ผู้ดูแลระบบ'}</div>
                              <div className="text-slate-400 mt-0.5">{formatDateTimeThai(adj.reviewedAt)}</div>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {adj.status === 'PENDING' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenReviewModal(adj, 'APPROVED')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                                title="อนุมัติคำขอ"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>อนุมัติ</span>
                              </button>
                              <button
                                onClick={() => handleOpenReviewModal(adj, 'REJECTED')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                                title="ปฏิเสธคำขอ"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>ปฏิเสธ</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-2xs text-slate-400 font-medium">สิ้นสุดแล้ว</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                แสดง {adjustments.length} จากทั้งหมด {adjustmentsTotalCount} รายการ (หน้า {adjustmentsPage} / {adjustmentsTotalPages})
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={adjustmentsPage <= 1}
                  onClick={() => setAdjustmentsPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={adjustmentsPage >= adjustmentsTotalPages}
                  onClick={() => setAdjustmentsPage((p) => Math.min(adjustmentsTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: สรุปสถิติประจำเดือน (MONTHLY SUMMARY) */}
      {/* ========================================================= */}
      {activeTab === 'monthly' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filter & Action Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Left: Month, Year, Department, Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Month Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                  className="bg-transparent focus:outline-none cursor-pointer text-slate-800 font-bold"
                >
                  {THAI_MONTHS.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                <span>ปี</span>
                <select
                  value={monthlyYear}
                  onChange={(e) => setMonthlyYear(Number(e.target.value))}
                  className="bg-transparent focus:outline-none cursor-pointer text-slate-800 font-bold"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y + 543} ({y})
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <select
                value={monthlyDepartment}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  setMonthlyDepartment(val);
                }}
                className="text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="ALL">ทุกแผนก</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.departmentName}
                  </option>
                ))}
              </select>

              {/* Search */}
              <div className="relative w-48 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหารหัส หรือชื่อพนักงาน..."
                  value={monthlySearch}
                  onChange={(e) => setMonthlySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadMonthlySummary}
                disabled={monthlyLoading}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${monthlyLoading ? 'animate-spin text-[#0B2046]' : ''}`} />
              </button>
            </div>

            {/* Right: Process & Export Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={handleExportMonthlyCsv}
                disabled={monthlyExporting || !monthlyData || monthlyData.employees.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {monthlyExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>ดาวน์โหลด CSV</span>
              </button>

              <button
                type="button"
                onClick={handleProcessMonthlySummary}
                disabled={monthlyProcessing || monthlyLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0B2046] hover:bg-[#15336C] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {monthlyProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>กำลังประมวลผล...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>ประมวลผลสรุปยอด</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Overview Metric Cards (6 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Total Employees */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-2xs font-bold uppercase tracking-wider">พนักงานทั้งหมด</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {monthlyData ? monthlyData.totalEmployees.toLocaleString() : '-'}
              </div>
              <p className="text-3xs text-slate-400 mt-0.5">ในรอบเดือนนี้</p>
            </div>

            {/* Card 2: Total Planned Work Days */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-2xs font-bold uppercase tracking-wider">วันทำงานตามแผน</span>
                <Calendar className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-xl font-black text-slate-800">
                {monthlyData ? monthlyData.totalPlannedDays.toLocaleString() : '-'}
              </div>
              <p className="text-3xs text-slate-400 mt-0.5">รวมทุกพนักงาน</p>
            </div>

            {/* Card 3: Actual Work Days & Rate */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-2xs font-bold uppercase tracking-wider">วันทำงานจริง</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-700 flex items-baseline gap-1.5">
                <span>{monthlyData ? monthlyData.totalActualDays.toLocaleString() : '-'}</span>
                {monthlyData && (
                  <span className="text-xs font-bold text-emerald-600">
                    ({monthlyData.averageAttendanceRate}%)
                  </span>
                )}
              </div>
              <p className="text-3xs text-slate-400 mt-0.5">อัตราเข้างานเฉลี่ย</p>
            </div>

            {/* Card 4: Late Minutes */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-2xs font-bold uppercase tracking-wider">มาสายสะสม</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-700">
                {monthlyData ? monthlyData.totalLateMinutes.toLocaleString() : '-'}
                <span className="text-xs font-semibold text-amber-600 ml-1">นาที</span>
              </div>
              <p className="text-3xs text-slate-400 mt-0.5">
                {monthlyData ? `${monthlyData.employees.reduce((acc, e) => acc + e.lateDays, 0)} ครั้ง` : '-'}
              </p>
            </div>

            {/* Card 5: Leave Days */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-2xs font-bold uppercase tracking-wider">ลางานสะสม</span>
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-black text-blue-700">
                {monthlyData ? Number(monthlyData.totalLeaveDays).toFixed(1) : '-'}
                <span className="text-xs font-semibold text-blue-600 ml-1">วัน</span>
              </div>
              <p className="text-3xs text-emerald-600 font-medium mt-0.5">อนุมัติแล้ว</p>
            </div>

            {/* Card 6: Absent Days */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-2xs font-bold uppercase tracking-wider">ขาดงานสะสม</span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-black text-rose-700">
                {monthlyData ? monthlyData.totalAbsentDays.toLocaleString() : '-'}
                <span className="text-xs font-semibold text-rose-600 ml-1">วัน</span>
              </div>
              <p className="text-3xs text-slate-400 mt-0.5">ไม่รวมวันลาอนุมัติ</p>
            </div>
          </div>

          {/* Table of Employees */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Table Header / Subtitle */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#0B2046]" />
                  <span>สรุปเวลาทำงานประจำเดือน {THAI_MONTHS[monthlyMonth - 1]} {monthlyYear + 543}</span>
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  {monthlyData?.lastProcessedAt ? (
                    <span className="text-emerald-700 font-semibold">
                      ✓ ประมวลผลล่าสุดเมื่อ {new Date(monthlyData.lastProcessedAt).toLocaleString('th-TH')}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">
                      * แสดงผลพรีวิวสดจากบันทึกเวลา (คลิก &quot;ประมวลผลสรุปยอด&quot; เพื่อบันทึกส่งให้ฝ่าย Payroll)
                    </span>
                  )}
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-600">
                จำนวนพนักงาน: <span className="font-bold text-[#0B2046]">{filteredMonthlyEmployees.length}</span> คน
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-2xs uppercase tracking-wider">
                    <th className="py-3 px-3.5">รหัสพนักงาน</th>
                    <th className="py-3 px-3.5">ชื่อ-นามสกุล</th>
                    <th className="py-3 px-3.5">แผนก / ตำแหน่ง</th>
                    <th className="py-3 px-2 text-center">แผน (วัน)</th>
                    <th className="py-3 px-2 text-center">จริง (วัน)</th>
                    <th className="py-3 px-2 text-center">สาย (ครั้ง/นาที)</th>
                    <th className="py-3 px-2 text-center">ออกก่อน</th>
                    <th className="py-3 px-2 text-center">ลางาน (วัน)</th>
                    <th className="py-3 px-2 text-center">ขาดงาน (วัน)</th>
                    <th className="py-3 px-3 text-center">อัตราเข้างาน</th>
                    <th className="py-3 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyLoading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#0B2046]" />
                          <span className="text-xs">กำลังคำนวณและดึงข้อมูลสรุปประจำเดือน...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredMonthlyEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users className="w-8 h-8 text-slate-300" />
                          <span className="text-xs font-semibold text-slate-600">ไม่พบข้อมูลสรุปเวลาทำงานของพนักงาน</span>
                          <span className="text-2xs text-slate-400">ลองเปลี่ยนเงื่อนไขการค้นหา หรือเลือกเดือน/ปีอื่น</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMonthlyEmployees.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {emp.employeeCode}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{emp.employeeName}</div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap text-2xs text-slate-500">
                          <div>{emp.departmentName || '-'}</div>
                          <div className="text-slate-400">{emp.positionName || '-'}</div>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">
                          {emp.totalWorkDays}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-emerald-700">
                          {emp.actualWorkDays}
                        </td>
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          {emp.lateDays > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold text-2xs border border-amber-200">
                              {emp.lateDays} ครั้ง ({emp.lateMinutes}น.)
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          {emp.earlyLeaveDays > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 font-semibold text-2xs border border-orange-200">
                              {emp.earlyLeaveDays} ครั้ง ({emp.earlyLeaveMinutes}น.)
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {emp.leaveDays > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-2xs border border-blue-200">
                              {Number(emp.leaveDays).toFixed(1)} วัน
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {emp.absentDays > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-black text-2xs border border-rose-200">
                              {emp.absentDays} วัน
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`text-2xs font-bold ${
                                emp.attendanceRate >= 90
                                  ? 'text-emerald-700'
                                  : emp.attendanceRate >= 75
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {emp.attendanceRate}%
                            </span>
                            <div className="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  emp.attendanceRate >= 90
                                    ? 'bg-emerald-500'
                                    : emp.attendanceRate >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, emp.attendanceRate)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {emp.hasProcessedSummary ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ประมวลผลแล้ว</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <span>รอดำเนินการ</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">แก้ไขข้อมูลบันทึกเวลา</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingRecord.employeeCode} - {editingRecord.employeeName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  กะการทำงาน (Shift)
                </label>
                <select
                  value={editForm.shiftId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setEditForm((prev) => ({ ...prev, shiftId: val }));
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                >
                  <option value="">ไม่ได้ระบุกะ</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shiftName} ({s.shiftCode}) - {s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)} น.
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ThaiTimePicker
                  label="เวลาเข้าจริง (Actual In)"
                  value={editForm.actualInTime}
                  onChange={(val) => setEditForm((prev) => ({ ...prev, actualInTime: val }))}
                  
                />
                <ThaiTimePicker
                  label="เวลาออกจริง (Actual Out)"
                  value={editForm.actualOutTime}
                  onChange={(val) => setEditForm((prev) => ({ ...prev, actualOutTime: val }))}
                  
                  align="right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  สถานะการเข้างาน (Status)
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-medium"
                >
                  <option value="PRESENT">ตรงเวลา (PRESENT)</option>
                  <option value="LATE">มาสาย (LATE)</option>
                  <option value="EARLY_LEAVE">ออกก่อนเวลา (EARLY_LEAVE)</option>
                  <option value="LATE_AND_EARLY">สายและออกก่อน (LATE_AND_EARLY)</option>
                  <option value="ABSENT">ขาดงาน (ABSENT)</option>
                  <option value="HOLIDAY">วันหยุดประเพณี (HOLIDAY)</option>
                  <option value="OFF">วันหยุดสัปดาห์ (OFF)</option>
                  <option value="PENDING">รอดำเนินการ (PENDING)</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.isAbsent}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, isAbsent: e.target.checked }))}
                    className="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500"
                  />
                  <span className="text-xs font-semibold text-rose-700">ระบุเป็น ขาดงาน (Absent)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Punch Modal */}
      {clockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${clockModalType === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                  {clockModalType === 'in' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    บันทึกเวลา{clockModalType === 'in' ? 'เข้างาน' : 'ออกงาน'}ด้วยตนเอง
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    วันที่ {formatThaiDate(selectedDate)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setClockModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickClock} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลือกพนักงาน <span className="text-rose-500">*</span>
                </label>
                <select
                  value={clockEmpId}
                  onChange={(e) => setClockEmpId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-medium"
                >
                  <option value={0}>-- กรุณาเลือกพนักงาน --</option>
                  {records.map((r) => (
                    <option key={r.employeeId} value={r.employeeId}>
                      {r.employeeCode} - {r.employeeName} ({r.departmentName || 'ไม่ระบุแผนก'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <ThaiTimePicker
                  label={`เวลา${clockModalType === 'in' ? 'เข้า' : 'ออก'}งาน`}
                  value={clockTime}
                  onChange={(val) => setClockTime(val)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setClockModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingClock || clockEmpId <= 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {savingClock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>ยืนยันบันทึกเวลา</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Log Modal */}
      {selectedBatchForErrors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    รายการข้อผิดพลาดของการนำเข้า (Error Logs)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ชุดที่ #{selectedBatchForErrors.id} | ไฟล์: {selectedBatchForErrors.fileName} ({errorTotalCount.toLocaleString()} รายการ)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatchForErrors(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">แถวที่</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">รหัสพนักงาน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">ชื่อพนักงาน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">แผนก</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">วันเวลาที่สแกน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-rose-600">สาเหตุข้อผิดพลาด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingErrors ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
                          กำลังโหลด Error Logs...
                        </td>
                      </tr>
                    ) : errorLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          ไม่พบรายการข้อผิดพลาดในชุดนี้
                        </td>
                      </tr>
                    ) : (
                      errorLogs.map((err) => (
                        <tr key={err.id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="py-3 px-3.5 text-center font-bold text-slate-700 whitespace-nowrap">
                            {err.rowNumber}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                            {err.employeeCode || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-800 whitespace-nowrap">
                            {err.employeeName || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                            {err.departmentName || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                            {err.rawPunchTimestamp || '-'}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-rose-600 whitespace-nowrap">
                            {err.errorMessage}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                แสดงหน้า {errorPage} จาก {errorTotalPages || 1} หน้า
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={errorPage <= 1}
                  onClick={() => {
                    const nextP = errorPage - 1;
                    setErrorPage(nextP);
                    loadErrorLogs(selectedBatchForErrors.id, nextP);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  ย้อนกลับ
                </button>
                <button
                  disabled={errorPage >= errorTotalPages}
                  onClick={() => {
                    const nextP = errorPage + 1;
                    setErrorPage(nextP);
                    loadErrorLogs(selectedBatchForErrors.id, nextP);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  ถัดไป
                </button>
                <button
                  onClick={() => setSelectedBatchForErrors(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors ml-2"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Review Modal (ตรวจเวลา) */}
      {selectedBatchForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ตรวจสอบเวลาเข้า-ออกงาน
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ชุดที่ #{selectedBatchForReview.id} | ไฟล์: {selectedBatchForReview.fileName} ({batchRecordTotalCount.toLocaleString()} รายการ)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatchForReview(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Table */}
            <div className="p-5 overflow-y-auto flex-1">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-3.5 whitespace-nowrap">รหัสพนักงาน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">ชื่อพนักงาน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">แผนก</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">วันที่</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">เวลาเข้า</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">เวลาออก</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">ชม.ทำงาน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">สาย (นาที)</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingBatchRecords ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
                          กำลังโหลดข้อมูล...
                        </td>
                      </tr>
                    ) : batchRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          ไม่พบข้อมูลบันทึกเวลาในชุดนี้
                        </td>
                      </tr>
                    ) : (
                      batchRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                            {rec.employeeCode}
                          </td>
                          <td className="py-3 px-3.5 text-slate-800 whitespace-nowrap">
                            {rec.employeeName || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                            {rec.departmentName || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap font-medium">
                            {rec.workDate
                              ? (() => {
                                  const d = new Date(rec.workDate);
                                  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
                                })()
                              : '-'}
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {rec.actualIn ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <LogIn className="w-3 h-3" />
                                {rec.actualIn}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {rec.actualOut ? (
                              <span className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                                <LogOut className="w-3 h-3" />
                                {rec.actualOut}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center text-slate-700 whitespace-nowrap">
                            {rec.isAbsent ? '-' : `${Math.floor(rec.workedMinutes / 60)}:${String(rec.workedMinutes % 60).padStart(2, '0')}`}
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {rec.lateMinutes > 0 ? (
                              <span className="font-semibold text-amber-600">{rec.lateMinutes}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {renderStatusBadge(rec.status, rec.isAbsent)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Pagination */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                แสดงหน้า {batchRecordPage} จาก {batchRecordTotalPages || 1} หน้า
                {batchRecordTotalCount > 0 && ` (ทั้งหมด ${batchRecordTotalCount.toLocaleString()} รายการ)`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={batchRecordPage <= 1}
                  onClick={() => {
                    const nextP = batchRecordPage - 1;
                    setBatchRecordPage(nextP);
                    loadBatchRecords(selectedBatchForReview.id, nextP);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  ย้อนกลับ
                </button>
                <button
                  disabled={batchRecordPage >= batchRecordTotalPages}
                  onClick={() => {
                    const nextP = batchRecordPage + 1;
                    setBatchRecordPage(nextP);
                    loadBatchRecords(selectedBatchForReview.id, nextP);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  ถัดไป
                </button>
                <button
                  onClick={() => setSelectedBatchForReview(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors ml-2"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revert / Delete Batch Confirmation Modal */}
      {revertModalOpen && batchToRevert && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ยืนยันยกเลิกและลบชุดข้อมูลนำเข้า?</h3>
                <p className="text-xs text-slate-500">ชุดข้อมูล #{batchToRevert.id}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">ชื่อไฟล์:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[200px]" title={batchToRevert.fileName || ''}>
                  {batchToRevert.fileName || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ช่วงวันที่ในเอกสาร:</span>
                <span className="font-semibold text-slate-900">
                  {batchToRevert.dateFrom && batchToRevert.dateTo
                    ? `${formatThaiDate(batchToRevert.dateFrom)} - ${formatThaiDate(batchToRevert.dateTo)}`
                    : batchToRevert.dateFrom || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">รายการที่นำเข้าสำเร็จ:</span>
                <span className="font-semibold text-emerald-600">
                  {batchToRevert.successRecords.toLocaleString()} รายการ
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 mb-5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">คำเตือนผลกระทบ (Rollback):</p>
                <p className="text-rose-700 mt-0.5 leading-relaxed">
                  ระบบจะทำการลบข้อมูลเวลาเข้า-ออกงานของพนักงานทั้งหมดที่เกิดจากไฟล์นี้ออกจากหน้า <strong>ตรวจบันทึกเวลา</strong> พร้อมทั้งลบประวัติและปลดล็อกไฟล์เพื่อให้สามารถนำเข้าไฟล์ใหม่ได้
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isRevertingBatch}
                onClick={() => {
                  setRevertModalOpen(false);
                  setBatchToRevert(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isRevertingBatch}
                onClick={handleConfirmRevertBatch}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isRevertingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังลบและ Rollback...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    ยืนยันลบและ Rollback ข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal: ยื่นคำขอปรับปรุงเวลาเข้า-ออกงาน (Attendance Adjustment) */}
      {/* ------------------------------------------------------------- */}
      {adjustmentModalOpen && targetRecordForAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">ยื่นคำขอปรับปรุงเวลาเข้า-ออกงาน</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {targetRecordForAdjustment.employeeCode} - {targetRecordForAdjustment.employeeName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAdjustmentModalOpen(false);
                  setTargetRecordForAdjustment(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context Info Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">วันที่ปฏิบัติงาน:</span>
                <span className="font-bold text-slate-900">
                  {formatThaiDate(targetRecordForAdjustment.workDate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">แผนก / กะการทำงาน:</span>
                <span className="font-semibold text-slate-800">
                  {targetRecordForAdjustment.departmentName || '-'} ({targetRecordForAdjustment.shiftName || 'ไม่ระบุกะ'})
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                <span className="text-slate-500">เวลาเดิมในระบบ:</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    เข้า: {targetRecordForAdjustment.actualIn ? formatTimeStr(targetRecordForAdjustment.actualIn) : 'ไม่มี'}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    ออก: {targetRecordForAdjustment.actualOut ? formatTimeStr(targetRecordForAdjustment.actualOut) : 'ไม่มี'}
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAdjustmentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ThaiTimePicker
                  label="เวลาเข้าที่ต้องการปรับ"
                  value={adjustmentInTime}
                  onChange={setAdjustmentInTime}
                />
                <ThaiTimePicker
                  label="เวลาออกที่ต้องการปรับ"
                  value={adjustmentOutTime}
                  onChange={setAdjustmentOutTime}
                  align="right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เหตุผลในการขอปรับปรุงเวลา <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="ระบุเหตุผล เช่น ลืมสแกนนิ้วมือ, เครื่องสแกนขัดข้อง, ไปปฏิบัติงานนอกสถานที่ ฯลฯ"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  คำขอนี้จะถูกส่งไปยังหัวหน้างานหรือฝ่ายทรัพยากรบุคคลเพื่อตรวจสอบและอนุมัติ เมื่อได้รับการอนุมัติแล้ว ระบบจะคำนวณเวลาทำงาน สาย ออกก่อน และสถานะใหม่อัตโนมัติ
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingAdjustment}
                  onClick={() => {
                    setAdjustmentModalOpen(false);
                    setTargetRecordForAdjustment(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment || !adjustmentReason.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0B2046] hover:bg-[#15336C] rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingAdjustment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังส่งคำขอ...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      ส่งคำขอปรับปรุงเวลา
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal: พิจารณาคำขอปรับปรุงเวลา (Approve / Reject)             */}
      {/* ------------------------------------------------------------- */}
      {reviewModalOpen && selectedAdjustmentForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    reviewAction === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}
                >
                  {reviewAction === 'APPROVED' ? (
                    <ThumbsUp className="w-5 h-5" />
                  ) : (
                    <ThumbsDown className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {reviewAction === 'APPROVED'
                      ? 'ยืนยันอนุมัติคำขอปรับปรุงเวลา'
                      : 'ยืนยันปฏิเสธคำขอปรับปรุงเวลา'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    คำขอ REQ-{selectedAdjustmentForReview.id.toString().padStart(5, '0')} • {selectedAdjustmentForReview.employeeName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReviewModalOpen(false);
                  setSelectedAdjustmentForReview(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">พนักงาน:</span>
                <span className="font-bold text-slate-900">
                  {selectedAdjustmentForReview.employeeCode} - {selectedAdjustmentForReview.employeeName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">วันที่ทำงาน:</span>
                <span className="font-semibold text-slate-800">
                  {formatThaiDate(selectedAdjustmentForReview.workDate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">เวลาเดิม:</span>
                <span className="text-slate-600 font-medium">
                  {selectedAdjustmentForReview.originalClockIn
                    ? formatTimeStr(selectedAdjustmentForReview.originalClockIn)
                    : '-'}{' '}
                  -{' '}
                  {selectedAdjustmentForReview.originalClockOut
                    ? formatTimeStr(selectedAdjustmentForReview.originalClockOut)
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">เวลาใหม่ที่ขอปรับ:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {selectedAdjustmentForReview.adjustedClockIn
                    ? formatTimeStr(selectedAdjustmentForReview.adjustedClockIn)
                    : '-'}{' '}
                  -{' '}
                  {selectedAdjustmentForReview.adjustedClockOut
                    ? formatTimeStr(selectedAdjustmentForReview.adjustedClockOut)
                    : '-'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 block mb-1">เหตุผลที่ยื่น:</span>
                <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 text-xs italic">
                  &ldquo;{selectedAdjustmentForReview.reason}&rdquo;
                </p>
              </div>
            </div>

            {/* Review Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                หมายเหตุ / คำชี้แจงจากผู้อนุมัติ (Optional)
              </label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="ระบุข้อความหรือบันทึกเพิ่มเติมประกอบการพิจารณา..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Warning / Notice Box */}
            {reviewAction === 'APPROVED' ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  เมื่ออนุมัติแล้ว ระบบจะบันทึกเวลาใหม่ลงในตารางบันทึกเวลาประจำวัน และคำนวณชั่วโมงทำงาน นาทีสาย ออกก่อนเวลา และสถานะการเข้างานใหม่อัตโนมัติทันที
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  คำขอนี้จะถูกปฏิเสธ และเวลาทำงานเดิมของพนักงานในระบบจะไม่ถูกเปลี่ยนแปลง
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={() => {
                  setReviewModalOpen(false);
                  setSelectedAdjustmentForReview(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleReviewSubmit}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer ${
                  reviewAction === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmittingReview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : reviewAction === 'APPROVED' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    ยืนยันอนุมัติคำขอ
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    ยืนยันปฏิเสธคำขอ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DailyAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0B2046]" />
          <p className="text-sm">กำลังโหลดข้อมูลบันทึกเวลา...</p>
        </div>
      }
    >
      <DailyAttendanceContent />
    </Suspense>
  );
}
