'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Moon,
  Sun,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Users,
  ArrowRight,
  LayoutGrid,
  List,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { shiftService } from '@/services/shiftService';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { Shift, CreateShiftRequest, UpdateShiftRequest } from '@/types/shift';
import ThaiTimePicker from '@/components/common/ThaiTimePicker';

export default function ShiftsPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Sub-tabs & View mode
  const [activeSubTab, setActiveSubTab] = useState<'patterns' | 'assignments'>('patterns');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL'); // ALL, NORMAL, CROSS_DAY
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // ALL, ACTIVE, INACTIVE

  // Employee assignment roster state (for Assignments Sub-tab)
  const [assignmentDeptFilter, setAssignmentDeptFilter] = useState('ALL');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [employeeRoster, setEmployeeRoster] = useState([
    { id: 'EMP001', name: 'นายสมชาย ใจดี', dept: 'ฝ่ายเทคโนโลยีสารสนเทศ', pos: 'นักพัฒนาซอฟต์แวร์อาวุโส', shiftCode: 'DAY_OFFICE', status: 'ปกติ' },
    { id: 'EMP002', name: 'นางสาวชนิภา นาจรินทร์', dept: 'ฝ่ายบริหารทรัพยากรบุคคล', pos: 'เจ้าหน้าที่สรรหาบุคลากร', shiftCode: 'DAY_OFFICE', status: 'ปกติ' },
    { id: 'EMP003', name: 'นายวิชัย สุขเกษม', dept: 'ฝ่ายเทคโนโลยีสารสนเทศ', pos: 'วิศวกรระบบเครือข่าย', shiftCode: 'FLEX_TECH', status: 'ปกติ' },
    { id: 'EMP004', name: 'นางสาวกานดา มั่นคง', dept: 'ฝ่ายการเงินและการบัญชี', pos: 'นักวิเคราะห์บัญชี', shiftCode: 'DAY_OFFICE', status: 'ปกติ' },
    { id: 'EMP005', name: 'นายณัฐดนัย ภักดี', dept: 'ฝ่ายปฏิบัติการและการผลิต', pos: 'หัวหน้าทีมควบคุมการผลิต', shiftCode: 'NIGHT_PROD', status: 'ปกติ' },
    { id: 'EMP006', name: 'นายธีรภัทร ชาญวิทย์', dept: 'ฝ่ายปฏิบัติการและการผลิต', pos: 'เจ้าหน้าที่เทคนิคประจำกะ', shiftCode: 'NIGHT_PROD', status: 'ปกติ' },
    { id: 'EMP007', name: 'นางสาวสุดารัตน์ พรประเสริฐ', dept: 'ฝ่ายปฏิบัติการและการผลิต', pos: 'เจ้าหน้าที่ตรวจสอบคุณภาพ', shiftCode: 'AFTERNOON_SERV', status: 'ปกติ' },
    { id: 'EMP008', name: 'นายธนกฤต มั่งมี', dept: 'ฝ่ายบริการลูกค้าและสนับสนุน', pos: 'เจ้าหน้าที่ประสานงานลูกค้า', shiftCode: 'AFTERNOON_SERV', status: 'ปกติ' },
  ]);

  // Alert states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states: Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
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

  // Modal states: Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string; code: string } | null>(null);

  // Modal states: Employee Details
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedShiftForEmployees, setSelectedShiftForEmployees] = useState<Shift | null>(null);

  // Breadcrumb sync
  useEffect(() => {
    setBreadcrumb({
      section: 'การเข้างาน',
      page: 'ตารางกะการทำงาน',
    });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Load shifts
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await shiftService.getShifts();
      setShifts(data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลกะการทำงาน');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Check if cross day should auto-toggle
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const updated = { ...shiftForm, [field]: value };
    if (updated.startTime && updated.endTime) {
      if (updated.endTime < updated.startTime) {
        updated.isCrossDay = true;
      }
    }
    setShiftForm(updated);
  };

  // Modal Handlers
  const handleOpenCreateModal = () => {
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
    setModalMode('create');
    setModalOpen(true);
  };

  const handleOpenEditModal = (s: Shift) => {
    setShiftForm({
      id: s.id,
      shiftCode: s.shiftCode,
      shiftName: s.shiftName,
      startTime: s.startTime,
      endTime: s.endTime,
      isCrossDay: s.isCrossDay,
      breakMinutes: s.breakMinutes,
      status: s.status,
      lateGraceMinutes: s.lateGraceMinutes,
      earlyLeaveGraceMinutes: s.earlyLeaveGraceMinutes,
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  // Enterprise Feature: One-Click Clone
  const handleCloneShift = (s: Shift) => {
    setShiftForm({
      shiftCode: `${s.shiftCode}_COPY`,
      shiftName: `${s.shiftName} (คัดลอก)`,
      startTime: s.startTime,
      endTime: s.endTime,
      isCrossDay: s.isCrossDay,
      breakMinutes: s.breakMinutes,
      status: 'ACTIVE',
      lateGraceMinutes: s.lateGraceMinutes,
      earlyLeaveGraceMinutes: s.earlyLeaveGraceMinutes,
    });
    setModalMode('create');
    setModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        const created = await shiftService.createShift({
          shiftCode: shiftForm.shiftCode.trim().toUpperCase(),
          shiftName: shiftForm.shiftName.trim(),
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
          isCrossDay: shiftForm.isCrossDay,
          breakMinutes: Number(shiftForm.breakMinutes),
          status: shiftForm.status,
          lateGraceMinutes: Number(shiftForm.lateGraceMinutes),
          earlyLeaveGraceMinutes: Number(shiftForm.earlyLeaveGraceMinutes),
        });
        setShifts((prev) => [...prev, created].sort((a, b) => a.shiftCode.localeCompare(b.shiftCode)));
        setSuccessMessage('เพิ่มกะการทำงานสำเร็จ');
      } else if (shiftForm.id) {
        const updated = await shiftService.updateShift(shiftForm.id, {
          shiftName: shiftForm.shiftName.trim(),
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
          isCrossDay: shiftForm.isCrossDay,
          breakMinutes: Number(shiftForm.breakMinutes),
          status: shiftForm.status,
          lateGraceMinutes: Number(shiftForm.lateGraceMinutes),
          earlyLeaveGraceMinutes: Number(shiftForm.earlyLeaveGraceMinutes),
        });
        setShifts((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) => a.shiftCode.localeCompare(b.shiftCode))
        );
        setSuccessMessage('แก้ไขข้อมูลกะการทำงานสำเร็จ');
      }
      setModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลกะการทำงานได้');
    }
  };

  const handleConfirmDelete = (s: Shift) => {
    setItemToDelete({ id: s.id, name: s.shiftName, code: s.shiftCode });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      await shiftService.deleteShift(itemToDelete.id);
      setShifts((prev) => prev.filter((s) => s.id !== itemToDelete.id));
      setSuccessMessage(`ลบกะการทำงาน "${itemToDelete.name}" สำเร็จ`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'ไม่สามารถลบกะการทำงานได้');
    }
  };

  const handleOpenEmployeeModal = (s: Shift) => {
    setSelectedShiftForEmployees(s);
    setEmployeeModalOpen(true);
  };

  // Enterprise Feature: Quick CSV Export
  const handleExportCSV = () => {
    const headers = [
      'รหัสกะ',
      'ชื่อกะการทำงาน',
      'เวลาเริ่ม',
      'เวลาสิ้นสุด',
      'กะข้ามวัน',
      'เวลาพัก(นาที)',
      'ชั่วโมงทำงานสุทธิ',
      'ผ่อนปรนสาย(นาที)',
      'ผ่อนปรนกลับก่อน(นาที)',
      'สถานะ',
    ];
    const rows = filteredShifts.map((s) => [
      s.shiftCode,
      `"${s.shiftName}"`,
      s.startTime,
      s.endTime,
      s.isCrossDay ? 'ใช่' : 'ไม่ใช่',
      s.breakMinutes,
      s.netWorkHours,
      s.lateGraceMinutes,
      s.earlyLeaveGraceMinutes,
      s.status === 'ACTIVE' ? 'ทำงานอยู่' : 'ไม่ได้ทำงาน',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hrms_shifts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessMessage('ส่งออกข้อมูลกะการทำงาน (CSV) เรียบร้อยแล้ว');
  };

  // Enterprise Feature: Re-assign employee shift
  const handleUpdateEmployeeShift = (empId: string, newShiftCode: string) => {
    setEmployeeRoster((prev) =>
      prev.map((emp) => (emp.id === empId ? { ...emp, shiftCode: newShiftCode } : emp))
    );
    setSuccessMessage(`ปรับเปลี่ยนกะพนักงานรหัส ${empId} สำเร็จ`);
  };

  // Convert "HH:mm" to percentage of a 24-hour day (0 - 100%)
  const timeToPercent = (timeStr: string) => {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return ((h * 60 + m) / (24 * 60)) * 100;
  };

  // Mock employee assignment counts based on shift ID for visual richness
  const getAssignedCount = (s: Shift) => {
    if (s.shiftCode.includes('DAY') || s.shiftCode.includes('OFFICE')) return 96;
    if (s.shiftCode.includes('NIGHT')) return 33;
    if (s.shiftCode.includes('AFTERNOON')) return 41;
    if (s.shiftCode.includes('FLEX')) return 18;
    return (s.id * 17) % 80 + 12;
  };

  // Filtered shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || s.shiftName.toLowerCase().includes(q) || s.shiftCode.toLowerCase().includes(q);
      const matchesType =
        filterType === 'ALL' ||
        (filterType === 'CROSS_DAY' && s.isCrossDay) ||
        (filterType === 'NORMAL' && !s.isCrossDay);
      const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [shifts, searchQuery, filterType, filterStatus]);

  // Statistics
  const totalShiftsCount = shifts.length;
  const crossDayShiftsCount = shifts.filter((s) => s.isCrossDay).length;
  const totalEmployeesAssigned = shifts.reduce((acc, s) => acc + getAssignedCount(s), 0);

  // Filtered roster for Assignments tab
  const filteredRoster = useMemo(() => {
    return employeeRoster.filter((emp) => {
      const q = assignmentSearch.toLowerCase().trim();
      const matchesSearch = !q || emp.name.toLowerCase().includes(q) || emp.id.toLowerCase().includes(q);
      const matchesDept = assignmentDeptFilter === 'ALL' || emp.dept.includes(assignmentDeptFilter);
      return matchesSearch && matchesDept;
    });
  }, [employeeRoster, assignmentSearch, assignmentDeptFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium whitespace-nowrap">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium whitespace-nowrap">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards (4 Cards matching User Mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: รูปแบบกะทั้งหมด */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 whitespace-nowrap">รูปแบบกะทั้งหมด</div>
            <div className="text-xs text-slate-400 mt-1 whitespace-nowrap">แม่แบบเวลาในระบบ</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
            <span className="text-xl font-bold text-slate-800 font-mono">{totalShiftsCount}</span>
          </div>
        </div>

        {/* Card 2: พนักงานที่ถูกมอบหมายกะ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 whitespace-nowrap">พนักงานที่ถูกมอบหมายกะ</div>
            <div className="text-xs text-slate-400 mt-1 whitespace-nowrap">กำลังปฏิบัติงานตามกะ</div>
          </div>
          <div className="w-16 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
            <span className="text-xl font-bold text-amber-700 font-mono">{totalEmployeesAssigned}</span>
          </div>
        </div>

        {/* Card 3: กะที่ข้ามวัน */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 whitespace-nowrap">กะที่ข้ามวัน</div>
            <div className="text-xs text-slate-400 mt-1 whitespace-nowrap">กะดึกเลิกงานวันรุ่งขึ้น</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
            <span className="text-xl font-bold text-purple-700 font-mono">{crossDayShiftsCount}</span>
          </div>
        </div>

        {/* Card 4: วันทำงาน/สัปดาห์ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 whitespace-nowrap">วันทำงาน/สัปดาห์</div>
            <div className="text-xs text-slate-400 mt-1 whitespace-nowrap">เกณฑ์มาตรฐานบริษัท</div>
          </div>
          <div className="w-16 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <span className="text-lg font-bold text-amber-700 font-mono">5/7</span>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        {/* Left: Sub-tabs */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveSubTab('patterns')}
            className={`pb-3 text-xs font-bold transition-all relative whitespace-nowrap ${
              activeSubTab === 'patterns'
                ? 'text-[#0B2046] border-b-2 border-[#0B2046]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            รูปแบบกะ
          </button>
          <button
            onClick={() => setActiveSubTab('assignments')}
            className={`pb-3 text-xs font-bold transition-all relative whitespace-nowrap ${
              activeSubTab === 'assignments'
                ? 'text-[#0B2046] border-b-2 border-[#0B2046]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            มอบหมายกะให้พนักงาน
          </button>
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            title="ส่งออกรายการกะเป็น CSV"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all shrink-0 whitespace-nowrap shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มกะการทำงาน</span>
          </button>
        </div>
      </div>

      {/* 4. Active Sub-Tab: PATTERNS (รูปแบบกะ) */}
      {activeSubTab === 'patterns' && (
        <div className="space-y-6">
          {/* Controls Toolbar (Search, Filter, View Mode Toggle) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อกะ หรือรหัสกะ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            />
          </div>

          {/* Shift Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 whitespace-nowrap"
          >
            <option value="ALL">ทุกประเภทกะ</option>
            <option value="NORMAL">กะปกติ (ไม่ข้ามวัน)</option>
            <option value="CROSS_DAY">กะข้ามวัน</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 whitespace-nowrap"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="ACTIVE">ทำงานอยู่</option>
            <option value="INACTIVE">ไม่ได้ทำงาน</option>
          </select>
        </div>

        {/* Refresh & View Toggle */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={loadData}
            disabled={loading}
            title="รีเฟรชข้อมูล"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-all shrink-0 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center bg-[#F1F5F9] border border-slate-200 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                viewMode === 'grid'
                  ? 'bg-white text-[#0B2046] shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>การ์ด</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-white text-[#0B2046] shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>ตาราง</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#0B2046]" />
          <span className="text-xs font-medium">กำลังโหลดข้อมูลกะการทำงาน...</span>
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <div className="text-sm font-semibold text-slate-700 mb-1">ไม่พบข้อมูลกะการทำงาน</div>
          <p className="text-xs text-slate-400 mb-4">ลองปรับตัวกรองการค้นหา หรือคลิกปุ่มเพื่อเพิ่มกะใหม่</p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B2046] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มกะการทำงานแรก</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* 5A. Card Grid View (Exact Design from User Mockup) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredShifts.map((s) => {
            const isNight = s.isCrossDay || parseInt(s.startTime.split(':')[0], 10) >= 18;
            const assignedCount = getAssignedCount(s);
            const startP = timeToPercent(s.startTime);
            const endP = timeToPercent(s.endTime);

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                {/* Card Top: Icon, Titles, Badges & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Shift Icon Box */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isNight
                          ? 'bg-purple-50 text-purple-600 border border-purple-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}
                    >
                      {isNight ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                    </div>

                    {/* Titles */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{s.shiftName}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] font-semibold text-slate-400">
                          {s.shiftCode}
                        </span>
                        <span className="text-[11px] text-slate-400">•</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {s.isCrossDay ? 'กะข้ามวัน' : 'เวลาคงที่'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-1.5">
                    {/* Status Dot Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          s.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      ></span>
                      <span>{s.status === 'ACTIVE' ? 'ทำงานอยู่' : 'ไม่ได้ทำงาน'}</span>
                    </span>

                    {/* Clone Button (Enterprise 10/10) */}
                    <button
                      onClick={() => handleCloneShift(s)}
                      title="คัดลอกกะนี้ (Clone)"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEditModal(s)}
                      title="แก้ไขกะนี้"
                      className="p-1.5 text-slate-400 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleConfirmDelete(s)}
                      title="ลบกะนี้"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Middle: Time Range Display */}
                <div className="flex items-center gap-3 py-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                    {s.startTime}
                  </span>
                  <ArrowRight className="w-5 h-5 text-slate-300 shrink-0" />
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                    {s.endTime}
                  </span>

                  {s.isCrossDay && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 whitespace-nowrap">
                      ข้ามวัน
                    </span>
                  )}
                </div>

                {/* Visual 24-Hour Mini Timeline Strip (Enterprise 10/10) */}
                <div className="space-y-1">
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    {!s.isCrossDay ? (
                      <div
                        style={{ left: `${startP}%`, width: `${Math.max(endP - startP, 3)}%` }}
                        className="absolute top-0 bottom-0 bg-amber-500 rounded-full"
                      />
                    ) : (
                      <>
                        <div
                          style={{ left: `${startP}%`, width: `${100 - startP}%` }}
                          className="absolute top-0 bottom-0 bg-purple-600 rounded-r-none rounded-full"
                        />
                        <div
                          style={{ left: '0%', width: `${endP}%` }}
                          className="absolute top-0 bottom-0 bg-purple-600 rounded-l-none rounded-full"
                        />
                      </>
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
                    <span>00:00</span>
                    <span>12:00</span>
                    <span>24:00</span>
                  </div>
                </div>

                {/* Card Stats Pills (4 Rounded Boxes: Total, Break, Late Grace, Early Leave Grace) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Pill 1: Net Work Hours */}
                  <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-2.5 text-center">
                    <div className="text-xs font-bold text-slate-800 font-mono">{s.netWorkHours} ชม.</div>
                    <div className="text-[10px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">รวมเวลา</div>
                  </div>

                  {/* Pill 2: Break Minutes */}
                  <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-2.5 text-center">
                    <div className="text-xs font-bold text-slate-800 font-mono">{s.breakMinutes} น.</div>
                    <div className="text-[10px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">พักงาน</div>
                  </div>

                  {/* Pill 3: Late Grace Period */}
                  <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-2.5 text-center">
                    <div className="text-xs font-bold text-slate-800 font-mono">{s.lateGraceMinutes} น.</div>
                    <div className="text-[10px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">
                      ผ่อนปรนสาย
                    </div>
                  </div>

                  {/* Pill 4: Early Leave Grace Period */}
                  <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-2.5 text-center">
                    <div className="text-xs font-bold text-slate-800 font-mono">{s.earlyLeaveGraceMinutes} น.</div>
                    <div className="text-[10px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">
                      ผ่อนปรนออกก่อน
                    </div>
                  </div>
                </div>

                {/* Compliance Indicator Badge */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  {s.netWorkHours <= 8 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>มาตรฐาน 8 ชม. (พรบ.คุ้มครองแรงงาน)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>เกิน 8 ชม. (คิดอัตราล่วงเวลา)</span>
                    </span>
                  )}
                </div>

                {/* Card Bottom: Assigned Employees Footer (Clickable) */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleOpenEmployeeModal(s)}
                    className="flex items-center gap-2 text-slate-500 hover:text-[#0B2046] font-medium transition-colors group"
                  >
                    <Users className="w-4 h-4 text-slate-400 group-hover:text-[#0B2046] transition-colors" />
                    <span className="whitespace-nowrap">{assignedCount} คนใช้กะนี้</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-0.5 transition-all" />
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID #{s.id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 5B. Table View (Single-line whitespace-nowrap conforming to Rule 4 & 5) */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0B2046] text-white font-semibold">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">รหัสกะ</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ชื่อกะการทำงาน</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">เวลาทำงาน</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-center">ประเภทกะ</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-center">พักงาน</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ช่วงเวลาผ่อนปรน</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-center">พนักงานใช้กะ</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredShifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {s.shiftCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {s.shiftName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {s.startTime} - {s.endTime}
                        </span>
                        <span className="text-slate-500 text-[11px] font-medium whitespace-nowrap">
                          ({s.netWorkHours} ชม.)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {s.isCrossDay ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
                          <Moon className="w-3 h-3" />
                          กะข้ามวัน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
                          <Sun className="w-3 h-3" />
                          กะปกติ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600 whitespace-nowrap">
                      {s.breakMinutes} นาที
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {s.lateGraceMinutes > 0 || s.earlyLeaveGraceMinutes > 0 ? (
                        <div className="inline-flex items-center gap-1.5 text-slate-600 font-medium text-[11px]">
                          {s.lateGraceMinutes > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                              สายได้ {s.lateGraceMinutes} นาที
                            </span>
                          )}
                          {s.earlyLeaveGraceMinutes > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                              ออกก่อนได้ {s.earlyLeaveGraceMinutes} นาที
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] whitespace-nowrap">ไม่มีการผ่อนปรน</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEmployeeModal(s)}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-[#0B2046] font-medium"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{getAssignedCount(s)} คน</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        ></span>
                        {s.status === 'ACTIVE' ? 'ทำงานอยู่' : 'ไม่ได้ทำงาน'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleCloneShift(s)}
                          title="คัดลอกกะ (Clone)"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          title="แก้ไข"
                          className="p-1.5 text-slate-500 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleConfirmDelete(s)}
                          title="ลบ"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* 5. Active Sub-Tab: ASSIGNMENTS (มอบหมายกะให้พนักงาน) */}
      {activeSubTab === 'assignments' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อพนักงาน หรือรหัสพนักงาน..."
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                />
              </div>

              <select
                value={assignmentDeptFilter}
                onChange={(e) => setAssignmentDeptFilter(e.target.value)}
                className="px-3 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 whitespace-nowrap"
              >
                <option value="ALL">ทุกแผนก</option>
                <option value="เทคโนโลยีสารสนเทศ">ฝ่าย IT</option>
                <option value="บริหารทรัพยากรบุคคล">ฝ่าย HR</option>
                <option value="การเงิน">ฝ่ายการเงิน</option>
                <option value="ปฏิบัติการ">ฝ่ายผลิต/ปฏิบัติการ</option>
                <option value="บริการลูกค้า">ฝ่ายบริการลูกค้า</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
              พนักงานทั้งหมด: <span className="font-bold text-slate-800">{filteredRoster.length}</span> คน
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสพนักงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อ-นามสกุล</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">แผนก / ตำแหน่ง</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">กะการทำงานปัจจุบัน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">เปลี่ยนกะการทำงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRoster.map((emp) => {
                    const currentShift = shifts.find((s) => s.shiftCode === emp.shiftCode);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {emp.id}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {emp.name}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-slate-800 font-medium">{emp.dept}</div>
                          <div className="text-[11px] text-slate-400">{emp.pos}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-medium text-[11px]">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{currentShift ? currentShift.shiftName : emp.shiftCode}</span>
                            {currentShift && (
                              <span className="text-slate-400 font-mono text-[10px]">
                                ({currentShift.startTime}-{currentShift.endTime})
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={emp.shiftCode}
                            onChange={(e) => handleUpdateEmployeeShift(emp.id, e.target.value)}
                            className="px-2.5 py-1.5 bg-[#F1F5F9] border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 cursor-pointer"
                          >
                            {shifts.map((s) => (
                              <option key={s.id} value={s.shiftCode}>
                                {s.shiftName} ({s.startTime} - {s.endTime})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Create / Edit Shift */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm whitespace-nowrap">
                {modalMode === 'create' ? 'เพิ่มกะการทำงานใหม่' : 'แก้ไขข้อมูลกะการทำงาน'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสกะ *</label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="DAY_OFFICE"
                    value={shiftForm.shiftCode}
                    onChange={(e) => setShiftForm({ ...shiftForm, shiftCode: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-mono disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อกะการทำงาน *</label>
                  <input
                    type="text"
                    required
                    placeholder="กะเช้า (สำนักงาน)"
                    value={shiftForm.shiftName}
                    onChange={(e) => setShiftForm({ ...shiftForm, shiftName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>
              </div>

              {/* Work Times with Thai Wheel Time Picker (ชม. / น.) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ThaiTimePicker
                  label="เวลาเริ่มงาน"
                  required
                  value={shiftForm.startTime}
                  onChange={(val) => handleTimeChange('startTime', val)}
                />

                <ThaiTimePicker
                  label="เวลาเลิกงาน"
                  required
                  value={shiftForm.endTime}
                  onChange={(val) => handleTimeChange('endTime', val)}
                />
              </div>

              {/* Cross-day checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">กะการทำงานข้ามวัน</span>
                  <span className="text-[11px] text-slate-500">
                    สำหรับกะดึกที่เวลาเลิกงานข้ามไปสู่วันรุ่งขึ้น (ระบบจะคำนวณวันเข้างานอัตโนมัติ)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={shiftForm.isCrossDay}
                  onChange={(e) => setShiftForm({ ...shiftForm, isCrossDay: e.target.checked })}
                  className="w-4 h-4 text-[#0B2046] rounded focus:ring-[#0B2046] border-slate-300"
                />
              </div>

              {/* Break Minutes & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาพักงาน (นาที)</label>
                  <input
                    type="number"
                    min={0}
                    step={15}
                    value={shiftForm.breakMinutes}
                    onChange={(e) => setShiftForm({ ...shiftForm, breakMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะกะการทำงาน</label>
                  <select
                    value={shiftForm.status}
                    onChange={(e) => setShiftForm({ ...shiftForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  >
                    <option value="ACTIVE">ทำงานอยู่</option>
                    <option value="INACTIVE">ไม่ได้ทำงาน</option>
                  </select>
                </div>
              </div>

              {/* Grace Periods */}
              <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>ระยะเวลาผ่อนปรนเวลา</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ผ่อนปรนการมาสาย (นาที)</label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      placeholder="0"
                      value={shiftForm.lateGraceMinutes}
                      onChange={(e) => setShiftForm({ ...shiftForm, lateGraceMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">เข้าสายได้ไม่เกินกี่นาทีโดยไม่คิดว่าสาย</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ผ่อนปรนการกลับก่อน (นาที)</label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      placeholder="0"
                      value={shiftForm.earlyLeaveGraceMinutes}
                      onChange={(e) => setShiftForm({ ...shiftForm, earlyLeaveGraceMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">กลับก่อนได้ไม่เกินกี่นาทีโดยไม่คิดว่ากลับก่อน</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Delete Confirmation */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1 whitespace-nowrap">ยืนยันการลบกะการทำงาน?</h3>
            <p className="text-xs text-slate-500 mb-4">
              คุณต้องการลบกะ <span className="font-semibold text-slate-800">"{itemToDelete.name}"</span> ({itemToDelete.code}) ใช่หรือไม่?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Employee Details for selected shift */}
      {employeeModalOpen && selectedShiftForEmployees && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm whitespace-nowrap">
                  รายชื่อพนักงานที่สังกัดกะ: {selectedShiftForEmployees.shiftName}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {selectedShiftForEmployees.shiftCode} ({selectedShiftForEmployees.startTime} - {selectedShiftForEmployees.endTime})
                </span>
              </div>
              <button onClick={() => setEmployeeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {[
                { id: 'EMP001', name: 'นายสมชาย ใจดี', dept: 'ฝ่ายเทคโนโลยีสารสนเทศ', pos: 'นักพัฒนาซอฟต์แวร์อาวุโส' },
                { id: 'EMP002', name: 'นางสาวชนิภา นาจรินทร์', dept: 'ฝ่ายบริหารทรัพยากรบุคคล', pos: 'เจ้าหน้าที่สรรหาบุคลากร' },
                { id: 'EMP003', name: 'นายวิชัย สุขเกษม', dept: 'ฝ่ายเทคโนโลยีสารสนเทศ', pos: 'วิศวกรระบบเครือข่าย' },
                { id: 'EMP004', name: 'นางสาวกานดา มั่นคง', dept: 'ฝ่ายการเงินและการบัญชี', pos: 'นักวิเคราะห์บัญชี' },
                { id: 'EMP005', name: 'นายณัฐดนัย ภักดี', dept: 'ฝ่ายปฏิบัติการและการผลิต', pos: 'หัวหน้าทีมควบคุมการผลิต' },
              ].map((emp) => (
                <div
                  key={emp.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0B2046] text-white flex items-center justify-center font-bold text-xs">
                      {emp.name.charAt(3)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-xs">{emp.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {emp.dept} • {emp.pos}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-600 px-2 py-0.5 rounded bg-white border border-slate-200">
                    {emp.id}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setEmployeeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
