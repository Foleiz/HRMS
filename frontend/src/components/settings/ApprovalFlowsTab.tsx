'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  ChevronDown,
  Plus,
  Loader2,
  Trash2,
  Users,
  UserCheck,
  GripVertical,
  X,
  CheckCircle2,
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
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { Button } from '@/components/ui';

// ประเภทเอกสารที่เลือกได้ตอนสร้าง/แก้สายการอนุมัติ
const HIDDEN_DOCUMENT_TYPES = new Set(['TRANSFER_REQUEST']);
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

// =========================================================================
// FlowCardEditor Component (การ์ดสายการอนุมัติแบบเปิดพร้อมแก้ไขทันทีในตัว)
// =========================================================================
interface FlowCardEditorProps {
  flow?: ApprovalFlow;
  isNew?: boolean;
  departments: Department[];
  levels: EmployeeLevel[];
  employees: Employee[];
  roles: RoleSummary[];
  onSave: (data: CreateApprovalFlowPayload, flowId?: number) => Promise<void>;
  onDelete?: (flow: ApprovalFlow) => void;
  onCancelNew?: () => void;
}

const FlowCardEditor: React.FC<FlowCardEditorProps> = ({
  flow,
  isNew = false,
  departments,
  levels,
  employees,
  roles,
  onSave,
  onDelete,
  onCancelNew,
}) => {
  const { error } = useToast();

  const [form, setForm] = useState<CreateApprovalFlowPayload>(() => {
    if (flow) {
      return {
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
      };
    }
    return {
      flowCode: '',
      flowName: '',
      documentType: 'LEAVE_REQUEST',
      departmentId: null,
      levelId: null,
      status: 'ACTIVE',
      steps: [emptyStep(1)],
    };
  });

  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sync if flow prop updates from outside
  useEffect(() => {
    if (flow) {
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
    }
  }, [flow]);

  // Close step settings popover on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingStepIndex !== null) {
        setEditingStepIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingStepIndex]);

  const renumberSteps = (steps: ApprovalStepInput[]): ApprovalStepInput[] =>
    steps.map((s, idx) => ({ ...s, stepNo: idx + 1 }));

  const insertStep = (idx: number) => {
    if (form.steps.length >= MAX_APPROVAL_STEPS) return;
    setForm((f) => {
      const copy = [...f.steps];
      copy.splice(idx, 0, emptyStep(idx + 1));
      return { ...f, steps: renumberSteps(copy) };
    });
    setEditingStepIndex(idx);
  };

  const removeStep = (idx: number) => {
    setForm((f) => ({ ...f, steps: renumberSteps(f.steps.filter((_, i) => i !== idx)) }));
    if (editingStepIndex === idx) {
      setEditingStepIndex(null);
    } else if (editingStepIndex !== null && editingStepIndex > idx) {
      setEditingStepIndex(editingStepIndex - 1);
    }
  };

  const updateStep = (idx: number, patch: Partial<ApprovalStepInput>) => {
    setForm((f) => {
      const copy = [...f.steps];
      copy[idx] = { ...copy[idx], ...patch };
      return { ...f, steps: copy };
    });
  };

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

  const handleReset = () => {
    if (isNew) {
      onCancelNew?.();
      return;
    }
    if (flow) {
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
      setEditingStepIndex(null);
    }
  };

  const handleSave = async () => {
    if (!form.flowName.trim()) {
      error('กรุณาระบุชื่อสายการอนุมัติ');
      return;
    }
    if (!form.documentType) {
      error('กรุณาเลือกประเภทเอกสาร');
      return;
    }
    if (form.steps.length === 0) {
      error('ต้องมีขั้นตอนการอนุมัติอย่างน้อย 1 ขั้นตอน');
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
      setIsSaving(true);
      await onSave(form, flow?.id);
      setEditingStepIndex(null);
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const currentDeptName = departments.find((d) => d.id === form.departmentId)?.departmentName ?? 'ทุกแผนก';
  const currentLevelName = levels.find((l) => l.id === form.levelId)?.levelName ?? 'ทุกระดับตำแหน่ง';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 lg:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 dark:border-slate-700/60 gap-4">
        {isNew ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0B2046] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
              เพิ่มสายการอนุมัติใหม่
            </h3>
          </div>
        ) : (
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
              {form.flowName || flow?.flowName}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{currentDeptName}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{currentLevelName}</span>
              </span>
            </div>
          </div>
        )}

        {/* ปุ่มกากบาทขวาบน: สำหรับสายเดิม = ลบรายการได้เลย, สำหรับเพิ่มใหม่ = ยกเลิกแบบร่าง */}
        <button
          type="button"
          onClick={() => {
            if (isNew) {
              onCancelNew?.();
            } else if (flow && onDelete) {
              onDelete(flow);
            }
          }}
          className="w-8 h-8 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title={isNew ? 'ยกเลิกการเพิ่ม' : 'ลบสายการอนุมัตินี้'}
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
            placeholder="เช่น คำขอลา"
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

                  {/* Approver display name with Step number badge */}
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>ขั้นตอนที่</span>
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold inline-flex items-center justify-center shrink-0 shadow-2xs">
                        {step.stepNo}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                      {getApproverDisplay(step, employees, roles)}
                    </div>
                  </div>

                  {/* Dropdown Chevron เหมือนปุ่มฟิลเตอร์ */}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-transform duration-150 ${
                      editingStepIndex === idx ? 'rotate-180 text-primary' : ''
                    }`}
                  />

                  {/* Delete button at top-right corner of the step node */}
                  {form.steps.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStep(idx);
                      }}
                      aria-label={`ลบขั้นที่ ${step.stepNo}`}
                      title="ลบขั้นตอนนี้"
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-400 hover:text-rose-600 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center shadow-xs cursor-pointer transition-all z-10"
                    >
                      <X className="w-3 h-3" />
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

      {/* Action Bar (Footer) */}
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
            onClick={handleReset}
            disabled={isSaving}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            loading={isSaving}
          >
            {isNew ? 'บันทึกสายการอนุมัติ' : 'บันทึกการแก้ไข'}
          </Button>
        </div>
      </div>

      {/* Dropdown Popover สำหรับตั้งค่าขั้นตอน */}
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
            {/* Transparent click-outside backdrop */}
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
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    ขั้นตอนที่
                  </h4>
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold inline-flex items-center justify-center shadow-xs">
                    {form.steps[editingStepIndex].stepNo}
                  </span>
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
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setEditingStepIndex(null)}
                >
                  เรียบร้อย
                </Button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};

// =========================================================================
// Main Tab Component
// =========================================================================
export const ApprovalFlowsTab: React.FC = () => {
  const { success, error } = useToast();

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

  // New Flow Draft State
  const [isCreatingNew, setIsCreatingNew] = useState(false);

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

  const handleSaveFlow = async (data: CreateApprovalFlowPayload, flowId?: number) => {
    try {
      if (flowId) {
        await approvalService.updateFlow(flowId, {
          flowName: data.flowName,
          documentType: data.documentType,
          departmentId: data.departmentId,
          levelId: data.levelId,
          status: data.status,
          steps: data.steps,
        });
        success('บันทึกการแก้ไขสายการอนุมัติสำเร็จ');
      } else {
        await approvalService.createFlow(data);
        success('สร้างสายการอนุมัติสำเร็จ');
        setIsCreatingNew(false);
      }
      loadFlows();
    } catch (err: any) {
      error(err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      throw err;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ผังสายการอนุมัติ (Workflow Templates) */}
      <div className="space-y-6">
        {/* Top Filter & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาสายการอนุมัติ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                <option value="">สถานะทั้งหมด</option>
                <option value="ACTIVE">ใช้งานอยู่</option>
                <option value="INACTIVE">ปิดใช้งาน</option>
              </CustomSelect>
            </div>
          </div>

          {/* Action Button: เพิ่มสายการอนุมัติ */}
          <Button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            disabled={isCreatingNew}
            icon={<Plus className="w-4 h-4" />}
          >
            เพิ่มสายการอนุมัติ
          </Button>
        </div>

        {/* Flows Cards List */}
        {loadingFlows ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center text-slate-400 dark:text-slate-500 shadow-xs">
            <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> กำลังโหลดข้อมูลสายการอนุมัติ...
          </div>
        ) : filteredFlows.length === 0 && !isCreatingNew ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center text-slate-400 dark:text-slate-500 shadow-xs">
            ยังไม่มีสายการอนุมัติในระบบ
          </div>
        ) : (
          <div className="space-y-5">
            {/* ถ้ากำลังเพิ่มสายการอนุมัติใหม่ ให้แสดงการ์ดตัวแก้ไขแทรกไว้ที่ด้านบนสุด */}
            {isCreatingNew && (
              <FlowCardEditor
                isNew={true}
                departments={departments}
                levels={levels}
                employees={employees}
                roles={roles}
                onSave={handleSaveFlow}
                onCancelNew={() => setIsCreatingNew(false)}
              />
            )}

            {/* หน้ารายการเริ่มแรกแสดงเป็นแบบการ์ดพร้อมแก้ไขได้ทันที ไม่ต้องมีปุ่มเพื่อแก้ไข */}
            {filteredFlows.map((flow) => (
              <FlowCardEditor
                key={flow.id}
                flow={flow}
                departments={departments}
                levels={levels}
                employees={employees}
                roles={roles}
                onSave={handleSaveFlow}
                onDelete={handleDeleteFlow}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        onConfirm={confirmModalConfig.onConfirm}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        confirmText="ยืนยันการลบ"
        cancelText="ยกเลิก"
        type="danger"
      />
    </div>
  );
};
