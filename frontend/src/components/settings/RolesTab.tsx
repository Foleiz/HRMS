'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Check,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  RoleSummary,
  RoleDetail,
  ModulePermissionScope,
  UpdateRoleMatrixRequest,
} from '@/types/settings';

interface RolesTabProps {
  roles: RoleSummary[];
  selectedRoleMatrix: RoleDetail | null;
  onSelectRole: (roleId: number) => void;
  onSaveMatrix: (roleId: number, data: UpdateRoleMatrixRequest) => Promise<void>;
  onAddRoleClick: () => void;
  onEditRoleClick: (role: RoleSummary) => void;
  onDeleteRoleClick: (role: RoleSummary) => void;
  isLoading: boolean;
  isSavingMatrix: boolean;
}

const SCOPES = [
  { key: 'SELF', label: 'ตัวเอง', tip: 'มองเห็นเฉพาะข้อมูลที่เป็นของตนเองเท่านั้น' },
  { key: 'TEAM', label: 'ทีม', tip: 'มองเห็นข้อมูลของสมาชิกในทีมที่อยู่ใต้บังคับบัญชาสายตรง (Direct Reports)' },
  { key: 'DEPARTMENT', label: 'แผนก', tip: 'มองเห็นข้อมูลของพนักงานทุกคนในแผนกเดียวกัน' },
  { key: 'DIVISION', label: 'ฝ่าย', tip: 'มองเห็นข้อมูลของพนักงานทุกคนในฝ่ายงานเดียวกัน' },
  { key: 'ORGANIZATION', label: 'องค์กร', tip: 'มองเห็นข้อมูลของพนักงานทุกคนในทั้งองค์กร/บริษัท' },
];

interface ActionSwitchProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

