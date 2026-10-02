'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  Check,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
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
  LayoutDashboard,
  Wallet,
  User,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  FileText,
  Megaphone,
  Database,
} from 'lucide-react';
import {
  RoleSummary,
  RoleDetail,
  ModulePermissionScope,
  UpdateRoleMatrixRequest,
} from '@/types/settings';
import { useToast } from '@/context/ToastContext';

interface ActivePopoverState {
  moduleCode: string;
  scopeKey: 'self' | 'team' | 'department' | 'division' | 'organization';
  top?: number;
  bottom?: number;
  left: number;
}

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

/* ─── Toggle Switch Component ─── */
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}> = ({ checked, onChange, disabled = false, size = 'md' }) => {
  const isSm = size === 'sm';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      disabled={disabled}
      className={`relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${ isSm ? 'h-5 w-9' : 'h-6 w-11'
      } ${
        checked ? 'bg-[#0B2046]' : 'bg-slate-300 hover:bg-slate-400'
      } ${disabled ? 'opacity-40 !cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block transform rounded-full bg-white dark:bg-slate-800 shadow-sm transition-transform duration-200 ${ isSm ? checked ? 'h-3.5 w-3.5 translate-x-4.5' : 'h-3.5 w-3.5 translate-x-1'
            : checked ? 'h-4.5 w-4.5 translate-x-5.5' : 'h-4.5 w-4.5 translate-x-1'
        }`}
      />
    </button>
  );
};

/* ─── Constants: ไอคอนตรงตามเมนูใน Sidebar ครบทั้ง 19 เมนู ─── */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DASHBOARD: LayoutDashboard,
  EMPLOYEE: Users,
  MY_SALARY: Wallet,
  MY_PROFILE: User,
  MY_LEAVE: CalendarCheck,
  MY_ATTENDANCE: CalendarDays,
  MY_NEWS: Megaphone,
  MY_DOCS: FileText,
  ATTENDANCE_DAILY: CalendarDays,
  ATTENDANCE_SCHEDULE: CalendarRange,
  LEAVE: CalendarCheck,
  PAYROLL: CreditCard,
  APPROVALS: CheckCircle2,
  ORGANIZATION: Building2,
  WORK_CALENDAR: CalendarDays,
  REPORT: BarChart3,
  ANNOUNCEMENTS: Megaphone,
  MASTER_DATA: Database,
  SETTINGS: Settings,
};

/** ชื่อหมวดหมู่ตรงตามหัวข้อเมนู Sidebar */
const CATEGORY_NAMES: Record<string, string> = {
  DASHBOARD: 'แดชบอร์ด',
  EMPLOYEE: 'พนักงาน',
  MY_SALARY: 'เงินเดือนของฉัน',
  MY_PROFILE: 'โปรไฟล์ของฉัน (ESS)',
  MY_LEAVE: 'ยอดวันลาคงเหลือ',
  MY_ATTENDANCE: 'บันทึกเวลาของฉัน (ESS)',
  MY_NEWS: 'ข่าวสารสำหรับฉัน',
  MY_DOCS: 'ยื่นเอกสาร',
  ATTENDANCE_DAILY: 'ตรวจบันทึกเวลา',
  ATTENDANCE_SCHEDULE: 'การจัดตารางงาน',
  LEAVE: 'การลา',
  PAYROLL: 'เงินเดือน',
  APPROVALS: 'การอนุมัติ',
  ORGANIZATION: 'โครงสร้างองค์กร',
  WORK_CALENDAR: 'วันทำงานและวันหยุด',
  REPORT: 'รายงาน',
  ANNOUNCEMENTS: 'จัดการประกาศ',
  MASTER_DATA: 'ข้อมูลหลัก (Master Data)',
  SETTINGS: 'ตั้งค่า',
};

