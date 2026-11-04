'use client';
import { ModalHeader } from '@/components/ui/ModalHeader';

import { useLoadPhase } from '@/hooks/useLoadPhase';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { ModalShell, TabBar, type TabBarItem, TablePagination, ActionDropdown } from '@/components/ui';
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
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Download,
  Plus,
  Pencil,
  FileEdit,
} from 'lucide-react';
import { attendanceService } from '@/services/attendanceService';
import { attendanceImportService } from '@/services/attendanceImportService';
import { AttendanceFileFormatModal } from '@/components/attendance/AttendanceFileFormatModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { Button, Modal, ModalFooter, inputClass } from '@/components/ui';
import ShiftSelect from '@/components/attendance/ShiftSelect';
import { attendanceAdjustmentService } from '@/services/attendanceAdjustmentService';
import { organizationService } from '@/services/organizationService';
import { shiftService } from '@/services/shiftService';
import {
  AttendanceDaily,
  DailyAttendanceSummary,
  UpdateAttendanceRequest,
} from '@/types/attendance';
import {
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

/** สถานะที่ฝ่ายบุคคลกำหนดเองได้ (นอกนั้นระบบคำนวณจากเวลาและกะ) */
const MANUAL_STATUS_OPTIONS = [
  { value: 'LEAVE', label: 'ลา' },
  { value: 'ABSENT', label: 'ขาดงาน' },
  { value: 'HOLIDAY_WORK', label: 'ทำงานวันหยุด' },
  { value: 'HOLIDAY', label: 'วันหยุดประเพณี / บริษัท' },
  { value: 'OFF', label: 'วันหยุดประจำสัปดาห์' },
];

const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} น.` : `${m} นาที`);

function DailyAttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { hasPermission, hasRole } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canViewDaily = hasPermission('TIME_DAILY_VIEW') || isSuper;
  const canViewImport = hasPermission('TIME_IMPORT_VIEW') || isSuper;
  const canViewAnyTime = canViewDaily || canViewImport || isSuper;
  const canEditTime = hasPermission('TIME_DAILY_EDIT') || isSuper;
  const canCreateImport = hasPermission('TIME_IMPORT_CREATE') || hasPermission('TIME_IMPORT_EDIT') || isSuper;
  const canEditImport = hasPermission('TIME_IMPORT_EDIT') || isSuper;

  // Active Tab: 'daily' | 'import' | 'monthly' (คำขอปรับปรุงเวลาย้ายไปพิจารณาที่เมนูอนุมัติเอกสาร)
  const initialTab = (searchParams.get('tab') as 'daily' | 'import' | 'monthly') || (canViewDaily ? 'daily' : 'import');
  const [activeTab, setActiveTab] = useState<'daily' | 'import' | 'monthly'>(
    initialTab === 'import' || initialTab === 'monthly' ? initialTab : (canViewDaily ? 'daily' : 'import')
  );

  useEffect(() => {
    if (!canViewDaily && activeTab === 'daily') {
      if (canViewImport) {
        setActiveTab('import');
      }
    }
  }, [canViewDaily, canViewImport, activeTab]);

  // Sync breadcrumb with activeTab
  useEffect(() => {
    const getPageTitle = () => {
      switch (activeTab) {
        case 'daily':
          return 'ตรวจบันทึกเวลาประจำวัน';
        case 'import':
          return 'นำเข้าไฟล์บันทึกเวลา';
        default:
          return 'ตรวจบันทึกเวลาประจำวัน';
      }
    };
    setBreadcrumb({ section: 'ตรวจบันทึกเวลา', page: getPageTitle() });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  const handleTabChange = (tab: 'daily' | 'import' | 'monthly') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/attendance/daily?${params.toString()}`, { scroll: false });
  };

  // State: Date selection (Default to date param or today in YYYY-MM-DD)
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const initialDate = searchParams.get('date') || getTodayStr();
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  // Sync state if URL searchParams change externally
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'import' || tabParam === 'daily' || tabParam === 'monthly') {
      setActiveTab(tabParam as 'daily' | 'import' | 'monthly');
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
  const [dailyPageSize, setDailyPageSize] = useState(10);

  // Filter States (Daily Records)
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const dailyPhase = useLoadPhase(loading);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceDaily | null>(null);
  const [editForm, setEditForm] = useState<{
    shiftId?: number;
    actualInTime: string;
    actualOutTime: string;
    /** '' = ให้ระบบคำนวณ; อื่นๆ = กำหนดสถานะเอง */
    overrideStatus: string;
    reason: string;
  }>({
    shiftId: undefined,
    actualInTime: '',
    actualOutTime: '',
    overrideStatus: '',
    reason: '',
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
  const [isFormatModalOpen, setIsFormatModalOpen] = useState<boolean>(false);

  // Period Overlap Confirmation Modal State
  const [overlapModalOpen, setOverlapModalOpen] = useState<boolean>(false);
  const [overlapData, setOverlapData] = useState<AttendanceImportResult | null>(null);

  // Batches Table State
  const [batches, setBatches] = useState<AttendanceImportBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const batchesPhase = useLoadPhase(isLoadingBatches);
  const [batchPage, setBatchPage] = useState<number>(1);
  const [batchPageSize, setBatchPageSize] = useState<number>(10);
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
  const [batchRecordPageSize, setBatchRecordPageSize] = useState<number>(10);
  const [batchRecordSearch, setBatchRecordSearch] = useState<string>('');
  const [batchRecordTotalPages, setBatchRecordTotalPages] = useState<number>(1);
  const [batchRecordTotalCount, setBatchRecordTotalCount] = useState<number>(0);

  // Adjustment Create Modal
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [targetRecordForAdjustment, setTargetRecordForAdjustment] = useState<AttendanceDaily | null>(null);
  const [adjustmentInTime, setAdjustmentInTime] = useState('');
  const [adjustmentOutTime, setAdjustmentOutTime] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // Attendance Import Date & Period Selection State
  // -------------------------------------------------------------
  const [importDateMode, setImportDateMode] = useState<'period' | 'auto'>('period');
  const [importYear, setImportYear] = useState<number>(() => new Date().getFullYear());
  const [importMonth, setImportMonth] = useState<number>(() => new Date().getMonth() + 1);

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const formatIsoDate = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;



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
          pageSize: dailyPageSize,
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
  }, [selectedDate, selectedDepartment, selectedStatus, searchKeyword, currentPage, dailyPageSize]);

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
        pageSize: batchPageSize,
        source: filterSource,
        status: filterBatchStatus,
        search: batchSearchQuery || undefined,
      });
      setBatches(res.items);
      setBatchTotalPages(res.totalPages);
      setBatchTotalCount(res.totalCount);
      const valid = res.items.filter((b) => b.dateFrom && b.dateTo && b.status !== 'FAILED' && b.status !== 'REVERTED');
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
  }, [activeTab, batchPage, batchPageSize, filterSource, filterBatchStatus]);

  // Fetch initial batch info on mount to restrict calendar to document date range
  useEffect(() => {
    if (!canViewDaily) return;
    const fetchLatestBatchRange = async () => {
      try {
        const res = await attendanceImportService.getBatches({ page: 1, pageSize: 10 });
        if (res.items && res.items.length > 0) {
          const validBatch = res.items.find((b) => b.dateFrom && b.dateTo && b.status !== 'FAILED' && b.status !== 'REVERTED');
          if (validBatch && validBatch.dateFrom && validBatch.dateTo) {
            setHasAnyBatch(true);
            setAllowedDateRange({
              min: validBatch.dateFrom,
              max: validBatch.dateTo,
              batchName: validBatch.fileName || undefined,
              batchId: validBatch.id,
            });

            // คง selectedDate เป็นวันปัจจุบันตาม requirement (ไม่ override อัตโนมัติเป็นวันที่ในไฟล์)
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
  }, [canViewDaily]);

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
      // สถานะที่ระบบคำนวณเองไม่ได้ → เปิดโหมดกำหนดเองไว้ให้
      overrideStatus: MANUAL_STATUS_OPTIONS.some((o) => o.value === rec.status) && rec.status !== 'ABSENT' ? rec.status : '',
      reason: '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (editForm.reason.trim().length < 3) {
      toast.warning('กรุณาระบุเหตุผลการแก้ไข');
      return;
    }

    try {
      setSavingEdit(true);

      // ใช้วันที่ของรายการที่แก้ (ไม่ใช่วันที่ที่เลือกบนหน้า)
      const combineDateAndTime = (timeStr: string) => {
        if (!timeStr) return undefined;
        const [h, m] = timeStr.split(':');
        const dt = new Date(editingRecord.workDate || selectedDate);
        dt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        return dt.toISOString();
      };

      const req: UpdateAttendanceRequest = {
        shiftId: editForm.shiftId,
        actualIn: combineDateAndTime(editForm.actualInTime),
        actualOut: combineDateAndTime(editForm.actualOutTime),
        clearActualIn: !editForm.actualInTime && !!editingRecord.actualIn,
        clearActualOut: !editForm.actualOutTime && !!editingRecord.actualOut,
        status: editForm.overrideStatus || undefined,
        reason: editForm.reason.trim(),
      };

      await attendanceService.updateAttendance(editingRecord.id, req);
      toast.success('แก้ไขข้อมูลบันทึกเวลาเรียบร้อยแล้ว');
      setEditModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to update attendance:', err);
      toast.error(err?.response?.data?.message || 'ไม่สามารถบันทึกการแก้ไขได้ กรุณาตรวจสอบข้อมูล');
    } finally {
      setSavingEdit(false);
    }
  };

  // ผลคำนวณล่วงหน้าในหน้าต่างแก้ไข (ตรงกับ RecalculateAttendance ฝั่ง backend)
  const editPreview = (() => {
    if (!editingRecord) return null;
    const toMin = (hhmm?: string) => {
      if (!hhmm) return null;
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const isoToHHmm = (iso?: string) => {
      if (!iso) return undefined;
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    const shift = shifts.find((s) => s.id === editForm.shiftId);
    const schedStartStr = shift ? shift.startTime?.substring(0, 5) : isoToHHmm(editingRecord.scheduledStart);
    const schedEndStr = shift ? shift.endTime?.substring(0, 5) : isoToHHmm(editingRecord.scheduledEnd);
    const sStart = toMin(schedStartStr);
    let sEnd = toMin(schedEndStr);
    if (sStart !== null && sEnd !== null && sEnd <= sStart) sEnd += 24 * 60; // กะข้ามวัน
    const aIn = toMin(editForm.actualInTime);
    let aOut = toMin(editForm.actualOutTime);
    if (aIn !== null && aOut !== null && aOut < aIn) aOut += 24 * 60;
    const lateGrace = shift?.lateGraceMinutes ?? 10;
    const earlyGrace = shift?.earlyLeaveGraceMinutes ?? 5;
    const breakMin = shift?.breakMinutes ?? 60;
    const late = aIn !== null && sStart !== null && aIn > sStart + lateGrace ? aIn - sStart : 0;
    const early = aOut !== null && sEnd !== null && aOut < sEnd - earlyGrace ? sEnd - aOut : 0;
    const worked = aIn !== null && aOut !== null ? Math.max(0, aOut - aIn - breakMin) : 0;
    let status: string;
    if (editForm.overrideStatus) status = editForm.overrideStatus;
    else if (aIn === null && aOut === null) status = 'ABSENT';
    else if (late > 0 && early > 0) status = 'LATE_AND_EARLY';
    else if (late > 0) status = 'LATE';
    else if (early > 0) status = 'EARLY_LEAVE';
    else status = 'PRESENT';
    const timed = !editForm.overrideStatus || editForm.overrideStatus === 'HOLIDAY_WORK';
    return {
      schedule: schedStartStr && schedEndStr ? `${schedStartStr} – ${schedEndStr} น.` : 'ไม่มีเวลาตามกะ',
      schedStart: schedStartStr,
      schedEnd: schedEndStr,
      status,
      late: timed && editForm.overrideStatus !== 'HOLIDAY_WORK' ? late : 0,
      early: timed && editForm.overrideStatus !== 'HOLIDAY_WORK' ? early : 0,
      worked: timed || editForm.overrideStatus === 'LEAVE' ? worked : 0,
    };
  })();

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
      const msg = 'ระบบรองรับเฉพาะไฟล์นามสกุล .xlsx, .xls หรือ .csv เท่านั้น';
      setImportErrorMessage(msg);
      toast.error(msg);
      setSelectedFile(null);
      return;
    }
    setImportErrorMessage(null);
    setSelectedFile(file);
    setUploadResult(null);
  };

  const formatDateThai = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleUploadSubmit = async (overwrite: boolean = false) => {
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
        (percent) => setUploadProgress(percent),
        undefined,
        undefined,
        undefined,
        undefined,
        overwrite
      );

      // กรณีพบว่าช่วงเดือน/ปีของไฟล์ซ้ำกับที่มีอยู่แล้วในระบบ และยังไม่ได้กดเลือกเขียนทับ
      if (res.data?.isPeriodOverlap && !overwrite) {
        setOverlapData(res.data);
        setOverlapModalOpen(true);
        setIsUploading(false);
        return;
      }

      if (res.success && res.data) {
        setSelectedFile(null);
        setOverlapModalOpen(false);
        setOverlapData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        let periodLabel = '';
        if (res.data.dateFrom && res.data.dateTo) {
          const [y, m] = res.data.dateFrom.split('-').map(Number);
          const monthText = m >= 1 && m <= 12 ? `${THAI_MONTHS[m - 1]} ${y + 543}` : '';
          periodLabel = monthText
            ? `รอบประจำเดือน ${monthText} (${formatDateThai(res.data.dateFrom)} ถึง ${formatDateThai(res.data.dateTo)})`
            : `ช่วงวันที่ ${formatDateThai(res.data.dateFrom)} ถึง ${formatDateThai(res.data.dateTo)}`;
        }

        if (res.data.failedRecords > 0) {
          toast.warning(
            `นำเข้าข้อมูลสำเร็จบางส่วน (สำเร็จ ${res.data.successRecords.toLocaleString()} / พบข้อผิดพลาด ${res.data.failedRecords.toLocaleString()} รายการ)`,
            periodLabel || 'พบรายการที่รหัสพนักงานไม่ตรงกับข้อมูลในระบบ'
          );
        } else {
          const successNotice = overwrite 
            ? `นำเข้าข้อมูลไฟล์ใหม่สำเร็จและเขียนทับข้อมูลเดิมเรียบร้อย (${res.data.successRecords.toLocaleString()} รายการ)`
            : `นำเข้าข้อมูลสำเร็จครบถ้วน (${res.data.successRecords.toLocaleString()} รายการ)`;
          toast.success(
            successNotice,
            periodLabel ? `${periodLabel} • ข้อมูลพร้อมใช้คำนวณเงินเดือนทันที` : 'ข้อมูลบันทึกเวลาพร้อมใช้งานทันที'
          );
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

  /** ปิดหน้าต่างไฟล์ทับซ้อน = ไม่นำเข้าไฟล์ใหม่ คงไฟล์เดิมไว้ */
  const cancelOverlapImport = () => {
    setOverlapModalOpen(false);
    setOverlapData(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('ยกเลิกการนำเข้าไฟล์ และคงการใช้งานไฟล์เดิมในระบบ');
  };

  const handleOpenRevertModal = (batch: AttendanceImportBatch) => {
    setBatchToRevert(batch);
    setRevertModalOpen(true);
  };

  // ค้นหาในหน้าต่างตรวจเวลา: พิมพ์แล้วค้นหาเองหลังหยุดพิมพ์ (ไม่ต้องกดปุ่ม)
  const lastReviewSearchRef = useRef('');
  useEffect(() => {
    if (!selectedBatchForReview) return;
    if (batchRecordSearch === lastReviewSearchRef.current) return;
    const batchId = selectedBatchForReview.id;
    const t = setTimeout(() => {
      setBatchRecordPage(1);
      loadBatchRecords(batchId, 1, batchRecordPageSize, batchRecordSearch);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchRecordSearch, selectedBatchForReview]);

  const handleOpenTimeReview = async (batch: AttendanceImportBatch) => {
    setSelectedBatchForReview(batch);
    setBatchRecordPage(1);
    setBatchRecordSearch('');
    await loadBatchRecords(batch.id, 1, batchRecordPageSize, '');
  };

  const loadBatchRecords = async (
    batchId: number,
    targetPage: number,
    targetPageSize?: number,
    targetSearch?: string
  ) => {
    try {
      setIsLoadingBatchRecords(true);
      const size = targetPageSize !== undefined ? targetPageSize : batchRecordPageSize;
      const search = targetSearch !== undefined ? targetSearch : batchRecordSearch;
      lastReviewSearchRef.current = search;
      const res = await attendanceImportService.getBatchRecords(batchId, targetPage, size, search);
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
          `ยกเลิกชุดข้อมูล #${batchToRevert.id} (${batchToRevert.fileName}) เรียบร้อยแล้ว`;
        toast.success(successMsg);
        if (allowedDateRange.batchId === batchToRevert.id) {
          const remaining = batches.filter((b) => b.id !== batchToRevert.id && b.status !== 'FAILED' && b.status !== 'REVERTED');
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
    } catch (err: any) {
      console.error('Failed to submit adjustment:', err);
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการยื่นคำขอ';
      toast.error(msg);
    } finally {
      setIsSubmittingAdjustment(false);
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>ลา</span>
        </span>
      );
    }

    if (isAbsent || status === 'ABSENT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>ขาดงาน</span>
        </span>
      );
    }

    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>ตรงเวลา</span>
          </span>
        );
      case 'HOLIDAY_WORK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>ทำงานวันหยุด</span>
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>มาสาย</span>
          </span>
        );
      case 'EARLY_LEAVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>ออกก่อนเวลา</span>
          </span>
        );
      case 'LATE_AND_EARLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>สายและออกก่อน</span>
          </span>
        );
      case 'HOLIDAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>วันหยุดประเพณี</span>
          </span>
        );
      case 'OFF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:text-slate-400 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>วันหยุดสัปดาห์</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>รอดำเนินการ</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getBatchStatusBadge = (status: string) => {
    switch (status) {
      case 'IMPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            สำเร็จครบถ้วน
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            สำเร็จบางส่วน
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            ล้มเหลว
          </span>
        );
      case 'REVERTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:text-slate-400 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:text-slate-400 dark:border-slate-700">
            <XCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
            ยกเลิกแล้ว
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
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
      <div className="border-b border-slate-200 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl dark:border-slate-700 dark:bg-slate-900">
        <TabBar
          aria-label="เมนูลงเวลา"
          items={([
            canViewDaily ? { key: 'daily', label: 'ตรวจบันทึกเวลาประจำวัน', onClick: () => handleTabChange('daily') } : null,
            canViewImport ? { key: 'import', label: 'นำเข้าไฟล์บันทึกเวลา', onClick: () => handleTabChange('import') } : null,
          ] as (TabBarItem | null)[]).filter((t): t is TabBarItem => t !== null)}
          activeKey={(activeTab === 'daily') ? 'daily' : (activeTab === 'import') ? 'import' : null}
        />
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ตรวจบันทึกเวลาประจำวัน (DAILY ATTENDANCE) */}
      {/* ========================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {hasAnyBatch === false ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center flex flex-col items-center justify-center my-4 dark:bg-slate-800 dark:border-slate-700">
              <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1 dark:text-slate-200">ยังไม่มีข้อมูลบันทึกเวลาในระบบ</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed dark:text-slate-400">
                อัปโหลดไฟล์จากเครื่องสแกนเพื่อเริ่มตรวจเวลา
              </p>
              <Button
                icon={<UploadCloud className="w-4 h-4" />}
                onClick={() => handleTabChange('import')}
              >
                ไปที่หน้านำเข้าไฟล์บันทึกเวลา
              </Button>
            </div>
          ) : (
            <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Employees */}
            <div className="bg-slate-100 dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-xs font-bold">พนักงานทั้งหมด</span>
                <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-700 shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{summary?.totalEmployees ?? 0}</div>
                <div className="text-2xs text-slate-600 dark:text-slate-400 mt-0.5">ในระบบวันนี้</div>
              </div>
            </div>

            {/* 2. Present */}
            <div className="bg-emerald-100 dark:bg-emerald-950/60 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                <span className="text-xs font-bold">มาตรงเวลา</span>
                <div className="w-7 h-7 rounded-full bg-white dark:bg-emerald-900/60 shadow-xs flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{summary?.presentCount ?? 0}</div>
                <div className="text-2xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                  คน ({(() => {
                    // % มาตรงเวลา = ตรงเวลา ÷ พนักงานที่ต้องทำงานวันนี้ (ไม่นับวันหยุด)
                    const workingTotal = (summary?.totalEmployees ?? 0) - (summary?.holidayOrOffCount ?? 0);
                    return workingTotal > 0 ? Math.round(((summary?.presentCount ?? 0) / workingTotal) * 1000) / 10 : 0;
                  })()}%)
                </div>
              </div>
            </div>

            {/* 3. Late */}
            <div className="bg-amber-100 dark:bg-amber-950/60 p-4 rounded-2xl border border-amber-300 dark:border-amber-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                <span className="text-xs font-bold">มาสาย</span>
                <div className="w-7 h-7 rounded-full bg-white dark:bg-amber-900/60 shadow-xs flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{summary?.lateCount ?? 0}</div>
                <div className="text-2xs text-amber-700 dark:text-amber-400 mt-0.5 font-medium">เกินระยะเวลาผ่อนปรน</div>
              </div>
            </div>

            {/* 4. Early Leave */}
            <div className="bg-purple-100 dark:bg-purple-950/60 p-4 rounded-2xl border border-purple-300 dark:border-purple-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-purple-800 dark:text-purple-300">
                <span className="text-xs font-bold">ออกก่อนเวลา</span>
                <div className="w-7 h-7 rounded-full bg-white dark:bg-purple-900/60 shadow-xs flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-purple-700 dark:text-purple-300">{summary?.earlyLeaveCount ?? 0}</div>
                <div className="text-2xs text-purple-700 dark:text-purple-400 mt-0.5 font-medium">ก่อนเวลาสิ้นสุดกะ</div>
              </div>
            </div>

            {/* 5. Absent */}
            <div className="bg-rose-100 dark:bg-rose-950/60 p-4 rounded-2xl border border-rose-300 dark:border-rose-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-800 dark:text-rose-300">
                <span className="text-xs font-bold">ขาดงาน</span>
                <div className="w-7 h-7 rounded-full bg-white dark:bg-rose-900/60 shadow-xs flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-rose-700 dark:text-rose-300">{summary?.absentCount ?? 0}</div>
                <div className="text-2xs text-rose-700 dark:text-rose-400 mt-0.5 font-medium">ไม่มีบันทึกเวลา</div>
              </div>
            </div>

            {/* 6. Holiday / Off */}
            <div className="bg-sky-100 dark:bg-sky-950/60 p-4 rounded-2xl border border-sky-300 dark:border-sky-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-sky-800 dark:text-sky-300">
                <span className="text-xs font-bold">วันหยุด</span>
                <div className="w-7 h-7 rounded-full bg-white dark:bg-sky-900/60 shadow-xs flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-sky-700 dark:text-sky-300">{summary?.holidayOrOffCount ?? 0}</div>
                <div className="text-2xs text-sky-700 dark:text-sky-400 mt-0.5 font-medium">วันหยุดบริษัท / ประจำสัปดาห์</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
              {/* Filter & Toolbar Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Search, Filters & Date Stepper */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Search */}
              <div className="relative w-56 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัส หรือชื่อกะ..."
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F1F5F9] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-blue-500/20 dark:text-slate-200 dark:placeholder:text-slate-500 dark:text-slate-400"
                />
              </div>

              {/* Department Filter */}
              <CustomSelect
                value={selectedDepartment}
                onChange={(val) => {
                  setSelectedDepartment(String(val) === 'ALL' ? 'ALL' : Number(val));
                  setCurrentPage(1);
                }}
                placeholder="ทุกแผนก / สังกัด"
                className="min-w-[160px]"
                options={[
                  { value: 'ALL', label: 'ทุกแผนก / สังกัด' },
                  ...departments.map((d) => ({ value: d.id, label: d.departmentName })),
                ]}
              />

              {/* Date Picker */}
              <div className="flex items-center gap-2">
                <ThaiDatePicker
                  value={selectedDate}
                  onChange={(newDate) => {
                    setSelectedDate(newDate);
                    setCurrentPage(1);
                  }}
                  size="sm"
                  className="w-[145px] sm:w-[155px]"
                />

              </div>

              {/* Recalculate Button */}
              <button
                onClick={handleRecalculate}
                disabled={refreshing}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100 border border-slate-200 rounded-lg transition disabled:opacity-50 cursor-pointer dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 dark:border-slate-700"
                title="ประมวลผลคำนวณเวลาใหม่"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>

            {/* Right: Actions */}
            {canViewImport && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  icon={<UploadCloud className="w-4 h-4" />}
                  onClick={() => handleTabChange('import')}
                >
                  นำเข้าไฟล์เวลา
                </Button>
              </div>
            )}
          </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <RefreshIndicator active={dailyPhase.refreshing} />
              <table className="table-standard w-full min-w-[1000px] text-left text-xs border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-primary text-white font-semibold whitespace-nowrap">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {dailyPhase.initialLoading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        กำลังโหลดข้อมูลบันทึกเวลา...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                        <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        ไม่พบข้อมูลบันทึกเวลาสำหรับวันที่เลือก ({formatThaiDate(selectedDate)})
                        {canViewImport && (
                          <div className="mt-3">
                            <button
                              onClick={() => handleTabChange('import')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              นำเข้าไฟล์บันทึกเวลาทันที
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap dark:text-slate-100">
                          {rec.employeeCode}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">
                          {rec.employeeName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">
                          <div>{rec.departmentName || '-'}</div>
                          <div className="text-2xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{rec.positionName || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap dark:text-slate-300">
                          {rec.shiftName ? (
                            <span className="font-semibold">{rec.shiftName}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">
                          {rec.shiftTimeWindow || '-'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {rec.actualIn ? (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400">
                              {formatTimeStr(rec.actualIn)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {rec.actualOut ? (
                            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400">
                              {formatTimeStr(rec.actualOut)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap dark:text-slate-300">
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
                          {canEditTime ? (
                            <button
                              onClick={() => handleOpenEditModal(rec)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer dark:text-slate-300 dark:border-slate-700"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>แก้ไข</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700/60">
              <TablePagination
                total={totalCount}
                page={currentPage}
                pageSize={dailyPageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setDailyPageSize(newSize);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100, 200]}
              />
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
          {canCreateImport && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:border-slate-700/60">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 dark:text-slate-100">
                  <HardDrive className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  อัปโหลดไฟล์ข้อมูลเวลาเข้างาน
                </h2>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  onClick={() => setIsFormatModalOpen(true)}
                  title="ดูโครงสร้างหัวคอลัมน์และดาวน์โหลดไฟล์แม่แบบตัวอย่าง (.xlsx)"
                >
                  รูปแบบไฟล์ที่รองรับ
                </Button>

                <Button
                  size="sm"
                  icon={isUploading ? undefined : <UploadCloud className="w-3.5 h-3.5" />}
                  disabled={!selectedFile}
                  loading={isUploading}
                  onClick={() => handleUploadSubmit(false)}
                >
                  {isUploading ? 'กำลังประมวลผล...' : 'เริ่มประมวลผลนำเข้าไฟล์'}
                </Button>
              </div>
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
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 dark:text-slate-400">ขนาด: {formatFileSize(selectedFile.size)}</p>
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
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        ลากไฟล์มาวางที่นี่ หรือ <span className="text-blue-600 hover:underline">คลิกเพื่อเลือกไฟล์</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 dark:text-slate-400">
                        รองรับไฟล์ประเภท .xlsx, .xls หรือ .csv (ขนาดไม่เกิน 20MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      กำลังส่งข้อมูลและประมวลผลกะการทำงาน...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Batch History Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative max-w-sm w-full sm:w-64 shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 pointer-events-none" />
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
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 transition-all"
                  />
                </div>

                <CustomSelect
                  value={filterSource}
                  onChange={(val) => {
                    setFilterSource(String(val));
                    setBatchPage(1);
                  }}
                  className="min-w-[170px]"
                  options={[
                    { value: 'ALL', label: 'แหล่งที่มา: ทั้งหมด' },
                    { value: 'FINGERPRINT', label: 'เครื่องสแกนลายนิ้วมือ' },
                    { value: 'FACE_SCAN', label: 'เครื่องสแกนใบหน้า' },
                    { value: 'EXCEL', label: 'ไฟล์ Excel' },
                    { value: 'CSV', label: 'ไฟล์ CSV' },
                  ]}
                />

                <CustomSelect
                  value={filterBatchStatus}
                  onChange={(val) => {
                    setFilterBatchStatus(String(val));
                    setBatchPage(1);
                  }}
                  className="min-w-[150px]"
                  options={[
                    { value: 'ALL', label: 'สถานะ: ทั้งหมด' },
                    { value: 'IMPORTED', label: 'สำเร็จครบถ้วน' },
                    { value: 'PARTIAL', label: 'สำเร็จบางส่วน' },
                    { value: 'FAILED', label: 'ล้มเหลว' },
                    { value: 'REVERTED', label: 'ยกเลิกแล้ว' },
                  ]}
                />
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  onClick={() => {
                    setBatchPage(1);
                    loadBatches();
                  }}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors dark:hover:bg-slate-800/40 dark:border-slate-700"
                  title="รีเฟรชตาราง"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingBatches ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <RefreshIndicator active={batchesPhase.refreshing} />
              <table className="table-standard w-full min-w-[1050px] text-left text-xs border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-primary text-white font-semibold whitespace-nowrap">
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
                    <th className="py-3.5 px-4 text-center whitespace-nowrap w-20">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {batchesPhase.initialLoading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        กำลังโหลดข้อมูลประวัติการนำเข้า...
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        ไม่พบรายการประวัติการนำเข้าไฟล์
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap dark:text-slate-100">
                          #{batch.id}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap dark:text-slate-300">
                          {formatDateTimeThai(batch.importedAt)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate whitespace-nowrap dark:text-slate-100" title={batch.fileName || ''}>
                          {batch.fileName || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap dark:text-slate-300">
                          <span className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 border border-slate-200 text-2xs font-semibold dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700">
                            {getSourceLabel(batch.source)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">
                          {batch.deviceName || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">
                          {batch.dateFrom && batch.dateTo ? (
                            <span>{formatDateThai(batch.dateFrom)} – {formatDateThai(batch.dateTo)}</span>
                          ) : batch.dateFrom ? (
                            <span>{formatDateThai(batch.dateFrom)}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">
                          {batch.totalRecords.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                          {batch.successRecords.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold whitespace-nowrap">
                          {batch.failedRecords > 0 ? (
                            <span className="text-rose-600">{batch.failedRecords.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getBatchStatusBadge(batch.status)}
                          {batch.status === 'REVERTED' && batch.revertedAt && (
                            <div className="text-2xs text-slate-400 mt-1 dark:text-slate-500 dark:text-slate-400">
                              {new Date(batch.revertedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                              {batch.revertedByUserName ? ` โดย ${batch.revertedByUserName}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">
                          {batch.importedByUserName || 'ระบบอัตโนมัติ'}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {batch.status === 'REVERTED' ? (
                            <span className="text-2xs text-slate-400 dark:text-slate-500">—</span>
                          ) : (
                            <ActionDropdown
                              menuClassName="w-48"
                              title="จัดการชุดข้อมูลนำเข้า"
                              items={[
                                {
                                  label: 'ตรวจเวลา',
                                  icon: <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />,
                                  onClick: () => handleOpenTimeReview(batch),
                                },
                                ...(batch.failedRecords > 0
                                  ? [{
                                      label: 'ดูข้อผิดพลาด',
                                      icon: <AlertCircle className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />,
                                      onClick: () => handleOpenErrors(batch),
                                    }]
                                  : []),
                                ...(canEditImport
                                  ? [
                                      { divider: true, label: '' },
                                      {
                                        label: 'ยกเลิกชุดข้อมูล',
                                        icon: <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />,
                                        onClick: () => handleOpenRevertModal(batch),
                                        danger: true,
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700/60">
              <TablePagination
                total={batchTotalCount}
                page={batchPage}
                pageSize={batchPageSize}
                onPageChange={setBatchPage}
                onPageSizeChange={(newSize) => {
                  setBatchPageSize(newSize);
                  setBatchPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editModalOpen && editingRecord && (
        <Modal
          icon={Pencil}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="แก้ไขข้อมูลบันทึกเวลา"
          subtitle={`${editingRecord.employeeCode} · ${editingRecord.employeeName} · ${formatThaiDate(editingRecord.workDate || selectedDate)}`}
          onSubmit={handleSaveEdit}
          footer={
            <ModalFooter
              onCancel={() => setEditModalOpen(false)}
              cancelText="ยกเลิก"
              submitText="บันทึกการแก้ไข"
              loading={savingEdit}
              loadingText="กำลังบันทึก..."
              submit={true}
            />
          }
        >
              {/* กะการทำงาน */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">กะการทำงาน</label>
                <ShiftSelect
                  shifts={shifts}
                  value={editForm.shiftId}
                  onChange={(id) => setEditForm((prev) => ({ ...prev, shiftId: id }))}
                  noneLabel="ไม่มีกะ (ใช้เวลาทำงานปกติของบริษัท)"
                />
              </div>

              {/* เวลาเข้า-ออกจริง (ลบได้) */}
              <div className="grid grid-cols-2 gap-4">
                {([
                  { key: 'actualInTime', label: 'เวลาเข้างาน', align: 'left' },
                  { key: 'actualOutTime', label: 'เวลาออกงาน', align: 'right' },
                ] as const).map((f) => (
                  <div key={f.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{f.label}</span>
                      {editForm[f.key] && (
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, [f.key]: '' }))}
                          className="text-[11px] font-medium text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          ล้างเวลา
                        </button>
                      )}
                    </div>
                    {editForm[f.key] ? (
                      <ThaiTimePicker
                        value={editForm[f.key]}
                        onChange={(val) => setEditForm((prev) => ({ ...prev, [f.key]: val }))}
                        align={f.align}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            [f.key]: f.key === 'actualInTime' ? editPreview?.schedStart || '08:30' : editPreview?.schedEnd || '17:30',
                          }))
                        }
                        className="w-full h-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-500 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                      >
                        + ไม่มีเวลา — กดเพื่อเพิ่ม
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* ผลคำนวณ (อัปเดตทันที) */}
              {editPreview && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 px-3.5 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {editForm.overrideStatus ? 'สถานะ (กำหนดเอง)' : 'ผลคำนวณจากเวลาและกะ'}
                    </span>
                    {renderStatusBadge(editPreview.status, editPreview.status === 'ABSENT')}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">ทำงาน</div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fmtMinutes(editPreview.worked)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">สาย</div>
                      <div className={`text-sm font-semibold ${editPreview.late > 0 ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'}`}>{editPreview.late} นาที</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">ออกก่อน</div>
                      <div className={`text-sm font-semibold ${editPreview.early > 0 ? 'text-purple-600' : 'text-slate-800 dark:text-slate-200'}`}>{editPreview.early} นาที</div>
                    </div>
                  </div>
                </div>
              )}

              {/* กำหนดสถานะเอง (กรณีพิเศษ) */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!editForm.overrideStatus}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, overrideStatus: e.target.checked ? 'LEAVE' : '' }))}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">กำหนดสถานะเอง</span>
                  <span className="text-[11px] text-slate-400">(ลา, ขาดงาน, วันหยุด)</span>
                </label>
                {editForm.overrideStatus && (
                  <CustomSelect
                    value={editForm.overrideStatus}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, overrideStatus: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {MANUAL_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </CustomSelect>
                )}
              </div>

              {/* เหตุผลการแก้ไข */}
              <div>
                <label htmlFor="edit-reason" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  เหตุผลการแก้ไข <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="edit-reason"
                  rows={2}
                  maxLength={500}
                  value={editForm.reason}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="เช่น ลืมสแกนนิ้วตอนเข้างาน / เครื่องสแกนขัดข้อง"
                  className={`${inputClass} resize-none`}
                />
                {editingRecord.editReason && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    แก้ไขล่าสุด{editingRecord.editedAt ? ` ${new Date(editingRecord.editedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.` : ''}: {editingRecord.editReason}
                  </p>
                )}
              </div>
        </Modal>
      )}

      {/* Manual Punch Modal */}
      {clockModalOpen && (
        <Modal
          icon={Clock}
          isOpen={clockModalOpen}
          onClose={() => setClockModalOpen(false)}
          title={`บันทึกเวลา${clockModalType === 'in' ? 'เข้างาน' : 'ออกงาน'}ด้วยตนเอง`}
          subtitle={`วันที่ ${formatThaiDate(selectedDate)}`}
          onSubmit={handleSaveQuickClock}
          size="sm"
          footer={
            <ModalFooter
              onCancel={() => setClockModalOpen(false)}
              cancelText="ยกเลิก"
              submitText="ยืนยันบันทึกเวลา"
              loading={savingClock}
              loadingText="กำลังบันทึก..."
              submit={true}
            />
          }
        >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 dark:text-slate-300">
                  เลือกพนักงาน <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={clockEmpId}
                  onChange={(e) => setClockEmpId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value={0}>-- กรุณาเลือกพนักงาน --</option>
                  {records.map((r) => (
                    <option key={r.employeeId} value={r.employeeId}>
                      {r.employeeName} ({r.departmentName || 'ไม่ระบุแผนก'})
                    </option>
                  ))}
                </CustomSelect>
              </div>

              <div>
                <ThaiTimePicker
                  label={`เวลา${clockModalType === 'in' ? 'เข้า' : 'ออก'}งาน`}
                  value={clockTime}
                  onChange={(val) => setClockTime(val)}
                />
              </div>

        </Modal>
      )}

      {/* Error Log Modal */}
      {selectedBatchForErrors && (
        <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] dark:bg-slate-800 dark:border-slate-700">
            <ModalHeader
              icon={AlertCircle}
              title="รายการข้อผิดพลาดของการนำเข้า (Error Logs)"
              subtitle={<>ชุดที่ #{selectedBatchForErrors.id} | ไฟล์: {selectedBatchForErrors.fileName} ({errorTotalCount.toLocaleString()} รายการ)</>}
              onClose={() => setSelectedBatchForErrors(null)}
            />

            <div className="p-5 overflow-y-auto flex-1">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="table-standard w-full min-w-[650px] text-left text-xs border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold whitespace-nowrap">
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">แถวที่</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">รหัสพนักงาน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">ชื่อพนักงาน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">แผนก</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">วันเวลาที่สแกน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-rose-600">สาเหตุข้อผิดพลาด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {isLoadingErrors ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
                          กำลังโหลด Error Logs...
                        </td>
                      </tr>
                    ) : errorLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                          ไม่พบรายการข้อผิดพลาดในชุดนี้
                        </td>
                      </tr>
                    ) : (
                      errorLogs.map((err) => (
                        <tr key={err.id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="py-3 px-3.5 text-center font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap dark:text-slate-300">
                            {err.rowNumber}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap dark:text-slate-100">
                            {err.employeeCode || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">
                            {err.employeeName || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">
                            {err.departmentName || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">
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

            <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">
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
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 dark:text-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors dark:hover:bg-slate-800/40 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-900"
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
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 dark:text-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors dark:hover:bg-slate-800/40 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-900"
                >
                  ถัดไป
                </button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedBatchForErrors(null)}
                  className="ml-2"
                >
                  ปิด
                </Button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Time Review Modal (ตรวจเวลา) */}
      {selectedBatchForReview && (
        <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] dark:bg-slate-800 dark:border-slate-700">
            {/* Header */}
            <ModalHeader
              icon={Eye}
              title="ตรวจสอบเวลาเข้า-ออกงาน"
              subtitle={<>ชุดที่ #{selectedBatchForReview.id} | ไฟล์: {selectedBatchForReview.fileName} ({batchRecordTotalCount.toLocaleString()} รายการ)</>}
              onClose={() => setSelectedBatchForReview(null)}
            />

            {/* Search Toolbar */}
            <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center gap-3 dark:border-slate-700/60 dark:bg-slate-900">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none dark:text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
                  value={batchRecordSearch}
                  onChange={(e) => setBatchRecordSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:text-slate-400"
                />
                {batchRecordSearch && (
                  <button
                    type="button"
                    onClick={() => setBatchRecordSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400 p-0.5 rounded-full dark:text-slate-500 dark:text-slate-400"
                    title="ล้างคำค้นหา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="p-5 overflow-y-auto flex-1">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="table-standard w-full min-w-[800px] text-left text-xs border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold whitespace-nowrap">
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
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {isLoadingBatchRecords ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
                          กำลังโหลดข้อมูล...
                        </td>
                      </tr>
                    ) : batchRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                          {batchRecordSearch
                            ? `ไม่พบข้อมูลพนักงานที่ตรงกับ "${batchRecordSearch}"`
                            : 'ไม่พบข้อมูลบันทึกเวลาในชุดนี้'}
                        </td>
                      </tr>
                    ) : (
                      batchRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap dark:text-slate-100">
                            {rec.employeeCode}
                          </td>
                          <td className="py-3 px-3.5 text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">
                            {rec.employeeName || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap dark:text-slate-400">
                            {rec.departmentName || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium dark:text-slate-300">
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
                              <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {rec.actualOut ? (
                              <span className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                                <LogOut className="w-3 h-3" />
                                {rec.actualOut}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center text-slate-700 dark:text-slate-300 whitespace-nowrap dark:text-slate-300">
                            {rec.isAbsent ? '-' : `${Math.floor(rec.workedMinutes / 60)}:${String(rec.workedMinutes % 60).padStart(2, '0')}`}
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {rec.lateMinutes > 0 ? (
                              <span className="font-semibold text-amber-600">{rec.lateMinutes}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">0</span>
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
            <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs dark:border-slate-700">
              <TablePagination
                total={batchRecordTotalCount}
                page={batchRecordPage}
                pageSize={batchRecordPageSize}
                onPageChange={(nextP) => {
                  setBatchRecordPage(nextP);
                  if (selectedBatchForReview) {
                    loadBatchRecords(selectedBatchForReview.id, nextP, batchRecordPageSize, batchRecordSearch);
                  }
                }}
                onPageSizeChange={(newSize) => {
                  setBatchRecordPageSize(newSize);
                  setBatchRecordPage(1);
                  if (selectedBatchForReview) {
                    loadBatchRecords(selectedBatchForReview.id, 1, newSize, batchRecordSearch);
                  }
                }}
                pageSizeOptions={[10, 20, 50, 100]}
                className="flex-1"
              />
            </div>
          </div>
        </ModalShell>
      )}

      {/* Revert / Delete Batch Confirmation Modal */}
      {revertModalOpen && batchToRevert && (
        <ModalShell className="bg-slate-900/40 backdrop-blur-xs z-50 animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 dark:bg-slate-900 dark:border-slate-700/60">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">ยืนยันยกเลิกชุดข้อมูลนำเข้า?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">ชุดข้อมูล #{batchToRevert.id}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs mb-4 dark:bg-slate-950 dark:border-slate-700/80">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">ชื่อไฟล์:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px] dark:text-slate-100" title={batchToRevert.fileName || ''}>
                  {batchToRevert.fileName || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">ช่วงวันที่ในเอกสาร:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {batchToRevert.dateFrom && batchToRevert.dateTo
                    ? `${formatThaiDate(batchToRevert.dateFrom)} - ${formatThaiDate(batchToRevert.dateTo)}`
                    : batchToRevert.dateFrom || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">รายการที่นำเข้าสำเร็จ:</span>
                <span className="font-semibold text-emerald-600">
                  {batchToRevert.successRecords.toLocaleString()} รายการ
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 mb-5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">ผลของการยกเลิก:</p>
                <ul className="text-rose-700 mt-0.5 leading-relaxed list-disc pl-4 space-y-0.5">
                  <li>เวลาเข้า-ออกที่มาจากไฟล์นี้จะถูกล้าง วันเหล่านั้นกลับเป็น ลา / วันหยุด / ขาดงาน ตามข้อมูลในระบบ</li>
                  <li>คำขอแก้ไขเวลาที่อนุมัติแล้วยังอยู่ และระบบจะใช้เวลาที่อนุมัติแทน</li>
                  <li>สรุปรายเดือนจะคำนวณใหม่ (ถ้าเดือนนั้นคำนวณเงินเดือนไว้แล้ว ต้องคำนวณใหม่)</li>
                  <li>ยกเลิกไม่ได้ ถ้างวดเงินเดือนของเดือนนั้นอนุมัติหรือจ่ายไปแล้ว</li>
                  <li>ชุดนี้ยังอยู่ในประวัติเป็น &quot;ยกเลิกแล้ว&quot; และนำเข้าไฟล์เดิมใหม่ได้</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setRevertModalOpen(false);
                  setBatchToRevert(null);
                }}
              >
                ยกเลิก
              </Button>
              <Button
                variant="danger"
                type="button"
                loading={isRevertingBatch}
                onClick={handleConfirmRevertBatch}
              >
                {isRevertingBatch ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกชุดข้อมูล'}
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal: ยื่นคำขอปรับปรุงเวลาเข้า-ออกงาน (Attendance Adjustment) */}
      {/* ------------------------------------------------------------- */}
      {adjustmentModalOpen && targetRecordForAdjustment && (
        <Modal
          icon={FileEdit}
          isOpen={adjustmentModalOpen}
          onClose={() => {
            setAdjustmentModalOpen(false);
            setTargetRecordForAdjustment(null);
          }}
          title="ยื่นคำขอปรับปรุงเวลาเข้า-ออกงาน"
          subtitle={`${targetRecordForAdjustment.employeeCode} - ${targetRecordForAdjustment.employeeName}`}
          onSubmit={handleCreateAdjustmentSubmit}
          footer={
            <ModalFooter
              onCancel={() => {
                setAdjustmentModalOpen(false);
                setTargetRecordForAdjustment(null);
              }}
              cancelText="ยกเลิก"
              submitText="ส่งคำขอปรับปรุงเวลา"
              loading={isSubmittingAdjustment}
              loadingText="กำลังส่งคำขอ..."
              submit={true}
            />
          }
        >

            {/* Context Info Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs dark:bg-slate-950 dark:border-slate-700/80">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">วันที่ปฏิบัติงาน:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatThaiDate(targetRecordForAdjustment.workDate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">แผนก / กะการทำงาน:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {targetRecordForAdjustment.departmentName || '-'} ({targetRecordForAdjustment.shiftName || 'ไม่ระบุกะ'})
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 dark:text-slate-400">เวลาเดิมในระบบ:</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold dark:bg-slate-700 dark:text-slate-300">
                    เข้า: {targetRecordForAdjustment.actualIn ? formatTimeStr(targetRecordForAdjustment.actualIn) : 'ไม่มี'}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold dark:bg-slate-700 dark:text-slate-300">
                    ออก: {targetRecordForAdjustment.actualOut ? formatTimeStr(targetRecordForAdjustment.actualOut) : 'ไม่มี'}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="space-y-4">
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 dark:text-slate-300">
                  เหตุผลในการขอปรับปรุงเวลา <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="ระบุเหตุผล เช่น ลืมสแกนนิ้วมือ, เครื่องสแกนขัดข้อง, ไปปฏิบัติงานนอกสถานที่ ฯลฯ"
                  className={inputClass}
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  คำขอนี้จะถูกส่งไปยังหัวหน้างานหรือฝ่ายทรัพยากรบุคคลเพื่อตรวจสอบและอนุมัติ เมื่อได้รับการอนุมัติแล้ว ระบบจะคำนวณเวลาทำงาน สาย ออกก่อน และสถานะใหม่อัตโนมัติ
                </p>
              </div>

            </div>
        </Modal>
      )}


      {/* Modal: ยืนยันการนำเข้าไฟล์เดือน/ปีที่ซ้ำซ้อน (เลือกใช้ไฟล์ใหม่หรือไฟล์เก่า) */}
      {overlapModalOpen && overlapData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <ModalHeader title="ตรวจพบข้อมูลเวลาของเดือนนี้ในระบบแล้ว" onClose={cancelOverlapImport} />

            {/* Comparison Cards */}
            <div className="p-6 pb-0 space-y-3">
              {/* Existing File Info */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>ไฟล์เดิมในระบบ</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Batch #{overlapData.existingBatchId}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {overlapData.existingBatchFileName || 'ชุดข้อมูลเดิม'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  ช่วงวันที่:{' '}
                  {overlapData.existingBatchDateFrom && overlapData.existingBatchDateTo
                    ? `${formatDateThai(overlapData.existingBatchDateFrom)} ถึง ${formatDateThai(overlapData.existingBatchDateTo)}`
                    : '-'}
                </div>
              </div>

              {/* New Uploading File Info */}
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-800 dark:text-blue-300">
                  <span className="flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>ไฟล์ใหม่ที่กำลังนำเข้า</span>
                  </span>
                  <span className="text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    ไฟล์ใหม่
                  </span>
                </div>
                <div className="text-sm font-bold text-blue-950 dark:text-blue-100 truncate">
                  {selectedFile?.name || overlapData.fileName}
                </div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300">
                  ช่วงวันที่: {overlapData.dateFrom && formatDateThai(overlapData.dateFrom)} ถึง {overlapData.dateTo && formatDateThai(overlapData.dateTo)}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 px-6 py-4 mt-5 border-t border-slate-100 dark:border-slate-700">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isUploading}
                onClick={cancelOverlapImport}
              >
                ใช้ไฟล์เก่า (ยกเลิกการอัปโหลด)
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isUploading}
                loading={isUploading}
                onClick={() => handleUploadSubmit(true)}
                icon={!isUploading ? <CheckCircle2 className="w-3.5 h-3.5" /> : undefined}
              >
                ใช้ไฟล์ใหม่ (เขียนทับข้อมูลเดิม)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: รูปแบบไฟล์ต้นฉบับสำหรับนำเข้าข้อมูลบันทึกเวลา */}
      <AttendanceFileFormatModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
      />
    </div>
  );
}

export default function DailyAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3 dark:text-slate-500 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">กำลังโหลดข้อมูลบันทึกเวลา...</p>
        </div>
      }
    >
      <DailyAttendanceContent />
    </Suspense>
  );
}