const ActionSwitch: React.FC<ActionSwitchProps> = ({ checked, onChange, ariaLabel }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 mx-auto ${
        checked ? 'bg-[#0B2046]' : 'bg-slate-200 hover:bg-slate-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export const RolesTab: React.FC<RolesTabProps> = ({
  roles,
  selectedRoleMatrix,
  onSelectRole,
  onSaveMatrix,
  onAddRoleClick,
  onEditRoleClick,
  onDeleteRoleClick,
  isLoading,
  isSavingMatrix,
}) => {
  const [searchRole, setSearchRole] = useState('');
  const [localModules, setLocalModules] = useState<ModulePermissionScope[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const lastRoleIdRef = useRef<number | null>(null);

  // Sync local matrix state when selected role changes or after save refetch
  useEffect(() => {
    if (selectedRoleMatrix) {
      if (lastRoleIdRef.current !== selectedRoleMatrix.id) {
        setLocalModules(JSON.parse(JSON.stringify(selectedRoleMatrix.modules)));
        setIsDirty(false);
        setSaveSuccessMsg(false);
        lastRoleIdRef.current = selectedRoleMatrix.id;
      } else if (!isDirty) {
        setLocalModules(JSON.parse(JSON.stringify(selectedRoleMatrix.modules)));
      }
    }
  }, [selectedRoleMatrix, isDirty]);

  const filteredRoles = roles.filter(
    (r) =>
      r.roleCode.toLowerCase().includes(searchRole.toLowerCase().trim()) ||
      r.roleName.toLowerCase().includes(searchRole.toLowerCase().trim())
  );

  // Handle Action Switch Toggle with Hierarchy Enforcement
  const handleToggleAction = (
    moduleCode: string,
    action: 'canView' | 'canCreate' | 'canEdit' | 'canApprove'
  ) => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        if (mod.moduleCode !== moduleCode) return mod;

        const updated = { ...mod };
        const nextVal = !updated[action];
        updated[action] = nextVal;

        // Hierarchy Logic:
        // 1. If turning OFF View -> Create, Edit, Approve must also be turned OFF
        if (action === 'canView' && !nextVal) {
          updated.canCreate = false;
          updated.canEdit = false;
          updated.canApprove = false;
        }

        // 2. If turning ON Create, Edit, or Approve -> View must automatically be turned ON
        if (action !== 'canView' && nextVal) {
          updated.canView = true;
        }

        return updated;
      })
    );
    setIsDirty(true);
  };

  // Handle Data Scope Selection
  const handleSelectScope = (moduleCode: string, scopeKey: string) => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        if (mod.moduleCode !== moduleCode) return mod;
        return { ...mod, dataScope: scopeKey, canView: true };
      })
    );
    setIsDirty(true);
  };

  // Quick Action: Toggle row all
  const handleToggleAllRow = (moduleCode: string) => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        if (mod.moduleCode !== moduleCode) return mod;
        const allOn = mod.canView && mod.canCreate && mod.canEdit && mod.canApprove;
        return {
          ...mod,
          canView: !allOn,
          canCreate: !allOn,
          canEdit: !allOn,
          canApprove: !allOn,
        };
      })
    );
    setIsDirty(true);
  };

  const handleReset = () => {
    if (selectedRoleMatrix) {
      setLocalModules(JSON.parse(JSON.stringify(selectedRoleMatrix.modules)));
      setIsDirty(false);
    }
  };

  const handleSave = async () => {
    if (!selectedRoleMatrix) return;
    try {
      await onSaveMatrix(selectedRoleMatrix.id, { modules: localModules });
      setIsDirty(false);
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } catch {
      // Error handled by ToastContext / parent
    }
  };

  const activeRoleSummary = roles.find((r) => r.id === selectedRoleMatrix?.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* ================= LEFT PANE: ROLES LIST (4 Cols) ================= */}
      <div className="lg:col-span-4 space-y-3">
        {/* Search & Add Role Header */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchRole}
              onChange={(e) => setSearchRole(e.target.value)}
              placeholder="ค้นหาบทบาท..."
              className="w-full h-9.5 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            />
          </div>

          <button
            onClick={onAddRoleClick}
            className="h-9.5 px-3 bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ เพิ่มบทบาท</span>
          </button>
        </div>

        {/* Roles List */}
        <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {filteredRoles.map((role) => {
            const isSelected = selectedRoleMatrix?.id === role.id;

            return (
              <div
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-white border-[#0B2046] ring-2 ring-[#0B2046]/10 shadow-sm'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 tracking-tight">
                        {role.roleCode}
                      </span>
                      {role.isSystemDefault && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded text-[9px] font-semibold">
                          System Default
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {role.roleName}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    ใช้งานอยู่
                  </span>
                </div>

                {role.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                    {role.description}
                  </p>
                )}

                {/* Edit & Delete actions for custom roles */}
                {!role.isSystemDefault && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-3 text-[11px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditRoleClick(role);
                      }}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRoleClick(role);
                      }}
                      className="text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>ลบ</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= RIGHT PANE: PERMISSIONS MATRIX (8 Cols) ================= */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        {selectedRoleMatrix ? (
          <>
            {/* Header: Role Details */}
            <div className="pb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900">
                    ตั้งค่าสิทธิ์การเข้าถึงสำหรับ: {selectedRoleMatrix.roleCode}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedRoleMatrix.description || selectedRoleMatrix.roleName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  แก้ไขล่าสุด 2 ชม.ที่ผ่านมา
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  ขอบเขตการเข้าถึงระดับโมดูลหลัก
                </h3>
                {isDirty && (
                  <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
                  </span>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold text-[11px]">
                      <th className="py-3 px-4 min-w-[190px]">ชื่อโมดูล / ระบบงาน</th>
                      <th className="py-3 px-4 min-w-[280px] text-center">ระดับขอบเขตข้อมูล</th>
                      <th className="py-3 px-3 w-14 text-center">ดู</th>
                      <th className="py-3 px-3 w-14 text-center">สร้าง</th>
                      <th className="py-3 px-3 w-14 text-center">แก้ไข</th>
                      <th className="py-3 px-3 w-14 text-center">อนุมัติ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {localModules.map((mod) => {
                      return (
                        <tr key={mod.moduleCode} className="hover:bg-slate-50/40 transition-colors">
                          {/* Module Name & Quick Toggle */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{mod.moduleName}</div>
                            <button
                              type="button"
                              onClick={() => handleToggleAllRow(mod.moduleCode)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-medium mt-0.5 cursor-pointer"
                            >
                              สลับเลือกทั้งหมด
                            </button>
                          </td>

                          {/* Data Scope Pills */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex p-1 bg-slate-100/80 rounded-lg border border-slate-200/60 gap-1">
                              {SCOPES.map((sc) => {
                                const isSelected = mod.dataScope === sc.key;
                                return (
                                  <button
                                    key={sc.key}
                                    type="button"
                                    title={sc.tip}
                                    onClick={() => handleSelectScope(mod.moduleCode, sc.key)}
                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#0B2046] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                    }`}
                                  >
                                    {sc.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Action: ดู (View) */}
                          <td className="py-3.5 px-3 text-center">
                            <ActionSwitch
                              checked={mod.canView}
                              onChange={() => handleToggleAction(mod.moduleCode, 'canView')}
                              ariaLabel={`สิทธิ์ดูข้อมูล ${mod.moduleName}`}
                            />
                          </td>

                          {/* Action: สร้าง (Create) */}
                          <td className="py-3.5 px-3 text-center">
                            <ActionSwitch
                              checked={mod.canCreate}
                              onChange={() => handleToggleAction(mod.moduleCode, 'canCreate')}
                              ariaLabel={`สิทธิ์สร้างข้อมูล ${mod.moduleName}`}
                            />
                          </td>

                          {/* Action: แก้ไข (Edit) */}
                          <td className="py-3.5 px-3 text-center">
                            <ActionSwitch
                              checked={mod.canEdit}
                              onChange={() => handleToggleAction(mod.moduleCode, 'canEdit')}
                              ariaLabel={`สิทธิ์แก้ไขข้อมูล ${mod.moduleName}`}
                            />
                          </td>

                          {/* Action: อนุมัติ (Approve) */}
                          <td className="py-3.5 px-3 text-center">
                            <ActionSwitch
                              checked={mod.canApprove}
                              onChange={() => handleToggleAction(mod.moduleCode, 'canApprove')}
                              ariaLabel={`สิทธิ์อนุมัติข้อมูล ${mod.moduleName}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <p className="text-slate-400 text-[11px] italic">
                * การเปลี่ยนสิทธิ์จะมีผลกับผู้ใช้ในบทบาทนี้ทันทีเมื่อทำการบันทึกข้อมูล
              </p>

              <div className="flex items-center gap-3">
                {saveSuccessMsg && (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in">
                    <Check className="w-4 h-4" /> บันทึกสิทธิ์สำเร็จ!
                  </span>
                )}
                <button
                  type="button"
                  disabled={!isDirty || isSavingMatrix}
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={!isDirty || isSavingMatrix}
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#112d5e] text-white font-semibold shadow-md shadow-[#0B2046]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSavingMatrix ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์การใช้งาน'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-24 text-center text-slate-400 font-medium">
            เลือกบทบาททางด้านซ้ายเพื่อตั้งค่าสิทธิ์การเข้าถึง
          </div>
        )}
      </div>
    </div>
  );
};