/** หมวดหมู่ของระบบ ESS ที่จำกัดขอบเขตเฉพาะข้อมูลตนเอง (Self Only) เท่านั้น */
const ESS_CATEGORY_CODES = new Set<string>([
  'MY_SALARY',
  'MY_PROFILE',
  'MY_LEAVE',
  'MY_ATTENDANCE',
  'MY_DOCS',
]);

const SCOPES_CONFIG: {
  key: 'self' | 'team' | 'department' | 'division' | 'organization';
  label: string;
}[] = [
  { key: 'self', label: 'ตัวเอง' },
  { key: 'team', label: 'ทีม' },
  { key: 'department', label: 'แผนก' },
  { key: 'division', label: 'ฝ่าย' },
  { key: 'organization', label: 'องค์กร' },
];

const ACTIONS_CONFIG: {
  key: 'view' | 'create' | 'edit';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'view', label: 'ดูข้อมูล (View)', icon: Eye },
  { key: 'create', label: 'สร้าง (Create)', icon: Plus },
  { key: 'edit', label: 'แก้ไข (Edit)', icon: Edit2 },
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

  /* ── State ── */
  const [searchRole, setSearchRole] = useState('');
  const [searchModuleQuery, setSearchModuleQuery] = useState('');
  const [localModules, setLocalModules] = useState<ModulePermissionScope[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Accordion expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Active Scope Popover Portal State
  const [activePopover, setActivePopover] = useState<ActivePopoverState | null>(null);

  // Close popover when scrolling or resizing
  useEffect(() => {
    if (!activePopover) return;
    const handleDismiss = () => setActivePopover(null);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [activePopover]);

  const [rightPaneHeight, setRightPaneHeight] = useState<number | null>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rightPaneRef.current) return;
    const updateHeight = () => {
      if (rightPaneRef.current) {
        setRightPaneHeight(rightPaneRef.current.offsetHeight);
      }
    };
    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(rightPaneRef.current);
    return () => resizeObserver.disconnect();
  }, [selectedRoleMatrix, expandedCategories]);

  const lastRoleIdRef = useRef<number | null>(null);

  /* ── Normalize legacy data ── */
  const normalizeModules = (mods: ModulePermissionScope[]): ModulePermissionScope[] =>
    mods.map((m) => {
      const def = () => ({ view: false, create: false, edit: false, approve: false });
      const self = m.self ? { ...m.self } : def();
      const team = m.team ? { ...m.team } : def();
      const department = m.department ? { ...m.department } : def();
      const division = m.division ? { ...m.division } : def();
      const organization = m.organization ? { ...m.organization } : def();

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

      // หากเป็นหมวดหมู่ ESS บังคับให้ขอบเขตข้อมูลเป็น Self Only เสมอ (เคลียร์ team, dept, div, org ออกทั้งหมด)
      const isEssModule = ESS_CATEGORY_CODES.has(m.categoryCode || '') || ESS_CATEGORY_CODES.has(m.groupName || '');
      if (isEssModule) {
        return {
          ...m,
          self,
          team: def(),
          department: def(),
          division: def(),
          organization: def(),
        };
      }

      return { ...m, self, team, department, division, organization };
    });

  /* ── Sync matrix state when selected role changes ── */
  useEffect(() => {
    if (selectedRoleMatrix) {
      if (lastRoleIdRef.current !== selectedRoleMatrix.id) {
        const normalized = normalizeModules(selectedRoleMatrix.modules);
        setLocalModules(normalized);
        setIsDirty(false);
        setSaveSuccessMsg(false);
        lastRoleIdRef.current = selectedRoleMatrix.id;
        setActivePopover(null);
        setExpandedCategories(new Set());
      } else if (!isDirty) {
        setLocalModules(normalizeModules(selectedRoleMatrix.modules));
      }
    }
  }, [selectedRoleMatrix, isDirty]);

  /* ── Derived Categories ── */
  const categories = useMemo(() => {
    const map = new Map<string, { code: string; name: string; modules: ModulePermissionScope[] }>();
    localModules.forEach((mod) => {
      const code = mod.categoryCode || mod.groupName || 'OTHER';
      const name = CATEGORY_NAMES[code] || mod.categoryName || mod.groupName || 'หมวดหมู่อื่นๆ';
      if (!map.has(code)) map.set(code, { code, name, modules: [] });
      map.get(code)!.modules.push(mod);
    });
    return Array.from(map.values());
  }, [localModules]);

  /* ── Search Filter ── */
  const filteredCategories = useMemo(() => {
    if (!searchModuleQuery.trim()) return categories;
    const q = searchModuleQuery.toLowerCase().trim();
    return categories
      .map((cat) => {
        const matchingModules = cat.modules.filter(
          (m) =>
            m.moduleName.toLowerCase().includes(q) ||
            m.moduleCode.toLowerCase().includes(q) ||
            cat.name.toLowerCase().includes(q)
        );
        return {
          ...cat,
          modules: matchingModules,
        };
      })
      .filter((cat) => cat.modules.length > 0);
  }, [categories, searchModuleQuery]);

  // Auto-expand categories matching search
  useEffect(() => {
    if (searchModuleQuery.trim()) {
      setExpandedCategories(new Set(filteredCategories.map((c) => c.code)));
    }
  }, [searchModuleQuery, filteredCategories]);

  /* ── Left Pane Filtered Roles ── */
  const filteredRoles = roles.filter(
    (r) =>
      r.roleCode.toLowerCase().includes(searchRole.toLowerCase().trim()) ||
      r.roleName.toLowerCase().includes(searchRole.toLowerCase().trim())
  );

  /* ── Module Helpers ── */
  const isModuleActive = (mod: ModulePermissionScope): boolean => {
    if (mod.categoryCode === 'DASHBOARD' || mod.groupName === 'DASHBOARD') {
      return Boolean(
        mod.canView ||
        mod.self?.view ||
        mod.team?.view ||
        mod.department?.view ||
        mod.division?.view ||
        mod.organization?.view
      );
    }
    const scopes = ['self', 'team', 'department', 'division', 'organization'] as const;
    return scopes.some((s) => mod[s]?.view || mod[s]?.create || mod[s]?.edit);
  };

  const getScopeActiveCount = (
    mod: ModulePermissionScope,
    scopeKey: 'self' | 'team' | 'department' | 'division' | 'organization'
  ): number => {
    const sc = mod[scopeKey];
    if (!sc) return 0;
    return (sc.view ? 1 : 0) + (sc.create ? 1 : 0) + (sc.edit ? 1 : 0);
  };

  /* ── Toggle Handlers ── */
  const toggleCategoryExpand = (catCode: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catCode)) {
        next.delete(catCode);
      } else {
        next.add(catCode);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedCategories(new Set(categories.map((c) => c.code)));
  };

  const handleCollapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Master switch per module
  const handleToggleModule = (moduleCode: string) => {
    setLocalModules((prev) =>
      prev.map((m) => {
        if (m.moduleCode !== moduleCode) return m;

        const active = isModuleActive(m);
        if (active) {
          // Turn completely OFF
          const empty = { view: false, create: false, edit: false, approve: false };
          return {
            ...m,
            canView: false,
            self: { ...empty },
            team: { ...empty },
            department: { ...empty },
            division: { ...empty },
            organization: { ...empty },
          };
        } else {
          // Turn ON (default: self view = true)
          if (m.categoryCode === 'DASHBOARD' || m.groupName === 'DASHBOARD') {
            return {
              ...m,
              canView: true,
              self: { view: true, create: false, edit: false, approve: false },
            };
          }
          return {
            ...m,
            self: { view: true, create: false, edit: false, approve: false },
          };
        }
      })
    );
    setIsDirty(true);
  };

  // Master switch per category
  const handleToggleCategory = (catCode: string) => {
    const cat = categories.find((c) => c.code === catCode);
    if (!cat) return;

    const anyActive = cat.modules.some((m) => isModuleActive(m));
    const modCodes = new Set(cat.modules.map((m) => m.moduleCode));

    setLocalModules((prev) =>
      prev.map((m) => {
        if (!modCodes.has(m.moduleCode)) return m;
        if (anyActive) {
          // Turn all off
          const empty = { view: false, create: false, edit: false, approve: false };
          return {
            ...m,
            canView: false,
            self: { ...empty },
            team: { ...empty },
            department: { ...empty },
            division: { ...empty },
            organization: { ...empty },
          };
        } else {
          // Turn all on
          if (m.categoryCode === 'DASHBOARD' || m.groupName === 'DASHBOARD') {
            return {
              ...m,
              canView: true,
              self: { view: true, create: false, edit: false, approve: false },
            };
          }
          return {
            ...m,
            self: { view: true, create: false, edit: false, approve: false },
          };
        }
      })
    );
    setIsDirty(true);
  };

  // Toggle specific action in a scope
  const handleToggleScopeAction = (
    moduleCode: string,
    scopeKey: 'self' | 'team' | 'department' | 'division' | 'organization',
    actionKey: 'view' | 'create' | 'edit'
  ) => {
    setLocalModules((prev) =>
      prev.map((m) => {
        if (m.moduleCode !== moduleCode) return m;
        const currentScope = m[scopeKey] || { view: false, create: false, edit: false, approve: false };
        const updatedScope = {
          ...currentScope,
          [actionKey]: !currentScope[actionKey],
        };
        return {
          ...m,
          [scopeKey]: updatedScope,
        };
      })
    );
    setIsDirty(true);
  };

  // Select all or clear all actions for a scope
  const handleSetAllScopeActions = (
    moduleCode: string,
    scopeKey: 'self' | 'team' | 'department' | 'division' | 'organization',
    enable: boolean
  ) => {
    setLocalModules((prev) =>
      prev.map((m) => {
        if (m.moduleCode !== moduleCode) return m;
        return {
          ...m,
          [scopeKey]: { view: enable, create: enable, edit: enable, approve: false },
        };
      })
    );
    setIsDirty(true);
  };

  const handleOpenPopover = (
    e: React.MouseEvent<HTMLButtonElement>,
    moduleCode: string,
    scopeKey: 'self' | 'team' | 'department' | 'division' | 'organization'
  ) => {
    e.stopPropagation();
    if (activePopover?.moduleCode === moduleCode && activePopover?.scopeKey === scopeKey) {
      setActivePopover(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 288;
    const popoverHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < popoverHeight && rect.top > popoverHeight;

    const left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, rect.right - popoverWidth));

    if (openUpward) {
      setActivePopover({
        moduleCode,
        scopeKey,
        bottom: window.innerHeight - rect.top + 6,
        left,
      });
    } else {
      setActivePopover({
        moduleCode,
        scopeKey,
        top: rect.bottom + 6,
        left,
      });
    }
  };

  const activeMod = useMemo(() => {
    if (!activePopover) return null;
    return localModules.find((m) => m.moduleCode === activePopover.moduleCode) || null;
  }, [activePopover, localModules]);

  const activeScopeConfig = useMemo(() => {
    if (!activePopover) return null;
    return SCOPES_CONFIG.find((s) => s.key === activePopover.scopeKey) || null;
  }, [activePopover]);

  // Global toolbar actions
  const handleSelectAll = () => {
    setLocalModules((prev) =>
      prev.map((m) => {
        if (m.categoryCode === 'DASHBOARD' || m.groupName === 'DASHBOARD') {
          return { ...m, canView: true, self: { view: true, create: false, edit: false, approve: false } };
        }
        const isEss = ESS_CATEGORY_CODES.has(m.categoryCode || '') || ESS_CATEGORY_CODES.has(m.groupName || '');
        if (isEss) {
          const full = { view: true, create: true, edit: true, approve: false };
          const empty = { view: false, create: false, edit: false, approve: false };
          return {
            ...m,
            self: { ...full },
            team: { ...empty },
            department: { ...empty },
            division: { ...empty },
            organization: { ...empty },
          };
        }
        const full = { view: true, create: true, edit: true, approve: false };
        return {
          ...m,
          self: { ...full },
          team: { ...full },
          department: { ...full },
          division: { ...full },
          organization: { ...full },
        };
      })
    );
    setIsDirty(true);
    toast.success('เปิดสิทธิ์ทั้งหมดเรียบร้อยแล้ว');
  };

  const handleDeselectAll = () => {
    setLocalModules((prev) =>
      prev.map((m) => {
        const empty = { view: false, create: false, edit: false, approve: false };
        return {
          ...m,
          canView: false,
          self: { ...empty },
          team: { ...empty },
          department: { ...empty },
          division: { ...empty },
          organization: { ...empty },
        };
      })
    );
    setIsDirty(true);
    toast.info('ยกเลิกสิทธิ์ทั้งหมดเรียบร้อยแล้ว');
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!selectedRoleMatrix) return;
    const scopes = ['self', 'team', 'department', 'division', 'organization'] as const;
    const hasAnyPermission = localModules.some((m) =>
      m.canView || scopes.some((s) => m[s]?.view || m[s]?.create || m[s]?.edit || m[s]?.approve)
    );
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
      // Error handled by parent
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full">

      {/* =========== LEFT PANE: ROLES LIST (4 cols lg, 3 cols xl) =========== */}
      <div className="lg:col-span-4 xl:col-span-3 space-y-3">
        {/* Search & Add */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchRole}
              onChange={(e) => setSearchRole(e.target.value)}
              placeholder="ค้นหาบทบาท..."
              className="w-full h-9.5 pl-8 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500"
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
        <div
          style={{ maxHeight: rightPaneHeight ? `${Math.max(380, rightPaneHeight - 52)}px` : 'calc(100vh - 280px)' }}
          className="space-y-2.5 overflow-y-auto pr-1"
        >
          {filteredRoles.map((role) => {
            const isSelected = selectedRoleMatrix?.id === role.id;
            return (
              <div
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${ isSelected ? 'bg-white border-[#0B2046] ring-2 ring-[#0B2046]/10 shadow-sm'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                        {role.roleCode}
                      </span>
                      {role.isSystemDefault && (
                        <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/60 rounded text-[9px] font-semibold">
                          System Default
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {role.roleName}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    ใช้งานอยู่
                  </span>
                </div>

                {role.description && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                    {role.description}
                  </p>
                )}

                {!role.isSystemDefault && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-3 text-[11px]">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditRoleClick(role); }}
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /><span>แก้ไข</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteRoleClick(role); }}
                      className="text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /><span>ลบ</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =========== RIGHT PANE: ACCORDION PERMISSION MANAGEMENT =========== */}
      <div
        ref={rightPaneRef}
        className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-5 sm:p-6 space-y-4"
      >
        {selectedRoleMatrix ? (
          <>
            {/* 1. Header Information */}
            <div className="pb-3 border-b border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>ตั้งค่าสิทธิ์สำหรับ:</span>
                  <span className="text-[#0B2046] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    {selectedRoleMatrix.roleCode}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedRoleMatrix.description || selectedRoleMatrix.roleName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  {localModules.length} โมดูลในระบบ
                </span>
              </div>
            </div>

            {/* 2. Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  หุบทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  ขยายทั้งหมด
                </button>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิกทั้งหมด
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchModuleQuery}
                  onChange={(e) => setSearchModuleQuery(e.target.value)}
                  placeholder="ค้นหากลุ่มหรือสิทธิ์..."
                  className="w-full h-9 pl-8 pr-3 bg-slate-50 dark:bg-slate-950 hover:bg-white focus:bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/90 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500 transition-all"
                />
                {searchModuleQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchModuleQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 3. Accordion Group List */}
            <div className="space-y-3 pt-2">
              {filteredCategories.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                  ไม่พบโมดูลหรือสิทธิ์ที่ค้นหา &quot;{searchModuleQuery}&quot;
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const isExpanded = expandedCategories.has(cat.code);
                  const IconComp = CATEGORY_ICONS[cat.code] || Layers;
                  const activeModulesCount = cat.modules.filter((m) => isModuleActive(m)).length;
                  const isCatAllActive = activeModulesCount === cat.modules.length && cat.modules.length > 0;
                  const isCatPartial = activeModulesCount > 0 && activeModulesCount < cat.modules.length;

                  return (
                    <div
                      key={cat.code}
                      className="rounded-2xl border border-slate-200/90 overflow-hidden bg-white dark:bg-slate-800 shadow-2xs transition-all"
                    >
                      {/* Group Header */}
                      <div
                        onClick={() => toggleCategoryExpand(cat.code)}
                        className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${ isExpanded ? 'bg-slate-50/90 border-b border-slate-200/80'
                            : 'bg-white hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 transition-transform"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            )}
                          </button>
                          <div className="w-7 h-7 rounded-lg bg-[#0B2046]/5 text-[#0B2046] flex items-center justify-center shrink-0">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 tracking-tight">
                              {cat.name}
                            </span>
                            {ESS_CATEGORY_CODES.has(cat.code) && (
                              <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 px-2 py-0.5 rounded-full hidden sm:inline">
                                เฉพาะข้อมูลตนเอง (Self Only)
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ activeModulesCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {activeModulesCount}/{cat.modules.length} เปิดใช้
                            </span>
                          </div>
                        </div>

                        {/* Master Category Toggle */}
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                            {isCatAllActive ? 'เปิดทั้งหมด' : isCatPartial ? 'เปิดบางส่วน' : 'ปิดทั้งหมด'}
                          </span>
                          <ToggleSwitch
                            checked={isCatAllActive || isCatPartial}
                            onChange={() => handleToggleCategory(cat.code)}
                          />
                        </div>
                      </div>

                      {/* Group Content (Modules) */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100">
                          {cat.modules.map((mod) => {
                            const modActive = isModuleActive(mod);
                            const isDashboardCat = cat.code === 'DASHBOARD';
                            const isEssCat = ESS_CATEGORY_CODES.has(cat.code);
                            const availableScopes = isEssCat
                              ? SCOPES_CONFIG.filter((s) => s.key === 'self')
                              : SCOPES_CONFIG;

                            return (
                              <div
                                key={mod.moduleCode}
                                className={`px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${ modActive ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/30'
                                }`}
                              >
                                {/* Left: Module Title & Subtitle */}
                                <div className="flex items-start gap-2.5 min-w-[200px] flex-1">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ modActive ? 'bg-emerald-500' : 'bg-slate-300'
                                    }`}
                                  />
                                  <div>
                                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 leading-snug">
                                      {mod.moduleName}
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                      {mod.moduleCode}
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Controls */}
                                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                                  {/* Master Module Toggle */}
                                  <ToggleSwitch
                                    checked={modActive}
                                    onChange={() => handleToggleModule(mod.moduleCode)}
                                  />

                                  {/* Scope Pills (สำหรับโมดูลทั่วไปที่ไม่ใช่แดชบอร์ด) */}
                                  {!isDashboardCat && (
                                    <div className="flex items-center gap-1.5">
                                      {availableScopes.map((scope) => {
                                        const count = getScopeActiveCount(mod, scope.key);
                                        const isScopeActive = count > 0;
                                        const isPopoverOpen =
                                          activePopover?.moduleCode === mod.moduleCode &&
                                          activePopover?.scopeKey === scope.key;

                                        return (
                                          <button
                                            key={scope.key}
                                            type="button"
                                            disabled={!modActive}
                                            onClick={(e) => handleOpenPopover(e, mod.moduleCode, scope.key)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer select-none ${ !modActive ? 'bg-slate-100 text-slate-300 border-slate-200/60 cursor-not-allowed'
                                                : isScopeActive
                                                ? 'bg-[#0B2046] hover:bg-[#112d5e] text-white border-[#0B2046] shadow-2xs'
                                                : isPopoverOpen
                                                ? 'bg-slate-100 text-[#0B2046] border-slate-300 ring-2 ring-[#0B2046]/20'
                                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                                            }`}
                                          >
                                            <span>{scope.label}</span>
                                            {isScopeActive && (
                                              <span className="ml-1 text-[10px] opacity-90">
                                                ({count})
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 4. Bottom Sticky Save Bar */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-4 pb-2 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs z-20">
              <div className="flex items-center gap-2">
                {isDirty ? (
                  <span className="flex items-center gap-1.5 text-amber-600 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    มีการเปลี่ยนแปลงสิทธิ์ที่ยังไม่ได้บันทึก
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    สิทธิ์การใช้งานเป็นปัจจุบัน
                  </span>
                )}
                {saveSuccessMsg && (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in">
                    <Check className="w-4 h-4" /> บันทึกสิทธิ์สำเร็จ!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {isDirty && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedRoleMatrix) {
                        setLocalModules(normalizeModules(selectedRoleMatrix.modules));
                        setIsDirty(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                )}
                <button
                  type="button"
                  disabled={!isDirty || isSavingMatrix}
                  onClick={handleSave}
                  className="px-6 py-2 rounded-xl bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  {isSavingMatrix ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกสิทธิ์การใช้งาน</span>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-24 text-center text-slate-400 dark:text-slate-500 font-medium text-xs">
            เลือกบทบาททางด้านซ้ายเพื่อตั้งค่าสิทธิ์การเข้าถึง
          </div>
        )}
      </div>

      {/* Scope Details Popover Portal */}
      {activePopover && activeMod && activeScopeConfig && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999]">
          {/* Backdrop to close on click outside */}
          <div
            className="fixed inset-0 bg-transparent"
            onClick={() => setActivePopover(null)}
          />

          {/* Popover Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: `${activePopover.left}px`,
              ...(activePopover.top !== undefined ? { top: `${activePopover.top}px` } : {}),
              ...(activePopover.bottom !== undefined ? { bottom: `${activePopover.bottom}px` } : {}),
            }}
            className="w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 space-y-2.5 z-[100000] animate-in fade-in zoom-in-95 duration-100 select-none"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <div className="min-w-0 pr-2">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">
                  {activeMod.moduleName}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#0B2046] shrink-0" />
                  <span>ระดับ: {activeScopeConfig.label}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePopover(null)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Action Checkbox Options (View, Create, Edit) */}
            <div className="space-y-1.5">
              {ACTIONS_CONFIG.map((action) => {
                const isChecked = Boolean(
                  activeMod[activePopover.scopeKey]?.[action.key]
                );
                const Icon = action.icon;

                return (
                  <div
                    key={action.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleScopeAction(
                        activeMod.moduleCode,
                        activePopover.scopeKey,
                        action.key
                      );
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${ isChecked ? 'bg-blue-50/70 border-blue-200 text-blue-950 font-semibold shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200/70 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-3.5 h-3.5 ${ isChecked ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                      <span>{action.label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[#0B2046] focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 pointer-events-none cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>

            {/* Popover Footer Shortcuts */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetAllScopeActions(
                    activeMod.moduleCode,
                    activePopover.scopeKey,
                    true
                  );
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetAllScopeActions(
                    activeMod.moduleCode,
                    activePopover.scopeKey,
                    false
                  );
                }}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 cursor-pointer"
              >
                ล้างทั้งหมด
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

