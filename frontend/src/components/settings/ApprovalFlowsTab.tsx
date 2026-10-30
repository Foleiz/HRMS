'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  GripVertical,
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
  APPROVER_SCOPE_LABELS,
  FALLBACK_ACTION_LABELS,
  DELEGATE_MODE_LABELS,
} from '@/types/approval';
import { Department, EmployeeLevel } from '@/types/organization';
import { Employee } from '@/types/employee';
import { RoleSummary } from '@/types/settings';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ActiveToggleRow, ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { Button } from '@/components/ui';


// ประเภทเอกสารที่เลือกได้ตอนสร้าง/แก้สายการอนุมัติ
// ไม่แสดง "คำขอย้ายแผนก/เลื่อนตำแหน่ง" — HR บันทึกการย้าย/เลื่อนตำแหน่งเอง (ไม่มีสายการอนุมัติ → มีผลทันที)
// ยังเก็บป้ายชื่อไว้ใน DOCUMENT_TYPE_LABELS เพื่อแสดงสายการอนุมัติเดิมที่มีอยู่แล้วได้ถูกต้อง
const HIDDEN_DOCUMENT_TYPES = new Set(['TRANSFER_REQUEST']);
// ลำดับการแสดงประเภทเอกสารในตัวเลือก (แสดงพร้อมเลขกำกับ) — ประเภทที่ไม่อยู่ในรายการนี้จะต่อท้าย
const DOCUMENT_TYPE_ORDER = [
  'LEAVE_REQUEST',
  'RESIGNATION_REQUEST',
  'GENERAL_REQUEST',
  'BENEFIT_CLAIM',
  'CERTIFICATE_REQUEST',
  'ATTENDANCE_ADJUSTMENT',
  'EMPLOYMENT_CONTRACT',
  'PAYROLL_PERIOD',
];
const DOCUMENT_TYPE_OPTIONS = [
  ...DOCUMENT_TYPE_ORDER.filter((t) => t in DOCUMENT_TYPE_LABELS),
  ...Object.keys(DOCUMENT_TYPE_LABELS).filter((t) => !DOCUMENT_TYPE_ORDER.includes(t)),
].filter((t) => !HIDDEN_DOCUMENT_TYPES.has(t));
/**
 * ประเภทผู้อนุมัติที่เลือกได้ — แบบ "ของผู้ยื่น" ระบบหาคนจากโครงสร้างองค์กรให้เอง จึงใช้สายเดียวได้ทุกแผนก
 */
const APPROVER_TYPE_OPTIONS = ['DEPARTMENT_HEAD', 'DIVISION_HEAD', 'MANAGER', 'ROLE', 'EMPLOYEE', 'HR', 'CEO'];
const APPROVER_TYPE_HINTS: Record<string, string> = {
  DEPARTMENT_HEAD: 'หัวหน้าแผนกของผู้ยื่นตามที่ตั้งไว้ในโครงสร้างองค์กร (รวมผู้มีบทบาทผู้จัดการแผนกในแผนกเดียวกัน)',
  DIVISION_HEAD: 'หัวหน้าฝ่ายของผู้ยื่นตามที่ตั้งไว้ในโครงสร้างองค์กร (รวมผู้มีบทบาทผู้จัดการฝ่ายในฝ่ายเดียวกัน)',
  MANAGER: 'หัวหน้าทีมของผู้ยื่นตามโครงสร้างทีมที่สังกัด',
  EMPLOYEE: 'พนักงานคนเดียวกันเสมอ ไม่ว่าใครเป็นผู้ยื่น',
  HR: 'ผู้มีบทบาทฝ่ายบุคคล',
  CEO: 'ผู้มีบทบาทผู้บริหารสูงสุด',
};
const APPROVER_SCOPE_HINTS: Record<string, string> = {
  ORG: 'ทุกคนที่มีบทบาทนี้ทั้งบริษัทจะเห็นและอนุมัติคำขอของทุกแผนกได้ — เหมาะกับบทบาทส่วนกลาง เช่น HR, การเงิน',
  DIVISION: 'เฉพาะผู้มีบทบาทนี้ที่อยู่ฝ่ายเดียวกับผู้ยื่น',
  DEPARTMENT: 'เฉพาะผู้มีบทบาทนี้ที่อยู่แผนกเดียวกับผู้ยื่น',
};

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
      return { label: DOCUMENT_TYPE_LABELS[docType] ?? docType, color: 'bg-slate-50 text-slate-600 dark:text-slate-400 border-slate-200' };
  }
};

