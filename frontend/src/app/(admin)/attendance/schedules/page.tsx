'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Loader2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Sparkles,
  SlidersHorizontal,
  CalendarDays,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Check,
  Layers,
  ChevronDown,
  Eye,
  CheckSquare,
  Square,
  Sun,
  Moon,
  Building2,
  CalendarRange,
} from 'lucide-react';
import { scheduleService, employeeShiftService } from '@/services/scheduleService';
import { shiftService } from '@/services/shiftService';
import { organizationService } from '@/services/organizationService';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import {
  WorkSchedule,
  CreateWorkScheduleRequest,
  UpdateWorkScheduleRequest,
  EmployeeShift,
  AssignEmployeeShiftRequest,
  BatchAssignEmployeeShiftRequest,
  BatchAssignResult,
  UpdateEmployeeShiftRequest,
  MonthlyRosterResponse,
  AssignableEmployee,
} from '@/types/schedule';
import { Shift } from '@/types/shift';
import { Department } from '@/types/organization';
import ThaiTimePicker from '@/components/common/ThaiTimePicker';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export default function SchedulesPage() {
  const { setBreadcrumb } = useBreadcrumb();

  // Active Main Tab: 'schedules' (ตารางหลัก) | 'assignments' (การมอบหมายกะ)
  const [activeTab, setActiveTab] = useState<'schedules' | 'assignments'>('schedules');

  // Loading states
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [assignments, setAssignments] = useState<EmployeeShift[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignableEmployees, setAssignableEmployees] = useState<AssignableEmployee[]>([]);

  // Roster State
  const [rosterData, setRosterData] = useState<MonthlyRosterResponse | null>(null);
  const [rosterYear, setRosterYear] = useState<number>(new Date().getFullYear());
  const [rosterMonth, setRosterMonth] = useState<number>(new Date().getMonth() + 1);

  // Tab 1 (Schedules) filters
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('ALL');
  const [scheduleViewMode, setScheduleViewMode] = useState<'grid' | 'table'>('grid');

  // Tab 2 (Assignments) filters & view
  const [assignmentViewMode, setAssignmentViewMode] = useState<'list' | 'matrix'>('list');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentDeptFilter, setAssignmentDeptFilter] = useState<string>('ALL');

  // Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states: Work Schedule (Create / Edit)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalMode, setScheduleModalMode] = useState<'create' | 'edit'>('create');
  const [scheduleForm, setScheduleForm] = useState<CreateWorkScheduleRequest & { id?: number }>({
    scheduleCode: '',
    scheduleName: '',
    workStart: '08:30',
    workEnd: '17:30',
    breakMinutes: 60,
    lateGraceMinutes: 15,
    earlyLeaveGraceMinutes: 0,
    status: 'ACTIVE',
  });

  // Modal states: Single Assign Shift
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalMode, setAssignModalMode] = useState<'create' | 'edit'>('create');
  const [assignForm, setAssignForm] = useState<AssignEmployeeShiftRequest & { id?: number }>({
    employeeId: 0,
    shiftId: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
  });

  // Modal states: Batch Assign Shift
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchTargetType, setBatchTargetType] = useState<'department' | 'selected'>('department');
  const [batchSelectedDept, setBatchSelectedDept] = useState<number | null>(null);
  const [batchSelectedEmpIds, setBatchSelectedEmpIds] = useState<number[]>([]);
  const [batchShiftId, setBatchShiftId] = useState<number>(0);
  const [batchEffectiveFrom, setBatchEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [batchEffectiveTo, setBatchEffectiveTo] = useState<string>('');
  const [batchResult, setBatchResult] = useState<BatchAssignResult | null>(null);
  const [empFilterKeyword, setEmpFilterKeyword] = useState('');

  // Delete Confirm Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'schedule' | 'assignment'; id: number; title: string } | null>(null);

  // -------------------------------------------------------------
  // Load Initial Data
  // -------------------------------------------------------------
  const loadSchedules = useCallback(async () => {
    try {
      setLoadingSchedules(true);
      const data = await scheduleService.getWorkSchedules();
      setWorkSchedules(data);
    } catch (err: any) {
      console.error('Error loading work schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      setLoadingAssignments(true);
      const data = await employeeShiftService.getAssignments();
      setAssignments(data);
    } catch (err: any) {
      console.error('Error loading shift assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  const loadRoster = useCallback(async (year: number, month: number, deptId?: number, search?: string) => {
    try {
      setLoadingRoster(true);
      const data = await employeeShiftService.getMonthlyRoster({
        year,
        month,
        departmentId: deptId,
        search,
      });
      setRosterData(data);
    } catch (err: any) {
      console.error('Error loading monthly roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  const loadMasterLookups = useCallback(async () => {
    try {
      const [shiftsData, deptsData, empsData] = await Promise.all([
        shiftService.getShifts('ACTIVE'),
        organizationService.getDepartments(),
        employeeShiftService.getAssignableEmployees(),
      ]);
      setShifts(shiftsData);
      setDepartments(deptsData);
      setAssignableEmployees(empsData);
      if (shiftsData.length > 0 && batchShiftId === 0) {
        setBatchShiftId(shiftsData[0].id);
      }
    } catch (err: any) {
      console.error('Error loading master lookups:', err);
    }
  }, [batchShiftId]);

  useEffect(() => {
    setBreadcrumb({
      section: 'การเข้างาน',
      page: 'ตารางการทำงานและการมอบหมายกะ',
    });
    loadSchedules();
    loadAssignments();
    loadMasterLookups();
  }, [setBreadcrumb, loadSchedules, loadAssignments, loadMasterLookups]);

  // Load roster whenever roster view is active or year/month changes
  useEffect(() => {
    if (activeTab === 'assignments' && assignmentViewMode === 'matrix') {
      const deptId = assignmentDeptFilter !== 'ALL' ? Number(assignmentDeptFilter) : undefined;
      loadRoster(rosterYear, rosterMonth, deptId, assignmentSearch);
    }
  }, [activeTab, assignmentViewMode, rosterYear, rosterMonth, assignmentDeptFilter, assignmentSearch, loadRoster]);

  // -------------------------------------------------------------
  // Filtered Lists
  // -------------------------------------------------------------
  const filteredWorkSchedules = useMemo(() => {
    return workSchedules.filter((ws) => {
      const matchSearch =
        ws.scheduleCode.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        ws.scheduleName.toLowerCase().includes(scheduleSearch.toLowerCase());
      const matchStatus =
        scheduleStatusFilter === 'ALL' || ws.status === scheduleStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [workSchedules, scheduleSearch, scheduleStatusFilter]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const q = assignmentSearch.toLowerCase();
      const matchSearch =
        a.employeeCode.toLowerCase().includes(q) ||
        a.employeeName.toLowerCase().includes(q) ||
        a.shiftCode.toLowerCase().includes(q) ||
        a.shiftName.toLowerCase().includes(q) ||
        (a.departmentName && a.departmentName.toLowerCase().includes(q));

      const matchDept =
        assignmentDeptFilter === 'ALL' ||
        (a.departmentName &&
          departments.find((d) => d.id === Number(assignmentDeptFilter))?.departmentName === a.departmentName);

      return matchSearch && matchDept;
    });
  }, [assignments, assignmentSearch, assignmentDeptFilter, departments]);

  const filteredAssignableEmps = useMemo(() => {
    return assignableEmployees.filter((e) => {
      const matchDept =
        batchTargetType === 'department' && batchSelectedDept
          ? e.departmentId === batchSelectedDept
          : true;
      const matchSearch =
        e.employeeCode.toLowerCase().includes(empFilterKeyword.toLowerCase()) ||
        e.fullName.toLowerCase().includes(empFilterKeyword.toLowerCase()) ||
        e.departmentName.toLowerCase().includes(empFilterKeyword.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [assignableEmployees, batchTargetType, batchSelectedDept, empFilterKeyword]);

  // Stats
  const activeSchedulesCount = useMemo(
    () => workSchedules.filter((s) => s.status === 'ACTIVE').length,
    [workSchedules]
  );
  const assignedEmployeesCount = useMemo(() => {
    const uniqueIds = new Set(assignments.map((a) => a.employeeId));
    return uniqueIds.size;
  }, [assignments]);

  // -------------------------------------------------------------
  // Work Schedule Modal Handlers
  // -------------------------------------------------------------
  const openCreateScheduleModal = () => {
    setScheduleModalMode('create');
    setScheduleForm({
      scheduleCode: '',
      scheduleName: '',
      workStart: '08:30',
      workEnd: '17:30',
      breakMinutes: 60,
      lateGraceMinutes: 15,
      earlyLeaveGraceMinutes: 0,
      status: 'ACTIVE',
    });
    setScheduleModalOpen(true);
  };

  const openEditScheduleModal = (ws: WorkSchedule) => {
    setScheduleModalMode('edit');
    setScheduleForm({
      id: ws.id,
      scheduleCode: ws.scheduleCode,
      scheduleName: ws.scheduleName,
      workStart: ws.workStart || '08:30',
      workEnd: ws.workEnd || '17:30',
      breakMinutes: ws.breakMinutes,
      lateGraceMinutes: ws.lateGraceMinutes,
      earlyLeaveGraceMinutes: ws.earlyLeaveGraceMinutes,
      status: ws.status,
    });
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (scheduleModalMode === 'create') {
        await scheduleService.createWorkSchedule(scheduleForm);
        setSuccessMessage(`เพิ่มตารางการทำงาน '${scheduleForm.scheduleName}' สำเร็จ`);
      } else if (scheduleForm.id) {
        await scheduleService.updateWorkSchedule(scheduleForm.id, {
          scheduleName: scheduleForm.scheduleName,
          workStart: scheduleForm.workStart,
          workEnd: scheduleForm.workEnd,
          breakMinutes: scheduleForm.breakMinutes,
          lateGraceMinutes: scheduleForm.lateGraceMinutes,
          earlyLeaveGraceMinutes: scheduleForm.earlyLeaveGraceMinutes,
          status: scheduleForm.status,
        });
        setSuccessMessage(`แก้ไขตารางการทำงาน '${scheduleForm.scheduleName}' สำเร็จ`);
      }
      setScheduleModalOpen(false);
      loadSchedules();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Shift Assignment Modal Handlers
  // -------------------------------------------------------------
  const openCreateAssignModal = (prefillEmployeeId?: number) => {
    setAssignModalMode('create');
    setAssignForm({
      employeeId: prefillEmployeeId || (assignableEmployees[0]?.id ?? 0),
      shiftId: shifts[0]?.id ?? 0,
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
    });
    setAssignModalOpen(true);
  };

  const openEditAssignModal = (a: EmployeeShift) => {
    setAssignModalMode('edit');
    setAssignForm({
      id: a.id,
      employeeId: a.employeeId,
      shiftId: a.shiftId,
      effectiveFrom: a.effectiveFrom,
      effectiveTo: a.effectiveTo || '',
    });
    setAssignModalOpen(true);
  };

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (assignModalMode === 'create') {
        await employeeShiftService.assignShift({
          employeeId: Number(assignForm.employeeId),
          shiftId: Number(assignForm.shiftId),
          effectiveFrom: assignForm.effectiveFrom,
          effectiveTo: assignForm.effectiveTo || null,
        });
        setSuccessMessage('มอบหมายกะการทำงานให้พนักงานสำเร็จ');
      } else if (assignForm.id) {
        await employeeShiftService.updateAssignment(assignForm.id, {
          shiftId: Number(assignForm.shiftId),
          effectiveFrom: assignForm.effectiveFrom,
          effectiveTo: assignForm.effectiveTo || null,
        });
        setSuccessMessage('แก้ไขข้อมูลการมอบหมายกะสำเร็จ');
      }
      setAssignModalOpen(false);
      loadAssignments();
      if (assignmentViewMode === 'matrix') {
        const deptId = assignmentDeptFilter !== 'ALL' ? Number(assignmentDeptFilter) : undefined;
        loadRoster(rosterYear, rosterMonth, deptId, assignmentSearch);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการมอบหมายกะ';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Batch Assign Modal Handlers
  // -------------------------------------------------------------
  const openBatchAssignModal = () => {
    setBatchTargetType('department');
    setBatchSelectedDept(departments[0]?.id ?? null);
    setBatchSelectedEmpIds([]);
    setBatchShiftId(shifts[0]?.id ?? 0);
    setBatchEffectiveFrom(new Date().toISOString().split('T')[0]);
    setBatchEffectiveTo('');
    setBatchResult(null);
    setEmpFilterKeyword('');
    setBatchModalOpen(true);
  };

  const handleBatchAssign = async () => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const requestData: BatchAssignEmployeeShiftRequest = {
        shiftId: batchShiftId,
        effectiveFrom: batchEffectiveFrom,
        effectiveTo: batchEffectiveTo || null,
        departmentId: batchTargetType === 'department' ? batchSelectedDept : null,
        employeeIds: batchTargetType === 'selected' ? batchSelectedEmpIds : [],
      };

      const result = await employeeShiftService.batchAssignShift(requestData);
      setBatchResult(result);
      loadAssignments();
      if (assignmentViewMode === 'matrix') {
        const deptId = assignmentDeptFilter !== 'ALL' ? Number(assignmentDeptFilter) : undefined;
        loadRoster(rosterYear, rosterMonth, deptId, assignmentSearch);
      }
      setSuccessMessage(`ประมวลผลมอบหมายกะแบบกลุ่มสำเร็จ: ${result.successCount} รายการ`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการมอบหมายกะแบบกลุ่ม';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Delete Handler
  // -------------------------------------------------------------
  const confirmDelete = (type: 'schedule' | 'assignment', id: number, title: string) => {
    setItemToDelete({ type, id, title });
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (itemToDelete.type === 'schedule') {
        await scheduleService.deleteWorkSchedule(itemToDelete.id);
        setSuccessMessage(`ลบตารางการทำงาน '${itemToDelete.title}' สำเร็จ`);
        loadSchedules();
      } else {
        await employeeShiftService.deleteAssignment(itemToDelete.id);
        setSuccessMessage(`ยกเลิกการมอบหมายกะ '${itemToDelete.title}' สำเร็จ`);
        loadAssignments();
        if (assignmentViewMode === 'matrix') {
          const deptId = assignmentDeptFilter !== 'ALL' ? Number(assignmentDeptFilter) : undefined;
          loadRoster(rosterYear, rosterMonth, deptId, assignmentSearch);
        }
      }
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Shift badge color helper
  const getShiftBadgeStyle = (shiftCode: string) => {
    if (shiftCode.includes('NIGHT')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (shiftCode.includes('FLEX')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* -------------------------------------------------------- */}
      {/* 1. Header & Quick Actions */}
      {/* -------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-[#0B2046]" />
            ตารางการทำงานและการมอบหมายกะ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            กำหนดรูปแบบตารางเวลาการทำงานหลัก มอบหมายกะรายบุคคล/แบบกลุ่ม และตรวจสอบปฏิทินกะรายเดือน
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === 'schedules' ? (
            <button
              onClick={openCreateScheduleModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#15326c] text-white font-medium text-sm shadow-sm hover:shadow transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              เพิ่มตารางการทำงาน
            </button>
          ) : (
            <>
              <button
                onClick={() => openCreateAssignModal()}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 text-[#0B2046]" />
                มอบหมายกะเดี่ยว
              </button>
              <button
                onClick={openBatchAssignModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#15326c] text-white font-medium text-sm shadow-sm hover:shadow transition-all active:scale-[0.98]"
              >
                <Users className="w-4 h-4" />
                มอบหมายกะแบบกลุ่ม
              </button>
            </>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------- */}
      {/* 2. Toast Alerts */}
      {/* -------------------------------------------------------- */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* 3. Stat Cards */}
      {/* -------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Schedules */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">ตารางการทำงานทั้งหมด</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{workSchedules.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">รูปแบบแม่แบบระบบ</div>
          </div>
        </div>

        {/* Active Schedules */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">เปิดใช้งานอยู่</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{activeSchedulesCount}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">สถานะปกติ</div>
          </div>
        </div>

        {/* Assigned Employees */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">พนักงานที่มีกะงาน</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{assignedEmployeesCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">จาก {assignableEmployees.length} คนในองค์กร</div>
          </div>
        </div>

        {/* Available Shifts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">กะการทำงานพร้อมใช้</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{shifts.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">กะมาตรฐานและกะหมุนเวียน</div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------- */}
      {/* 4. Tab Selector */}
      {/* -------------------------------------------------------- */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`pb-3.5 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'schedules'
              ? 'border-[#0B2046] text-[#0B2046] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          รูปแบบตารางการทำงานหลัก
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
            {workSchedules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-3.5 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'assignments'
              ? 'border-[#0B2046] text-[#0B2046] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          การมอบหมายกะและปฏิทินกะพนักงาน
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
            {assignments.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: WORK SCHEDULES MASTER */}
      {/* ======================================================== */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหารหัสหรือชื่อตารางการทำงาน..."
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/10 focus:border-[#0B2046]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={scheduleStatusFilter}
                onChange={(e) => setScheduleStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/10"
              >
                <option value="ALL">สถานะทั้งหมด</option>
                <option value="ACTIVE">เปิดใช้งาน (Active)</option>
                <option value="INACTIVE">ปิดการใช้งาน (Inactive)</option>
              </select>
            </div>

            {/* View Mode & Refresh */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={loadSchedules}
                disabled={loadingSchedules}
                title="รีเฟรชข้อมูล"
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSchedules ? 'animate-spin' : ''}`} />
              </button>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setScheduleViewMode('grid')}
                  className={`p-1.5 rounded-lg text-sm transition-all ${
                    scheduleViewMode === 'grid'
                      ? 'bg-white text-[#0B2046] shadow-sm font-medium'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="มุมมองการ์ด"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setScheduleViewMode('table')}
                  className={`p-1.5 rounded-lg text-sm transition-all ${
                    scheduleViewMode === 'table'
                      ? 'bg-white text-[#0B2046] shadow-sm font-medium'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="มุมมองตาราง"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content Loading */}
          {loadingSchedules ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0B2046]" />
              กำลังโหลดข้อมูลตารางการทำงาน...
            </div>
          ) : filteredWorkSchedules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-700">ไม่พบข้อมูลตารางการทำงาน</div>
              <p className="text-sm text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มตารางการทำงาน" ด้านบน</p>
            </div>
          ) : scheduleViewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredWorkSchedules.map((ws) => (
                <div
                  key={ws.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                          {ws.scheduleCode}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-2 line-clamp-1 group-hover:text-[#0B2046] transition-colors">
                          {ws.scheduleName}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                          ws.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {ws.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </div>

                    {/* Work Hours & Break */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          เวลามาตรฐาน
                        </span>
                        <span className="font-semibold text-slate-800">
                          {ws.workStart && ws.workEnd
                            ? `${ws.workStart} - ${ws.workEnd} น.`
                            : 'กำหนดตามกะที่มอบหมาย'}
                        </span>
                      </div>

                      {ws.netWorkHours !== null && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">ชั่วโมงทำงานจริง</span>
                          <span className="font-semibold text-blue-700">
                            {ws.netWorkHours} ชม. (พัก {ws.breakMinutes} นาที)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Grace Periods */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100/80">
                        <div className="text-[11px] text-amber-700">ผ่อนปรนสาย</div>
                        <div className="font-bold text-amber-900 mt-0.5">{ws.lateGraceMinutes} นาที</div>
                      </div>
                      <div className="p-2 rounded-lg bg-orange-50/60 border border-orange-100/80">
                        <div className="text-[11px] text-orange-700">ผ่อนปรนออกก่อน</div>
                        <div className="font-bold text-orange-900 mt-0.5">{ws.earlyLeaveGraceMinutes} นาที</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEditScheduleModal(ws)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-[#0B2046] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      แก้ไข
                    </button>
                    <button
                      onClick={() => confirmDelete('schedule', ws.id, ws.scheduleName)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">รหัสตาราง</th>
                      <th className="py-3 px-4">ชื่อตารางการทำงาน</th>
                      <th className="py-3 px-4">เวลาปฏิบัติงาน</th>
                      <th className="py-3 px-4 text-center">เวลาพัก</th>
                      <th className="py-3 px-4 text-center">ผ่อนปรนสาย</th>
                      <th className="py-3 px-4 text-center">ผ่อนปรนออกก่อน</th>
                      <th className="py-3 px-4 text-center">สถานะ</th>
                      <th className="py-3 px-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWorkSchedules.map((ws) => (
                      <tr key={ws.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{ws.scheduleCode}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">{ws.scheduleName}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {ws.workStart && ws.workEnd ? `${ws.workStart} - ${ws.workEnd} น.` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-600">{ws.breakMinutes} นาที</td>
                        <td className="py-3.5 px-4 text-center text-amber-700 font-medium">{ws.lateGraceMinutes} นาที</td>
                        <td className="py-3.5 px-4 text-center text-orange-700 font-medium">{ws.earlyLeaveGraceMinutes} นาที</td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              ws.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {ws.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditScheduleModal(ws)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B2046] hover:bg-slate-100"
                              title="แก้ไข"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDelete('schedule', ws.id, ws.scheduleName)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SHIFT ASSIGNMENTS & MONTHLY ROSTER */}
      {/* ======================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              {/* View Switch: List vs Matrix */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setAssignmentViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    assignmentViewMode === 'list'
                      ? 'bg-white text-[#0B2046] shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  ตารางรายชื่อ
                </button>
                <button
                  onClick={() => setAssignmentViewMode('matrix')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    assignmentViewMode === 'matrix'
                      ? 'bg-white text-[#0B2046] shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  ปฏิทินกะรายเดือน (Gantt)
                </button>
              </div>

              {/* Search */}
              <div className="relative min-w-[180px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาพนักงานหรือกะ..."
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2046]/10"
                />
              </div>

              {/* Department Filter */}
              <select
                value={assignmentDeptFilter}
                onChange={(e) => setAssignmentDeptFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/10"
              >
                <option value="ALL">แผนกทั้งหมด</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.departmentName}
                  </option>
                ))}
              </select>
            </div>

            {/* Matrix Month Navigator (when in matrix view) */}
            {assignmentViewMode === 'matrix' && (
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={() => {
                    if (rosterMonth === 1) {
                      setRosterMonth(12);
                      setRosterYear(rosterYear - 1);
                    } else {
                      setRosterMonth(rosterMonth - 1);
                    }
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 min-w-[130px] text-center">
                  {THAI_MONTHS[rosterMonth - 1]} {rosterYear + 543}
                </div>

                <button
                  onClick={() => {
                    if (rosterMonth === 12) {
                      setRosterMonth(1);
                      setRosterYear(rosterYear + 1);
                    } else {
                      setRosterMonth(rosterMonth + 1);
                    }
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setRosterYear(new Date().getFullYear());
                    setRosterMonth(new Date().getMonth() + 1);
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-[#0B2046] hover:bg-slate-100 rounded-lg"
                >
                  เดือนนี้
                </button>
              </div>
            )}
          </div>

          {/* LIST VIEW */}
          {assignmentViewMode === 'list' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {loadingAssignments ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0B2046]" />
                  กำลังโหลดข้อมูลการมอบหมายกะ...
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <div className="text-base font-semibold text-slate-700">ไม่พบประวัติการมอบหมายกะ</div>
                  <p className="text-sm text-slate-400 mt-1">
                    คลิกปุ่ม "มอบหมายกะเดี่ยว" หรือ "มอบหมายกะแบบกลุ่ม" เพื่อเริ่มจัดสรรกะการทำงาน
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">พนักงาน</th>
                        <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                        <th className="py-3 px-4">กะการทำงาน</th>
                        <th className="py-3 px-4">เวลาปฏิบัติงาน</th>
                        <th className="py-3 px-4">วันที่เริ่มมีผล</th>
                        <th className="py-3 px-4">วันที่สิ้นสุด</th>
                        <th className="py-3 px-4 text-center">สถานะ</th>
                        <th className="py-3 px-4 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAssignments.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Employee */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#0B2046]/10 text-[#0B2046] font-bold text-xs flex items-center justify-center shrink-0">
                                {a.employeeCode.slice(-3)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{a.employeeName}</div>
                                <div className="text-xs text-slate-400">{a.employeeCode}</div>
                              </div>
                            </div>
                          </td>

                          {/* Dept / Position */}
                          <td className="py-3.5 px-4">
                            <div className="text-slate-800 font-medium">{a.departmentName || '-'}</div>
                            <div className="text-xs text-slate-400">{a.positionName || '-'}</div>
                          </td>

                          {/* Shift */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getShiftBadgeStyle(
                                a.shiftCode
                              )}`}
                            >
                              {a.isCrossDay ? (
                                <Moon className="w-3 h-3 text-purple-600" />
                              ) : (
                                <Sun className="w-3 h-3 text-amber-500" />
                              )}
                              {a.shiftName} ({a.shiftCode})
                            </span>
                          </td>

                          {/* Hours */}
                          <td className="py-3.5 px-4 text-slate-600">
                            {a.startTime} - {a.endTime} น.
                          </td>

                          {/* Effective Dates */}
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-700">{a.effectiveFrom}</td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                            {a.effectiveTo ? (
                              a.effectiveTo
                            ) : (
                              <span className="text-emerald-600 font-sans font-medium">ต่อเนื่อง</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                a.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {a.isActive ? 'ใช้งานอยู่' : 'ยังไม่มีผล/หมดอายุ'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditAssignModal(a)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B2046] hover:bg-slate-100"
                                title="แก้ไข"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  confirmDelete(
                                    'assignment',
                                    a.id,
                                    `${a.employeeName} (${a.shiftName})`
                                  )
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="ยกเลิกการมอบหมาย"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MONTHLY MATRIX (GANTT ROSTER) VIEW */}
          {assignmentViewMode === 'matrix' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {loadingRoster ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0B2046]" />
                  กำลังประมวลผลตารางกะรายเดือน...
                </div>
              ) : !rosterData || rosterData.employees.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <div className="text-base font-semibold text-slate-700">ไม่พบข้อมูลพนักงานในรอบเดือนนี้</div>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[650px] relative">
                  <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                    {/* Header */}
                    <thead className="bg-slate-50 text-slate-700 sticky top-0 z-20 shadow-sm border-b border-slate-200">
                      <tr>
                        {/* Sticky Employee column */}
                        <th className="py-3 px-4 font-bold min-w-[200px] sticky left-0 bg-slate-50 z-30 border-r border-slate-200">
                          พนักงาน ({rosterData.employees.length} คน)
                        </th>

                        {/* Day headers */}
                        {Array.from({ length: rosterData.daysInMonth }, (_, i) => i + 1).map((day) => {
                          const dateObj = new Date(rosterYear, rosterMonth - 1, day);
                          const dayOfWeek = dateObj.getDay();
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                          return (
                            <th
                              key={day}
                              className={`py-2 px-1 text-center min-w-[42px] border-r border-slate-100 ${
                                isWeekend ? 'bg-amber-50/70 text-amber-900 font-bold' : 'text-slate-700'
                              }`}
                            >
                              <div className="text-[10px] text-slate-400">{THAI_DAYS[dayOfWeek]}</div>
                              <div className="text-xs font-semibold">{day}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    {/* Body */}
                    <tbody className="divide-y divide-slate-100">
                      {rosterData.employees.map((emp) => (
                        <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition-colors">
                          {/* Sticky Employee Name & Dept */}
                          <td className="py-2.5 px-4 sticky left-0 bg-white hover:bg-slate-50/80 z-10 border-r border-slate-200">
                            <div className="font-semibold text-slate-900 leading-tight">{emp.employeeName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{emp.employeeCode}</span>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">{emp.departmentName}</span>
                            </div>
                          </td>

                          {/* Day Cells */}
                          {Array.from({ length: rosterData.daysInMonth }, (_, i) => i + 1).map((day) => {
                            const dateObj = new Date(rosterYear, rosterMonth - 1, day);
                            const dayOfWeek = dateObj.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const shift = emp.days[day];

                            return (
                              <td
                                key={day}
                                className={`py-1.5 px-1 text-center border-r border-slate-100 ${
                                  isWeekend ? 'bg-amber-50/30' : ''
                                }`}
                              >
                                {shift ? (
                                  <div
                                    title={`${shift.shiftName} (${shift.startTime}-${shift.endTime} น.)`}
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight cursor-default transition-transform hover:scale-105 ${getShiftBadgeStyle(
                                      shift.shiftCode
                                    )}`}
                                  >
                                    {shift.shiftCode.length > 6
                                      ? shift.shiftCode.slice(0, 5) + '..'
                                      : shift.shiftCode}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-mono">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREATE / EDIT WORK SCHEDULE */}
      {/* ======================================================== */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {scheduleModalMode === 'create' ? 'เพิ่มตารางการทำงานใหม่' : 'แก้ไขตารางการทำงาน'}
                  </h3>
                  <p className="text-xs text-slate-500">กำหนดเงื่อนไขเวลาปฏิบัติงานและนาทีผ่อนปรน</p>
                </div>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="mt-5 space-y-4">
              {/* Code & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสตารางงาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={scheduleModalMode === 'edit'}
                    placeholder="เช่น SCH_HQ"
                    value={scheduleForm.scheduleCode}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduleCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B2046]/10 disabled:opacity-60"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อตารางการทำงาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ตารางทำงานสำนักงานใหญ่ (จันทร์-ศุกร์)"
                    value={scheduleForm.scheduleName}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduleName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/10"
                  />
                </div>
              </div>

              {/* Work Start & Work End with ThaiTimePicker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    เวลาเริ่มต้นปฏิบัติงานมาตรฐาน
                  </label>
                  <ThaiTimePicker
                    value={scheduleForm.workStart || '08:30'}
                    onChange={(val) => setScheduleForm({ ...scheduleForm, workStart: val })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    เวลาสิ้นสุดปฏิบัติงานมาตรฐาน
                  </label>
                  <ThaiTimePicker
                    value={scheduleForm.workEnd || '17:30'}
                    onChange={(val) => setScheduleForm({ ...scheduleForm, workEnd: val })}
                  />
                </div>
              </div>

              {/* Break minutes & Grace minutes */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาพัก (นาที)</label>
                  <input
                    type="number"
                    min={0}
                    value={scheduleForm.breakMinutes}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, breakMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-800 mb-1">ผ่อนปรนสาย (นาที)</label>
                  <input
                    type="number"
                    min={0}
                    value={scheduleForm.lateGraceMinutes}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, lateGraceMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-orange-800 mb-1">
                    ผ่อนปรนออกก่อน (นาที)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={scheduleForm.earlyLeaveGraceMinutes}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        earlyLeaveGraceMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-orange-50/50 border border-orange-200 rounded-xl text-sm font-semibold text-orange-900"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะการใช้งาน</label>
                <div className="flex items-center gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="scheduleStatus"
                      checked={scheduleForm.status === 'ACTIVE'}
                      onChange={() => setScheduleForm({ ...scheduleForm, status: 'ACTIVE' })}
                      className="text-[#0B2046]"
                    />
                    เปิดใช้งาน (Active)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="scheduleStatus"
                      checked={scheduleForm.status === 'INACTIVE'}
                      onChange={() => setScheduleForm({ ...scheduleForm, status: 'INACTIVE' })}
                      className="text-[#0B2046]"
                    />
                    ปิดใช้งาน (Inactive)
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0B2046] hover:bg-[#15326c] rounded-xl shadow-sm transition-all"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึกตารางการทำงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: SINGLE ASSIGN SHIFT */}
      {/* ======================================================== */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {assignModalMode === 'create' ? 'มอบหมายกะการทำงาน' : 'แก้ไขการมอบหมายกะ'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    บันทึกกะและช่วงวันที่มีผล (ระบบจะป้องกันกะซ้อนทับอัตโนมัติ)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssign} className="mt-5 space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  พนักงานที่ต้องการมอบหมาย <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  disabled={assignModalMode === 'edit'}
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/10 disabled:opacity-60 font-medium"
                >
                  <option value={0} disabled>
                    -- เลือกพนักงาน --
                  </option>
                  {assignableEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} - {e.fullName} ({e.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กะการทำงาน <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={assignForm.shiftId}
                  onChange={(e) => setAssignForm({ ...assignForm, shiftId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/10 font-medium"
                >
                  <option value={0} disabled>
                    -- เลือกกะการทำงาน --
                  </option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shiftName} ({s.startTime} - {s.endTime} น.)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันเริ่มต้นกะ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={assignForm.effectiveFrom}
                    onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันสิ้นสุดกะ (ไม่ระบุ = ต่อเนื่อง)
                  </label>
                  <input
                    type="date"
                    value={assignForm.effectiveTo || ''}
                    onChange={(e) => setAssignForm({ ...assignForm, effectiveTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* PostgreSQL GiST No-Overlap note */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>กฎความปลอดภัยตารางกะ:</strong> พนักงานคนเดียวกันจะไม่สามารถมีกะซ้อนทับกันในช่วงเวลาเดียวกันได้
                  ระบบควบคุมด้วยกฎ <code>ex_employee_shift_no_overlap</code> ของ PostgreSQL
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0B2046] hover:bg-[#15326c] rounded-xl shadow-sm transition-all"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึกการมอบหมาย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: BATCH ASSIGN SHIFT */}
      {/* ======================================================== */}
      {batchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">มอบหมายกะการทำงานแบบกลุ่ม (Batch Assign)</h3>
                  <p className="text-xs text-slate-500">มอบหมายกะให้พนักงานหลายคนหรือยกแผนกในคราวเดียว</p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Batch Result Report */}
              {batchResult && (
                <div
                  className={`p-4 rounded-xl border ${
                    batchResult.failedCount === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ประมวลผลเสร็จสิ้น: มอบหมายสำเร็จ {batchResult.successCount} คน, ล้มเหลว {batchResult.failedCount} คน
                  </div>
                  {batchResult.errors.length > 0 && (
                    <div className="mt-2 text-xs space-y-1 text-rose-700">
                      <strong>รายการที่ซ้อนทับหรือไม่สำเร็จ:</strong>
                      {batchResult.errors.map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Target Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  รูปแบบการเลือกกลุ่มเป้าหมาย
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBatchTargetType('department')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchTargetType === 'department'
                        ? 'border-[#0B2046] bg-[#0B2046]/5 font-semibold text-[#0B2046]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      มอบหมายยกแผนก
                    </div>
                    <div className="text-[11px] font-normal text-slate-400 mt-1">
                      พนักงานทุกคนที่สังกัดในแผนกที่เลือก
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchTargetType('selected')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchTargetType === 'selected'
                        ? 'border-[#0B2046] bg-[#0B2046]/5 font-semibold text-[#0B2046]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4" />
                      เลือกพนักงานหลายคน
                    </div>
                    <div className="text-[11px] font-normal text-slate-400 mt-1">
                      เลือกรายชื่อทีละคน ({batchSelectedEmpIds.length} คนที่เลือก)
                    </div>
                  </button>
                </div>
              </div>

              {/* Target: Department */}
              {batchTargetType === 'department' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกแผนก</label>
                  <select
                    value={batchSelectedDept || 0}
                    onChange={(e) => setBatchSelectedDept(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target: Multiselect Employees */}
              {batchTargetType === 'selected' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      เลือกรายชื่อพนักงาน ({batchSelectedEmpIds.length} คน)
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setBatchSelectedEmpIds(filteredAssignableEmps.map((e) => e.id))
                        }
                        className="text-[#0B2046] hover:underline font-medium"
                      >
                        เลือกทั้งหมด ({filteredAssignableEmps.length})
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setBatchSelectedEmpIds([])}
                        className="text-slate-400 hover:underline"
                      >
                        ล้างที่เลือก
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อหรือรหัสพนักงานเพื่อกรอง..."
                    value={empFilterKeyword}
                    onChange={(e) => setEmpFilterKeyword(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                    {filteredAssignableEmps.map((emp) => {
                      const isSelected = batchSelectedEmpIds.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            if (isSelected) {
                              setBatchSelectedEmpIds(batchSelectedEmpIds.filter((id) => id !== emp.id));
                            } else {
                              setBatchSelectedEmpIds([...batchSelectedEmpIds, emp.id]);
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#0B2046]/5' : 'hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#0B2046]" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                            <div>
                              <div className="font-semibold text-xs text-slate-900">{emp.fullName}</div>
                              <div className="text-[11px] text-slate-400">
                                {emp.employeeCode} • {emp.departmentName}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shift Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กะการทำงานที่จะมอบหมาย <span className="text-rose-500">*</span>
                </label>
                <select
                  value={batchShiftId}
                  onChange={(e) => setBatchShiftId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shiftName} ({s.startTime} - {s.endTime} น.)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">วันเริ่มต้นกะ</label>
                  <input
                    type="date"
                    required
                    value={batchEffectiveFrom}
                    onChange={(e) => setBatchEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันสิ้นสุดกะ (ไม่ระบุ = ต่อเนื่อง)
                  </label>
                  <input
                    type="date"
                    value={batchEffectiveTo}
                    onChange={(e) => setBatchEffectiveTo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0 mt-4">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={handleBatchAssign}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0B2046] hover:bg-[#15326c] rounded-xl shadow-sm transition-all"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                เริ่มประมวลผลการมอบหมายกะ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DELETE CONFIRMATION */}
      {/* ======================================================== */}
      {deleteConfirmOpen && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {itemToDelete.type === 'schedule' ? 'ยืนยันการลบตารางการทำงาน' : 'ยืนยันการยกเลิกการมอบหมายกะ'}
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              คุณต้องการลบ{' '}
              <span className="font-semibold text-slate-800">"{itemToDelete.title}"</span>{' '}
              ออกจากระบบใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
