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
  GitMerge,
  ArrowLeftRight,
  Compass,
  Calendar,
  AlertCircle,
  Sparkles,
  ShieldCheck,
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
  ApprovalDelegation,
  CreateApprovalDelegationPayload,
  UpdateApprovalDelegationPayload,
  DOCUMENT_TYPE_LABELS,
  APPROVER_TYPE_LABELS,
} from '@/types/approval';
import { Department, EmployeeLevel } from '@/types/organization';
import { Employee } from '@/types/employee';
import { RoleSummary } from '@/types/settings';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ApprovalDelegationModal } from './ApprovalDelegationModal';
import { WorkflowSimulatorView } from './WorkflowSimulatorView';

type SubTab = 'flows' | 'delegations' | 'simulator';

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

// ตัวช่วยแสดงชื่อผู้อนุมัติตามประเภท (Pure Thai - Rule #10)
const getApproverDisplay = (step: ApprovalStep | ApprovalStepInput, employees: Employee[], roles: RoleSummary[]) => {
  switch (step.approverType) {
    case 'MANAGER':
      return 'หัวหน้างานโดยตรง';
    case 'DEPARTMENT_HEAD':
      return 'หัวหน้าแผนก';
    case 'DIVISION_HEAD':
      return 'หัวหน้าฝ่าย';
    case 'HR':
      return 'ฝ่ายทรัพยากรบุคคล';
    case 'CEO':
      return 'ผู้บริหารสูงสุด';
    case 'ROLE': {
      if ('approverRoleName' in step && step.approverRoleName) return step.approverRoleName;
      const foundRole = roles.find((r) => r.id === step.approverRoleId);
      return foundRole ? foundRole.roleName : 'ระบุตามบทบาท';
    }
    case 'EMPLOYEE': {
      if ('approverEmployeeName' in step && step.approverEmployeeName) return step.approverEmployeeName;
      const foundEmp = employees.find((e) => e.id === step.approverEmployeeId);
      return foundEmp ? `${foundEmp.firstName} ${foundEmp.lastName}` : 'ระบุตัวบุคคล';
    }
    default:
      return APPROVER_TYPE_LABELS[step.approverType] ?? step.approverType;
  }
};

const formatDateThai = (d?: string | null) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d;
  }
};

const emptyStep = (stepNo: number): ApprovalStepInput => ({
  stepNo,
  approverType: 'MANAGER',
  approverEmployeeId: null,
  approverRoleId: null,
  isRequired: true,
});

