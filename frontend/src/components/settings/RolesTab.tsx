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
  Info,
} from 'lucide-react';
import {
  RoleSummary,
  RoleDetail,
  ModulePermissionScope,
  UpdateRoleMatrixRequest,
} from '@/types/settings';
import { useToast } from '@/context/ToastContext';

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
const Checkbox: React.FC<{
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
}> = ({ checked, indeterminate = false, onChange, title, ariaLabel, disabled }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className="w-4 h-4 rounded border-slate-300 text-[#0B2046] focus:ring-[#0B2046]/20 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    />
  );
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  EMPLOYEE: Users,
  ATTENDANCE: Clock,
  LEAVE: CalendarCheck,
  PAYROLL: CreditCard,
  ORGANIZATION: Building2,
  SETTINGS: Settings,
  REPORT: BarChart3,
};

const SCOPES_CONFIG: {
  key: 'self' | 'team' | 'department' | 'division' | 'organization';
  label: string;
  badgeBg: string;
  badgeText: string;
  headerBg: string;
}[] = [
  { key: 'self', label: 'ตัวเอง', badgeBg: 'bg-slate-100', badgeText: 'text-slate-800', headerBg: 'bg-slate-100/90' },
  { key: 'team', label: 'ทีม', badgeBg: 'bg-blue-50', badgeText: 'text-blue-800', headerBg: 'bg-blue-50/80' },
  { key: 'department', label: 'แผนก', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-800', headerBg: 'bg-emerald-50/80' },
  { key: 'division', label: 'ฝ่าย', badgeBg: 'bg-purple-50', badgeText: 'text-purple-800', headerBg: 'bg-purple-50/80' },
  { key: 'organization', label: 'องค์กร', badgeBg: 'bg-amber-50', badgeText: 'text-amber-800', headerBg: 'bg-amber-50/80' },
];

const ACTIONS_CONFIG: {
  key: 'view' | 'create' | 'edit' | 'approve';
  label: string;
  title: string;
  color: string;
}[] = [
  { key: 'view', label: 'ดู', title: 'ดูข้อมูล', color: 'text-blue-700' },
  { key: 'create', label: 'สร้าง', title: 'สร้างข้อมูล', color: 'text-emerald-700' },
  { key: 'edit', label: 'แก้ไข', title: 'แก้ไขข้อมูล', color: 'text-amber-700' },
  { key: 'approve', label: 'อนุมัติ', title: 'อนุมัติข้อมูล', color: 'text-purple-700' },
];

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
  const toast = useToast();
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

  const normalizeModules = (mods: ModulePermissionScope[]): ModulePermissionScope[] =>
    mods.map((m) => {
      const defaultPerms = () => ({
        view: false,
        create: false,
        edit: false,
        approve: false,
      });

      const self = m.self ? { ...m.self } : defaultPerms();
      const team = m.team ? { ...m.team } : defaultPerms();
      const department = m.department ? { ...m.department } : defaultPerms();
      const division = m.division ? { ...m.division } : defaultPerms();
      const organization = m.organization ? { ...m.organization } : defaultPerms();

      // Legacy fallback: if all scopes are false but legacy canView/Create/Edit/Approve was true
      const hasAny =
        self.view || self.create || self.edit || self.approve ||
        team.view || team.create || team.edit || team.approve ||
        department.view || department.create || department.edit || department.approve ||
        division.view || division.create || division.edit || division.approve ||
        organization.view || organization.create || organization.edit || organization.approve;

      if (!hasAny) {
        const scStr = (m.dataScope || 'SELF').toUpperCase();
        const target =
          scStr === 'ORGANIZATION' ? organization :
          scStr === 'DIVISION' ? division :
          scStr === 'DEPARTMENT' ? department :
          scStr === 'TEAM' ? team : self;

        if (m.canView) target.view = true;
        if (m.canCreate) target.create = true;
        if (m.canEdit) target.edit = true;
        if (m.canApprove) target.approve = true;
      }

      return {
        ...m,
        self,
        team,
        department,
        division,
        organization,
      };
    });

  // Sync local matrix state when selected role changes or after save refetch
  useEffect(() => {
    if (selectedRoleMatrix) {
      if (lastRoleIdRef.current !== selectedRoleMatrix.id) {
        setLocalModules(normalizeModules(selectedRoleMatrix.modules));
        setIsDirty(false);
        setSaveSuccessMsg(false);
        lastRoleIdRef.current = selectedRoleMatrix.id;
      } else if (!isDirty) {
        setLocalModules(normalizeModules(selectedRoleMatrix.modules));
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

  // Toggle individual checkbox for a specific module, scope, and action
  const handleToggleCheckbox = (
    moduleCode: string,
    scopeKey: 'self' | 'team' | 'department' | 'division' | 'organization',
    actionKey: 'view' | 'create' | 'edit' | 'approve'
  ) => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        if (mod.moduleCode !== moduleCode) return mod;
        const currentScopeObj = mod[scopeKey] || { view: false, create: false, edit: false, approve: false };
        return {
          ...mod,
          [scopeKey]: {
            ...currentScopeObj,
            [actionKey]: !currentScopeObj[actionKey],
          },
        };
      })
    );
    setIsDirty(true);
  };

  // Toggle category master checkbox for a specific scope and action
  const handleToggleCategoryCheckbox = (
    catCode: string,
    scopeKey: 'self' | 'team' | 'department' | 'division' | 'organization',
    actionKey: 'view' | 'create' | 'edit' | 'approve'
  ) => {
    setLocalModules((prev) => {
      const catMods = prev.filter((m) => (m.categoryCode || m.groupName || 'OTHER') === catCode);
      const allChecked = catMods.length > 0 && catMods.every((m) => m[scopeKey]?.[actionKey]);
      const nextVal = !allChecked;

      return prev.map((mod) => {
        const thisCat = mod.categoryCode || mod.groupName || 'OTHER';
        if (thisCat !== catCode) return mod;

        const currentScopeObj = mod[scopeKey] || { view: false, create: false, edit: false, approve: false };
        return {
          ...mod,
          [scopeKey]: {
            ...currentScopeObj,
            [actionKey]: nextVal,
          },
        };
      });
    });
    setIsDirty(true);
  };

  // Toggle all checkboxes in an entire category
  const handleToggleCategoryAll = (catCode: string) => {
    setLocalModules((prev) => {
      const catMods = prev.filter((m) => (m.categoryCode || m.groupName || 'OTHER') === catCode);
      const scopes: ('self' | 'team' | 'department' | 'division' | 'organization')[] = [
        'self', 'team', 'department', 'division', 'organization'
      ];
      const actions: ('view' | 'create' | 'edit' | 'approve')[] = ['view', 'create', 'edit', 'approve'];

      const allOn = catMods.length > 0 && catMods.every((m) => scopes.every((s) => actions.every((a) => m[s]?.[a])));
      const nextVal = !allOn;

      return prev.map((mod) => {
        const thisCat = mod.categoryCode || mod.groupName || 'OTHER';
        if (thisCat !== catCode) return mod;

        const updated = { ...mod };
        scopes.forEach((s) => {
          updated[s] = {
            view: nextVal,
            create: nextVal,
            edit: nextVal,
            approve: nextVal,
          };
        });

        return updated;
      });
    });
    setIsDirty(true);
  };

  // Toggle all checkboxes in a single row
  const handleToggleAllRow = (moduleCode: string) => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        if (mod.moduleCode !== moduleCode) return mod;
        const scopes: ('self' | 'team' | 'department' | 'division' | 'organization')[] = [
          'self', 'team', 'department', 'division', 'organization'
        ];
        const actions: ('view' | 'create' | 'edit' | 'approve')[] = ['view', 'create', 'edit', 'approve'];

        const allOn = scopes.every((s) => actions.every((a) => mod[s]?.[a]));
        const nextVal = !allOn;

        const updated = { ...mod };
        scopes.forEach((s) => {
          updated[s] = {
            view: nextVal,
            create: nextVal,
            edit: nextVal,
            approve: nextVal,
          };
        });

        return updated;
      })
    );
    setIsDirty(true);
  };

  // Global Quick Action: Select All Permissions (View, Create, Edit, Approve) across all 22 modules and all scopes
  const handleSelectAll = () => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        const fullPerms = { view: true, create: true, edit: true, approve: true };
        return {
          ...mod,
          self: { ...fullPerms },
          team: { ...fullPerms },
          department: { ...fullPerms },
          division: { ...fullPerms },
          organization: { ...fullPerms },
        };
      })
    );
    setIsDirty(true);
  };

  // Global Quick Action: Select All "View" Only across all 22 modules and all scopes
  const handleSelectAllView = () => {
    setLocalModules((prev) =>
      prev.map((mod) => ({
        ...mod,
        self: { ...(mod.self || {}), view: true, create: false, edit: false, approve: false },
        team: { ...(mod.team || {}), view: true, create: false, edit: false, approve: false },
        department: { ...(mod.department || {}), view: true, create: false, edit: false, approve: false },
        division: { ...(mod.division || {}), view: true, create: false, edit: false, approve: false },
        organization: { ...(mod.organization || {}), view: true, create: false, edit: false, approve: false },
      }))
    );
    setIsDirty(true);
  };

  // Global Quick Action: Deselect All Permissions across all 22 modules
  const handleDeselectAll = () => {
    if (selectedRoleMatrix?.roleCode === 'ADMIN' || selectedRoleMatrix?.roleCode === 'SYSTEM_SUPER') {
      toast.warning('บทบาทผู้ดูแลระบบสูงสุดจำเป็นต้องมีสิทธิ์เข้าถึงระบบอย่างน้อย 1 สิทธิ์ (Lockout Protection)');
    }

    setLocalModules((prev) =>
      prev.map((mod) => {
        const emptyPerms = { view: false, create: false, edit: false, approve: false };
        return {
          ...mod,
          self: { ...emptyPerms },
          team: { ...emptyPerms },
          department: { ...emptyPerms },
          division: { ...emptyPerms },
          organization: { ...emptyPerms },
        };
      })
    );
    setIsDirty(true);
  };

  // Toggle entire column (all modules for a given scope and action)
  const handleToggleColumn = (
    scopeKey: 'self' | 'team' | 'department' | 'division' | 'organization',
    actionKey: 'view' | 'create' | 'edit' | 'approve'
  ) => {
    setLocalModules((prev) => {
      const allOn = prev.every((m) => m[scopeKey]?.[actionKey]);
      const nextVal = !allOn;

      return prev.map((mod) => ({
        ...mod,
        [scopeKey]: {
          ...(mod[scopeKey] || { view: false, create: false, edit: false, approve: false }),
          [actionKey]: nextVal,
        },
      }));
    });
    setIsDirty(true);
  };

  const handleReset = () => {
    if (selectedRoleMatrix) {
      setLocalModules(normalizeModules(JSON.parse(JSON.stringify(selectedRoleMatrix.modules))));
      setIsDirty(false);
    }
  };

  const handleSave = async () => {
    if (!selectedRoleMatrix) return;

    const hasAnyPermission = localModules.some((m) => {
      const scopes: ('self' | 'team' | 'department' | 'division' | 'organization')[] = [
        'self', 'team', 'department', 'division', 'organization'
      ];
      return scopes.some((s) => m[s]?.view || m[s]?.create || m[s]?.edit || m[s]?.approve);
    });

    // Lockout Protection: Cannot revoke all access for super admins
    if (
      (selectedRoleMatrix.roleCode === 'ADMIN' || selectedRoleMatrix.roleCode === 'SYSTEM_SUPER') &&
      !hasAnyPermission
    ) {
      toast.error('ไม่อนุญาตให้ยกเลิกสิทธิ์ทั้งหมดของบทบาทผู้ดูแลระบบสูงสุด (Lockout Protection)');
      return;
    }

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

              {/* Informative Tip on Granular Action Scopes */}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/80 border border-blue-200/70 rounded-xl text-xs text-blue-900 shadow-2xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="leading-relaxed">
                  💡 <strong>ความยืดหยุ่นขอบเขตข้อมูล:</strong> คุณสามารถติ๊กเลือกสิทธิ์ <strong>ดู, สร้าง, แก้ไข, อนุมัติ</strong> ในแต่ละระดับขอบเขต (ตัวเอง, ทีม, แผนก, ฝ่าย, องค์กร) ได้อย่างอิสระตามต้องการ เช่น ติ๊กแก้ไขได้เฉพาะระดับทีม แต่ระดับแผนกและฝ่ายสามารถติ๊กเลือกเฉพาะดูได้
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    {/* Row 1: Scope Group Headers */}
                    <tr className="border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                      <th rowSpan={2} className="py-3 px-4 min-w-[200px] bg-slate-100/90 border-r border-slate-200">
                        ชื่อโมดูล / เมนูย่อย
                      </th>
                      {SCOPES_CONFIG.map((sc) => (
                        <th
                          key={sc.key}
                          colSpan={4}
                          className={`py-2 px-2 text-center border-r border-slate-200 ${sc.headerBg}`}
                        >
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${sc.badgeBg} ${sc.badgeText}`}>
                            {sc.label}
                          </span>
                        </th>
                      ))}
                      <th rowSpan={2} className="py-3 px-3 min-w-[70px] text-center bg-slate-100/90">
                        สลับแถว
                      </th>
                    </tr>

                    {/* Row 2: Action Headers under each Scope */}
                    <tr className="border-b border-slate-200 text-slate-600 font-semibold text-[10px] bg-slate-50/90">
                      {SCOPES_CONFIG.map((sc) =>
                        ACTIONS_CONFIG.map((act) => (
                          <th
                            key={`${sc.key}-${act.key}`}
                            onClick={() => handleToggleColumn(sc.key, act.key)}
                            className="py-2 px-1 text-center cursor-pointer hover:bg-slate-200/80 transition-colors select-none border-r border-slate-100"
                            title={`คลิกเพื่อสลับเปิด/ปิดทั้งคอลัมน์ (${sc.label} - ${act.label})`}
                          >
                            <span className={act.color}>{act.label}</span>
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {categories.map((cat) => {
                      const isExpanded = expandedCategories[cat.code] ?? true;
                      const IconComponent = CATEGORY_ICONS[cat.code] || Layers;

                      return (
                        <React.Fragment key={cat.code}>
                          {/* ================= CATEGORY MASTER ROW ================= */}
                          <tr className="bg-slate-100/90 hover:bg-slate-200/70 border-t-2 border-slate-200 transition-colors font-medium">
                            {/* Category Header & Expand Toggle */}
                            <td className="py-2 px-3 border-r border-slate-200">
                              <div
                                onClick={() => toggleCategory(cat.code)}
                                className="flex items-center gap-2 cursor-pointer select-none group"
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

                            {/* 20 Category Master Checkboxes */}
                            {SCOPES_CONFIG.map((sc) =>
                              ACTIONS_CONFIG.map((act) => {
                                const allChecked =
                                  cat.modules.length > 0 && cat.modules.every((m) => m[sc.key]?.[act.key]);
                                const someChecked = cat.modules.some((m) => m[sc.key]?.[act.key]);

                                return (
                                  <td
                                    key={`${sc.key}-${act.key}`}
                                    className="py-2 px-1 text-center align-middle border-r border-slate-100"
                                  >
                                    <Checkbox
                                      checked={allChecked}
                                      indeterminate={someChecked && !allChecked}
                                      onChange={() => handleToggleCategoryCheckbox(cat.code, sc.key, act.key)}
                                      title={`เลือก/ยกเลิกทั้งหมวด ${cat.name} (${sc.label} - ${act.label})`}
                                      ariaLabel={`เลือก/ยกเลิกทั้งหมวด ${cat.name} ${sc.label} ${act.label}`}
                                    />
                                  </td>
                                );
                              })
                            )}

                            {/* Category Toggle All Button */}
                            <td className="py-2 px-2 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => handleToggleCategoryAll(cat.code)}
                                className="px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:text-[#0B2046] bg-white hover:bg-slate-50 border border-slate-200 rounded shadow-2xs cursor-pointer transition-colors whitespace-nowrap"
                                title={`สลับเปิด/ปิดทุกสิทธิ์ในหมวด ${cat.name}`}
                              >
                                สลับหมวด
                              </button>
                            </td>
                          </tr>

                          {/* ================= SUB-MODULE ROWS ================= */}
                          {isExpanded &&
                            cat.modules.map((mod) => (
                              <tr
                                key={mod.moduleCode}
                                className="bg-white hover:bg-slate-50/70 transition-colors border-b border-slate-100"
                              >
                                {/* Sub-module Name */}
                                <td className="py-2.5 px-3 pl-8 border-r border-slate-200">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-slate-400 font-mono text-xs select-none">↳</span>
                                    <span className="font-medium text-slate-800 text-xs truncate" title={mod.moduleName}>
                                      {mod.moduleName}
                                    </span>
                                  </div>
                                </td>

                                {/* 20 Independent Checkboxes */}
                                {SCOPES_CONFIG.map((sc) =>
                                  ACTIONS_CONFIG.map((act) => {
                                    const isChecked = !!mod[sc.key]?.[act.key];

                                    return (
                                      <td
                                        key={`${sc.key}-${act.key}`}
                                        className="py-2 px-1 text-center align-middle border-r border-slate-100"
                                      >
                                        <Checkbox
                                          checked={isChecked}
                                          onChange={() => handleToggleCheckbox(mod.moduleCode, sc.key, act.key)}
                                          title={`${mod.moduleName} - ${sc.label}: ${act.label}`}
                                          ariaLabel={`${mod.moduleName} ${sc.label} ${act.label}`}
                                        />
                                      </td>
                                    );
                                  })
                                )}

                                {/* Row Toggle All Button */}
                                <td className="py-2 px-2 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAllRow(mod.moduleCode)}
                                    className="px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-[#0B2046] hover:bg-slate-100 rounded border border-slate-200 cursor-pointer transition-colors whitespace-nowrap"
                                    title={`สลับเปิด/ปิดทุกสิทธิ์ในแถว ${mod.moduleName}`}
                                  >
                                    สลับแถว
                                  </button>
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

