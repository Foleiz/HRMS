'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { approvalService } from '@/services/approvalService';
import { organizationService } from '@/services/organizationService';
import { employeeService } from '@/services/employeeService';
import { settingsService } from '@/services/settingsService';
import {
  ApprovalFlow,
  ApprovalStep,
  ApprovalStepInput,
  CreateApprovalFlowPayload,
  DOCUMENT_TYPE_LABELS,
  APPROVER_TYPE_LABELS,
} from '@/types/approval';
import { Department, EmployeeLevel } from '@/types/organization';
import { Employee } from '@/types/employee';
import { RoleSummary } from '@/types/settings';
import { ApprovalNavTabs } from '@/components/approvals/ApprovalNavTabs';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const DOCUMENT_TYPE_OPTIONS = Object.keys(DOCUMENT_TYPE_LABELS);
const APPROVER_TYPE_OPTIONS = Object.keys(APPROVER_TYPE_LABELS);

// ตัวช่วยป้ายชื่อประเภทเอกสารและโทนสี
const getDocTypeBadge = (docType: string) => {
  switch (docType) {
    case 'LEAVE_REQUEST':
      return { label: 'คำขอลา', color: 'bg-blue-50 text-blue-600 border-blue-200' };
    case 'ATTENDANCE_ADJUSTMENT':
      return { label: 'ปรับเวลาเข้า-ออก', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    case 'RESIGNATION_REQUEST':
      return { label: 'คำขอลาออก', color: 'bg-rose-50 text-rose-600 border-rose-200' };
    case 'CERTIFICATE_REQUEST':
      return { label: 'ขอหนังสือรับรอง', color: 'bg-amber-50 text-amber-600 border-amber-200' };
    case 'EMPLOYMENT_CONTRACT':
      return { label: 'สัญญาจ้างงาน', color: 'bg-purple-50 text-purple-600 border-purple-200' };
    case 'PAYROLL_PERIOD':
      return { label: 'รอบเงินเดือน', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
    default:
      return { label: DOCUMENT_TYPE_LABELS[docType] ?? docType, color: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
};

// ตัวช่วยแสดงชื่อผู้อนุมัติตามประเภท
const getApproverDisplay = (step: ApprovalStep) => {
  switch (step.approverType) {
    case 'MANAGER':
      return 'หัวหน้างานโดยตรง (Direct Manager)';
    case 'DEPARTMENT_HEAD':
      return 'ผู้จัดการแผนก (Department Head)';
    case 'DIVISION_HEAD':
      return 'หัวหน้าฝ่าย (Division Head)';
    case 'HR':
      return 'ฝ่ายบุคคล (HR Administrator)';
    case 'CEO':
      return 'ประธานเจ้าหน้าที่บริหาร (CEO)';
    case 'ROLE':
      return step.approverRoleName ? step.approverRoleName : 'ระบุตามบทบาท';
    case 'EMPLOYEE':
      return step.approverEmployeeName ? step.approverEmployeeName : 'ระบุตัวบุคคล';
    default:
      return APPROVER_TYPE_LABELS[step.approverType] ?? step.approverType;
  }
};

const emptyStep = (stepNo: number): ApprovalStepInput => ({
  stepNo,
  approverType: 'MANAGER',
  approverEmployeeId: null,
  approverRoleId: null,
  isRequired: true,
});

export default function ApprovalFlowsPage() {
  const { success, error } = useToast();

  // === Reference Data ===
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<EmployeeLevel[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);

  useEffect(() => {
    organizationService.getDepartments().then(setDepartments).catch(() => {});
    organizationService.getLevels().then(setLevels).catch(() => {});
    employeeService.getAll().then(setEmployees).catch(() => {});
    settingsService.getAllRoles().then(setRoles).catch(() => {});
  }, []);

  // === Flows State ===
  const [flows, setFlows] = useState<ApprovalFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // === Filters ===
  const [searchTerm, setSearchTerm] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // === Flow Editor Drawer / Modal ===
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ApprovalFlow | null>(null);
  const [isSavingFlow, setIsSavingFlow] = useState(false);

  const [form, setForm] = useState<CreateApprovalFlowPayload>({
    flowCode: '',
    flowName: '',
    documentType: 'LEAVE_REQUEST',
    departmentId: null,
    levelId: null,
    status: 'ACTIVE',
    steps: [emptyStep(1)],
  });

  // === Delete Confirm Dialog ===
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Fetch flows from backend
  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await approvalService.getFlows();
      setFlows(data);
    } catch (err: any) {
      error(err.message || 'ไม่สามารถโหลดรายการสายการอนุมัติได้');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  // Client-side filtering
  const filteredFlows = useMemo(() => {
    return flows.filter((f) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = f.flowName.toLowerCase().includes(q);
        const matchCode = f.flowCode.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      if (docTypeFilter && f.documentType !== docTypeFilter) {
        return false;
      }
      if (deptFilter && f.departmentId !== Number(deptFilter)) {
        return false;
      }
      if (statusFilter && f.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [flows, searchTerm, docTypeFilter, deptFilter, statusFilter]);

  // Toggle status directly
  const handleToggleStatus = async (flow: ApprovalFlow) => {
    const nextStatus = flow.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setTogglingId(flow.id);
    try {
      await approvalService.updateFlow(flow.id, {
        flowName: flow.flowName,
        documentType: flow.documentType,
        departmentId: flow.departmentId,
        levelId: flow.levelId,
        status: nextStatus,
        steps: flow.steps.map((s) => ({
          stepNo: s.stepNo,
          approverType: s.approverType,
          approverEmployeeId: s.approverEmployeeId,
          approverRoleId: s.approverRoleId,
          isRequired: s.isRequired,
        })),
      });
      success(nextStatus === 'ACTIVE' ? `เปิดใช้งาน '${flow.flowName}' สำเร็จ` : `ปิดใช้งาน '${flow.flowName}' สำเร็จ`);
      loadFlows();
    } catch (err: any) {
      error(err?.response?.data?.message || err.message || 'ไม่สามารถเปลี่ยนสถานะสายการอนุมัติได้');
    } finally {
      setTogglingId(null);
    }
  };

  // Open Create Editor
  const openCreateEditor = () => {
    setEditingFlow(null);
    setForm({
      flowCode: '',
      flowName: '',
      documentType: 'LEAVE_REQUEST',
      departmentId: null,
      levelId: null,
      status: 'ACTIVE',
      steps: [emptyStep(1)],
    });
    setIsEditorOpen(true);
  };

  // Open Edit Editor
  const openEditEditor = (flow: ApprovalFlow) => {
    setEditingFlow(flow);
    setForm({
      flowCode: flow.flowCode,
      flowName: flow.flowName,
      documentType: flow.documentType,
      departmentId: flow.departmentId ?? null,
      levelId: flow.levelId ?? null,
      status: flow.status,
      steps: flow.steps
        .slice()
        .sort((a, b) => a.stepNo - b.stepNo)
        .map((s) => ({
          stepNo: s.stepNo,
          approverType: s.approverType,
          approverEmployeeId: s.approverEmployeeId,
          approverRoleId: s.approverRoleId,
          isRequired: s.isRequired,
        })),
    });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingFlow(null);
  };

  const renumberSteps = (steps: ApprovalStepInput[]): ApprovalStepInput[] =>
    steps.map((s, idx) => ({ ...s, stepNo: idx + 1 }));

  const addStep = () => {
    setForm((f) => ({ ...f, steps: renumberSteps([...f.steps, emptyStep(f.steps.length + 1)]) }));
  };

  const removeStep = (idx: number) => {
    setForm((f) => ({ ...f, steps: renumberSteps(f.steps.filter((_, i) => i !== idx)) }));
  };

  const moveStep = (idx: number, direction: -1 | 1) => {
    setForm((f) => {
      const target = idx + direction;
      if (target < 0 || target >= f.steps.length) return f;
      const copy = [...f.steps];
      const tmp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = tmp;
      return { ...f, steps: renumberSteps(copy) };
    });
  };

  const updateStep = (idx: number, patch: Partial<ApprovalStepInput>) => {
    setForm((f) => {
      const copy = [...f.steps];
      copy[idx] = { ...copy[idx], ...patch };
      return { ...f, steps: copy };
    });
  };

  const handleSaveFlow = async () => {
    if (!form.flowName.trim()) {
      error('กรุณาระบุชื่อสายการอนุมัติ');
      return;
    }
    if (!editingFlow && !form.flowCode.trim()) {
      error('กรุณาระบุรหัสสายการอนุมัติ');
      return;
    }
    if (!form.steps || form.steps.length === 0) {
      error('สายการอนุมัติต้องมีอย่างน้อย 1 ขั้นตอน');
      return;
    }

    for (const step of form.steps) {
      if (step.approverType === 'EMPLOYEE' && !step.approverEmployeeId) {
        error(`ขั้นตอนที่ ${step.stepNo}: กรุณาเลือกพนักงานผู้อนุมัติ`);
        return;
      }
      if (step.approverType === 'ROLE' && !step.approverRoleId) {
        error(`ขั้นตอนที่ ${step.stepNo}: กรุณาเลือกบทบาทผู้อนุมัติ`);
        return;
      }
    }

    setIsSavingFlow(true);
    try {
      if (editingFlow) {
        await approvalService.updateFlow(editingFlow.id, {
          flowName: form.flowName,
          documentType: form.documentType,
          departmentId: form.departmentId,
          levelId: form.levelId,
          status: form.status,
          steps: form.steps,
        });
        success('แก้ไขสายการอนุมัติสำเร็จ');
      } else {
        await approvalService.createFlow(form);
        success('สร้างสายการอนุมัติใหม่สำเร็จ');
      }
      closeEditor();
      loadFlows();
    } catch (err: any) {
      error(err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSavingFlow(false);
    }
  };

  const handleDeleteFlow = (flow: ApprovalFlow) => {
    setConfirmConfig({
      isOpen: true,
      title: 'ยืนยันการลบสายการอนุมัติ',
      message: `คุณต้องการลบสายการอนุมัติ '${flow.flowName}' (${flow.flowCode}) ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      onConfirm: async () => {
        try {
          await approvalService.deleteFlow(flow.id);
          success('ลบสายการอนุมัติสำเร็จ');
          setConfirmConfig((p) => ({ ...p, isOpen: false }));
          loadFlows();
        } catch (err: any) {
          error(err?.response?.data?.message || 'ไม่สามารถลบสายการอนุมัติได้');
        }
      },
    });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header & Navigation Sub-Tabs */}
      <ApprovalNavTabs currentSubTitle="สายการอนุมัติ" />

      {/* 2. Top Filter / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาสายการอนุมัติ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Document Type Filter */}
          <div className="relative">
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 appearance-none cursor-pointer"
            >
              <option value="">ประเภทเอกสารทั้งหมด</option>
              {DOCUMENT_TYPE_OPTIONS.map((dt) => (
                <option key={dt} value={dt}>
                  {DOCUMENT_TYPE_LABELS[dt]}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 appearance-none cursor-pointer"
            >
              <option value="">ทุกแผนก</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.departmentName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 appearance-none cursor-pointer"
            >
              <option value="">สถานะ: ทั้งหมด</option>
              <option value="ACTIVE">ใช้งานอยู่</option>
              <option value="INACTIVE">ไม่ได้ใช้งาน</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Add Flow Button */}
        <button
          onClick={openCreateEditor}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-sm font-medium transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> เพิ่มสายการอนุมัติ
        </button>
      </div>

      {/* 3. Cards List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> กำลังโหลดข้อมูลสายการอนุมัติ...
        </div>
      ) : filteredFlows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 shadow-xs">
          ยังไม่มีสายการอนุมัติในระบบ
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFlows.map((flow) => {
            const badge = getDocTypeBadge(flow.documentType);
            return (
              <div
                key={flow.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-800 text-base">{flow.flowName}</h3>
                      <span className="text-slate-400 text-xs font-normal">{flow.flowCode}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{flow.departmentName ?? 'ทุกแผนก'}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>{flow.levelName ?? 'ทุกระดับตำแหน่ง'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Document Type Badge */}
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Card Body - ลำดับขั้นตอนการอนุมัติ */}
                <div>
                  <div className="text-xs text-slate-400 font-medium mb-2.5">ลำดับขั้นตอนการอนุมัติ</div>
                  {flow.steps.length === 0 ? (
                    <div className="text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3">
                      ยังไม่มีขั้นตอนการอนุมัติ
                    </div>
                  ) : (
                    <div className="flex items-center flex-wrap gap-2.5">
                      {flow.steps
                        .slice()
                        .sort((a, b) => a.stepNo - b.stepNo)
                        .map((step, idx, arr) => (
                          <React.Fragment key={step.id}>
                            {/* Step Item Box */}
                            <div className="flex items-center gap-3 bg-slate-50/90 border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-2xs">
                              <div className="w-5 h-5 rounded-full bg-[#0B2046] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                {step.stepNo}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">
                                  {getApproverDisplay(step)}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  {step.isRequired ? 'จำเป็นต้องอนุมัติ' : 'ผ่านโดยไม่มีก็ได้'}
                                </div>
                              </div>
                            </div>

                            {/* Arrow Connector */}
                            {idx < arr.length - 1 && (
                              <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  <div className="text-xs text-slate-400 italic">
                    * ลำดับการอนุมัติจะดำเนินตามลูกศรชี้อ้างอิงจากซ้ายไปขวา
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Status Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(flow)}
                        disabled={togglingId === flow.id}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          flow.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            flow.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span
                        className={`text-xs font-medium cursor-pointer ${
                          flow.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                        onClick={() => handleToggleStatus(flow)}
                      >
                        {flow.status === 'ACTIVE' ? 'ใช้งานอยู่' : 'ไม่ได้ใช้งาน'}
                      </span>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditEditor(flow)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteFlow(flow)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Flow Editor Drawer / Slide-Over */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" onClick={closeEditor}>
          <div
            className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-slate-800">
                {editingFlow ? 'แก้ไขสายการอนุมัติ' : 'เพิ่มสายการอนุมัติ'}
              </h3>
              <button
                onClick={closeEditor}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">รหัสสายการอนุมัติ *</label>
                  <input
                    type="text"
                    disabled={!!editingFlow}
                    value={form.flowCode}
                    onChange={(e) => setForm((f) => ({ ...f, flowCode: e.target.value }))}
                    placeholder="เช่น FL-001"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">สถานะ</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30 cursor-pointer"
                  >
                    <option value="ACTIVE">ใช้งานอยู่</option>
                    <option value="INACTIVE">ไม่ได้ใช้งาน</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อสายการอนุมัติ *</label>
                <input
                  type="text"
                  value={form.flowName}
                  onChange={(e) => setForm((f) => ({ ...f, flowName: e.target.value }))}
                  placeholder="เช่น สายอนุมัติคำขอลาปกติ (ทุกระดับ)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">ประเภทเอกสาร *</label>
                <select
                  value={form.documentType}
                  onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30 cursor-pointer"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((dt) => (
                    <option key={dt} value={dt}>
                      {DOCUMENT_TYPE_LABELS[dt]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">เฉพาะแผนก (ไม่บังคับ)</label>
                  <select
                    value={form.departmentId ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30 cursor-pointer"
                  >
                    <option value="">ทุกแผนก</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">เฉพาะระดับพนักงาน (ไม่บังคับ)</label>
                  <select
                    value={form.levelId ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, levelId: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30 cursor-pointer"
                  >
                    <option value="">ทุกระดับตำแหน่ง</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.levelName} ({l.levelCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step Builder */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">ขั้นตอนการอนุมัติ (Approval Steps)</h4>
                    <p className="text-xs text-slate-400">ระบบจะส่งต่อการอนุมัติตามลำดับขั้น 1, 2, 3...</p>
                  </div>
                  <button
                    type="button"
                    onClick={addStep}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มขั้นตอน
                  </button>
                </div>

                <div className="space-y-3">
                  {form.steps.map((step, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-800">
                          <span className="w-5 h-5 rounded-full bg-[#0B2046] text-white flex items-center justify-center text-xs">
                            {step.stepNo}
                          </span>
                          ขั้นตอนที่ {step.stepNo}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveStep(idx, -1)}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                            title="เลื่อนขึ้น"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === form.steps.length - 1}
                            onClick={() => moveStep(idx, 1)}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                            title="เลื่อนลง"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          {form.steps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeStep(idx)}
                              className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                              title="ลบขั้นตอนนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">ประเภทผู้อนุมัติ *</label>
                        <select
                          value={step.approverType}
                          onChange={(e) =>
                            updateStep(idx, {
                              approverType: e.target.value,
                              approverEmployeeId: null,
                              approverRoleId: null,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30 bg-white cursor-pointer"
                        >
                          {APPROVER_TYPE_OPTIONS.map((at) => (
                            <option key={at} value={at}>
                              {APPROVER_TYPE_LABELS[at]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {step.approverType === 'EMPLOYEE' && (
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">เลือกพนักงานผู้อนุมัติ *</label>
                          <select
                            value={step.approverEmployeeId ?? ''}
                            onChange={(e) =>
                              updateStep(idx, {
                                approverEmployeeId: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30 bg-white cursor-pointer"
                          >
                            <option value="">-- เลือกพนักงาน --</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.fullName} ({emp.employeeCode})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {step.approverType === 'ROLE' && (
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">เลือกบทบาทผู้อนุมัติ *</label>
                          <select
                            value={step.approverRoleId ?? ''}
                            onChange={(e) =>
                              updateStep(idx, {
                                approverRoleId: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30 bg-white cursor-pointer"
                          >
                            <option value="">-- เลือกบทบาท --</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.roleName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={step.isRequired}
                          onChange={(e) => updateStep(idx, { isRequired: e.target.checked })}
                          className="rounded border-slate-300 text-[#0B2046] focus:ring-[#0B2046]"
                        />
                        <span>จำเป็นต้องอนุมัติ (ขั้นตอนบังคับ)</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white z-10">
              <button
                type="button"
                onClick={closeEditor}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveFlow}
                disabled={isSavingFlow}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-60 cursor-pointer shadow-xs"
              >
                {isSavingFlow && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type="danger"
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