// ตัวช่วยแสดงชื่อผู้อนุมัติตามประเภท (Pure Thai - Rule #10)
const getApproverDisplay = (step: ApprovalStep | ApprovalStepInput, employees: Employee[], roles: RoleSummary[]) => {
  switch (step.approverType) {
    case 'MANAGER':
      return 'หัวหน้าทีมของผู้ยื่น';
    case 'DEPARTMENT_HEAD':
      return 'หัวหน้าแผนกของผู้ยื่น';
    case 'DIVISION_HEAD':
      return 'หัวหน้าฝ่ายของผู้ยื่น';
    case 'HR':
      return 'ฝ่ายทรัพยากรบุคคล';
    case 'CEO':
      return 'ผู้บริหารสูงสุด';
    case 'ROLE': {
      const scope = step.approverScope && step.approverScope !== 'ORG' ? ` (${APPROVER_SCOPE_LABELS[step.approverScope]})` : '';
      if ('approverRoleName' in step && step.approverRoleName) return step.approverRoleName + scope;
      const foundRole = roles.find((r) => r.id === step.approverRoleId);
      return (foundRole ? foundRole.roleName : 'ระบุตามบทบาท') + scope;
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

const SELECT_CLS =
  'w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer';
const LABEL_CLS = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1';

/** จำนวนขั้นตอนอนุมัติสูงสุดของทุกสายการอนุมัติ (ต้องตรงกับ backend: ApprovalFlowService.MaxApprovalSteps) */
const MAX_APPROVAL_STEPS = 4;

const emptyStep = (stepNo: number): ApprovalStepInput => ({
  stepNo,
  approverType: 'DEPARTMENT_HEAD',
  approverEmployeeId: null,
  approverRoleId: null,
  isRequired: true,
  approverScope: 'ORG',
  fallbackAction: 'HR',
  delegateType: null,
  delegateEmployeeId: null,
  delegateRoleId: null,
  delegateScope: 'ORG',
  delegateMode: 'WHEN_ABSENT',
});

/** ข้อความสั้นของผู้อนุมัติแทน เช่น "แทน: นาย ก (เมื่อไม่อยู่)" */
const getDelegateDisplay = (step: ApprovalStep | ApprovalStepInput, employees: Employee[], roles: RoleSummary[]) => {
  if (!step.delegateType) return null;
  let who = '';
  if (step.delegateType === 'EMPLOYEE') {
    const name = 'delegateEmployeeName' in step ? step.delegateEmployeeName : null;
    const emp = employees.find((e) => e.id === step.delegateEmployeeId);
    who = name || (emp ? `${emp.firstName} ${emp.lastName}` : 'ระบุตัวบุคคล');
  } else {
    const name = 'delegateRoleName' in step ? step.delegateRoleName : null;
    const role = roles.find((r) => r.id === step.delegateRoleId);
    who = name || role?.roleName || 'ตามบทบาท';
    if (step.delegateScope && step.delegateScope !== 'ORG') who += ` (${APPROVER_SCOPE_LABELS[step.delegateScope]})`;
  }
  return `แทน: ${who}${step.delegateMode === 'ALWAYS' ? '' : ' (เมื่อไม่อยู่)'}`;
};

export const ApprovalFlowsTab: React.FC = () => {
  const { success, error } = useToast();

  // Active Sub-Tab

  // === Reference Data ===
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<EmployeeLevel[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);

  // === Flows Data ===
  const [flows, setFlows] = useState<ApprovalFlow[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Inline Editor State (จัดการที่รายการได้เลย ไม่ต้องมี Modal)
  const [editingFlowId, setEditingFlowId] = useState<number | 'NEW' | null>(null);
  const [editingFlow, setEditingFlow] = useState<ApprovalFlow | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Reference for step nodes to anchor the dropdown popover
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Drag and drop state for reordering steps
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Close step settings modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingStepIndex !== null) {
        setEditingStepIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingStepIndex]);

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

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

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
          approverScope: s.approverScope ?? 'ORG',
          fallbackAction: s.fallbackAction ?? 'HR',
          delegateType: s.delegateType ?? null,
          delegateEmployeeId: s.delegateEmployeeId ?? null,
          delegateRoleId: s.delegateRoleId ?? null,
          delegateScope: s.delegateScope ?? 'ORG',
          delegateMode: s.delegateMode ?? 'WHEN_ABSENT',
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

  // Open Create Flow Inline Editor
  const openCreateEditor = () => {
    setEditingFlowId('NEW');
    setEditingFlow(null);
    setEditingStepIndex(null);
    setForm({
      flowCode: '',
      flowName: '',
      documentType: 'LEAVE_REQUEST',
      departmentId: null,
      levelId: null,
      status: 'ACTIVE',
      steps: [emptyStep(1)],
    });
  };

  // Open Edit Flow Inline Editor
  const openEditEditor = (flow: ApprovalFlow) => {
    setEditingFlowId(flow.id);
    setEditingFlow(flow);
    setEditingStepIndex(null);
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
          approverScope: s.approverScope ?? 'ORG',
          fallbackAction: s.fallbackAction ?? 'HR',
          delegateType: s.delegateType ?? null,
          delegateEmployeeId: s.delegateEmployeeId ?? null,
          delegateRoleId: s.delegateRoleId ?? null,
          delegateScope: s.delegateScope ?? 'ORG',
          delegateMode: s.delegateMode ?? 'WHEN_ABSENT',
        })),
    });
  };

  const closeEditor = () => {
    setEditingFlowId(null);
    setEditingFlow(null);
    setEditingStepIndex(null);
  };

  const renumberSteps = (steps: ApprovalStepInput[]): ApprovalStepInput[] =>
    steps.map((s, idx) => ({ ...s, stepNo: idx + 1 }));

  /** แทรกขั้นใหม่ที่ตำแหน่ง idx (0 = ก่อนขั้นแรก, length = ต่อท้าย) และเปิดหน้าต่างตั้งค่าทันที */
  const insertStep = (idx: number) => {
    if (form.steps.length >= MAX_APPROVAL_STEPS) return;
    setForm((f) => {
      const copy = [...f.steps];
      copy.splice(idx, 0, emptyStep(idx + 1));
      return { ...f, steps: renumberSteps(copy) };
    });
    setEditingStepIndex(idx);
  };

  /** เส้นเชื่อมระหว่างการ์ด + ปุ่มแทรกขั้น */
  const renderConnector = (insertAt: number) => {
    const full = form.steps.length >= MAX_APPROVAL_STEPS;
    return (
      <div className="w-12 shrink-0 flex items-center px-0.5" aria-hidden={full ? true : undefined}>
        <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
        {full ? null : (
          <button
            type="button"
            onClick={() => insertStep(insertAt)}
            aria-label={insertAt === form.steps.length ? 'เพิ่มขั้นต่อท้าย' : `แทรกขั้นก่อนขั้นที่ ${insertAt + 1}`}
            title={insertAt === form.steps.length ? 'เพิ่มขั้นต่อท้าย' : 'แทรกขั้นตรงนี้'}
            className="w-7 h-7 mx-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary dark:hover:text-blue-300 flex items-center justify-center shadow-xs cursor-pointer shrink-0 transition-all group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </button>
        )}
        <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600 relative">
          <span className="absolute -right-1 -top-[5px] w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-slate-400" />
        </div>
      </div>
    );
  };

  const removeStep = (idx: number) => {
    setForm((f) => ({ ...f, steps: renumberSteps(f.steps.filter((_, i) => i !== idx)) }));
    if (editingStepIndex === idx) {
      setEditingStepIndex(null);
    } else if (editingStepIndex !== null && editingStepIndex > idx) {
      setEditingStepIndex(editingStepIndex - 1);
    }
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
    if (editingStepIndex === idx) {
      setEditingStepIndex(idx + direction);
    } else if (editingStepIndex === idx + direction) {
      setEditingStepIndex(idx);
    }
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
    if (!form.steps || form.steps.length === 0) {
      error('สายการอนุมัติต้องมีอย่างน้อย 1 ขั้นตอน');
      return;
    }
    if (form.steps.length > MAX_APPROVAL_STEPS) {
      error(`สายการอนุมัติกำหนดได้สูงสุด ${MAX_APPROVAL_STEPS} ขั้นตอน กรุณาลบขั้นตอนที่เกินออก`);
      return;
    }

    for (const step of form.steps) {
      if (!APPROVER_TYPE_OPTIONS.includes(step.approverType)) {
        error(`ขั้นตอนที่ ${step.stepNo}: กรุณาเลือกประเภทผู้อนุมัติ`);
        return;
      }
      if (step.approverType === 'EMPLOYEE' && !step.approverEmployeeId) {
        error(`ขั้นตอนที่ ${step.stepNo}: กรุณาเลือกพนักงานผู้มีอำนาจอนุมัติ`);
        return;
      }
      if (step.approverType === 'ROLE' && !step.approverRoleId) {
        error(`ขั้นตอนที่ ${step.stepNo}: กรุณาเลือกบทบาทผู้มีอำนาจอนุมัติ`);
        return;
      }
      if (step.delegateType === 'EMPLOYEE' && !step.delegateEmployeeId) {
        error(`ขั้นตอนที่ ${step.stepNo}: กรุณาเลือกพนักงานผู้อนุมัติแทน`);
        return;
      }
      if (step.delegateType === 'ROLE' && !step.delegateRoleId) {
        error(`ขั้นตอนที่ ${step.stepNo}: กรุณาเลือกบทบาทผู้อนุมัติแทน`);
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

  // =========================================================================
  // In-Place Inline Flow Editor Component (แสดงผลแทนการ์ดเดิมโดยตรง ไม่เปิด Modal)
  // =========================================================================
  const renderInlineFlowEditor = (isNew: boolean, existingFlow?: ApprovalFlow) => (
    <div
      key={isNew ? 'flow-editor-new' : `flow-editor-${existingFlow?.id}`}
      className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-[#0B2046] dark:border-blue-500 ring-4 ring-[#0B2046]/10 dark:ring-blue-500/20 p-5 lg:p-6 shadow-md space-y-5 animate-in fade-in duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0B2046] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {isNew ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
            {isNew ? 'เพิ่มสายการอนุมัติใหม่' : `กำลังแก้ไข: ${existingFlow?.flowName}`}
          </h3>
        </div>

        <button
          type="button"
          onClick={closeEditor}
          className="w-8 h-8 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          title="ยกเลิกการแก้ไข"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Fields: Grid 4 columns on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            ประเภทเอกสาร <span className="text-rose-500">*</span>
          </label>
          <CustomSelect
            value={form.documentType}
            onChange={(e) => setForm({ ...form, documentType: e.target.value })}
            className={SELECT_CLS}
          >
            {DOCUMENT_TYPE_OPTIONS.map((dt, idx) => (
              <option key={dt} value={dt}>
                {idx + 1}. {DOCUMENT_TYPE_LABELS[dt]}
              </option>
            ))}
          </CustomSelect>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            ชื่อสายการอนุมัติ <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.flowName}
            onChange={(e) => setForm({ ...form, flowName: e.target.value })}
            placeholder="เช่น สายอนุมัติการลาทั่วไป"
            className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            แผนกที่บังคับใช้
          </label>
          <CustomSelect
            value={form.departmentId ?? ''}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value ? Number(e.target.value) : null })}
            className={SELECT_CLS}
          >
            <option value="">ทุกแผนก (ใช้ร่วมกัน)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.departmentName}
              </option>
            ))}
          </CustomSelect>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            ระดับตำแหน่งที่บังคับใช้
          </label>
          <CustomSelect
            value={form.levelId ?? ''}
            onChange={(e) => setForm({ ...form, levelId: e.target.value ? Number(e.target.value) : null })}
            className={SELECT_CLS}
          >
            <option value="">ทุกระดับตำแหน่ง</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.levelName}
              </option>
            ))}
          </CustomSelect>
        </div>
      </div>

      {/* Visual Workflow Steps Builder */}
      <div className="pt-2">
        <div className="flex items-center gap-2.5 mb-2.5">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">ลำดับขั้นตอนการอนุมัติ</h4>
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            {form.steps.length}/{MAX_APPROVAL_STEPS} ขั้นตอน
          </span>
        </div>

        {/* Workflow Canvas (Compact interactive sequence) */}
        <div className="overflow-x-auto pb-3 custom-scrollbar bg-slate-50/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center min-w-max">
            {/* Start Node */}
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 shrink-0 shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">จุดเริ่มต้น</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">ผู้ยื่นคำขอ</div>
              </div>
            </div>

            {form.steps.map((step, idx) => (
              <React.Fragment key={idx}>
                {renderConnector(idx)}

                <div
                  ref={(el) => {
                    stepRefs.current[idx] = el;
                  }}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIndex(idx);
                    setEditingStepIndex(null);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(idx));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIndex !== idx) {
                      setDragOverIndex(idx);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === idx) {
                      setDragOverIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIndex === null || draggedIndex === idx) {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                      return;
                    }
                    setForm((f) => {
                      const copy = [...f.steps];
                      const [moved] = copy.splice(draggedIndex, 1);
                      copy.splice(idx, 0, moved);
                      return { ...f, steps: renumberSteps(copy) };
                    });
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onClick={() => setEditingStepIndex(editingStepIndex === idx ? null : idx)}
                  className={`group relative flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border-2 ${
                    dragOverIndex === idx && draggedIndex !== idx
                      ? 'border-primary ring-2 ring-primary/40 scale-105 shadow-md bg-primary/5'
                      : editingStepIndex === idx
                      ? 'border-primary ring-2 ring-primary/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-blue-400 shadow-2xs'
                  } ${
                    draggedIndex === idx ? 'opacity-40 border-dashed border-primary scale-95' : ''
                  } rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing transition-all duration-150 shrink-0 select-none`}
                  title="คลิกเพื่อเลือกผู้อนุมัติ หรือคลิกค้างเพื่อลากสลับลำดับ"
                >
                  {/* Grip Icon for Drag & Drop */}
                  <GripVertical
                    className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 shrink-0"
                    aria-hidden="true"
                  />

                  {/* Step number badge */}
                  <div className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    {step.stepNo}
                  </div>

                  {/* Approver display name */}
                  <div className="min-w-0 pr-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {getApproverDisplay(step, employees, roles)}
                    </div>
                  </div>

                  {/* Dropdown Chevron เหมือนปุ่มฟิลเตอร์ */}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-transform duration-150 ${
                      editingStepIndex === idx ? 'rotate-180 text-primary' : ''
                    }`}
                  />

                  {/* Delete button if more than 1 step */}
                  {form.steps.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStep(idx);
                      }}
                      aria-label={`ลบขั้นที่ ${step.stepNo}`}
                      title="ลบขั้นตอนนี้"
                      className="w-5 h-5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors shrink-0 ml-0.5 cursor-pointer opacity-60 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </React.Fragment>
            ))}

            {renderConnector(form.steps.length)}

            {/* End Node */}
            <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3.5 py-2.5 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">อนุมัติแล้ว</div>
                <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 font-medium">เอกสารมีผล</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="pt-3.5 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ToggleSwitch
            checked={form.status === 'ACTIVE'}
            onChange={(checked) => setForm({ ...form, status: checked ? 'ACTIVE' : 'INACTIVE' })}
            ariaLabel="สถานะสายการอนุมัติ"
          />
          <span
            className={`text-xs font-semibold cursor-pointer ${
              form.status === 'ACTIVE' ? 'text-primary dark:text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => setForm({ ...form, status: form.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
          >
            {form.status === 'ACTIVE' ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={closeEditor}
            disabled={isSavingFlow}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleSaveFlow}
            loading={isSavingFlow}
          >
            {isNew ? 'บันทึกสายการอนุมัติ' : 'บันทึกการแก้ไข'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-16">
      {/* ========================================================================= */}
      {/* ผังสายการอนุมัติ (Workflow Templates) */}
      {/* ========================================================================= */}
      {(
        <div className="space-y-6">
          {/* Top Filter & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาสายการอนุมัติ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400"
                />
              </div>

              {/* Doc Type Filter */}
              <div className="relative">
                <CustomSelect
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="">ประเภทเอกสารทั้งหมด</option>
                  {DOCUMENT_TYPE_OPTIONS.map((dt) => (
                    <option key={dt} value={dt}>
                      {DOCUMENT_TYPE_LABELS[dt]}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* Dept Filter */}
              <div className="relative">
                <CustomSelect
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="">ทุกแผนก</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentName}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <CustomSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="">สถานะ: ทั้งหมด</option>
                  <option value="ACTIVE">ใช้งานอยู่</option>
                  <option value="INACTIVE">ปิดใช้งาน</option>
                </CustomSelect>
              </div>
            </div>

            {/* Add Flow Button */}
            <Button
              type="button"
              onClick={openCreateEditor}
              disabled={editingFlowId === 'NEW'}
              icon={<Plus className="w-4 h-4" />}
            >
              เพิ่มสายการอนุมัติ
            </Button>
          </div>

          {/* Flows Cards List */}
          {loadingFlows ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400 shadow-xs">
              <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> กำลังโหลดข้อมูลสายการอนุมัติ...
            </div>
          ) : filteredFlows.length === 0 && editingFlowId !== 'NEW' ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400 shadow-xs">
              ยังไม่มีสายการอนุมัติในระบบ
            </div>
          ) : (
            <div className="space-y-4">
              {/* ถ้ากำลังเพิ่มสายการอนุมัติใหม่ ให้แสดงการ์ดตัวแก้ไขแทรกไว้ที่ด้านบนสุด */}
              {editingFlowId === 'NEW' && renderInlineFlowEditor(true)}

              {filteredFlows.map((flow) => {
                {/* ถ้าการ์ดนี้อยู่ในสถานะกำลังแก้ไข ให้แสดงตัวแก้ไข Inline แทนการ์ดปกติ */}
                if (editingFlowId === flow.id) {
                  return renderInlineFlowEditor(false, flow);
                }
                const badge = getDocTypeBadge(flow.documentType);
                return (
                  <div
                    key={flow.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-800 text-base">{flow.flowName}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                            <span>{flow.departmentName ?? 'ทุกแผนก'}</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
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
                      <div className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium mb-2.5">ลำดับขั้นตอนการอนุมัติ</div>
                      {flow.steps.length === 0 ? (
                        <div className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3">
                          ยังไม่มีขั้นตอนการอนุมัติ
                        </div>
                      ) : (
                        <div className="flex items-center flex-wrap gap-2.5">
                          {/* จุดเริ่มต้น: ผู้ยื่นคำขอ */}
                          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5">
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                              <Users className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">จุดเริ่มต้น</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium mt-0.5">ผู้ยื่นคำขอ</div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />

                          {flow.steps
                            .slice()
                            .sort((a, b) => a.stepNo - b.stepNo)
                            .map((step) => (
                              <React.Fragment key={step.id}>
                                <div className="flex items-center gap-2.5 bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 shadow-2xs shrink-0">
                                  <div className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                    {step.stepNo}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {getApproverDisplay(step, employees, roles)}
                                    </div>
                                  </div>
                                </div>

                                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                              </React.Fragment>
                            ))}

                          {/* จุดสิ้นสุด: อนุมัติครบทุกขั้น */}
                          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-emerald-700">อนุมัติแล้ว</div>
                              <div className="text-[10px] text-emerald-600/80 font-medium mt-0.5">เอกสารมีผล</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100">

                      <div className="flex items-center gap-4">
                        {/* Delete Button */}
                        <Button
                          type="button"
                          variant="soft-danger"
                          size="sm"
                          onClick={() => handleDeleteFlow(flow)}
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          ลบ
                        </Button>

                        {/* Edit Button */}
                        <Button
                          type="button"
                          variant="soft-warning"
                          size="sm"
                          onClick={() => openEditEditor(flow)}
                          icon={<Pencil className="w-3.5 h-3.5" />}
                        >
                          แก้ไข
                        </Button>

                        {/* Toggle Status */}
                        <div className="flex items-center gap-2">
                          <ToggleSwitch
                            checked={flow.status === 'ACTIVE'}
                            onChange={() => handleToggleStatus(flow)}
                            disabled={togglingId === flow.id}
                            ariaLabel="เปิดใช้งานสายการอนุมัติ"
                          />
                          <span
                            className={`text-xs font-semibold cursor-pointer ${
                              flow.status === 'ACTIVE' ? 'text-primary dark:text-blue-400' : 'text-slate-400'
                            }`}
                            onClick={() => handleToggleStatus(flow)}
                          >
                            {flow.status === 'ACTIVE' ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                          </span>
                        </div>
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
      {/* Dropdown Popover สำหรับตั้งค่าขั้นตอน (เด้งขึ้นมาใต้ขั้นตอนเหมือนปุ่มฟิลเตอร์) */}
      {/* ========================================================================= */}
      {(() => {
        if (editingStepIndex === null || !form.steps[editingStepIndex]) return null;
        const activeEl = stepRefs.current[editingStepIndex];
        const rect = activeEl?.getBoundingClientRect();
        if (!rect) return null;

        const popoverWidth = 360;
        const left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, rect.left));
        const popoverHeight = 390;
        let top = rect.bottom + 8;
        if (top + popoverHeight > window.innerHeight && rect.top > popoverHeight + 16) {
          top = rect.top - popoverHeight - 8;
        }

        return (
          <>
            {/* Transparent click-outside backdrop (ไม่มีการดรอปความมืด เหมือนกดปุ่มฟิลเตอร์) */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setEditingStepIndex(null)}
            />

            {/* Anchored Dropdown Card */}
            <div
              style={{
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                width: `${popoverWidth}px`,
              }}
              className="z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dropdown Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                    {form.steps[editingStepIndex].stepNo}
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    ขั้นตอนที่ {form.steps[editingStepIndex].stepNo}: กำหนดผู้อนุมัติ
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingStepIndex(null)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  title="ปิด"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Field 1: ผู้อนุมัติ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ผู้อนุมัติ <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={form.steps[editingStepIndex].approverType}
                  onChange={(e) =>
                    updateStep(editingStepIndex, {
                      approverType: e.target.value as any,
                      approverEmployeeId: null,
                      approverRoleId: null,
                      approverScope: 'ORG',
                    })
                  }
                  className={SELECT_CLS}
                >
                  {!APPROVER_TYPE_OPTIONS.includes(form.steps[editingStepIndex].approverType) && (
                    <option value={form.steps[editingStepIndex].approverType} disabled>
                      {APPROVER_TYPE_LABELS[form.steps[editingStepIndex].approverType] ?? form.steps[editingStepIndex].approverType}
                    </option>
                  )}
                  {APPROVER_TYPE_OPTIONS.map((at) => (
                    <option key={at} value={at}>
                      {APPROVER_TYPE_LABELS[at]}
                    </option>
                  ))}
                </CustomSelect>

                {form.steps[editingStepIndex].approverType === 'EMPLOYEE' && (
                  <CustomSelect
                    value={form.steps[editingStepIndex].approverEmployeeId ?? ''}
                    onChange={(e) =>
                      updateStep(editingStepIndex, {
                        approverEmployeeId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className={`${SELECT_CLS} mt-2`}
                  >
                    <option value="">-- เลือกพนักงานผู้อนุมัติ --</option>
                    {employees
                      .filter(
                        (emp) =>
                          !form.departmentId ||
                          emp.departmentId === form.departmentId ||
                          emp.id === form.steps[editingStepIndex].approverEmployeeId
                      )
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} {emp.positionName ? `(${emp.positionName})` : ''}
                        </option>
                      ))}
                  </CustomSelect>
                )}

                {form.steps[editingStepIndex].approverType === 'ROLE' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <CustomSelect
                      value={form.steps[editingStepIndex].approverRoleId ?? ''}
                      onChange={(e) =>
                        updateStep(editingStepIndex, {
                          approverRoleId: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className={SELECT_CLS}
                    >
                      <option value="">-- เลือกบทบาท --</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roleName}
                        </option>
                      ))}
                    </CustomSelect>
                    <CustomSelect
                      value={form.steps[editingStepIndex].approverScope ?? 'ORG'}
                      onChange={(e) => updateStep(editingStepIndex, { approverScope: e.target.value })}
                      className={SELECT_CLS}
                    >
                      {Object.entries(APPROVER_SCOPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {form.steps[editingStepIndex].approverType === 'ROLE'
                    ? APPROVER_SCOPE_HINTS[form.steps[editingStepIndex].approverScope ?? 'ORG']
                    : APPROVER_TYPE_HINTS[form.steps[editingStepIndex].approverType]}
                </p>
              </div>

              {/* Field 2: ถ้าหาผู้อนุมัติไม่เจอ */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ถ้าหาผู้อนุมัติไม่เจอ
                </label>
                <CustomSelect
                  value={form.steps[editingStepIndex].fallbackAction ?? 'HR'}
                  onChange={(e) =>
                    updateStep(editingStepIndex, {
                      fallbackAction: e.target.value,
                      isRequired: e.target.value !== 'SKIP',
                    })
                  }
                  className={SELECT_CLS}
                >
                  {Object.entries(FALLBACK_ACTION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </CustomSelect>
                {form.steps[editingStepIndex].fallbackAction === 'SKIP' &&
                  editingStepIndex === form.steps.length - 1 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                      ขั้นสุดท้ายจะไม่ถูกข้าม — ส่งให้ฝ่ายบุคคลแทน
                    </p>
                  )}
              </div>

              {/* Field 3: ผู้อนุมัติแทน (ไม่บังคับ) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ผู้อนุมัติแทน <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <CustomSelect
                    value={form.steps[editingStepIndex].delegateType ?? ''}
                    onChange={(e) =>
                      updateStep(editingStepIndex, {
                        delegateType: e.target.value || null,
                        delegateEmployeeId: null,
                        delegateRoleId: null,
                        delegateScope: 'ORG',
                      })
                    }
                    className={SELECT_CLS}
                  >
                    <option value="">ไม่มี</option>
                    <option value="EMPLOYEE">ระบุตัวบุคคล</option>
                    <option value="ROLE">ตามบทบาท</option>
                  </CustomSelect>
                  {form.steps[editingStepIndex].delegateType ? (
                    <CustomSelect
                      value={form.steps[editingStepIndex].delegateMode ?? 'WHEN_ABSENT'}
                      onChange={(e) => updateStep(editingStepIndex, { delegateMode: e.target.value })}
                      className={SELECT_CLS}
                    >
                      {Object.entries(DELEGATE_MODE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </CustomSelect>
                  ) : (
                    <span />
                  )}
                </div>

                {form.steps[editingStepIndex].delegateType === 'EMPLOYEE' && (
                  <CustomSelect
                    value={form.steps[editingStepIndex].delegateEmployeeId ?? ''}
                    onChange={(e) =>
                      updateStep(editingStepIndex, {
                        delegateEmployeeId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className={`${SELECT_CLS} mt-2`}
                  >
                    <option value="">-- เลือกผู้อนุมัติแทน --</option>
                    {employees
                      .filter(
                        (emp) =>
                          !(
                            form.steps[editingStepIndex].approverType === 'EMPLOYEE' &&
                            emp.id === form.steps[editingStepIndex].approverEmployeeId
                          ) &&
                          (!form.departmentId ||
                            emp.departmentId === form.departmentId ||
                            emp.id === form.steps[editingStepIndex].delegateEmployeeId)
                      )
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} {emp.positionName ? `(${emp.positionName})` : ''}
                        </option>
                      ))}
                  </CustomSelect>
                )}

                {form.steps[editingStepIndex].delegateType === 'ROLE' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <CustomSelect
                      value={form.steps[editingStepIndex].delegateRoleId ?? ''}
                      onChange={(e) =>
                        updateStep(editingStepIndex, {
                          delegateRoleId: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className={SELECT_CLS}
                    >
                      <option value="">-- บทบาท --</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roleName}
                        </option>
                      ))}
                    </CustomSelect>
                    <CustomSelect
                      value={form.steps[editingStepIndex].delegateScope ?? 'ORG'}
                      onChange={(e) => updateStep(editingStepIndex, { delegateScope: e.target.value })}
                      className={SELECT_CLS}
                    >
                      {Object.entries(APPROVER_SCOPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>
                )}
              </div>

              {/* Footer Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setEditingStepIndex(null)}
                  className="w-full justify-center"
                >
                  เรียบร้อย
                </Button>
              </div>
            </div>
          </>
        );
      })()}

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
