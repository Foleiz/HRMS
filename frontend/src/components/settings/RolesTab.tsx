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
  ChevronDown,
  ChevronRight,
  Users,
  CalendarCheck,
  CreditCard,
  Building2,
  Settings,
  BarChart3,
  Layers,
  CheckSquare,
  Eye,
  X,
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

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  EMPLOYEE: Users,
  ATTENDANCE: Clock,
  LEAVE: CalendarCheck,
  PAYROLL: CreditCard,
  ORGANIZATION: Building2,
  SETTINGS: Settings,
  REPORT: BarChart3,
};

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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    EMPLOYEE: true,
    ATTENDANCE: true,
    LEAVE: true,
    PAYROLL: true,
    ORGANIZATION: true,
    SETTINGS: true,
    REPORT: true,
  });
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

  // Group modules by Category
  const categories = React.useMemo(() => {
    const map = new Map<string, { code: string; name: string; modules: ModulePermissionScope[] }>();
    localModules.forEach((mod) => {
      const code = mod.categoryCode || mod.groupName || 'OTHER';
      const name = mod.categoryName || mod.groupName || 'หมวดหมู่อื่นๆ';
      if (!map.has(code)) {
        map.set(code, { code, name, modules: [] });
      }
      map.get(code)!.modules.push(mod);
    });
    return Array.from(map.values());
  }, [localModules]);

  // Accordion Expand / Collapse controls
  const toggleCategory = (catCode: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catCode]: prev[catCode] !== undefined ? !prev[catCode] : false,
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    categories.forEach((c) => {
      all[c.code] = true;
    });
    setExpandedCategories(all);
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    categories.forEach((c) => {
      all[c.code] = false;
    });
    setExpandedCategories(all);
  };

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

  // Category Master Action Toggle (applies to all sub-modules in category)
  const handleToggleCategoryAction = (
    catCode: string,
    action: 'canView' | 'canCreate' | 'canEdit' | 'canApprove'
  ) => {
    setLocalModules((prev) => {
      const catMods = prev.filter((m) => (m.categoryCode || m.groupName || 'OTHER') === catCode);
      const allOn = catMods.length > 0 && catMods.every((m) => m[action]);
      const nextVal = !allOn;

      return prev.map((mod) => {
        const thisCat = mod.categoryCode || mod.groupName || 'OTHER';
        if (thisCat !== catCode) return mod;

        const updated = { ...mod };
        updated[action] = nextVal;

        if (action === 'canView' && !nextVal) {
          updated.canCreate = false;
          updated.canEdit = false;
          updated.canApprove = false;
        }

        if (action !== 'canView' && nextVal) {
          updated.canView = true;
        }

        return updated;
      });
    });
    setIsDirty(true);
  };

  // Handle Data Scope Selection for a single module
  const handleSelectScope = (moduleCode: string, scopeKey: string) => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        if (mod.moduleCode !== moduleCode) return mod;
        return { ...mod, dataScope: scopeKey, canView: true };
      })
    );
    setIsDirty(true);
  };

  // Handle Data Scope Selection for an entire category
  const handleSelectCategoryScope = (catCode: string, scopeKey: string) => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        const thisCat = mod.categoryCode || mod.groupName || 'OTHER';
        if (thisCat !== catCode) return mod;
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

  // Global Quick Action: Select All Permissions (View, Create, Edit, Approve) across all 22 modules
  const handleSelectAll = () => {
    setLocalModules((prev) =>
      prev.map((mod) => ({
        ...mod,
        canView: true,
        canCreate: true,
        canEdit: true,
        canApprove: true,
      }))
    );
    setIsDirty(true);
  };

  // Global Quick Action: Select All "View" Only across all 22 modules
  const handleSelectAllView = () => {
    setLocalModules((prev) =>
      prev.map((mod) => ({
        ...mod,
        canView: true,
      }))
    );
    setIsDirty(true);
  };

  // Global Quick Action: Deselect All Permissions across all 22 modules
  const handleDeselectAll = () => {
    setLocalModules((prev) =>
      prev.map((mod) => ({
        ...mod,
        canView: false,
        canCreate: false,
        canEdit: false,
        canApprove: false,
      }))
    );
    setIsDirty(true);
  };

  // Global Column Toggle (View, Create, Edit, Approve)
  const handleToggleColumn = (action: 'canView' | 'canCreate' | 'canEdit' | 'canApprove') => {
    setLocalModules((prev) => {
      const allOn = prev.every((m) => m[action]);
      const nextVal = !allOn;

      return prev.map((mod) => {
        const updated = { ...mod, [action]: nextVal };
        if (action === 'canView' && !nextVal) {
          updated.canCreate = false;
          updated.canEdit = false;
          updated.canApprove = false;
        }
        if (action !== 'canView' && nextVal) {
          updated.canView = true;
        }
        return updated;
      });
    });
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
                  สิทธิ์ระดับละเอียด 22 เมนูย่อย
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    ขอบเขตการเข้าถึงระดับโมดูลและเมนูย่อย (22 เมนู)
                  </h3>
                  {isDirty && (
                    <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      ยังไม่ได้บันทึก
                    </span>
                  )}
                </div>

                {/* Accordion Expand/Collapse & Quick Bulk Select Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="เลือกเปิดสิทธิ์ทั้งหมด (ดู, สร้าง, แก้ไข, อนุมัติ) ทุกเมนูย่อย"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>เลือกทั้งหมด</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectAllView}
                    className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="เลือกเปิดเฉพาะสิทธิ์การดู (View Only) ทุกเมนูย่อย"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>เลือกเฉพาะดู</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="ยกเลิก/ปิดสิทธิ์ทั้งหมดทุกเมนูย่อย"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" />
                    <span>ยกเลิกทั้งหมด</span>
                  </button>

                  <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                  <button
                    type="button"
                    onClick={expandAll}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    ขยายทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    ย่อทั้งหมด
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <th className="py-3 px-4 min-w-[210px]">ชื่อโมดูล / เมนูย่อย</th>
                      <th className="py-3 px-4 min-w-[280px] text-center">ระดับขอบเขตข้อมูล</th>
                      <th
                        onClick={() => handleToggleColumn('canView')}
                        className="py-3 px-3 w-14 text-center cursor-pointer hover:bg-slate-200/80 select-none transition-colors"
                        title="คลิกเพื่อสลับเปิด/ปิดสิทธิ์ 'ดู' ทั้งหมด"
                      >
                        ดู
                      </th>
                      <th
                        onClick={() => handleToggleColumn('canCreate')}
                        className="py-3 px-3 w-14 text-center cursor-pointer hover:bg-slate-200/80 select-none transition-colors"
                        title="คลิกเพื่อสลับเปิด/ปิดสิทธิ์ 'สร้าง' ทั้งหมด"
                      >
                        สร้าง
                      </th>
                      <th
                        onClick={() => handleToggleColumn('canEdit')}
                        className="py-3 px-3 w-14 text-center cursor-pointer hover:bg-slate-200/80 select-none transition-colors"
                        title="คลิกเพื่อสลับเปิด/ปิดสิทธิ์ 'แก้ไข' ทั้งหมด"
                      >
                        แก้ไข
                      </th>
                      <th
                        onClick={() => handleToggleColumn('canApprove')}
                        className="py-3 px-3 w-14 text-center cursor-pointer hover:bg-slate-200/80 select-none transition-colors"
                        title="คลิกเพื่อสลับเปิด/ปิดสิทธิ์ 'อนุมัติ' ทั้งหมด"
                      >
                        อนุมัติ
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {categories.map((cat) => {
                      const isExpanded = expandedCategories[cat.code] ?? true;
                      const IconComponent = CATEGORY_ICONS[cat.code] || Layers;

                      // Category-level action state calculation
                      const allView = cat.modules.length > 0 && cat.modules.every((m) => m.canView);
                      const allCreate = cat.modules.length > 0 && cat.modules.every((m) => m.canCreate);
                      const allEdit = cat.modules.length > 0 && cat.modules.every((m) => m.canEdit);
                      const allApprove = cat.modules.length > 0 && cat.modules.every((m) => m.canApprove);

                      // Common scope if all match
                      const firstScope = cat.modules[0]?.dataScope;
                      const allSameScope = cat.modules.every((m) => m.dataScope === firstScope);

                      return (
                        <React.Fragment key={cat.code}>
                          {/* ================= CATEGORY MASTER ROW ================= */}
                          <tr className="bg-slate-100/90 hover:bg-slate-150 border-t-2 border-slate-200/90 transition-colors">
                            {/* Category Header & Expand Toggle */}
                            <td className="py-2.5 px-4">
                              <div
                                onClick={() => toggleCategory(cat.code)}
                                className="flex items-center gap-2.5 cursor-pointer select-none group"
                              >
                                <div className="text-slate-400 group-hover:text-slate-700 transition-colors">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="p-1 rounded-md bg-white border border-slate-200/80 text-[#0B2046] shadow-2xs">
                                  <IconComponent className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-bold text-xs text-slate-900 tracking-tight">
                                  {cat.name}
                                </span>
                                <span className="px-1.5 py-0.5 bg-[#0B2046]/10 text-[#0B2046] rounded-full text-[10px] font-bold">
                                  {cat.modules.length}
                                </span>
                              </div>
                            </td>

                            {/* Category Master Scope Selector */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex p-0.5 bg-white rounded-lg border border-slate-200 shadow-2xs gap-0.5">
                                {SCOPES.map((sc) => {
                                  const isSelected = allSameScope && firstScope === sc.key;
                                  return (
                                    <button
                                      key={sc.key}
                                      type="button"
                                      title={`กำหนดขอบเขต "${sc.label}" ให้ทุกเมนูในหมวด${cat.name}`}
                                      onClick={() => handleSelectCategoryScope(cat.code, sc.key)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#0B2046] text-white shadow-2xs'
                                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                      }`}
                                    >
                                      {sc.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Master ดู (View) */}
                            <td className="py-2.5 px-3 text-center">
                              <ActionSwitch
                                checked={allView}
                                onChange={() => handleToggleCategoryAction(cat.code, 'canView')}
                                ariaLabel={`เปิดปิดสิทธิ์ดูทุกเมนูในหมวด ${cat.name}`}
                              />
                            </td>

                            {/* Master สร้าง (Create) */}
                            <td className="py-2.5 px-3 text-center">
                              <ActionSwitch
                                checked={allCreate}
                                onChange={() => handleToggleCategoryAction(cat.code, 'canCreate')}
                                ariaLabel={`เปิดปิดสิทธิ์สร้างทุกเมนูในหมวด ${cat.name}`}
                              />
                            </td>

                            {/* Master แก้ไข (Edit) */}
                            <td className="py-2.5 px-3 text-center">
                              <ActionSwitch
                                checked={allEdit}
                                onChange={() => handleToggleCategoryAction(cat.code, 'canEdit')}
                                ariaLabel={`เปิดปิดสิทธิ์แก้ไขทุกเมนูในหมวด ${cat.name}`}
                              />
                            </td>

                            {/* Master อนุมัติ (Approve) */}
                            <td className="py-2.5 px-3 text-center">
                              <ActionSwitch
                                checked={allApprove}
                                onChange={() => handleToggleCategoryAction(cat.code, 'canApprove')}
                                ariaLabel={`เปิดปิดสิทธิ์อนุมัติทุกเมนูในหมวด ${cat.name}`}
                              />
                            </td>
                          </tr>

                          {/* ================= SUB-MODULE ROWS ================= */}
                          {isExpanded &&
                            cat.modules.map((mod) => (
                              <tr
                                key={mod.moduleCode}
                                className="bg-white hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                              >
                                {/* Sub-module Name */}
                                <td className="py-3 px-4 pl-10">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-slate-400 font-mono text-xs select-none">↳</span>
                                      <span className="font-medium text-slate-800 text-xs truncate">
                                        {mod.moduleName}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleAllRow(mod.moduleCode)}
                                      className="text-[10px] text-blue-600 hover:text-blue-800 font-medium shrink-0 cursor-pointer"
                                    >
                                      สลับทั้งหมด
                                    </button>
                                  </div>
                                </td>

                                {/* Sub-module Scope Pills */}
                                <td className="py-3 px-4 text-center">
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
                                <td className="py-3 px-3 text-center">
                                  <ActionSwitch
                                    checked={mod.canView}
                                    onChange={() => handleToggleAction(mod.moduleCode, 'canView')}
                                    ariaLabel={`สิทธิ์ดูข้อมูล ${mod.moduleName}`}
                                  />
                                </td>

                                {/* Action: สร้าง (Create) */}
                                <td className="py-3 px-3 text-center">
                                  <ActionSwitch
                                    checked={mod.canCreate}
                                    onChange={() => handleToggleAction(mod.moduleCode, 'canCreate')}
                                    ariaLabel={`สิทธิ์สร้างข้อมูล ${mod.moduleName}`}
                                  />
                                </td>

                                {/* Action: แก้ไข (Edit) */}
                                <td className="py-3 px-3 text-center">
                                  <ActionSwitch
                                    checked={mod.canEdit}
                                    onChange={() => handleToggleAction(mod.moduleCode, 'canEdit')}
                                    ariaLabel={`สิทธิ์แก้ไขข้อมูล ${mod.moduleName}`}
                                  />
                                </td>

                                {/* Action: อนุมัติ (Approve) */}
                                <td className="py-3 px-3 text-center">
                                  <ActionSwitch
                                    checked={mod.canApprove}
                                    onChange={() => handleToggleAction(mod.moduleCode, 'canApprove')}
                                    ariaLabel={`สิทธิ์อนุมัติข้อมูล ${mod.moduleName}`}
                                  />
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
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

