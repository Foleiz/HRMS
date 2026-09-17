'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  GitBranch,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { approvalService } from '@/services/approvalService';
import { organizationService } from '@/services/organizationService';
import { employeeService } from '@/services/employeeService';
import { settingsService } from '@/services/settingsService';
import {
  ApprovalFlow,
  ApprovalStepInput,
  CreateApprovalFlowPayload,
  DOCUMENT_TYPE_LABELS,
  APPROVER_TYPE_LABELS,
} from '@/types/approval';
import { Department, EmployeeLevel } from '@/types/organization';
import { Employee } from '@/types/employee';
import { RoleSummary } from '@/types/settings';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const DOCUMENT_TYPE_OPTIONS = Object.keys(DOCUMENT_TYPE_LABELS);
const APPROVER_TYPE_OPTIONS = Object.keys(APPROVER_TYPE_LABELS);

const emptyStep = (stepNo: number): ApprovalStepInput => ({
  stepNo,
  approverType: 'MANAGER',
  approverEmployeeId: null,
  approverRoleId: null,
  isRequired: true,
});

/**
 * แท็บ "สายการอนุมัติ" ในหน้าตั้งค่า — Approval Workflow Designer UI
 * เป็นคอมโพเนนต์แบบ self-contained (ดึงข้อมูล/จัดการ state ของตัวเองทั้งหมด)
 * เพื่อไม่ต้องเพิ่มภาระ state ให้หน้า settings/page.tsx เดิมที่มีความซับซ้อนอยู่แล้ว
 */
export const ApprovalFlowsTab: React.FC = () => {
  const { success, error } = useToast();

  // === Reference data (dropdowns) ===
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

  const employeeName = (id?: number | null) => employees.find((e) => e.id === id)?.fullName ?? '-';

  // === Flows ===
  const [flows, setFlows] = useState<ApprovalFlow[]>([]);
  const [isFlowsLoading, setIsFlowsLoading] = useState(false);

  const loadFlows = useCallback(async () => {
    setIsFlowsLoading(true);
    try {
      setFlows(await approvalService.getFlows());
    } catch (err: any) {
      error(err.message || 'ไม่สามารถโหลดรายการสายการอนุมัติได้');
    } finally {
      setIsFlowsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

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

  // ลำดับขั้นตอนอ้างอิงจากตำแหน่งใน array เสมอ (index + 1) — การเลื่อนขึ้น/ลงจึงแค่สลับตำแหน่งใน array
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
      const next = f.steps.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...f, steps: renumberSteps(next) };
    });
  };

  const updateStep = (idx: number, patch: Partial<ApprovalStepInput>) => {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
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
        success('บันทึกสายการอนุมัติสำเร็จ');
      } else {
        await approvalService.createFlow(form);
        success('สร้างสายการอนุมัติสำเร็จ');
      }
      closeEditor();
      loadFlows();
    } catch (err: any) {
      error(err?.response?.data?.message || err.message || 'ไม่สามารถบันทึกสายการอนุมัติได้');
    } finally {
      setIsSavingFlow(false);
    }
  };

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', onConfirm: async () => {} });

  const handleDeleteFlow = (flow: ApprovalFlow) => {
    setConfirmConfig({
      isOpen: true,
      title: 'ลบสายการอนุมัติ',
      message: `ต้องการลบสายการอนุมัติ "${flow.flowName}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
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
    <div className="space-y-5">
      <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={openCreateEditor}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" /> เพิ่มสายการอนุมัติ
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {isFlowsLoading ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" /> กำลังโหลดข้อมูล...
              </div>
            ) : flows.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">ยังไม่มีสายการอนุมัติในระบบ</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">รหัส/ชื่อ</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ประเภทเอกสาร</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ขอบเขต</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ขั้นตอน</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">สถานะ</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {flows.map((flow) => (
                      <tr key={flow.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-800">{flow.flowName}</div>
                          <div className="text-xs text-slate-400">{flow.flowCode}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{DOCUMENT_TYPE_LABELS[flow.documentType] ?? flow.documentType}</td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          {flow.departmentName ?? 'ทุกแผนก'} / {flow.levelName ?? 'ทุกระดับ'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{flow.steps.length} ขั้นตอน</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                              flow.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {flow.status === 'ACTIVE' ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditEditor(flow)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#0B2046] hover:bg-slate-100 transition-all"
                              title="แก้ไข"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFlow(flow)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
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
            )}
          </div>
        </div>

      {/* === Flow Editor Drawer === */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={closeEditor}>
          <div
            className="w-full max-w-xl h-full bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-slate-800">
                {editingFlow ? 'แก้ไขสายการอนุมัติ' : 'เพิ่มสายการอนุมัติ'}
              </h3>
              <button onClick={closeEditor} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">รหัสสายการอนุมัติ *</label>
                  <input
                    type="text"
                    disabled={!!editingFlow}
                    value={form.flowCode}
                    onChange={(e) => setForm((f) => ({ ...f, flowCode: e.target.value }))}
                    placeholder="เช่น LEAVE-STD"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">สถานะ</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
                  >
                    <option value="ACTIVE">ใช้งานอยู่</option>
                    <option value="INACTIVE">ปิดใช้งาน</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อสายการอนุมัติ *</label>
                <input
                  type="text"
                  value={form.flowName}
                  onChange={(e) => setForm((f) => ({ ...f, flowName: e.target.value }))}
                  placeholder="เช่น สายอนุมัติใบลามาตรฐาน"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">ประเภทเอกสาร *</label>
                <select
                  value={form.documentType}
                  onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
                  >
                    <option value="">ทุกระดับ</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.levelName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ─── Step Builder ─── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-500">ขั้นตอนการอนุมัติ (เรียงตามลำดับ)</label>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0B2046] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มขั้นตอน
                  </button>
                </div>

                <div className="space-y-2">
                  {form.steps.map((step, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 bg-slate-50/40">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-[#0B2046] text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <select
                          value={step.approverType}
                          onChange={(e) => updateStep(idx, { approverType: e.target.value, approverEmployeeId: null, approverRoleId: null })}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
                        >
                          {APPROVER_TYPE_OPTIONS.map((at) => (
                            <option key={at} value={at}>
                              {APPROVER_TYPE_LABELS[at]}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => moveStep(idx, -1)}
                            disabled={idx === 0}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveStep(idx, 1)}
                            disabled={idx === form.steps.length - 1}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeStep(idx)}
                            disabled={form.steps.length <= 1}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {step.approverType === 'EMPLOYEE' && (
                        <select
                          value={step.approverEmployeeId ?? ''}
                          onChange={(e) => updateStep(idx, { approverEmployeeId: e.target.value ? Number(e.target.value) : null })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
                        >
                          <option value="">-- เลือกพนักงานผู้อนุมัติ --</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.fullName} ({emp.employeeCode})
                            </option>
                          ))}
                        </select>
                      )}

                      {step.approverType === 'ROLE' && (
                        <select
                          value={step.approverRoleId ?? ''}
                          onChange={(e) => updateStep(idx, { approverRoleId: e.target.value ? Number(e.target.value) : null })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30"
                        >
                          <option value="">-- เลือกบทบาทผู้อนุมัติ --</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.roleName}
                            </option>
                          ))}
                        </select>
                      )}

                      <label className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={step.isRequired}
                          onChange={(e) => updateStep(idx, { isRequired: e.target.checked })}
                          className="rounded border-slate-300"
                        />
                        ขั้นตอนบังคับ (ข้ามไม่ได้)
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
              <button
                onClick={closeEditor}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveFlow}
                disabled={isSavingFlow}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-60"
              >
                {isSavingFlow && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

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
};
