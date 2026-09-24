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
  ChevronLeft,
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
  Shield,
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

/* ─── Checkbox (still used by quick-action toolbar area) ─── */
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
    if (ref.current) ref.current.indeterminate = indeterminate;
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

/* ─── iOS-style Toggle Switch ─── */
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  activeColor: string;
  label: string;
  disabled?: boolean;
}> = ({ checked, onChange, activeColor, label, disabled = false }) => (
  <div className="flex flex-col items-center gap-1.5">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 cursor-pointer ${
        checked ? activeColor : 'bg-slate-200 hover:bg-slate-300'
      } ${disabled ? 'opacity-40 !cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
    <span
      className={`text-[11px] font-semibold leading-none ${
        checked ? 'text-slate-800' : 'text-slate-400'
      }`}
    >
      {label}
    </span>
  </div>
);

/* ─── Constants: ไอคอนตรงตามเมนูใน Sidebar ครบทั้ง 19 เมนู ─── */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DASHBOARD: LayoutDashboard,
  EMPLOYEE: Users,
  MY_SALARY: Wallet,
  MY_PROFILE: User,
  MY_LEAVE: CalendarCheck,
  MY_ATTENDANCE: Clock,
  MY_NEWS: CalendarDays,
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

/** ชื่อหมวดหมู่ตรงตามหัวข้อเมนู Sidebar เพื่อให้ตั้งสิทธิ์ครอบคลุมแต่ละหน้า */
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


const SCOPES_CONFIG: {
  key: 'self' | 'team' | 'department' | 'division' | 'organization';
  label: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  rowBg: string;
  accentBorder: string;
  toggleOn: string;
}[] = [
  {
    key: 'self',
    label: 'ตัวเอง',
    description: 'มองเห็นเฉพาะข้อมูลของตัวเองเท่านั้น',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    rowBg: 'bg-slate-50/60',
    accentBorder: 'border-slate-400',
    toggleOn: 'bg-slate-600',
  },
  {
    key: 'team',
    label: 'ทีม',
    description: 'มองเห็นข้อมูลสมาชิกทีมภายใต้บังคับบัญชา',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    rowBg: 'bg-blue-50/40',
    accentBorder: 'border-blue-500',
    toggleOn: 'bg-blue-500',
  },
  {
    key: 'department',
    label: 'แผนก',
    description: 'มองเห็นข้อมูลพนักงานในแผนกเดียวกัน',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    rowBg: 'bg-emerald-50/40',
    accentBorder: 'border-emerald-500',
    toggleOn: 'bg-emerald-500',
  },
  {
    key: 'division',
    label: 'ฝ่าย',
    description: 'มองเห็นข้อมูลพนักงานในฝ่ายงานเดียวกัน',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    rowBg: 'bg-purple-50/40',
    accentBorder: 'border-purple-400',
    toggleOn: 'bg-purple-500',
  },
  {
    key: 'organization',
    label: 'องค์กร',
    description: 'มองเห็นข้อมูลพนักงานทั้งองค์กร',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    rowBg: 'bg-amber-50/40',
    accentBorder: 'border-amber-500',
    toggleOn: 'bg-amber-500',
  },
];

const ACTIONS_CONFIG: {
  key: 'view' | 'create' | 'edit' | 'approve';
  label: string;
}[] = [
  { key: 'view', label: 'ดู' },
  { key: 'create', label: 'สร้าง' },
  { key: 'edit', label: 'แก้ไข' },
  { key: 'approve', label: 'อนุมัติ' },
];

/* ─── Main Component ─── */
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
  const [localModules, setLocalModules] = useState<ModulePermissionScope[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Toggle UI navigation
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('');
  const [selectedModuleCode, setSelectedModuleCode] = useState<string>('');

  const [openCategoryCode, setOpenCategoryCode] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  }, [selectedRoleMatrix, selectedModuleCode, openCategoryCode]);

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
        // Auto-select first module
        if (normalized.length > 0) {
          const first = normalized[0];
          setSelectedCategoryCode(first.categoryCode || first.groupName || 'OTHER');
          setSelectedModuleCode(first.moduleCode);
        }
      } else if (!isDirty) {
        setLocalModules(normalizeModules(selectedRoleMatrix.modules));
      }
    }
  }, [selectedRoleMatrix, isDirty]);

  /* ── Derived ── */
  const filteredRoles = roles.filter(
    (r) =>
      r.roleCode.toLowerCase().includes(searchRole.toLowerCase().trim()) ||
      r.roleName.toLowerCase().includes(searchRole.toLowerCase().trim())
  );

  const categories = React.useMemo(() => {
    const map = new Map<string, { code: string; name: string; modules: ModulePermissionScope[] }>();
    localModules.forEach((mod) => {
      const code = mod.categoryCode || mod.groupName || 'OTHER';
      // ใช้ชื่อจาก CATEGORY_NAMES ก่อน ถ้าไม่มีค่อยใช้จาก API
      const name = CATEGORY_NAMES[code] || mod.categoryName || mod.groupName || 'หมวดหมู่อื่นๆ';
      if (!map.has(code)) map.set(code, { code, name, modules: [] });
      map.get(code)!.modules.push(mod);
    });
    return Array.from(map.values());
  }, [localModules]);

  const selectedCategory = React.useMemo(
    () => categories.find((c) => c.code === selectedCategoryCode) || null,
    [categories, selectedCategoryCode]
  );

  const selectedModule = React.useMemo(
    () => localModules.find((m) => m.moduleCode === selectedModuleCode) || null,
    [localModules, selectedModuleCode]
  );

  const currentOverallIdx = React.useMemo(
    () => localModules.findIndex((m) => m.moduleCode === selectedModuleCode),
    [localModules, selectedModuleCode]
  );

  /* ── Navigation ── */
  const navigateModule = (dir: 'prev' | 'next') => {
    const newIdx = currentOverallIdx + (dir === 'next' ? 1 : -1);
    if (newIdx < 0 || newIdx >= localModules.length) return;
    const newMod = localModules[newIdx];
    setSelectedModuleCode(newMod.moduleCode);
    setSelectedCategoryCode(newMod.categoryCode || newMod.groupName || 'OTHER');
  };

  /* ── Category Dropdown Popover ── */
  const handleCategoryClick = (catCode: string, buttonEl: HTMLButtonElement) => {
    const cat = categories.find((c) => c.code === catCode);
    if (!cat) return;

    // ถ้ามีโมดูลเดียวในหมวดหมู่นี้ ให้สลับไปที่โมดูลนั้นทันที
    if (cat.modules.length === 1) {
      setSelectedCategoryCode(catCode);
      setSelectedModuleCode(cat.modules[0].moduleCode);
      setOpenCategoryCode(null);
      return;
    }

    if (openCategoryCode === catCode) {
      setOpenCategoryCode(null);
      return;
    }
    const rect = buttonEl.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 335) });
    setSelectedCategoryCode(catCode);
    setOpenCategoryCode(catCode);

    // หากโมดูลปัจจุบันไม่ได้อยู่ในหมวดนี้ ให้เลือกตัวแรกในหมวดนี้โดยอัตโนมัติ
    if (!cat.modules.some((m) => m.moduleCode === selectedModuleCode)) {
      setSelectedModuleCode(cat.modules[0].moduleCode);
    }
  };

  useEffect(() => {
    if (!openCategoryCode) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenCategoryCode(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openCategoryCode]);

  /* ── Toggle handlers ── */
  const handleToggleCheckbox = (
    moduleCode: string,
    scopeKey: 'self' | 'team' | 'department' | 'division' | 'organization',
    actionKey: 'view' | 'create' | 'edit' | 'approve'
  ) => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        if (mod.moduleCode !== moduleCode) return mod;
        const cur = mod[scopeKey] || { view: false, create: false, edit: false, approve: false };
        return { ...mod, [scopeKey]: { ...cur, [actionKey]: !cur[actionKey] } };
      })
    );
    setIsDirty(true);
  };

  const handleToggleAllRow = (moduleCode: string) => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        if (mod.moduleCode !== moduleCode) return mod;
        const scopes = ['self', 'team', 'department', 'division', 'organization'] as const;
        const actions = ['view', 'create', 'edit', 'approve'] as const;
        const allOn = scopes.every((s) => actions.every((a) => mod[s]?.[a]));
        const nextVal = !allOn;
        const updated = { ...mod };
        scopes.forEach((s) => {
          updated[s] = { view: nextVal, create: nextVal, edit: nextVal, approve: nextVal };
        });
        return updated;
      })
    );
    setIsDirty(true);
  };

  const handleSelectAll = () => {
    setLocalModules((prev) =>
      prev.map((mod) => {
        const full = { view: true, create: true, edit: true, approve: true };
        return { ...mod, self: { ...full }, team: { ...full }, department: { ...full }, division: { ...full }, organization: { ...full } };
      })
    );
    setIsDirty(true);
  };

  const handleSelectAllAction = (actionKey: 'view' | 'create' | 'edit' | 'approve') => {
    const actionLabel = ACTIONS_CONFIG.find((a) => a.key === actionKey)?.label || actionKey;
    setLocalModules((prev) =>
      prev.map((mod) => {
        const targetState = {
          view: actionKey === 'view',
          create: actionKey === 'create',
          edit: actionKey === 'edit',
          approve: actionKey === 'approve',
        };
        return {
          ...mod,
          self: { ...(mod.self || {}), ...targetState },
          team: { ...(mod.team || {}), ...targetState },
          department: { ...(mod.department || {}), ...targetState },
          division: { ...(mod.division || {}), ...targetState },
          organization: { ...(mod.organization || {}), ...targetState },
        };
      })
    );
    setIsDirty(true);
    toast.info(`เลือกเฉพาะสิทธิ์ "${actionLabel}" ทุกเมนูเรียบร้อยแล้ว`);
  };

  const handleSelectAllView = () => handleSelectAllAction('view');
  const handleSelectAllCreate = () => handleSelectAllAction('create');
  const handleSelectAllEdit = () => handleSelectAllAction('edit');
  const handleSelectAllApprove = () => handleSelectAllAction('approve');

  const handleDeselectAll = () => {
    if (selectedRoleMatrix?.roleCode === 'ADMIN' || selectedRoleMatrix?.roleCode === 'SYSTEM_SUPER') {
      toast.warning('บทบาทผู้ดูแลระบบสูงสุดจำเป็นต้องมีสิทธิ์เข้าถึงระบบอย่างน้อย 1 สิทธิ์ (Lockout Protection)');
    }
    setLocalModules((prev) =>
      prev.map((mod) => {
        const empty = { view: false, create: false, edit: false, approve: false };
        return { ...mod, self: { ...empty }, team: { ...empty }, department: { ...empty }, division: { ...empty }, organization: { ...empty } };
      })
    );
    setIsDirty(true);
  };

  /* ── Category-level Bulk Actions (เลือกทุกหน้าในหัวข้อนั้นๆ) ── */
  const handleSelectAllCategory = (catCode: string) => {
    const cat = categories.find((c) => c.code === catCode);
    if (!cat) return;
    const modCodes = new Set(cat.modules.map((m) => m.moduleCode));
    setLocalModules((prev) =>
      prev.map((mod) => {
        if (!modCodes.has(mod.moduleCode)) return mod;
        const full = { view: true, create: true, edit: true, approve: true };
        return {
          ...mod,
          self: { ...full },
          team: { ...full },
          department: { ...full },
          division: { ...full },
          organization: { ...full },
        };
      })
    );
    setIsDirty(true);
    toast.success(`เปิดสิทธิ์ทุกหน้าในหัวข้อ "${cat.name}" เรียบร้อยแล้ว`);
  };

  const handleSelectCategoryAction = (
    catCode: string,
    actionKey: 'view' | 'create' | 'edit' | 'approve'
  ) => {
    const cat = categories.find((c) => c.code === catCode);
    if (!cat) return;
    const modCodes = new Set(cat.modules.map((m) => m.moduleCode));
    const actionLabel = ACTIONS_CONFIG.find((a) => a.key === actionKey)?.label || actionKey;

    setLocalModules((prev) =>
      prev.map((mod) => {
        if (!modCodes.has(mod.moduleCode)) return mod;
        const targetState = {
          view: actionKey === 'view',
          create: actionKey === 'create',
          edit: actionKey === 'edit',
          approve: actionKey === 'approve',
        };
        return {
          ...mod,
          self: { ...(mod.self || {}), ...targetState },
          team: { ...(mod.team || {}), ...targetState },
          department: { ...(mod.department || {}), ...targetState },
          division: { ...(mod.division || {}), ...targetState },
          organization: { ...(mod.organization || {}), ...targetState },
        };
      })
    );
    setIsDirty(true);
    toast.info(`เลือกเฉพาะสิทธิ์ "${actionLabel}" ทุกหน้าในหัวข้อ "${cat.name}" เรียบร้อยแล้ว`);
  };

  const handleSelectAllCategoryView = (catCode: string) => handleSelectCategoryAction(catCode, 'view');

  const handleDeselectCategory = (catCode: string) => {
    const cat = categories.find((c) => c.code === catCode);
    if (!cat) return;
    const modCodes = new Set(cat.modules.map((m) => m.moduleCode));
    setLocalModules((prev) =>
      prev.map((mod) => {
        if (!modCodes.has(mod.moduleCode)) return mod;
        const empty = { view: false, create: false, edit: false, approve: false };
        return {
          ...mod,
          self: { ...empty },
          team: { ...empty },
          department: { ...empty },
          division: { ...empty },
          organization: { ...empty },
        };
      })
    );
    setIsDirty(true);
    toast.info(`ยกเลิกสิทธิ์ทุกหน้าในหัวข้อ "${cat.name}" เรียบร้อยแล้ว`);
  };

  const handleReset = () => {
    if (selectedRoleMatrix) {
      setLocalModules(normalizeModules(JSON.parse(JSON.stringify(selectedRoleMatrix.modules))));
      setIsDirty(false);
    }
  };

  const handleSave = async () => {
    if (!selectedRoleMatrix) return;
    const scopes = ['self', 'team', 'department', 'division', 'organization'] as const;
    const hasAnyPermission = localModules.some((m) =>
      scopes.some((s) => m[s]?.view || m[s]?.create || m[s]?.edit || m[s]?.approve)
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
      // Error handled by ToastContext / parent
    }
  };

  /* ──────────────────────────────────────────────────────────── */
  /*  RENDER                                                      */
  /* ──────────────────────────────────────────────────────────── */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full">

      {/* =========== LEFT PANE: ROLES LIST (4 cols lg, 3 cols xl) =========== */}
      <div className="lg:col-span-4 xl:col-span-3 space-y-3">
        {/* Search & Add */}
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

        {/* Roles List (จำกัดความสูงให้พอดีกับ panel ด้านขวา พร้อม scrollbar) */}
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

                {!role.isSystemDefault && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-3 text-[11px]">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditRoleClick(role); }}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
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

      {/* =========== RIGHT PANE: TOGGLE PERMISSION UI (8 cols lg, 9 cols xl) =========== */}
      <div
        ref={rightPaneRef}
        className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5"
      >
        {selectedRoleMatrix ? (
          <>
            {/* Header */}
            <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900">
                    ตั้งค่าสิทธิ์สำหรับ: {selectedRoleMatrix.roleCode}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedRoleMatrix.description || selectedRoleMatrix.roleName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {localModules.length} เมนูย่อย
                </span>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  สิทธิ์การเข้าถึง
                </h3>
                {isDirty && (
                  <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    ยังไม่ได้บันทึก
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedCategory && selectedCategory.modules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleSelectAllCategory(selectedCategory.code)}
                    title={`เลือกเปิดสิทธิ์ทุกหน้าในหัวข้อ ${selectedCategory.name}`}
                    className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                    <span>เลือกทุกหน้าใน{selectedCategory.name}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSelectAll}
                  title="เลือกเปิดสิทธิ์ทั้งหมด ทุกเมนู"
                  className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllView}
                  title="เปิดเฉพาะสิทธิ์ดู ทุกเมนู"
                  className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  เฉพาะดู
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllCreate}
                  title="เปิดเฉพาะสิทธิ์สร้าง ทุกเมนู"
                  className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  เฉพาะสร้าง
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllEdit}
                  title="เปิดเฉพาะสิทธิ์แก้ไข ทุกเมนู"
                  className="px-2 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5 text-purple-600" />
                  เฉพาะแก้ไข
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllApprove}
                  title="เปิดเฉพาะสิทธิ์อนุมัติ ทุกเมนู"
                  className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  เฉพาะอนุมัติ
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  title="ยกเลิกสิทธิ์ทั้งหมด"
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  ยกเลิกทั้งหมด
                </button>
              </div>
            </div>

            {/* ── Category Tab Bar (wrap แถวใหม่ได้, ไม่มี scrollbar) ── */}
            <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const IconComp = CATEGORY_ICONS[cat.code] || Layers;
                  const isActive = selectedCategoryCode === cat.code;
                  const isOpen = openCategoryCode === cat.code;
                  return (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={(e) => handleCategoryClick(cat.code, e.currentTarget)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#0B2046] text-white border-[#0B2046] shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                      {cat.name}
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {cat.modules.length}
                      </span>
                      {cat.modules.length > 1 && (
                        <ChevronDown
                          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                            isActive ? 'text-white/70' : 'text-slate-400'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
            </div>

            {/* ── Breadcrumb: current module path ── */}
            {selectedModule && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-0.5">
                <span className="font-medium text-slate-600">{selectedCategory?.name}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="font-semibold text-[#0B2046]">{selectedModule.moduleName}</span>
                <span className="ml-1 text-slate-300">·</span>
                <span className="text-slate-400">{currentOverallIdx + 1} / {localModules.length} เมนู</span>
              </div>
            )}

            {/* ── Dropdown Popover (fixed, rendered via portal pattern) ── */}
            {openCategoryCode && (() => {
              const openCat = categories.find((c) => c.code === openCategoryCode);
              if (!openCat) return null;
              const IconComp = CATEGORY_ICONS[openCat.code] || Layers;
              return (
                <div
                  ref={dropdownRef}
                  style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
                  className="w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {/* Dropdown Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#0B2046]/8 text-[#0B2046]">
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-sm text-slate-900">{openCat.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{openCat.modules.length} เมนู</span>
                  </div>

                  {/* Action Bar in Dropdown: ปุ่มเลือกทุกหน้า + คีย์ลัดเฉพาะแต่ละสิทธิ์ */}
                  <div className="p-2.5 bg-slate-50/80 border-b border-slate-100 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectAllCategory(openCat.code);
                        }}
                        className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                        title={`เลือกเปิดสิทธิ์ทั้งหมดทุกหน้าในหัวข้อ ${openCat.name}`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>เลือกทุกหน้า</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeselectCategory(openCat.code);
                        }}
                        className="py-1.5 px-2.5 bg-slate-200/80 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title={`ยกเลิกสิทธิ์ทุกหน้าในหัวข้อ ${openCat.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ยกเลิก</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectCategoryAction(openCat.code, 'view');
                        }}
                        className="py-1 px-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-md text-[11px] font-medium flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                        title={`เปิดเฉพาะสิทธิ์ดูทุกหน้าในหัวข้อ ${openCat.name}`}
                      >
                        <Eye className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>เฉพาะดู</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectCategoryAction(openCat.code, 'create');
                        }}
                        className="py-1 px-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 rounded-md text-[11px] font-medium flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                        title={`เปิดเฉพาะสิทธิ์สร้างทุกหน้าในหัวข้อ ${openCat.name}`}
                      >
                        <Plus className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>เฉพาะสร้าง</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectCategoryAction(openCat.code, 'edit');
                        }}
                        className="py-1 px-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 rounded-md text-[11px] font-medium flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                        title={`เปิดเฉพาะสิทธิ์แก้ไขทุกหน้าในหัวข้อ ${openCat.name}`}
                      >
                        <Edit2 className="w-3 h-3 text-purple-600 shrink-0" />
                        <span>เฉพาะแก้ไข</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectCategoryAction(openCat.code, 'approve');
                        }}
                        className="py-1 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-md text-[11px] font-medium flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                        title={`เปิดเฉพาะสิทธิ์อนุมัติทุกหน้าในหัวข้อ ${openCat.name}`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>เฉพาะอนุมัติ</span>
                      </button>
                    </div>
                  </div>

                  {/* Sub-module List */}
                  <div className="py-1 max-h-72 overflow-y-auto">
                    {openCat.modules.map((mod) => {
                      const isSelected = selectedModuleCode === mod.moduleCode;
                      return (
                        <button
                          key={mod.moduleCode}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryCode(openCat.code);
                            setSelectedModuleCode(mod.moduleCode);
                            setOpenCategoryCode(null);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs transition-colors cursor-pointer border-l-4 ${
                            isSelected
                              ? 'bg-[#0B2046]/5 border-[#0B2046] text-[#0B2046] font-semibold'
                              : 'border-transparent text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <span className="leading-snug">{mod.moduleName}</span>
                          {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#0B2046]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Single Permission Card (1 อันเท่านั้น ไม่ซ้อนหลายอัน) ── */}
            {selectedModule ? (
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white">

                {/* Card Header */}
                <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedModule.moduleName}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      กำหนดสิทธิ์การเข้าถึงตามระดับขอบเขตข้อมูล
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* ปุ่มเลือกทุกหน้าในหัวข้อนี้ (ถ้ามีมากกว่า 1 เมนูย่อยในหมวดนี้) */}
                    {selectedCategory && selectedCategory.modules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleSelectAllCategory(selectedCategory.code)}
                        className="text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold cursor-pointer px-3 py-1.5 rounded-lg border border-emerald-200/80 transition-colors flex items-center gap-1 shadow-xs"
                        title={`เปิดสิทธิ์ทุกหน้าในหัวข้อ ${selectedCategory.name}`}
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>เลือกทุกหน้าในหัวข้อนี้</span>
                      </button>
                    )}
                    {/* สลับทั้งแถว */}
                    <button
                      type="button"
                      onClick={() => handleToggleAllRow(selectedModule.moduleCode)}
                      className="text-xs text-[#0B2046] hover:text-[#112d5e] font-semibold cursor-pointer px-3 py-1.5 rounded-lg border border-[#0B2046]/20 hover:bg-[#0B2046]/5 transition-colors"
                    >
                      สลับทั้งหมด
                    </button>
                    {/* Prev / Next Module */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigateModule('prev')}
                        disabled={currentOverallIdx <= 0}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="เมนูก่อนหน้า"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] text-slate-500 font-medium min-w-[46px] text-center">
                        {currentOverallIdx + 1} / {localModules.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigateModule('next')}
                        disabled={currentOverallIdx >= localModules.length - 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="เมนูถัดไป"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── 5 Scope Rows ── */}
                <div className="divide-y divide-slate-100">
                  {SCOPES_CONFIG.map((sc) => {
                    const scopePerms = selectedModule[sc.key] || {
                      view: false, create: false, edit: false, approve: false,
                    };
                    const activeCount = Object.values(scopePerms).filter(Boolean).length;

                    return (
                      <div
                        key={sc.key}
                        className={`flex items-center justify-between gap-4 px-5 py-4 border-l-4 ${sc.accentBorder} ${sc.rowBg} transition-colors`}
                      >
                        {/* Left: scope info */}
                        <div className="flex items-center gap-3 min-w-[160px]">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${sc.badgeBg}`}
                          >
                            <span className={`text-sm font-bold ${sc.badgeText}`}>
                              {sc.label.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{sc.label}</span>
                              {activeCount > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${sc.badgeBg} ${sc.badgeText}`}>
                                  {activeCount} เปิด
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{sc.description}</p>
                          </div>
                        </div>

                        {/* Right: 4 Toggle Switches */}
                        <div className="flex items-end gap-5 shrink-0">
                          {ACTIONS_CONFIG.map((act) => (
                            <ToggleSwitch
                              key={act.key}
                              checked={!!scopePerms[act.key]}
                              onChange={() =>
                                handleToggleCheckbox(selectedModule.moduleCode, sc.key, act.key)
                              }
                              activeColor={sc.toggleOn}
                              label={act.label}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Card Footer: quick nav hint */}
                <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    กดปุ่ม ← → เพื่อเปลี่ยนเมนูย่อย หรือคลิกชื่อเมนูด้านบน
                  </span>
                  {currentOverallIdx < localModules.length - 1 && (
                    <button
                      type="button"
                      onClick={() => navigateModule('next')}
                      className="text-[#0B2046] font-semibold hover:underline cursor-pointer"
                    >
                      ถัดไป: {localModules[currentOverallIdx + 1]?.moduleName} →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                เลือกเมนูย่อยด้านบนเพื่อกำหนดสิทธิ์
              </div>
            )}

            {/* Bottom Save Bar */}
            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
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