export const ApprovalFlowsTab: React.FC = () => {
  const { success, error } = useToast();

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('flows');

  // === Reference Data ===
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<EmployeeLevel[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);

  // === Tab 1: Flows Data ===
  const [flows, setFlows] = useState<ApprovalFlow[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Drawer Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ApprovalFlow | null>(null);
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Flow Form State
  const [form, setForm] = useState<CreateApprovalFlowPayload>({
    flowCode: '',
    flowName: '',
    documentType: 'LEAVE_REQUEST',
    departmentId: null,
    levelId: null,
    status: 'ACTIVE',
    steps: [emptyStep(1)],
  });

  // === Tab 2: Delegations Data ===
  const [delegations, setDelegations] = useState<ApprovalDelegation[]>([]);
  const [loadingDelegations, setLoadingDelegations] = useState(false);
  const [delegationSearch, setDelegationSearch] = useState('');
  const [delegationDocFilter, setDelegationDocFilter] = useState('');
  const [delegationStatusFilter, setDelegationStatusFilter] = useState('');
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [editingDelegation, setEditingDelegation] = useState<ApprovalDelegation | null>(null);

  // Common Confirm Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
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

  // 1. Load Reference Data
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [deptRes, levelRes, empRes, rolesRes] = await Promise.allSettled([
          organizationService.getDepartments(),
          organizationService.getLevels(),
          employeeService.getAll(),
          settingsService.getAllRoles(),
        ]);
        if (deptRes.status === 'fulfilled') setDepartments(deptRes.value);
        if (levelRes.status === 'fulfilled') setLevels(levelRes.value);
        if (empRes.status === 'fulfilled') setEmployees(empRes.value || []);
        if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value);
      } catch (e) {
        console.error('Failed to load reference data', e);
      }
    };
    loadRefs();
  }, []);

  // 2. Load Flows
  const loadFlows = useCallback(async () => {
    try {
      setLoadingFlows(true);
      const res = await approvalService.getFlows();
      setFlows(res);
    } catch (err: any) {
      console.error('Failed to load flows', err);
      error(err?.response?.data?.message || err.message || 'ไม่สามารถโหลดข้อมูลสายการอนุมัติได้');
    } finally {
      setLoadingFlows(false);
    }
  }, [error]);

  // 3. Load Delegations
  const loadDelegations = useCallback(async () => {
    try {
      setLoadingDelegations(true);
      const res = await approvalService.getDelegations();
      setDelegations(res);
    } catch (err: any) {
      console.error('Failed to load delegations', err);
      error(err?.response?.data?.message || err.message || 'ไม่สามารถโหลดข้อมูลการมอบอำนาจได้');
    } finally {
      setLoadingDelegations(false);
    }
  }, [error]);

  useEffect(() => {
    loadFlows();
    loadDelegations();
  }, [loadFlows, loadDelegations]);

  // Filtered Flows
  const filteredFlows = useMemo(() => {
    return flows.filter((f) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = f.flowName.toLowerCase().includes(term);
        const matchCode = f.flowCode.toLowerCase().includes(term);
        if (!matchName && !matchCode) return false;
      }
      if (docTypeFilter && f.documentType !== docTypeFilter) return false;
      if (deptFilter && String(f.departmentId) !== deptFilter) return false;
      if (statusFilter && f.status !== statusFilter) return false;
      return true;
    });
  }, [flows, searchTerm, docTypeFilter, deptFilter, statusFilter]);

  // Filtered Delegations
  const filteredDelegations = useMemo(() => {
    return delegations.filter((d) => {
      if (delegationSearch.trim()) {
        const term = delegationSearch.toLowerCase();
        const matchDelegator =
          d.delegatorEmployeeName.toLowerCase().includes(term) ||
          d.delegatorEmployeeCode.toLowerCase().includes(term);
        const matchDelegate =
          d.delegateEmployeeName.toLowerCase().includes(term) ||
          d.delegateEmployeeCode.toLowerCase().includes(term);
        if (!matchDelegator && !matchDelegate) return false;
      }
      if (delegationDocFilter && d.documentType !== delegationDocFilter) return false;
      if (delegationStatusFilter) {
        if (delegationStatusFilter === 'ACTIVE_NOW' && !d.isActiveNow) return false;
        if (delegationStatusFilter === 'INACTIVE' && d.status !== 'INACTIVE') return false;
      }
      return true;
    });
  }, [delegations, delegationSearch, delegationDocFilter, delegationStatusFilter]);

  // Quick Toggle Status for Flow
  const handleToggleStatus = async (flow: ApprovalFlow) => {
    const nextStatus = flow.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setTogglingId(flow.id);
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

  // Open Create Flow Editor
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

  // Open Edit Flow Editor
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

  // Preset Template Applicator
  const applyPreset = (presetType: 'TWO_TIER' | 'THREE_TIER' | 'DIRECT_HR') => {
    if (presetType === 'TWO_TIER') {
      setForm((f) => ({
        ...f,
        steps: [
          { stepNo: 1, approverType: 'MANAGER', approverEmployeeId: null, approverRoleId: null, isRequired: true },
          { stepNo: 2, approverType: 'HR', approverEmployeeId: null, approverRoleId: null, isRequired: true },
        ],
      }));
      success('ปรับใช้แม่แบบ 2 ลำดับขั้นสำเร็จ');
    } else if (presetType === 'THREE_TIER') {
      setForm((f) => ({
        ...f,
        steps: [
          { stepNo: 1, approverType: 'MANAGER', approverEmployeeId: null, approverRoleId: null, isRequired: true },
          { stepNo: 2, approverType: 'DEPARTMENT_HEAD', approverEmployeeId: null, approverRoleId: null, isRequired: true },
          { stepNo: 3, approverType: 'CEO', approverEmployeeId: null, approverRoleId: null, isRequired: true },
        ],
      }));
      success('ปรับใช้แม่แบบ 3 ลำดับขั้นสำเร็จ');
    } else if (presetType === 'DIRECT_HR') {
      setForm((f) => ({
        ...f,
        steps: [
          { stepNo: 1, approverType: 'HR', approverEmployeeId: null, approverRoleId: null, isRequired: true },
        ],
      }));
      success('ปรับใช้แม่แบบฝ่ายทรัพยากรบุคคลโดยตรงสำเร็จ');
    }
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
        error(`ขั้นตอนที่ ${step.stepNo}: กรุณาเลือกพนักงานผู้มีอำนาจอนุมัติ`);
        return;
      }
      if (step.approverType === 'ROLE' && !step.approverRoleId) {
        error(`ขั้นตอนที่ ${step.stepNo}: กรุณาเลือกบทบาทผู้มีอำนาจอนุมัติ`);
        return;
      }
    }

    try {
      setIsSavingFlow(true);
      if (editingFlow) {
        await approvalService.updateFlow(editingFlow.id, {
          flowName: form.flowName,
          documentType: form.documentType,
          departmentId: form.departmentId,
          levelId: form.levelId,
          status: form.status,
          steps: form.steps,
        });
        success('บันทึกการแก้ไขสายการอนุมัติสำเร็จ');
      } else {
        await approvalService.createFlow(form);
        success('สร้างสายการอนุมัติสำเร็จ');
      }
      closeEditor();
      loadFlows();
    } catch (err: any) {
      error(err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSavingFlow(false);
    }
  };

  const handleDeleteFlow = (flow: ApprovalFlow) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'ยืนยันการลบสายการอนุมัติ',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบสายการอนุมัติ "${flow.flowName}" (${flow.flowCode})? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      onConfirm: async () => {
        try {
          await approvalService.deleteFlow(flow.id);
          success('ลบสายการอนุมัติสำเร็จ');
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
          loadFlows();
        } catch (err: any) {
          error(err?.response?.data?.message || 'ไม่สามารถลบสายการอนุมัติได้');
        }
      },
    });
  };

  // Delegation Actions
  const handleOpenCreateDelegation = () => {
    setEditingDelegation(null);
    setIsDelegationModalOpen(true);
  };

  const handleOpenEditDelegation = (delegation: ApprovalDelegation) => {
    setEditingDelegation(delegation);
    setIsDelegationModalOpen(true);
  };

  const handleSaveDelegation = async (payload: CreateApprovalDelegationPayload | UpdateApprovalDelegationPayload) => {
    if (editingDelegation) {
      await approvalService.updateDelegation(editingDelegation.id, payload as UpdateApprovalDelegationPayload);
      success('แก้ไขการมอบอำนาจอนุมัติแทนสำเร็จ');
    } else {
      await approvalService.createDelegation(payload as CreateApprovalDelegationPayload);
      success('เพิ่มการมอบอำนาจอนุมัติแทนสำเร็จ');
    }
    loadDelegations();
  };

  const handleDeleteDelegation = (delegation: ApprovalDelegation) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'ยืนยันการยกเลิกการมอบอำนาจ',
      message: `คุณต้องการลบหรือยกเลิกการมอบอำนาจจาก ${delegation.delegatorEmployeeName} ให้แก่ ${delegation.delegateEmployeeName} ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          await approvalService.deleteDelegation(delegation.id);
          success('ลบการมอบอำนาจสำเร็จ');
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
          loadDelegations();
        } catch (err: any) {
          error(err?.response?.data?.message || 'ไม่สามารถลบการมอบอำนาจได้');
        }
      },
    });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Sub-Tab Switcher Pills (Rule #10 Pure Thai) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('flows')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'flows'
              ? 'bg-white text-[#0B2046] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <GitMerge className="w-4 h-4 text-[#0B2046]" />
          <span>ผังสายการอนุมัติ</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {flows.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('delegations')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'delegations'
              ? 'bg-white text-[#0B2046] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-[#0B2046]" />
          <span>การมอบอำนาจอนุมัติแทน</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {delegations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('simulator')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'simulator'
              ? 'bg-white text-[#0B2046] shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Compass className="w-4 h-4 text-[#0B2046]" />
          <span>ทดสอบจำลองสายการอนุมัติ</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: ผังสายการอนุมัติ (Workflow Templates) */}
      {/* ========================================================================= */}
      {activeSubTab === 'flows' && (
        <div className="space-y-6">
          {/* Top Filter & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
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

              {/* Doc Type Filter */}
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

              {/* Dept Filter */}
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
                  <option value="INACTIVE">ปิดใช้งาน</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Add Flow Button */}
            <button
              type="button"
              onClick={openCreateEditor}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-sm font-medium transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> เพิ่มสายการอนุมัติ
            </button>
          </div>

          {/* Flows Cards List */}
          {loadingFlows ? (
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
                    {/* Header */}
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

                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Step Sequence Visualization */}
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
                                <div className="flex items-center gap-3 bg-slate-50/90 border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-2xs">
                                  <div className="w-5 h-5 rounded-full bg-[#0B2046] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                    {step.stepNo}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate">
                                      {getApproverDisplay(step, employees, roles)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                      {step.isRequired ? 'จำเป็นต้องอนุมัติ' : 'ผ่านโดยไม่มีก็ได้'}
                                    </div>
                                  </div>
                                </div>

                                {idx < arr.length - 1 && (
                                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                                )}
                              </React.Fragment>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                      <div className="text-xs text-slate-400 italic">
                        * ลำดับการอนุมัติจะดำเนินตามลูกศรชี้อ้างอิงจากซ้ายไปขวา
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Toggle Status */}
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
                            {flow.status === 'ACTIVE' ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                          </span>
                        </div>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditEditor(flow)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>แก้ไข</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFlow(flow)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: การมอบอำนาจอนุมัติแทน (Approval Delegation Hub) */}
      {/* ========================================================================= */}
      {activeSubTab === 'delegations' && (
        <div className="space-y-6">
          {/* Top Filter & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรือรหัสพนักงาน..."
                  value={delegationSearch}
                  onChange={(e) => setDelegationSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Doc Type Filter */}
              <div className="relative">
                <select
                  value={delegationDocFilter}
                  onChange={(e) => setDelegationDocFilter(e.target.value)}
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

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={delegationStatusFilter}
                  onChange={(e) => setDelegationStatusFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 appearance-none cursor-pointer"
                >
                  <option value="">สถานะทั้งหมด</option>
                  <option value="ACTIVE_NOW">กำลังมีผลในปัจจุบัน</option>
                  <option value="INACTIVE">ปิดใช้งาน</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Add Delegation Button */}
            <button
              type="button"
              onClick={handleOpenCreateDelegation}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-sm font-medium transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> เพิ่มการมอบอำนาจอนุมัติแทน
            </button>
          </div>

          {/* Delegations Table */}
          {loadingDelegations ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 shadow-xs">
              <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> กำลังโหลดข้อมูลการมอบอำนาจ...
            </div>
          ) : filteredDelegations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 shadow-xs">
              ยังไม่มีประวัติการมอบอำนาจอนุมัติแทนในระบบ
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">ผู้มอบอำนาจ (เจ้าของสิทธิ์)</th>
                      <th className="px-5 py-3.5">ผู้รับมอบอำนาจแทน</th>
                      <th className="px-5 py-3.5">ประเภทเอกสาร</th>
                      <th className="px-5 py-3.5">ช่วงวันที่มีผล</th>
                      <th className="px-5 py-3.5 text-center">สถานะ</th>
                      <th className="px-5 py-3.5 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDelegations.map((d) => {
                      const isExpired = new Date(d.endDate) < new Date(new Date().toDateString());
                      const isPending = new Date(d.startDate) > new Date();

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Delegator */}
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-800">{d.delegatorEmployeeName}</div>
                            <div className="text-[11px] text-slate-400">
                              {d.delegatorEmployeeCode} • {d.delegatorPosition || 'ไม่ระบุตำแหน่ง'}
                            </div>
                          </td>

                          {/* Delegate */}
                          <td className="px-5 py-4">
                            <div className="font-bold text-[#0B2046] flex items-center gap-1.5">
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{d.delegateEmployeeName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 pl-5">
                              {d.delegateEmployeeCode} • {d.delegatePosition || 'ไม่ระบุตำแหน่ง'}
                            </div>
                          </td>

                          {/* Document Type */}
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {d.documentTypeLabel}
                            </span>
                          </td>

                          {/* Dates */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {formatDateThai(d.startDate)} - {formatDateThai(d.endDate)}
                              </span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-4 text-center">
                            {d.status === 'INACTIVE' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                ปิดใช้งาน
                              </span>
                            ) : d.isActiveNow ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                กำลังมีผล
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                รอถึงกำหนด
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600 border border-rose-200">
                                สิ้นสุดแล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                ปกติ
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditDelegation(d)}
                                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="แก้ไขข้อมูล"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDelegation(d)}
                                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="ลบการมอบอำนาจ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: ทดสอบจำลองสายการอนุมัติ (Workflow Simulator) */}
      {/* ========================================================================= */}
      {activeSubTab === 'simulator' && (
        <WorkflowSimulatorView employees={employees} />
      )}

      {/* ========================================================================= */}
      {/* Slide-Over Drawer สำหรับสร้าง / แก้ไข สายการอนุมัติ (Visual Builder) */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={closeEditor}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {editingFlow ? 'แก้ไขสายการอนุมัติ' : 'เพิ่มสายการอนุมัติใหม่'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดลำดับขั้นตอนและผู้มีสิทธิ์อนุมัติเอกสารในระบบ
                  </p>
                </div>
                <button
                  onClick={closeEditor}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Quick Presets (แม่แบบสายการอนุมัติสำเร็จรูป) */}
                {!editingFlow && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>แม่แบบสายการอนุมัติสำเร็จรูป (เลือกเพื่อสร้างขั้นตอนรวดเร็ว)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => applyPreset('TWO_TIER')}
                        className="p-2.5 bg-white border border-slate-200 hover:border-[#0B2046] hover:bg-slate-50/80 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
                      >
                        <div className="text-[11px] font-bold text-slate-800 group-hover:text-[#0B2046]">
                          สายอนุมัติ 2 ขั้นตอน
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          หัวหน้างานตรง ➔ ฝ่ายทรัพยากรบุคคล
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyPreset('THREE_TIER')}
                        className="p-2.5 bg-white border border-slate-200 hover:border-[#0B2046] hover:bg-slate-50/80 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
                      >
                        <div className="text-[11px] font-bold text-slate-800 group-hover:text-[#0B2046]">
                          สายอนุมัติ 3 ขั้นตอน
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          หัวหน้างาน ➔ หัวหน้าแผนก ➔ ผู้บริหารสูงสุด
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyPreset('DIRECT_HR')}
                        className="p-2.5 bg-white border border-slate-200 hover:border-[#0B2046] hover:bg-slate-50/80 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
                      >
                        <div className="text-[11px] font-bold text-slate-800 group-hover:text-[#0B2046]">
                          ฝ่ายบุคคลตรง
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ฝ่ายทรัพยากรบุคคลพิจารณาตรง
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Interactive Real-Time Visual Flow Preview */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-slate-200">
                      <GitMerge className="w-4 h-4 text-emerald-400" />
                      <span>ภาพจำลองเส้นทางการอนุมัติจริง</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      รวม {form.steps.length} ขั้นตอน
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {/* Start Node */}
                    <div className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-[11px] text-slate-300 shrink-0">
                      ผู้ยื่นคำขอ
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

                    {/* Steps Nodes */}
                    {form.steps.map((step, idx) => (
                      <React.Fragment key={idx}>
                        <div className="px-3 py-1.5 bg-slate-800/90 border border-emerald-500/40 rounded-xl text-[11px] text-white shrink-0 flex items-center gap-1.5 shadow-2xs">
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                            {step.stepNo}
                          </span>
                          <span className="font-medium truncate max-w-[130px]">
                            {getApproverDisplay(step, employees, roles)}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      </React.Fragment>
                    ))}

                    {/* End Node */}
                    <div className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-[11px] text-emerald-300 font-bold shrink-0">
                      อนุมัติสำเร็จ
                    </div>
                  </div>
                </div>

                {/* 3. General Form Fields */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    ข้อมูลทั่วไป
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        รหัสสายการอนุมัติ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!!editingFlow}
                        value={form.flowCode}
                        onChange={(e) => setForm({ ...form, flowCode: e.target.value.toUpperCase() })}
                        placeholder="เช่น FL-LEAVE-01"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ประเภทเอกสาร <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={form.documentType}
                        onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none cursor-pointer"
                      >
                        {DOCUMENT_TYPE_OPTIONS.map((dt) => (
                          <option key={dt} value={dt}>
                            {DOCUMENT_TYPE_LABELS[dt]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ชื่อสายการอนุมัติ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.flowName}
                      onChange={(e) => setForm({ ...form, flowName: e.target.value })}
                      placeholder="เช่น สายอนุมัติการลาทั่วไป - พนักงานประจำ"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        แผนกที่บังคับใช้
                      </label>
                      <select
                        value={form.departmentId ?? ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            departmentId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none cursor-pointer"
                      >
                        <option value="">ทุกแผนก (ใช้ร่วมกัน)</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.departmentName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ระดับตำแหน่งที่บังคับใช้
                      </label>
                      <select
                        value={form.levelId ?? ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            levelId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none cursor-pointer"
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

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      สถานะการใช้งาน
                    </label>
                    <div className="flex gap-4 items-center pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="flowStatus"
                          value="ACTIVE"
                          checked={form.status === 'ACTIVE'}
                          onChange={() => setForm({ ...form, status: 'ACTIVE' })}
                          className="text-[#0B2046] focus:ring-[#0B2046]"
                        />
                        <span className="text-slate-700">เปิดใช้งาน</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="flowStatus"
                          value="INACTIVE"
                          checked={form.status === 'INACTIVE'}
                          onChange={() => setForm({ ...form, status: 'INACTIVE' })}
                          className="text-[#0B2046] focus:ring-[#0B2046]"
                        />
                        <span className="text-slate-700">ปิดการใช้งาน</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. Form Steps Builder */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        ลำดับขั้นตอนการอนุมัติ ({form.steps.length} ขั้นตอน)
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ระบบจะส่งคำขอตามลำดับ 1 → 2 → 3 เมื่อขั้นตอนก่อนหน้าอนุมัติผ่าน
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addStep}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มขั้นตอน
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#0B2046] text-white text-[11px] font-bold flex items-center justify-center">
                              {step.stepNo}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              ลำดับที่ {step.stepNo}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Reorder Buttons */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveStep(idx, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                              title="ย้ายขึ้น"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === form.steps.length - 1}
                              onClick={() => moveStep(idx, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                              title="ย้ายลง"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Remove Button */}
                            {form.steps.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeStep(idx)}
                                className="w-6 h-6 rounded flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer ml-1"
                                title="ลบขั้นตอนนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Approver Type Selection */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              ประเภทผู้อนุมัติ
                            </label>
                            <select
                              value={step.approverType}
                              onChange={(e) => {
                                updateStep(idx, {
                                  approverType: e.target.value,
                                  approverEmployeeId: null,
                                  approverRoleId: null,
                                });
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2046] focus:outline-none cursor-pointer"
                            >
                              {APPROVER_TYPE_OPTIONS.map((at) => (
                                <option key={at} value={at}>
                                  {APPROVER_TYPE_LABELS[at]}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              ความจำเป็นในการอนุมัติ
                            </label>
                            <div className="flex items-center gap-2 pt-1.5">
                              <input
                                type="checkbox"
                                id={`req-${idx}`}
                                checked={step.isRequired}
                                onChange={(e) => updateStep(idx, { isRequired: e.target.checked })}
                                className="rounded text-[#0B2046] focus:ring-[#0B2046]"
                              />
                              <label
                                htmlFor={`req-${idx}`}
                                className="text-xs text-slate-700 cursor-pointer select-none"
                              >
                                จำเป็นต้องอนุมัติ
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Extra selector when ApproverType is EMPLOYEE */}
                        {step.approverType === 'EMPLOYEE' && (
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              เลือกพนักงานผู้มีอำนาจอนุมัติ <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={step.approverEmployeeId ?? ''}
                              onChange={(e) =>
                                updateStep(idx, {
                                  approverEmployeeId: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2046] focus:outline-none cursor-pointer"
                            >
                              <option value="">-- กรุณาเลือกพนักงาน --</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.employeeCode} - {emp.firstName} {emp.lastName}{' '}
                                  {emp.positionName ? `(${emp.positionName})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Extra selector when ApproverType is ROLE */}
                        {step.approverType === 'ROLE' && (
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              เลือกบทบาทผู้มีสิทธิ์อนุมัติ <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={step.approverRoleId ?? ''}
                              onChange={(e) =>
                                updateStep(idx, {
                                  approverRoleId: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2046] focus:outline-none cursor-pointer"
                            >
                              <option value="">-- กรุณาเลือกบทบาท --</option>
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.roleName} ({r.roleCode})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={isSavingFlow}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveFlow}
                  disabled={isSavingFlow}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-[#0B2046] hover:bg-[#0B2046]/90 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingFlow && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingFlow ? 'บันทึกการแก้ไข' : 'สร้างสายการอนุมัติ'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Delegation Modal */}
      {/* ========================================================================= */}
      <ApprovalDelegationModal
        isOpen={isDelegationModalOpen}
        onClose={() => {
          setIsDelegationModalOpen(false);
          setEditingDelegation(null);
        }}
        onSave={handleSaveDelegation}
        editingDelegation={editingDelegation}
        employees={employees}
      />

      {/* ========================================================================= */}
      {/* Common Confirm Modal */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        type="danger"
        confirmText="ยืนยันการลบ"
        cancelText="ยกเลิก"
      />
    </div>
  );
};
