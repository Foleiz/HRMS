'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
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
  Download,
  HardDrive,
  FileText,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { attendanceService } from '@/services/attendanceService';
import { attendanceImportService } from '@/services/attendanceImportService';
import { organizationService } from '@/services/organizationService';
import { shiftService } from '@/services/shiftService';
import {
  AttendanceDaily,
  DailyAttendanceSummary,
  UpdateAttendanceRequest,
} from '@/types/attendance';
import {
  AttendanceImportBatch,
  AttendanceImportResult,
  AttendanceImportError,
  AttendanceImportFilterQuery,
} from '@/types/attendanceImport';
import { Department } from '@/types/organization';
import { Shift } from '@/types/shift';
import ThaiTimePicker from '@/components/common/ThaiTimePicker';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function DailyAttendancePage() {
  // Active Tab: 'daily' | 'import'
  const [activeTab, setActiveTab] = useState<'daily' | 'import'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'import') return 'import';
    }
    return 'daily';
  });

  // State: Date selection (Default to today in YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get('date');
      if (dateParam) return dateParam;
    }
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

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

  // Loading & Alert States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const [source, setSource] = useState<string>('FINGERPRINT');
  const [deviceName, setDeviceName] = useState<string>('');
  const [allowDuplicate, setAllowDuplicate] = useState<boolean>(false);
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

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
      setErrorMessage('ไม่สามารถโหลดข้อมูลบันทึกเวลาได้ กรุณาลองใหม่อีกครั้ง');
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
      setSuccessMessage('คำนวณเวลาเข้างานและสถานะใหม่เรียบร้อยแล้ว');
      await fetchData();
    } catch (err) {
      console.error('Failed to recalculate:', err);
      setErrorMessage('ไม่สามารถคำนวณเวลาใหม่ได้');
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
      setSuccessMessage('แก้ไขข้อมูลบันทึกเวลาเรียบร้อยแล้ว');
      setEditModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to update attendance:', err);
      setErrorMessage('ไม่สามารถบันทึกการแก้ไขได้ กรุณาตรวจสอบข้อมูล');
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
      setErrorMessage('กรุณาเลือกพนักงาน');
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
        setSuccessMessage('บันทึกเวลาเข้างานเรียบร้อย');
      } else {
        await attendanceService.clockOut({
          employeeId: clockEmpId,
          workDate: selectedDate,
          clockOutTime: dt.toISOString(),
        });
        setSuccessMessage('บันทึกเวลาออกงานเรียบร้อย');
      }

      setClockModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed manual punch:', err);
      setErrorMessage('ไม่สามารถบันทึกเวลาได้ กรุณาตรวจสอบข้อมูล');
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

      const res = await attendanceImportService.uploadFile(
        selectedFile,
        source,
        deviceName || undefined,
        allowDuplicate,
        (percent) => setUploadProgress(percent)
      );

      if (res.success && res.data) {
        setUploadResult(res.data);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadBatches();
      } else {
        setImportErrorMessage(res.message || 'เกิดข้อผิดพลาดในการประมวลผลไฟล์');
        if (res.data) setUploadResult(res.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      setImportErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await attendanceImportService.downloadTemplate('xlsx');
    } catch (err: any) {
      alert('ไม่สามารถดาวน์โหลดไฟล์แม่แบบได้ในขณะนี้: ' + (err.message || 'ข้อผิดพลาด'));
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

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ตรวจบันทึกเวลาและนำเข้าข้อมูลเวลา</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                นำเข้าข้อมูลเวลาจากไฟล์เครื่องสแกนนิ้ว/Excel ตรวจสอบเวลาเข้า-ออกงาน และคำนวณการมาสาย ออกก่อน อัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === 'daily' ? (
            <>
              {/* Quick Date Stepper */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => adjustDate(-1)}
                  className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition"
                  title="วันก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-1 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>{formatThaiDate(selectedDate)}</span>
                </div>
                <button
                  onClick={() => adjustDate(1)}
                  className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition"
                  title="วันถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-700"
              />

              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                วันนี้
              </button>

              <button
                onClick={handleRecalculate}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
                title="ประมวลผลเวลาใหม่"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                <span>คำนวณใหม่</span>
              </button>

              <button
                onClick={() => setActiveTab('import')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
              >
                <UploadCloud className="w-4 h-4" />
                <span>นำเข้าไฟล์เวลา</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4 text-slate-500" />
                ดาวน์โหลดไฟล์ตัวอย่าง (Template)
              </button>
              <button
                onClick={() => setActiveTab('daily')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Clock className="w-4 h-4" />
                ดูตารางบันทึกเวลาประจำวัน
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 px-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'daily'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>ตรวจบันทึกเวลาประจำวัน</span>
          {records.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-50 text-blue-700">
              {totalCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`pb-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'import'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>นำเข้าไฟล์บันทึกเวลา (Excel / CSV)</span>
          {batchTotalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700">
              {batchTotalCount}
            </span>
          )}
        </button>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: ตรวจบันทึกเวลาประจำวัน (DAILY ATTENDANCE) */}
      {/* ========================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6 animate-in fade-in duration-200">
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

          {/* Filters & Actions Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหารหัสพนักงาน, ชื่อ-นามสกุล..."
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedDepartment(val === 'ALL' ? 'ALL' : Number(val));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">ทุกแผนก</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">สถานะทั้งหมด</option>
                  <option value="PRESENT">ตรงเวลา</option>
                  <option value="LATE">มาสาย</option>
                  <option value="EARLY_LEAVE">ออกก่อนเวลา</option>
                  <option value="LATE_AND_EARLY">สายและออกก่อน</option>
                  <option value="ABSENT">ขาดงาน</option>
                  <option value="HOLIDAY">วันหยุดประเพณี</option>
                  <option value="OFF">วันหยุดสัปดาห์</option>
                  <option value="PENDING">รอดำเนินการ</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openQuickClockModal('in')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-600" />
                <span>ลงเวลาด้วยตนเอง</span>
              </button>
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
                            onClick={() => setActiveTab('import')}
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
                          <button
                            onClick={() => handleOpenEditModal(rec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>
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
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                ดาวน์โหลด Template
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

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    แหล่งที่มาของข้อมูล (Source)
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="FINGERPRINT">เครื่องสแกนลายนิ้วมือ</option>
                    <option value="FACE_SCAN">เครื่องสแกนใบหน้า</option>
                    <option value="EXCEL">ไฟล์ Excel บันทึกเวลา</option>
                    <option value="CSV">ไฟล์ CSV ข้อมูลเวลา</option>
                    <option value="EXTERNAL">ระบบภายนอก</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อเครื่องสแกน / จุดบันทึก (ระบุหรือไม่ก็ได้)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น เครื่องสแกนประตูหน้า ชั้น 1"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowDuplicate}
                      onChange={(e) => setAllowDuplicate(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      อนุญาตให้อัปโหลดซ้ำ (บังคับนำเข้ากรณีตรวจพบไฟล์เดิม)
                    </span>
                  </label>
                </div>
              </div>

              {/* Error Alert */}
              {importErrorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-rose-900">แจ้งเตือนข้อผิดพลาด</p>
                    <p className="text-xs text-rose-700 mt-0.5">{importErrorMessage}</p>
                  </div>
                </div>
              )}

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

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={!selectedFile || isUploading}
                  onClick={handleUploadSubmit}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all ${
                    !selectedFile || isUploading
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-[0.98]'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      กำลังประมวลผล...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      เริ่มประมวลผลนำเข้าไฟล์
                    </>
                  )}
                </button>
              </div>
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
                      if (uploadResult.dateFrom) {
                        setSelectedDate(uploadResult.dateFrom);
                      }
                      setActiveTab('daily');
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
                              onClick={() => {
                                if (batch.dateFrom) {
                                  setSelectedDate(batch.dateFrom);
                                }
                                setActiveTab('daily');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              ตรวจเวลา
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
    </div>
  );
}
