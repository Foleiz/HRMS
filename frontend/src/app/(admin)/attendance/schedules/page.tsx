'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  CalendarDays,
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
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  RefreshCw,
  UserCheck,
  Building2,
  Sun,
  Moon,
  Copy,
  ArrowRight,
} from 'lucide-react';
import { employeeShiftService } from '@/services/scheduleService';
import { shiftService } from '@/services/shiftService';
import { organizationService } from '@/services/organizationService';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import {
  EmployeeShift,
  AssignEmployeeShiftRequest,
  BatchAssignEmployeeShiftRequest,
  BatchAssignResult,
  MonthlyRosterResponse,
  AssignableEmployee,
  RosterDayShift,
  EmployeeTypeLookup,
} from '@/types/schedule';
import { Shift, CreateShiftRequest } from '@/types/shift';
import { Department } from '@/types/organization';
import ThaiTimePicker from '@/components/common/ThaiTimePicker';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

type TabKey = 'roster' | 'shifts';

function SchedulesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();

  // -------------------------------------------------------------
  // 1. Tab Navigation: Roster (1) -> Shifts (2)
  // -------------------------------------------------------------
  const initialTab = (searchParams.get('tab') as TabKey) || 'roster';
  const [activeTab, setActiveTab] = useState<TabKey>(
    ['roster', 'shifts'].includes(initialTab) ? initialTab : 'roster'
  );

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    router.replace(`/attendance/schedules?${params.toString()}`, { scroll: false });
  };

  // -------------------------------------------------------------
  // 2. Loading & Data States
  // -------------------------------------------------------------
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Core Data
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<EmployeeShift[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignableEmployees, setAssignableEmployees] = useState<AssignableEmployee[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeTypeLookup[]>([]);
  const [singleAssignTypeFilter, setSingleAssignTypeFilter] = useState<string>('ALL');
  const [batchAssignTypeFilter, setBatchAssignTypeFilter] = useState<string>('ALL');

  // Roster Calendar Data
  const [rosterData, setRosterData] = useState<MonthlyRosterResponse | null>(null);
  const [rosterYear, setRosterYear] = useState<number>(new Date().getFullYear());
  const [rosterMonth, setRosterMonth] = useState<number>(new Date().getMonth() + 1);

  // Global Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 6000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  // -------------------------------------------------------------
  // 3. Tab 1 States: มอบหมายกะให้พนักงาน (Shift Roster)
  // -------------------------------------------------------------
  const [assignmentViewMode, setAssignmentViewMode] = useState<'calendar' | 'list'>('calendar');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentDeptFilter, setAssignmentDeptFilter] = useState<string>('ALL');

  // Selected Day Details Modal (for Real Calendar view)
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<{
    day: number;
    month: number;
    year: number;
    shifts: Array<{
      employeeId: number;
      employeeName: string;
      employeeCode: string;
      departmentName?: string;
      shift: RosterDayShift;
    }>;
  } | null>(null);

  // Single Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalMode, setAssignModalMode] = useState<'create' | 'edit'>('create');
  const [assignForm, setAssignForm] = useState<AssignEmployeeShiftRequest & { id?: number }>({
    employeeId: 0,
    shiftId: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
  });

  // Batch Assign Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchTargetType, setBatchTargetType] = useState<'department' | 'selected'>('department');
  const [batchSelectedDept, setBatchSelectedDept] = useState<number | null>(null);
  const [batchSelectedEmpIds, setBatchSelectedEmpIds] = useState<number[]>([]);
  const [batchShiftId, setBatchShiftId] = useState<number>(0);
  const [batchEffectiveFrom, setBatchEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [batchEffectiveTo, setBatchEffectiveTo] = useState<string>('');
  const [batchResult, setBatchResult] = useState<BatchAssignResult | null>(null);
  const [empFilterKeyword, setEmpFilterKeyword] = useState('');

  // -------------------------------------------------------------
  // 4. Tab 2 States: กะการทำงาน (Shift Master)
  // -------------------------------------------------------------
  const [shiftViewMode, setShiftViewMode] = useState<'grid' | 'table'>('grid');
  const [shiftSearchQuery, setShiftSearchQuery] = useState('');
  const [shiftFilterType, setShiftFilterType] = useState<string>('ALL'); // ALL, NORMAL, CROSS_DAY
  const [shiftFilterStatus, setShiftFilterStatus] = useState<string>('ALL'); // ALL, ACTIVE, INACTIVE

  // Shift Modal (Create / Edit)
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState<'create' | 'edit'>('create');
  const [shiftForm, setShiftForm] = useState<CreateShiftRequest & { id?: number }>({
    shiftCode: '',
    shiftName: '',
    startTime: '08:30',
    endTime: '17:30',
    isCrossDay: false,
    breakMinutes: 60,
    status: 'ACTIVE',
    lateGraceMinutes: 10,
    earlyLeaveGraceMinutes: 5,
  });

  // Employee details modal for shift
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedShiftForEmployees, setSelectedShiftForEmployees] = useState<Shift | null>(null);

  // -------------------------------------------------------------
  // Shared Delete Confirmation Modal
  // -------------------------------------------------------------
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'assignment' | 'shift';
    id: number;
    title: string;
    subtitle?: string;
  } | null>(null);

  // -------------------------------------------------------------
  // Data Loaders
  // -------------------------------------------------------------
  const loadShifts = useCallback(async () => {
    try {
      setLoadingShifts(true);
      const data = await shiftService.getShifts();
      setShifts(data);
      if (data.length > 0 && batchShiftId === 0) {
        setBatchShiftId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error loading shifts:', err);
    } finally {
      setLoadingShifts(false);
    }
  }, [batchShiftId]);

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

  const loadLookups = useCallback(async () => {
    try {
      const [deptsData, empsData, typesData] = await Promise.all([
        organizationService.getDepartments(),
        employeeShiftService.getAssignableEmployees(),
        employeeShiftService.getEmployeeTypes(),
      ]);
      setDepartments(deptsData);
      setAssignableEmployees(empsData);
      setEmployeeTypes(typesData);
    } catch (err: any) {
      console.error('Error loading lookups:', err);
    }
  }, []);

  useEffect(() => {
    setBreadcrumb({
      section: 'การเข้างาน',
      page: 'การจัดตารางงาน',
    });
    loadShifts();
    loadAssignments();
    loadLookups();
  }, [setBreadcrumb, loadShifts, loadAssignments, loadLookups]);

  // Load roster when on Tab 1 and Calendar view
  useEffect(() => {
    if (activeTab === 'roster' && assignmentViewMode === 'calendar') {
      const deptId = assignmentDeptFilter !== 'ALL' ? Number(assignmentDeptFilter) : undefined;
      loadRoster(rosterYear, rosterMonth, deptId, assignmentSearch);
    }
  }, [activeTab, assignmentViewMode, rosterYear, rosterMonth, assignmentDeptFilter, assignmentSearch, loadRoster]);

  // -------------------------------------------------------------
  // Filtered Lists
  // -------------------------------------------------------------
  // Tab 1: Filtered Assignments
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
          departments.find((d) => String(d.id) === assignmentDeptFilter)?.departmentName === a.departmentName);

      return matchSearch && matchDept;
    });
  }, [assignments, assignmentSearch, assignmentDeptFilter, departments]);

  // Tab 2: Filtered Shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      const matchQuery =
        shift.shiftCode.toLowerCase().includes(shiftSearchQuery.toLowerCase()) ||
        shift.shiftName.toLowerCase().includes(shiftSearchQuery.toLowerCase());
      const matchType =
        shiftFilterType === 'ALL' ||
        (shiftFilterType === 'CROSS_DAY' && shift.isCrossDay) ||
        (shiftFilterType === 'NORMAL' && !shift.isCrossDay);
      const matchStatus =
        shiftFilterStatus === 'ALL' || shift.status === shiftFilterStatus;
      return matchQuery && matchType && matchStatus;
    });
  }, [shifts, shiftSearchQuery, shiftFilterType, shiftFilterStatus]);

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const prevMonth = () => {
    if (rosterMonth === 1) {
      setRosterMonth(12);
      setRosterYear((y) => y - 1);
    } else {
      setRosterMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (rosterMonth === 12) {
      setRosterMonth(1);
      setRosterYear((y) => y + 1);
    } else {
      setRosterMonth((m) => m + 1);
    }
  };

  // Real 7-day Month Grid calculation (Monday=0, Sunday=6)
  const monthCalendarGrid = useMemo(() => {
    const totalDays = getDaysInMonth(rosterYear, rosterMonth);
    const firstDayJs = new Date(rosterYear, rosterMonth - 1, 1).getDay();
    const firstDayIndex = (firstDayJs + 6) % 7; // Monday = 0, Sunday = 6
    const daysInPrevMonth = new Date(rosterYear, rosterMonth - 1, 0).getDate();
    const cells = [];

    // 1. Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isWeekend: false,
        isToday: false,
      });
    }

    // 2. Current month days
    const today = new Date();
    const isCurrentYearMonth = today.getFullYear() === rosterYear && today.getMonth() + 1 === rosterMonth;
    const todayDate = today.getDate();

    for (let d = 1; d <= totalDays; d++) {
      const dayOfWeekJs = new Date(rosterYear, rosterMonth - 1, d).getDay();
      const dayOfWeekIndex = (dayOfWeekJs + 6) % 7;
      const isWeekend = dayOfWeekIndex === 5 || dayOfWeekIndex === 6;
      const isToday = isCurrentYearMonth && d === todayDate;

      cells.push({
        dayNumber: d,
        isCurrentMonth: true,
        isWeekend,
        isToday,
      });
    }

    // 3. Next month padding
    const remainder = cells.length % 7;
    if (remainder > 0) {
      const remainingCells = 7 - remainder;
      for (let d = 1; d <= remainingCells; d++) {
        cells.push({
          dayNumber: d,
          isCurrentMonth: false,
          isWeekend: false,
          isToday: false,
        });
      }
    }

    return cells;
  }, [rosterYear, rosterMonth]);

  const calcShiftDuration = (start: string, end: string, isCrossDay: boolean, breakMinutes: number) => {
    if (!start || !end) return { total: 0, net: 0 };
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (isCrossDay || endMin < startMin) {
      endMin += 24 * 60;
    }
    const grossMinutes = endMin - startMin;
    const netMinutes = Math.max(0, grossMinutes - (breakMinutes || 0));
    return {
      total: Math.round((grossMinutes / 60) * 10) / 10,
      net: Math.round((netMinutes / 60) * 10) / 10,
    };
  };

  const handleShiftTimeChange = (field: 'startTime' | 'endTime', val: string) => {
    const updated = { ...shiftForm, [field]: val };
    if (updated.startTime && updated.endTime) {
      if (updated.endTime < updated.startTime) {
        updated.isCrossDay = true;
      }
    }
    setShiftForm(updated);
  };

  // -------------------------------------------------------------
  // Actions: Tab 1 (Shift Roster & Assignments)
  // -------------------------------------------------------------
  const openSingleAssignCreate = (empId?: number, dateStr?: string) => {
    setAssignModalMode('create');
    setAssignForm({
      employeeId: empId || (assignableEmployees[0]?.id ?? 0),
      shiftId: shifts[0]?.id ?? 0,
      effectiveFrom: dateStr || new Date().toISOString().split('T')[0],
      effectiveTo: '',
    });
    setAssignModalOpen(true);
  };

  const openSingleAssignEdit = (assignment: EmployeeShift) => {
    setAssignModalMode('edit');
    setAssignForm({
      id: assignment.id,
      employeeId: assignment.employeeId,
      shiftId: assignment.shiftId,
      effectiveFrom: assignment.effectiveFrom.split('T')[0],
      effectiveTo: assignment.effectiveTo ? assignment.effectiveTo.split('T')[0] : '',
    });
    setAssignModalOpen(true);
  };

  const handleSaveSingleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (assignModalMode === 'create') {
        await employeeShiftService.assignShift({
          employeeId: Number(assignForm.employeeId),
          shiftId: Number(assignForm.shiftId),
          effectiveFrom: assignForm.effectiveFrom,
          effectiveTo: assignForm.effectiveTo ? assignForm.effectiveTo : null,
        });
        setSuccessMessage('มอบหมายกะให้พนักงานสำเร็จเรียบร้อย');
      } else if (assignForm.id) {
        await employeeShiftService.updateAssignment(assignForm.id, {
          shiftId: Number(assignForm.shiftId),
          effectiveFrom: assignForm.effectiveFrom,
          effectiveTo: assignForm.effectiveTo ? assignForm.effectiveTo : null,
        });
        setSuccessMessage('อัปเดตการมอบหมายกะสำเร็จ');
      }
      setAssignModalOpen(false);
      loadAssignments();
      if (assignmentViewMode === 'calendar') {
        const deptId = assignmentDeptFilter !== 'ALL' ? Number(assignmentDeptFilter) : undefined;
        loadRoster(rosterYear, rosterMonth, deptId, assignmentSearch);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลกะพนักงาน');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunBatchAssign = async () => {
    if (batchShiftId === 0) {
      setErrorMessage('กรุณาเลือกกะการทำงานที่ต้องการมอบหมาย');
      return;
    }
    if (batchTargetType === 'department' && !batchSelectedDept) {
      setErrorMessage('กรุณาเลือกแผนกเป้าหมาย');
      return;
    }
    if (batchTargetType === 'selected' && batchSelectedEmpIds.length === 0) {
      setErrorMessage('กรุณาเลือกพนักงานอย่างน้อย 1 รายการ');
      return;
    }

    try {
      setSubmitting(true);
      const req: BatchAssignEmployeeShiftRequest = {
        shiftId: batchShiftId,
        effectiveFrom: batchEffectiveFrom,
        effectiveTo: batchEffectiveTo ? batchEffectiveTo : null,
        departmentId: batchTargetType === 'department' ? batchSelectedDept : null,
        employeeIds: batchTargetType === 'selected' ? batchSelectedEmpIds : undefined,
      };
      const res = await employeeShiftService.batchAssignShift(req);
      setBatchResult(res);
      setSuccessMessage(`จัดกะสำเร็จ ${res.successCount} คน, ข้อผิดพลาด ${res.failedCount} คน`);
      loadAssignments();
      if (assignmentViewMode === 'calendar') {
        const deptId = assignmentDeptFilter !== 'ALL' ? Number(assignmentDeptFilter) : undefined;
        loadRoster(rosterYear, rosterMonth, deptId, assignmentSearch);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'เกิดข้อผิดพลาดในการมอบหมายกะแบบกลุ่ม');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Tab 2 (Shift Master)
  // -------------------------------------------------------------
  const openShiftCreate = () => {
    setShiftModalMode('create');
    setShiftForm({
      shiftCode: '',
      shiftName: '',
      startTime: '08:30',
      endTime: '17:30',
      isCrossDay: false,
      breakMinutes: 60,
      status: 'ACTIVE',
      lateGraceMinutes: 10,
      earlyLeaveGraceMinutes: 5,
    });
    setShiftModalOpen(true);
  };

  const openShiftEdit = (shift: Shift) => {
    setShiftModalMode('edit');
    setShiftForm({
      id: shift.id,
      shiftCode: shift.shiftCode,
      shiftName: shift.shiftName,
      startTime: shift.startTime.substring(0, 5),
      endTime: shift.endTime.substring(0, 5),
      isCrossDay: shift.isCrossDay,
      breakMinutes: shift.breakMinutes,
      status: shift.status,
      lateGraceMinutes: shift.lateGraceMinutes,
      earlyLeaveGraceMinutes: shift.earlyLeaveGraceMinutes,
    });
    setShiftModalOpen(true);
  };

  const handleDuplicateShift = (shift: Shift) => {
    setShiftModalMode('create');
    setShiftForm({
      shiftCode: `${shift.shiftCode}_COPY`,
      shiftName: `${shift.shiftName} (คัดลอก)`,
      startTime: shift.startTime.substring(0, 5),
      endTime: shift.endTime.substring(0, 5),
      isCrossDay: shift.isCrossDay,
      breakMinutes: shift.breakMinutes,
      status: 'ACTIVE',
      lateGraceMinutes: shift.lateGraceMinutes,
      earlyLeaveGraceMinutes: shift.earlyLeaveGraceMinutes,
    });
    setShiftModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (shiftModalMode === 'create') {
        await shiftService.createShift(shiftForm);
        setSuccessMessage('สร้างกะการทำงานใหม่เรียบร้อยแล้ว');
      } else if (shiftForm.id) {
        await shiftService.updateShift(shiftForm.id, {
          shiftName: shiftForm.shiftName,
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
          isCrossDay: shiftForm.isCrossDay,
          breakMinutes: shiftForm.breakMinutes,
          status: shiftForm.status,
          lateGraceMinutes: shiftForm.lateGraceMinutes,
          earlyLeaveGraceMinutes: shiftForm.earlyLeaveGraceMinutes,
        });
        setSuccessMessage('แก้ไขข้อมูลกะการทำงานเรียบร้อยแล้ว');
      }
      setShiftModalOpen(false);
      loadShifts();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกกะการทำงาน');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Shared Delete
  // -------------------------------------------------------------
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setSubmitting(true);
      if (itemToDelete.type === 'assignment') {
        await employeeShiftService.deleteAssignment(itemToDelete.id);
        setSuccessMessage('ยกเลิกการมอบหมายกะเรียบร้อยแล้ว');
        loadAssignments();
        if (assignmentViewMode === 'calendar') {
          const deptId = assignmentDeptFilter !== 'ALL' ? Number(assignmentDeptFilter) : undefined;
          loadRoster(rosterYear, rosterMonth, deptId, assignmentSearch);
        }
      } else if (itemToDelete.type === 'shift') {
        await shiftService.deleteShift(itemToDelete.id);
        setSuccessMessage('ลบข้อมูลกะการทำงานเรียบร้อยแล้ว');
        loadShifts();
      }
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'ไม่สามารถลบรายการได้เนื่องจากมีข้อมูลผูกพันในระบบ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Global Alert Banners */}
      {/* ------------------------------------------------------------- */}
      {successMessage && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Sub-menu Tabs */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 shadow-sm overflow-x-auto">
        {/* Tabs on Left */}
        <div className="flex gap-2 text-sm font-medium whitespace-nowrap min-w-max">
          {/* Tab 1: มอบหมายกะให้พนักงาน */}
          <button
            onClick={() => handleTabChange('roster')}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>มอบหมายกะให้พนักงาน</span>
          </button>

          {/* Tab 2: กะการทำงาน */}
          <button
            onClick={() => handleTabChange('shifts')}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'shifts'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>กะการทำงาน</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: มอบหมายกะให้พนักงาน (Shift Roster) */}
      {/* ============================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Filter & View Switcher Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 overflow-x-auto">
            {/* Left: Filters & Search */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Search */}
              <div className="relative w-56 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัส หรือชื่อกะ..."
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              {/* Department Filter */}
              <div className="w-44">
                <select
                  value={assignmentDeptFilter}
                  onChange={(e) => setAssignmentDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                >
                  <option value="ALL">ทุกแผนก / สังกัด</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => {
                  loadAssignments();
                  if (assignmentViewMode === 'calendar') {
                    const deptId = assignmentDeptFilter !== 'ALL' ? Number(assignmentDeptFilter) : undefined;
                    loadRoster(rosterYear, rosterMonth, deptId, assignmentSearch);
                  }
                }}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition border border-slate-200 bg-slate-50 shrink-0"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRoster || loadingAssignments ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Right: View Mode Switcher & Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setAssignmentViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap ${
                    assignmentViewMode === 'calendar'
                      ? 'bg-white text-[#0B2046] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>ปฏิทิน</span>
                </button>
                <button
                  onClick={() => setAssignmentViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap ${
                    assignmentViewMode === 'list'
                      ? 'bg-white text-[#0B2046] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>รายการ</span>
                </button>
              </div>

              <div className="h-6 w-px bg-slate-200" />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setBatchModalOpen(true);
                    setBatchResult(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition shadow-xs whitespace-nowrap"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>มอบหมายกะกลุ่ม</span>
                </button>
                <button
                  onClick={() => openSingleAssignCreate()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B2046] hover:bg-[#0B2046]/90 text-white text-xs font-semibold transition shadow-xs shadow-[#0B2046]/20 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>มอบหมายกะเดี่ยว</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 0: REAL MONTHLY 7-DAY CALENDAR VIEW */}
          {assignmentViewMode === 'calendar' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-4">
              {/* Month Navigator & Shift Legends */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={prevMonth}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition"
                      title="เดือนก่อนหน้า"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-3 text-sm font-bold text-slate-800">
                      {THAI_MONTHS[rosterMonth - 1]} {rosterYear + 543}
                    </div>
                    <button
                      onClick={nextMonth}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition"
                      title="เดือนถัดไป"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const today = new Date();
                      setRosterYear(today.getFullYear());
                      setRosterMonth(today.getMonth() + 1);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                  >
                    วันนี้
                  </button>

                  <span className="text-xs text-slate-500">
                    แสดงภาพรวมการจัดเวร ({rosterData?.employees.length ?? 0} คน)
                  </span>
                </div>

                {/* Shift Badges Legend */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">ประเภทกะ:</span>
                  {shifts.map((s) => (
                    <span
                      key={s.id}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        s.isCrossDay
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                      title={`${s.shiftName} (${s.startTime.substring(0, 5)}-${s.endTime.substring(0, 5)})`}
                    >
                      {s.isCrossDay ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
                      <span>{s.shiftName}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Calendar 7-Day Grid */}
              {loadingRoster ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0B2046]" />
                  <p className="text-sm">กำลังโหลดปฏิทินการจัดเวร...</p>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                  {/* Day of week headers: Mon - Sun */}
                  <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-600">
                    {['จันทร์ (Mon)', 'อังคาร (Tue)', 'พุธ (Wed)', 'พฤหัสบดี (Thu)', 'ศุกร์ (Fri)', 'เสาร์ (Sat)', 'อาทิตย์ (Sun)'].map(
                      (dayLabel, idx) => (
                        <div
                          key={dayLabel}
                          className={`py-2.5 border-r border-slate-200 last:border-r-0 ${
                            idx >= 5 ? 'bg-amber-50/60 text-amber-900' : ''
                          }`}
                        >
                          {dayLabel}
                        </div>
                      )
                    )}
                  </div>

                  {/* Month days cells */}
                  <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
                    {monthCalendarGrid.map((cell, cellIdx) => {
                      if (!cell.isCurrentMonth) {
                        return (
                          <div
                            key={`empty-${cellIdx}`}
                            className="bg-slate-50/50 p-2 min-h-[115px] text-slate-300 select-none"
                          >
                            <span className="text-xs font-medium">{cell.dayNumber}</span>
                          </div>
                        );
                      }

                      const dayShifts = (rosterData?.employees || []).flatMap((emp) => {
                        const shift = emp.days?.[cell.dayNumber];
                        if (!shift) return [];
                        return [{
                          employeeId: emp.employeeId,
                          employeeName: emp.employeeName,
                          employeeCode: emp.employeeCode,
                          departmentName: emp.departmentName,
                          shift: shift,
                        }];
                      });

                      const dateStr = `${rosterYear}-${String(rosterMonth).padStart(2, '0')}-${String(cell.dayNumber).padStart(2, '0')}`;

                      return (
                        <div
                          key={`day-${cell.dayNumber}`}
                          className={`bg-white p-2 min-h-[115px] flex flex-col justify-between transition group hover:bg-slate-50/80 cursor-pointer ${
                            cell.isWeekend ? 'bg-amber-50/20' : ''
                          }`}
                          onClick={() =>
                            setSelectedCalendarDay({
                              day: cell.dayNumber,
                              month: rosterMonth,
                              year: rosterYear,
                              shifts: dayShifts,
                            })
                          }
                        >
                          {/* Cell Header: Day number & Add action */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`inline-flex items-center justify-center text-xs font-bold rounded-full transition ${
                                cell.isToday
                                  ? 'w-6 h-6 bg-[#0B2046] text-white shadow-xs'
                                  : cell.isWeekend
                                  ? 'text-amber-800'
                                  : 'text-slate-800'
                              }`}
                            >
                              {cell.dayNumber}
                            </span>

                            <div className="flex items-center gap-1">
                              {dayShifts.length > 0 && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                  {dayShifts.length} คน
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSingleAssignCreate(undefined, dateStr);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#0B2046] hover:bg-slate-200/70 rounded transition"
                                title="มอบหมายกะในวันนี้"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Scheduled Shift Pills */}
                          <div className="space-y-1 flex-1">
                            {dayShifts.slice(0, 3).map((item, idx) => (
                              <div
                                key={`${item.employeeId}-${idx}`}
                                className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded font-medium border truncate ${
                                  item.shift.isCrossDay
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                                title={`${item.employeeName} (${item.employeeCode}) - ${item.shift.shiftName} (${item.shift.startTime.substring(0, 5)}-${item.shift.endTime.substring(0, 5)})`}
                              >
                                <div className="flex items-center gap-1 min-w-0 truncate">
                                  {item.shift.isCrossDay ? (
                                    <Moon className="w-2.5 h-2.5 shrink-0 text-purple-600" />
                                  ) : (
                                    <Sun className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                                  )}
                                  <span className="font-bold shrink-0">{item.shift.shiftName}:</span>
                                  <span className="truncate text-slate-700">{item.employeeName.split(' ')[0]}</span>
                                </div>
                              </div>
                            ))}

                            {dayShifts.length > 3 && (
                              <div className="text-[10px] font-semibold text-slate-500 group-hover:text-[#0B2046] text-right pt-0.5">
                                + อีก {dayShifts.length - 3} คน
                              </div>
                            )}

                            {dayShifts.length === 0 && (
                              <div className="h-full flex items-center justify-center py-3 text-[11px] text-slate-300 select-none">
                                {cell.isWeekend ? 'วันหยุด' : '-'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: DETAILED ASSIGNMENT LIST VIEW */}
          {assignmentViewMode === 'list' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">รายการมอบหมายกะพนักงานทั้งหมด</h3>
                  <p className="text-xs text-slate-500">
                    รายการการกำหนดกะแบบเฉพาะบุคคล ({filteredAssignments.length} รายการ)
                  </p>
                </div>
              </div>

              {loadingAssignments ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0B2046]" />
                  <p className="text-sm">กำลังโหลดรายการมอบหมายกะ...</p>
                </div>
              ) : filteredAssignments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                        <th className="p-3.5">รหัส / ชื่อพนักงาน</th>
                        <th className="p-3.5">แผนก / สังกัด</th>
                        <th className="p-3.5">กะการทำงาน</th>
                        <th className="p-3.5">เวลาการทำงาน</th>
                        <th className="p-3.5">มีผลตั้งแต่วันที่</th>
                        <th className="p-3.5">สิ้นสุดวันที่</th>
                        <th className="p-3.5">สถานะ</th>
                        <th className="p-3.5 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAssignments.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/60 transition">
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-900">{a.employeeName}</div>
                            <div className="text-xs text-slate-500">{a.employeeCode}</div>
                          </td>
                          <td className="p-3.5 text-slate-600">
                            {a.departmentName || '-'}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  a.isCrossDay ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {a.shiftCode}
                              </span>
                              <span className="text-slate-700">{a.shiftName}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-600 font-mono text-xs">
                            {a.startTime?.substring(0, 5)} - {a.endTime?.substring(0, 5)} น.
                            {a.isCrossDay && <span className="ml-1 text-purple-600 font-semibold">(ข้ามวัน)</span>}
                          </td>
                          <td className="p-3.5 text-slate-700">
                            {new Date(a.effectiveFrom).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="p-3.5 text-slate-700">
                            {a.effectiveTo ? (
                              new Date(a.effectiveTo).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            ) : (
                              <span className="text-emerald-600 font-medium text-xs">ต่อเนื่อง (ไม่มีกำหนดสิ้นสุด)</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                a.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  a.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {a.isActive ? 'กำลังใช้งาน' : 'ยกเลิก'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openSingleAssignEdit(a)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="แก้ไขช่วงเวลากะ"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete({
                                    type: 'assignment',
                                    id: a.id,
                                    title: `ยกเลิกการมอบหมายกะ: ${a.employeeName}`,
                                    subtitle: `กะ ${a.shiftName} (${a.shiftCode})`,
                                  });
                                  setDeleteConfirmOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="ยกเลิกการมอบหมายกะ"
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
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <p className="text-base font-semibold text-slate-600">ไม่พบรายการมอบหมายกะ</p>
                  <p className="text-xs text-slate-400 mt-1">ยังไม่มีการกำหนดกะเฉพาะบุคคลในระบบ</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: กะการทำงาน (Shift Master) */}
      {/* ============================================================= */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Company Standard Work Hours Info Banner */}
          <div className="p-4 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">เวลาทำงานมาตรฐานของบริษัท:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    จันทร์ – ศุกร์ (08:30 – 17:30 น.)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">• วันหยุด เสาร์ – อาทิตย์</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  พนักงานประจำทั่วไปจะยึดตามวันและเวลาทำงานของปฏิทินบริษัท หากต้องการจัดเวร/กะพิเศษเฉพาะบุคคลหรือแผนก สามารถเพิ่มกะด้านล่างนี้ได้
                </p>
              </div>
            </div>

            <Link
              href="/work-calendar"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#0B2046] font-semibold text-xs shadow-xs transition-all whitespace-nowrap shrink-0 group"
            >
              <Calendar className="w-3.5 h-3.5 text-[#0B2046]" />
              <span>ปรับแต่งปฏิทินวันทำงานบริษัท</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Shift Filter & View Switcher Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 overflow-x-auto">
            {/* Left: Filters & Search */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Search */}
              <div className="relative w-56 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหารหัส หรือชื่อกะการทำงาน..."
                  value={shiftSearchQuery}
                  onChange={(e) => setShiftSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              {/* Filter Shift Type */}
              <div className="w-40">
                <select
                  value={shiftFilterType}
                  onChange={(e) => setShiftFilterType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                >
                  <option value="ALL">ประเภทกะทั้งหมด</option>
                  <option value="NORMAL">กะกลางวัน (ปกติ)</option>
                  <option value="CROSS_DAY">กะข้ามวัน (กะดึก)</option>
                </select>
              </div>

              {/* Filter Status */}
              <div className="w-36">
                <select
                  value={shiftFilterStatus}
                  onChange={(e) => setShiftFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                >
                  <option value="ALL">สถานะทั้งหมด</option>
                  <option value="ACTIVE">เปิดใช้งาน</option>
                  <option value="INACTIVE">ระงับใช้งาน</option>
                </select>
              </div>

              {/* Refresh */}
              <button
                onClick={loadShifts}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition border border-slate-200 bg-slate-50 shrink-0"
                title="รีเฟรชข้อมูลกะ"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingShifts ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Right: View Switcher & Action */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setShiftViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap ${
                    shiftViewMode === 'grid'
                      ? 'bg-white text-[#0B2046] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>การ์ด</span>
                </button>
                <button
                  onClick={() => setShiftViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap ${
                    shiftViewMode === 'table'
                      ? 'bg-white text-[#0B2046] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>ตาราง</span>
                </button>
              </div>

              <div className="h-6 w-px bg-slate-200" />

              <button
                onClick={openShiftCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B2046] hover:bg-[#0B2046]/90 text-white text-xs font-semibold transition shadow-xs shadow-[#0B2046]/20 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มกะการทำงานใหม่</span>
              </button>
            </div>
          </div>

          {/* Shift Content */}
          {loadingShifts ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B2046]" />
              <p className="text-sm">กำลังโหลดข้อมูลกะการทำงาน...</p>
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">ไม่พบข้อมูลกะการทำงานที่ค้นหา</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มกะการทำงานใหม่" เพื่อสร้างกะแรก</p>
            </div>
          ) : shiftViewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Header: Shift Name & Day/Night Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-[#0B2046] transition truncate">
                        {shift.shiftName}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                          shift.isCrossDay
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {shift.isCrossDay ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                        <span>{shift.isCrossDay ? 'กะข้ามวัน (กลางคืน)' : 'กะกลางวัน'}</span>
                      </span>
                    </div>

                    {/* Time Window Display */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">เวลาทำงาน:</span>
                        <span className="font-bold font-mono text-slate-800 text-sm">
                          {shift.startTime.substring(0, 5)} - {shift.endTime.substring(0, 5)} น.
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">ชั่วโมงทำงานสุทธิ:</span>
                        <span className="font-semibold text-slate-700">
                          {shift.netWorkHours ?? 8} ชม. (พัก {shift.breakMinutes} นาที)
                        </span>
                      </div>
                    </div>

                    {/* Separate Grace Times */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
                        <div className="text-slate-400 text-[11px]">ผ่อนปรนมาสาย:</div>
                        <div className="font-semibold text-slate-700 mt-0.5">
                          {shift.lateGraceMinutes > 0 ? `${shift.lateGraceMinutes} นาที` : 'ไม่ผ่อนปรน'}
                        </div>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
                        <div className="text-slate-400 text-[11px]">ผ่อนปรนกลับก่อน:</div>
                        <div className="font-semibold text-slate-700 mt-0.5">
                          {shift.earlyLeaveGraceMinutes > 0 ? `${shift.earlyLeaveGraceMinutes} นาที` : 'ไม่ผ่อนปรน'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        shift.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          shift.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      {shift.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับใช้งาน'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedShiftForEmployees(shift);
                          setEmployeeModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="ดูพนักงานที่เข้ากะนี้"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateShift(shift)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="คัดลอกกะนี้เพื่อสร้างใหม่"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openShiftEdit(shift)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="แก้ไขรายละเอียดกะ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setItemToDelete({
                            type: 'shift',
                            id: shift.id,
                            title: `ลบกะการทำงาน: ${shift.shiftName}`,
                            subtitle: `รหัสกะ: ${shift.shiftCode} (${shift.startTime.substring(0, 5)} - ${shift.endTime.substring(0, 5)})`,
                          });
                          setDeleteConfirmOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="ลบกะการทำงาน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                      <th className="p-3.5">รหัสกะ</th>
                      <th className="p-3.5">ชื่อกะการทำงาน</th>
                      <th className="p-3.5">ประเภทกะ</th>
                      <th className="p-3.5">เวลาทำงาน</th>
                      <th className="p-3.5">พัก (นาที)</th>
                      <th className="p-3.5">ผ่อนปรนสาย</th>
                      <th className="p-3.5">ผ่อนปรนกลับก่อน</th>
                      <th className="p-3.5">สถานะ</th>
                      <th className="p-3.5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredShifts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3.5 font-mono font-bold text-slate-800">{s.shiftCode}</td>
                        <td className="p-3.5 font-semibold text-slate-900">{s.shiftName}</td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              s.isCrossDay
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {s.isCrossDay ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                            <span>{s.isCrossDay ? 'กะข้ามวัน' : 'ปกติ'}</span>
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-xs text-slate-700">
                          {s.startTime.substring(0, 5)} - {s.endTime.substring(0, 5)} น.
                        </td>
                        <td className="p-3.5 text-slate-600">{s.breakMinutes} นาที</td>
                        <td className="p-3.5 text-slate-700">
                          {s.lateGraceMinutes > 0 ? `${s.lateGraceMinutes} นาที` : '-'}
                        </td>
                        <td className="p-3.5 text-slate-700">
                          {s.earlyLeaveGraceMinutes > 0 ? `${s.earlyLeaveGraceMinutes} นาที` : '-'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              s.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                s.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {s.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับใช้งาน'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedShiftForEmployees(s);
                                setEmployeeModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="ดูพนักงานที่เข้ากะนี้"
                            >
                              <Users className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicateShift(s)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="คัดลอกกะ"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openShiftEdit(s)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="แก้ไข"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setItemToDelete({
                                  type: 'shift',
                                  id: s.id,
                                  title: `ลบกะการทำงาน: ${s.shiftName}`,
                                  subtitle: `รหัสกะ: ${s.shiftCode}`,
                                });
                                setDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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

      {/* ============================================================= */}
      {/* MODAL 1: Single Assign Shift Modal */}
      {/* ============================================================= */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {assignModalMode === 'create' ? 'มอบหมายกะให้พนักงาน' : 'แก้ไขการมอบหมายกะ'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  กำหนดกะเฉพาะบุคคล (ป้องกันการกำหนดช่วงเวลาซ้อนทับอัตโนมัติ)
                </p>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleAssign} className="p-5 space-y-4">
              {/* Employee Selection & Type Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    เลือกพนักงาน <span className="text-rose-500">*</span>
                  </label>
                  {assignModalMode === 'create' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">ประเภท:</span>
                      <select
                        value={singleAssignTypeFilter}
                        onChange={(e) => setSingleAssignTypeFilter(e.target.value)}
                        className="px-2 py-0.5 text-xs bg-slate-100 border border-slate-200 rounded-md focus:outline-none text-slate-700 font-medium"
                      >
                        <option value="ALL">ทุกประเภทการจ้างงาน</option>
                        {employeeTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.typeName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {assignModalMode === 'create' ? (
                  <select
                    value={assignForm.employeeId}
                    onChange={(e) => setAssignForm({ ...assignForm, employeeId: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                    required
                  >
                    <option value="0">-- กรุณาเลือกพนักงาน --</option>
                    {assignableEmployees
                      .filter((emp) =>
                        singleAssignTypeFilter === 'ALL'
                          ? true
                          : emp.employeeTypeId === Number(singleAssignTypeFilter)
                      )
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employeeCode} - {emp.fullName} ({emp.departmentName || 'ไม่ระบุแผนก'}) · [{emp.employeeTypeName || 'พนักงานประจำ'}]
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium flex items-center justify-between">
                    <span>
                      {assignableEmployees.find((e) => e.id === assignForm.employeeId)?.fullName ||
                        `พนักงานรหัส #${assignForm.employeeId}`}
                    </span>
                    <span className="text-xs text-slate-500 font-normal">
                      {assignableEmployees.find((e) => e.id === assignForm.employeeId)?.employeeTypeName || 'พนักงานประจำ'}
                    </span>
                  </div>
                )}
              </div>

              {/* Shift Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กะการทำงานเป้าหมาย <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignForm.shiftId}
                  onChange={(e) => setAssignForm({ ...assignForm, shiftId: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  required
                >
                  <option value="0">-- กรุณาเลือกกะการทำงาน --</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shiftCode} - {s.shiftName} ({s.startTime.substring(0, 5)} - {s.endTime.substring(0, 5)} น.
                      {s.isCrossDay ? ' กะข้ามวัน' : ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    มีผลตั้งแต่วันที่ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={assignForm.effectiveFrom}
                    onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สิ้นสุดวันที่ <span className="text-slate-400 font-normal">(เว้นว่างถ้าไม่มีกำหนด)</span>
                  </label>
                  <input
                    type="date"
                    value={assignForm.effectiveTo || ''}
                    onChange={(e) => setAssignForm({ ...assignForm, effectiveTo: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-[#0B2046] hover:bg-[#0B2046]/90 text-white font-medium rounded-lg transition disabled:opacity-50 shadow-sm"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>บันทึกการมอบหมาย</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: Batch Assign Shift Modal */}
      {/* ============================================================= */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">มอบหมายกะแบบกลุ่ม (Batch Assignment)</h3>
                  <p className="text-xs text-slate-500">จัดกะให้พนักงานทั้งแผนก หรือเลือกเฉพาะหลายคนพร้อมกันในครั้งเดียว</p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Batch Result Report */}
              {batchResult && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">ผลการประมวลผลการจัดกะ:</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-700 font-semibold">สำเร็จ: {batchResult.successCount}</span>
                      <span className="text-rose-700 font-semibold">ข้อผิดพลาด: {batchResult.failedCount}</span>
                    </div>
                  </div>
                  {batchResult.errors && batchResult.errors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto text-xs text-rose-700 bg-rose-50/70 p-2 rounded-lg space-y-1">
                      {batchResult.errors.map((err, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Target Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">เป้าหมายที่ต้องการมอบหมาย</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBatchTargetType('department')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                      batchTargetType === 'department'
                        ? 'border-[#0B2046] bg-[#0B2046]/5 text-[#0B2046]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Building2 className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">ตามรายแผนก</div>
                      <div className="text-[11px] text-slate-500">มอบหมายให้พนักงานทุกคนในแผนก</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchTargetType('selected')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                      batchTargetType === 'selected'
                        ? 'border-[#0B2046] bg-[#0B2046]/5 text-[#0B2046]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">เลือกพนักงานเอง</div>
                      <div className="text-[11px] text-slate-500">ติ๊กเลือกพนักงานเฉพาะกลุ่ม</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Department Option */}
              {batchTargetType === 'department' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลือกแผนกเป้าหมาย <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={batchSelectedDept || ''}
                    onChange={(e) => setBatchSelectedDept(Number(e.target.value) || null)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  >
                    <option value="">-- กรุณาเลือกแผนก --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentName} ({d.departmentCode})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Select Specific Employees */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      เลือกพนักงาน ({batchSelectedEmpIds.length} คนที่เลือก)
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const matchingIds = assignableEmployees
                            .filter((e) => {
                              const matchSearch =
                                e.fullName.toLowerCase().includes(empFilterKeyword.toLowerCase()) ||
                                e.employeeCode.toLowerCase().includes(empFilterKeyword.toLowerCase()) ||
                                (e.departmentName && e.departmentName.toLowerCase().includes(empFilterKeyword.toLowerCase()));
                              const matchType =
                                batchAssignTypeFilter === 'ALL' || e.employeeTypeId === Number(batchAssignTypeFilter);
                              return matchSearch && matchType;
                            })
                            .map((e) => e.id);
                          setBatchSelectedEmpIds(Array.from(new Set([...batchSelectedEmpIds, ...matchingIds])));
                        }}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        เลือกทั้งหมดตามตัวกรอง
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setBatchSelectedEmpIds([])}
                        className="text-slate-500 hover:underline"
                      >
                        ล้างการเลือก
                      </button>
                    </div>
                  </div>

                  {/* Search and Employee Type Filter Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="พิมพ์กรองชื่อ หรือแผนก..."
                        value={empFilterKeyword}
                        onChange={(e) => setEmpFilterKeyword(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <select
                        value={batchAssignTypeFilter}
                        onChange={(e) => setBatchAssignTypeFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-medium"
                      >
                        <option value="ALL">ทุกประเภทการจ้างงาน</option>
                        {employeeTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.typeName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 p-1">
                    {assignableEmployees
                      .filter((e) => {
                        const matchSearch =
                          e.fullName.toLowerCase().includes(empFilterKeyword.toLowerCase()) ||
                          e.employeeCode.toLowerCase().includes(empFilterKeyword.toLowerCase()) ||
                          (e.departmentName && e.departmentName.toLowerCase().includes(empFilterKeyword.toLowerCase()));
                        const matchType =
                          batchAssignTypeFilter === 'ALL' || e.employeeTypeId === Number(batchAssignTypeFilter);
                        return matchSearch && matchType;
                      })
                      .map((emp) => {
                        const checked = batchSelectedEmpIds.includes(emp.id);
                        return (
                          <label
                            key={emp.id}
                            className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBatchSelectedEmpIds([...batchSelectedEmpIds, emp.id]);
                                } else {
                                  setBatchSelectedEmpIds(batchSelectedEmpIds.filter((id) => id !== emp.id));
                                }
                              }}
                              className="rounded border-slate-300 text-[#0B2046] focus:ring-[#0B2046]"
                            />
                            <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                              <div className="truncate">
                                <span className="font-semibold text-slate-800">{emp.fullName}</span>
                                <span className="text-slate-400 text-[11px] ml-2 font-mono">{emp.employeeCode}</span>
                                {emp.departmentName && (
                                  <span className="text-slate-500 text-[11px] ml-1.5">({emp.departmentName})</span>
                                )}
                              </div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                {emp.employeeTypeName || 'พนักงานประจำ'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Choose Shift */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กะการทำงานที่ต้องการมอบหมาย <span className="text-rose-500">*</span>
                </label>
                <select
                  value={batchShiftId}
                  onChange={(e) => setBatchShiftId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shiftCode} - {s.shiftName} ({s.startTime.substring(0, 5)} - {s.endTime.substring(0, 5)} น.)
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    มีผลตั้งแต่วันที่ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={batchEffectiveFrom}
                    onChange={(e) => setBatchEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สิ้นสุดวันที่ <span className="text-slate-400 font-normal">(เว้นว่างถ้าต่อเนื่อง)</span>
                  </label>
                  <input
                    type="date"
                    value={batchEffectiveTo}
                    onChange={(e) => setBatchEffectiveTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={handleRunBatchAssign}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-[#0B2046] hover:bg-[#0B2046]/90 text-white font-medium rounded-lg transition disabled:opacity-50 shadow-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>ดำเนินการจัดกะแบบกลุ่ม</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: Create / Edit Shift Master Modal */}
      {/* ============================================================= */}
      {shiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {shiftModalMode === 'create' ? 'เพิ่มกะการทำงานใหม่' : 'แก้ไขกะการทำงาน'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  กำหนดช่วงเวลาเข้า-ออก และเงื่อนไขการผ่อนปรนเวลา
                </p>
              </div>
              <button
                onClick={() => setShiftModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="p-5 space-y-4">
              {/* Shift Code & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสกะ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น DAY_OFFICE"
                    value={shiftForm.shiftCode}
                    onChange={(e) => setShiftForm({ ...shiftForm, shiftCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อกะการทำงาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น กะกลางวันสำนักงาน"
                    value={shiftForm.shiftName}
                    onChange={(e) => setShiftForm({ ...shiftForm, shiftName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>
              </div>

              {/* Working Hours with ThaiTimePicker */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">กำหนดเวลาทำงาน</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="isCrossDay"
                      checked={shiftForm.isCrossDay}
                      onChange={(e) => setShiftForm({ ...shiftForm, isCrossDay: e.target.checked })}
                      className="rounded border-slate-300 text-[#0B2046] focus:ring-[#0B2046]"
                    />
                    <label htmlFor="isCrossDay" className="text-xs font-medium text-slate-700 cursor-pointer">
                      กะข้ามวัน (เช่น 20:00 - 05:00)
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">เวลาเริ่มงาน</label>
                    <ThaiTimePicker
                      value={shiftForm.startTime}
                      onChange={(val) => handleShiftTimeChange('startTime', val)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">เวลาเลิกงาน</label>
                    <ThaiTimePicker
                      value={shiftForm.endTime}
                      onChange={(val) => handleShiftTimeChange('endTime', val)}
                    />
                  </div>
                </div>

                {/* Duration summary badge */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span>ชั่วโมงสุทธิโดยประมาณ:</span>
                  <span className="font-bold text-[#0B2046]">
                    {calcShiftDuration(
                      shiftForm.startTime,
                      shiftForm.endTime,
                      !!shiftForm.isCrossDay,
                      shiftForm.breakMinutes
                    ).net}{' '}
                    ชั่วโมง
                  </span>
                </div>
              </div>

              {/* Break Minutes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เวลาพักกลางวัน / กะ (นาที)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={shiftForm.breakMinutes}
                  onChange={(e) => setShiftForm({ ...shiftForm, breakMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              {/* Separate Grace Times: Late & Early Leave */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผ่อนปรนมาสาย (นาที)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={shiftForm.lateGraceMinutes}
                    onChange={(e) => setShiftForm({ ...shiftForm, lateGraceMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {[0, 5, 10, 15].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setShiftForm({ ...shiftForm, lateGraceMinutes: m })}
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          shiftForm.lateGraceMinutes === m
                            ? 'bg-[#0B2046] text-white border-[#0B2046]'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {m}น.
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผ่อนปรนกลับก่อน (นาที)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={shiftForm.earlyLeaveGraceMinutes}
                    onChange={(e) => setShiftForm({ ...shiftForm, earlyLeaveGraceMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {[0, 5, 10, 15].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setShiftForm({ ...shiftForm, earlyLeaveGraceMinutes: m })}
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          shiftForm.earlyLeaveGraceMinutes === m
                            ? 'bg-[#0B2046] text-white border-[#0B2046]'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {m}น.
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะกะการทำงาน</label>
                <select
                  value={shiftForm.status}
                  onChange={(e) => setShiftForm({ ...shiftForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                >
                  <option value="ACTIVE">เปิดใช้งาน (Active)</option>
                  <option value="INACTIVE">ระงับการใช้งานชั่วคราว (Inactive)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShiftModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-[#0B2046] hover:bg-[#0B2046]/90 text-white font-medium rounded-lg transition disabled:opacity-50 shadow-sm"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{shiftModalMode === 'create' ? 'สร้างกะใหม่' : 'บันทึกการแก้ไข'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 5: View Staff Assigned to Shift */}
      {/* ============================================================= */}
      {employeeModalOpen && selectedShiftForEmployees && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">พนักงานในกะ: {selectedShiftForEmployees.shiftName}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  รหัส {selectedShiftForEmployees.shiftCode} ({selectedShiftForEmployees.startTime.substring(0, 5)} -{' '}
                  {selectedShiftForEmployees.endTime.substring(0, 5)} น.)
                </p>
              </div>
              <button
                onClick={() => setEmployeeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto">
              {assignments.filter((a) => a.shiftId === selectedShiftForEmployees.id).length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">ยังไม่มีพนักงานที่ถูกมอบหมายกะนี้</p>
                  <p className="text-xs text-slate-400 mt-1">
                    สามารถไปที่ "แท็บ 1: มอบหมายกะให้พนักงาน" เพื่อเริ่มจัดเวรได้ทันที
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assignments
                    .filter((a) => a.shiftId === selectedShiftForEmployees.id)
                    .map((a) => (
                      <div key={a.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{a.employeeName}</div>
                          <div className="text-xs text-slate-500">
                            {a.employeeCode} · {a.departmentName || '-'}
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <div>
                            ตั้งแต่{' '}
                            {new Date(a.effectiveFrom).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
                            })}
                          </div>
                          <div>
                            {a.effectiveTo
                              ? `ถึง ${new Date(a.effectiveTo).toLocaleDateString('th-TH', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: '2-digit',
                                })}`
                              : 'ต่อเนื่อง'}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setEmployeeModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: Selected Calendar Day Details */}
      {/* ============================================================= */}
      {selectedCalendarDay && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    ตารางจัดเวร: วันที่ {selectedCalendarDay.day} {THAI_MONTHS[selectedCalendarDay.month - 1]} {selectedCalendarDay.year + 543}
                  </h3>
                  <p className="text-xs text-slate-500">
                    มีพนักงานได้รับมอบหมายกะทั้งหมด {selectedCalendarDay.shifts.length} คน
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const dStr = `${selectedCalendarDay.year}-${String(selectedCalendarDay.month).padStart(2, '0')}-${String(selectedCalendarDay.day).padStart(2, '0')}`;
                    setSelectedCalendarDay(null);
                    openSingleAssignCreate(undefined, dStr);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B2046] hover:bg-[#0B2046]/90 text-white text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>มอบหมายกะในวันนี้</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCalendarDay(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-3 max-h-[60vh]">
              {selectedCalendarDay.shifts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">ไม่มีพนักงานที่ได้รับมอบหมายกะในวันนี้</p>
                  <p className="text-xs text-slate-400">
                    คุณสามารถกดปุ่ม "มอบหมายกะในวันนี้" ด้านบน เพื่อกำหนดกะให้พนักงาน
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {selectedCalendarDay.shifts.map((item, idx) => (
                    <div
                      key={`${item.employeeId}-${idx}`}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                          {item.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-900">{item.employeeName}</div>
                          <div className="text-xs text-slate-500">
                            {item.employeeCode} {item.departmentName ? `· ${item.departmentName}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.shift.isCrossDay
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {item.shift.isCrossDay ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                          <span>{item.shift.shiftName}</span>
                        </span>
                        <span className="font-mono text-xs text-slate-600">
                          {item.shift.startTime.substring(0, 5)} - {item.shift.endTime.substring(0, 5)} น.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedCalendarDay(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 6: Shared Delete Confirmation Modal */}
      {/* ============================================================= */}
      {deleteConfirmOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">{itemToDelete.title}</h3>
              {itemToDelete.subtitle && (
                <p className="text-xs text-slate-500 font-medium">{itemToDelete.subtitle}</p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การดำเนินการนี้ไม่สามารถเรียกคืนได้
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition disabled:opacity-50 shadow-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SchedulesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0B2046]" />
          <p className="text-sm">กำลังโหลดข้อมูลระบบการจัดตารางงาน...</p>
        </div>
      }
    >
      <SchedulesContent />
    </Suspense>
  );
}
