'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  Check,
  AlertCircle,
  AlertTriangle,
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
  Compass,
  Info,
  Wallet,
  User,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  FileText,
  Megaphone,
  Database,
  Gift,
  Network,
  Calculator,
  UserX,
  ArrowRightLeft,
  ClipboardCheck,
  FileSpreadsheet,
  Shield,
} from 'lucide-react';
import {
  RoleSummary,
  RoleDetail,
  ModulePermissionScope,
  UpdateRoleMatrixRequest,
} from '@/types/settings';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { Button, ModalShell } from '@/components/ui';

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
  canCreateRole?: boolean;
  canEditRole?: boolean;
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
        checked ? 'bg-primary' : 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-600'
      } ${disabled ? 'opacity-40 !cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block transform rounded-full bg-white shadow-sm transition-transform duration-200 ${ isSm ? checked ? 'h-3.5 w-3.5 translate-x-4.5' : 'h-3.5 w-3.5 translate-x-1'
            : checked ? 'h-4.5 w-4.5 translate-x-5.5' : 'h-4.5 w-4.5 translate-x-1'
        }`}
      />
    </button>
  );
};

/* ─── Constants: ไอคอนตรงตามเมนูใน Sidebar ครบทั้ง 19 เมนู ─── */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DASHBOARD: LayoutDashboard,
  ORG_CHART: Network,
  EMPLOYEE: Users,
  BENEFIT: Gift,
  BENEFIT_BALANCE: Gift,
  BENEFIT_CLAIM: Gift,
  MY_SALARY: Wallet,
  MY_PROFILE: User,
  MY_LEAVE: CalendarCheck,
  MY_ATTENDANCE: CalendarDays,
  MY_NEWS: Megaphone,
  MY_DOCS: FileText,
  MY_BENEFITS: Gift,
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
  GUIDE: Compass,
};

/** ชื่อหมวดหมู่ตรงตามหัวข้อเมนู Sidebar */
const CATEGORY_NAMES: Record<string, string> = {
  DASHBOARD: 'แดชบอร์ด',
  ORG_CHART: 'แผนผังองค์กร',
  EMPLOYEE: 'พนักงาน',
  BENEFIT: 'สวัสดิการ',
  BENEFIT_BALANCE: 'ยอดสวัสดิการพนักงาน',
  BENEFIT_CLAIM: 'ประวัติการเบิกจ่ายและใช้สิทธิ์สวัสดิการ',
  MY_SALARY: 'เงินเดือนของฉัน',
  MY_PROFILE: 'โปรไฟล์ของฉัน (ESS)',
  MY_LEAVE: 'ยอดวันลาคงเหลือ',
  MY_ATTENDANCE: 'บันทึกเวลาของฉัน (ESS)',
  MY_NEWS: 'ข่าวสารสำหรับฉัน',
  MY_DOCS: 'ยื่นเอกสาร',
  MY_BENEFITS: 'สวัสดิการของฉัน',
  ATTENDANCE_DAILY: 'ตรวจบันทึกเวลา',
  ATTENDANCE_SCHEDULE: 'การจัดตารางงาน',
  LEAVE: 'สิทธิ์การลา',
  PAYROLL: 'เงินเดือน',
  APPROVALS: 'การอนุมัติ',
  ORGANIZATION: 'โครงสร้างองค์กร',
  WORK_CALENDAR: 'วันทำงานและวันหยุด',
  REPORT: 'รายงาน',
  ANNOUNCEMENTS: 'จัดการประกาศ',
  MASTER_DATA: 'ข้อมูลหลัก (Master Data)',
  SETTINGS: 'ตั้งค่า',
  GUIDE: 'วิธีการใช้งาน',
};

/** โครงสร้างเมนูย่อยของแต่ละ Flow ในวิธีการใช้งาน (Two-way Sync กับโมดูลหลัก) */
interface GuideStepConfig {
  step: number;
  targetModuleCode: string;
  label: string;
  route: string;
  badge: string;
  desc?: string;
  requiresWrite?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

interface GuideFlowConfig {
  id: string;
  moduleCode: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: GuideStepConfig[];
}

/** รายการไกด์วิธีการใช้งานทั้ง 9 Flows ในระบบ พร้อมผูกเมนูย่อยและ Target Module Code */
const GUIDE_FLOW_CONFIGS: GuideFlowConfig[] = [
  {
    id: 'hr-onboarding',
    moduleCode: 'GUIDE_ONBOARDING',
    title: 'ไกด์: เพิ่มพนักงานใหม่',
    subtitle: 'บันทึกประวัติพนักงาน สัญญาจ้าง และสร้างบัญชีผู้ใช้งานระบบ',
    icon: Users,
    steps: [
      {
        step: 1,
        targetModuleCode: 'EMP_PROFILE',
        label: '1. จัดการพนักงาน',
        route: '/employees',
        badge: 'ทะเบียนประวัติพนักงาน',
        icon: Users,
      },
      {
        step: 2,
        targetModuleCode: 'EMP_CONTRACT',
        label: '2. สัญญาจ้าง',
        route: '/employees/contracts',
        badge: 'สัญญาจ้างงาน',
        icon: FileText,
      },
      {
        step: 3,
        targetModuleCode: 'SETTINGS_USERS',
        label: '3. ผู้ใช้งาน',
        route: '/settings?tab=users',
        badge: 'บัญชีผู้ใช้งานระบบ',
        requiresWrite: true,
        icon: User,
      },
    ],
  },
  {
    id: 'payroll-cycle-hr',
    moduleCode: 'GUIDE_PAYROLL_HR',
    title: 'ไกด์: การประมวลผลรอบเงินเดือนประจำเดือน (ฝ่ายบุคคล / HR)',
    subtitle: 'ตรวจสอบเวลาทำงาน สรุปเวลาทำงาน สร้างรอบเงินเดือน และสั่งคำนวณเงินเดือนสุทธิ',
    icon: Wallet,
    steps: [
      {
        step: 1,
        targetModuleCode: 'TIME_DAILY',
        label: '1. ตรวจบันทึกเวลาประจำวัน',
        route: '/attendance/daily?tab=daily',
        badge: 'เวลาทำงาน ขาด ลา มาสาย & โอที',
        icon: Clock,
      },
      {
        step: 2,
        targetModuleCode: 'PAYROLL_CALC',
        label: '2. ประมวลเงินเดือน',
        route: '/payroll?tab=process',
        badge: 'สร้างรอบเงินเดือนและคำนวณเงินเดือนสุทธิ',
        requiresWrite: true,
        icon: Calculator,
      },
    ],
  },
  {
    id: 'payroll-cycle-finance',
    moduleCode: 'GUIDE_PAYROLL_FINANCE',
    title: 'ไกด์: การตรวจสอบและจ่ายเงินเดือนประจำเดือน (ฝ่ายการเงิน)',
    subtitle: 'ตรวจสอบรายการเงินเดือนและสลิปพนักงาน ยืนยันความถูกต้อง โอนเงิน และปิดรอบ',
    icon: CreditCard,
    steps: [
      {
        step: 1,
        targetModuleCode: 'PAYROLL_CALC',
        label: '1. ตรวจสอบและจ่ายเงินเดือน',
        route: '/payroll?tab=process',
        badge: 'ตรวจสอบสลิป ยืนยันความถูกต้อง และจ่ายเงินเดือน',
        requiresWrite: true,
        icon: Calculator,
      },
    ],
  },
  {
    id: 'payroll-cycle-ceo',
    moduleCode: 'GUIDE_PAYROLL_CEO',
    title: 'ไกด์: การอนุมัติรอบเงินเดือนประจำเดือน (ผู้บริหาร / CEO)',
    subtitle: 'ตรวจสอบยอดรวม รายการเงินเดือน และอนุมัติรอบเงินเดือนประจำงวด',
    icon: Shield,
    steps: [
      {
        step: 1,
        targetModuleCode: 'PAYROLL_CALC',
        label: '1. อนุมัติรอบเงินเดือน',
        route: '/payroll?tab=process',
        badge: 'ตรวจสอบยอดจ่ายรวมและอนุมัติรอบเงินเดือน',
        requiresWrite: true,
        icon: CheckCircle2,
      },
    ],
  },
  {
    id: 'offboarding',
    moduleCode: 'GUIDE_OFFBOARDING',
    title: 'ไกด์: การพ้นสภาพพนักงาน (ลาออก)',
    subtitle: 'อนุมัติใบลาออก สิ้นสุดสัญญาจ้าง และระงับสิทธิ์เข้าใช้งานระบบ',
    icon: UserX,
    steps: [
      {
        step: 1,
        targetModuleCode: 'ESS_RESIGN',
        label: '1. ประวัติเอกสาร (คำขอลาออก)',
        route: '/documents/history',
        badge: 'ยื่นคำขอลาออก',
        icon: FileText,
      },
      {
        step: 2,
        targetModuleCode: 'EMP_CONTRACT',
        label: '2. สัญญาจ้าง',
        route: '/employees/contracts',
        badge: 'สิ้นสุดสัญญาจ้างงาน',
        icon: FileSpreadsheet,
      },
      {
        step: 3,
        targetModuleCode: 'SETTINGS_USERS',
        label: '3. ผู้ใช้งานและสิทธิ์',
        route: '/settings?tab=users',
        badge: 'ระงับบัญชีผู้ใช้งาน',
        requiresWrite: true,
        icon: User,
      },
    ],
  },
  {
    id: 'shift-schedule',
    moduleCode: 'GUIDE_SHIFT_SCHEDULE',
    title: 'ไกด์: การจัดตารางกะงานพนักงาน',
    subtitle: 'กำหนดรอบเวลาและรูปแบบกะ จัดตารางกะรายแผนก และตรวจเทียบเวลาจริง',
    icon: CalendarRange,
    steps: [
      {
        step: 1,
        targetModuleCode: 'TIME_SCHEDULE',
        label: '1. กะการทำงาน',
        route: '/attendance/schedules?tab=shifts',
        badge: 'รอบเวลาและรูปแบบกะ',
        icon: Clock,
      },
      {
        step: 2,
        targetModuleCode: 'TIME_SCHEDULE',
        label: '2. มอบหมายกะให้พนักงาน',
        route: '/attendance/schedules?tab=roster',
        badge: 'จัดตารางกะงาน',
        icon: CalendarDays,
      },
      {
        step: 3,
        targetModuleCode: 'TIME_DAILY',
        label: '3. ตรวจบันทึกเวลาประจำวัน',
        route: '/attendance/daily?tab=daily',
        badge: 'ตรวจการลงเวลาจริง',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    id: 'attendance-import',
    moduleCode: 'GUIDE_ATTENDANCE_IMPORT',
    title: 'ไกด์: การนำเข้าเวลาสแกนนิ้วและตรวจเช็คประจำวัน',
    subtitle: 'อัปโหลดไฟล์เวลาสแกนนิ้วเข้าสู่ระบบและตรวจสอบผลการบันทึกเวลาประจำวัน',
    icon: Clock,
    steps: [
      {
        step: 1,
        targetModuleCode: 'TIME_IMPORT',
        label: '1. นำเข้าไฟล์บันทึกเวลา',
        route: '/attendance/daily?tab=import',
        badge: 'อัปโหลดไฟล์เวลาสแกนนิ้ว',
        icon: FileSpreadsheet,
      },
      {
        step: 2,
        targetModuleCode: 'TIME_DAILY',
        label: '2. ตรวจบันทึกเวลาประจำวัน',
        route: '/attendance/daily?tab=daily',
        badge: 'ตรวจผลการบันทึกเวลา',
        icon: Clock,
      },
    ],
  },
  {
    id: 'transfer-flow',
    moduleCode: 'GUIDE_TRANSFER',
    title: 'ไกด์: การโอนย้ายแผนกและปรับตำแหน่ง',
    subtitle: 'บันทึกคำสั่งโอนย้าย ปรับปรุงสัญญาจ้างฐานเงินเดือน และตรวจสอบผังองค์กร',
    icon: ArrowRightLeft,
    steps: [
      {
        step: 1,
        targetModuleCode: 'EMP_TRANSFER',
        label: '1. การย้ายแผนก/เลื่อนตำแหน่ง',
        route: '/employees/transfers',
        badge: 'คำสั่งโอนย้ายและเลื่อนตำแหน่ง',
        icon: ArrowRightLeft,
      },
      {
        step: 2,
        targetModuleCode: 'EMP_CONTRACT',
        label: '2. สัญญาจ้าง',
        route: '/employees/contracts',
        badge: 'สัญญาจ้างและเงินเดือนใหม่',
        icon: FileText,
      },
      {
        step: 3,
        targetModuleCode: 'ORG_CHART',
        label: '3. แผนผังองค์กร',
        route: '/org-chart',
        badge: 'ผังองค์กร',
        icon: Network,
      },
    ],
  },
  {
    id: 'leave-setup',
    moduleCode: 'GUIDE_LEAVE_SETUP',
    title: 'ไกด์: การตั้งค่าเริ่มต้นระบบการลาประจำปี',
    subtitle: 'กำหนดประเภทการลา กำหนดวันหยุดประจำปี และจัดสรรโควตาวันลาพนักงาน',
    icon: CalendarCheck,
    steps: [
      {
        step: 1,
        targetModuleCode: 'LEAVE_TYPE',
        label: '1. ประเภทการลา',
        route: '/leave?tab=types',
        badge: 'ประเภทการลา & สีประจำประเภท',
        icon: CalendarDays,
      },
      {
        step: 2,
        targetModuleCode: 'WORK_CALENDAR',
        label: '2. วันหยุดประจำปี',
        route: '/work-calendar?tab=holidays',
        badge: 'วันหยุดประจำปีของบริษัท',
        icon: CalendarRange,
      },
      {
        step: 3,
        targetModuleCode: 'LEAVE_BALANCE',
        label: '3. ยอดวันลาคงเหลือ',
        route: '/leave-balances',
        badge: 'สิทธิ์วันลาคงเหลือ & จัดสรรโควตา',
        icon: CalendarCheck,
      },
    ],
  },
  {
    id: 'leave-approval',
    moduleCode: 'GUIDE_LEAVE_APPROVAL',
    title: 'ไกด์: การอนุมัติคำขอลาและตรวจผลกระทบต่อทีม',
    subtitle: 'ตรวจสอบรายละเอียดและอนุมัติคำขอลา พร้อมตรวจปฏิทินกำลังคนของทีม',
    icon: ClipboardCheck,
    steps: [
      {
        step: 1,
        targetModuleCode: 'APPROVAL_LEAVE',
        label: '1. เอกสารรอดำเนินการ',
        route: '/approvals/leave-requests',
        badge: 'อนุมัติคำขอลา',
        icon: CheckCircle2,
      },
      {
        step: 2,
        targetModuleCode: 'LEAVE_BALANCE',
        label: '2. ปฏิทินการลาของทีม',
        route: '/team-leave-calendar',
        badge: 'ปฏิทินกำลังคนของทีม',
        icon: CalendarDays,
      },
    ],
  },
  {
    id: 'company-setup',
    moduleCode: 'GUIDE_COMPANY_SETUP',
    title: 'ไกด์: การตั้งค่าระบบองค์กรสำหรับบริษัทใหม่',
    subtitle: 'ตั้งค่าฝ่าย แผนก ตำแหน่ง กำหนดวันทำงานปกติ สิทธิ์การลา และสายการอนุมัติ',
    icon: Building2,
    steps: [
      {
        step: 1,
        targetModuleCode: 'ORG_STRUCT',
        label: '1. โครงสร้างองค์กร (ฝ่าย)',
        route: '/organization?tab=divisions',
        badge: 'ฝ่าย แผนก ตำแหน่ง',
        requiresWrite: true,
        icon: Building2,
      },
      {
        step: 2,
        targetModuleCode: 'WORK_CALENDAR',
        label: '2. วันทำงานประจำสัปดาห์',
        route: '/work-calendar?tab=work-week',
        badge: 'วันทำงานปกติ & วันหยุดประจำสัปดาห์',
        icon: CalendarDays,
      },
      {
        step: 3,
        targetModuleCode: 'LEAVE_POLICY',
        label: '3. กำหนดสิทธิ์การลา',
        route: '/leave?tab=policies',
        badge: 'นโยบายและเงื่อนไขการลา',
        icon: FileText,
      },
      {
        step: 4,
        targetModuleCode: 'SETTINGS_ROLES',
        label: '4. สายการอนุมัติ',
        route: '/settings?tab=approval-flows',
        badge: 'สายการอนุมัติ & สิทธิ์',
        requiresWrite: true,
        icon: Shield,
      },
    ],
  },
];

/** หมวดหมู่ของระบบ ESS ที่จำกัดขอบเขตเฉพาะข้อมูลตนเอง (Self Only) เท่านั้น */
const ESS_CATEGORY_CODES = new Set<string>([
  'MY_SALARY',
  'MY_PROFILE',
  'MY_LEAVE',
  'MY_ATTENDANCE',
  'MY_DOCS',
  'MY_BENEFITS',
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
  { key: 'view', label: 'ดูข้อมูล', icon: Eye },
  { key: 'create', label: 'สร้าง', icon: Plus },
  { key: 'edit', label: 'แก้ไข', icon: Edit2 },
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
  canCreateRole = true,
  canEditRole = true,
}) => {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  /* ── State ── */
  const [searchRole, setSearchRole] = useState('');
  const [searchModuleQuery, setSearchModuleQuery] = useState('');
  const [localModules, setLocalModules] = useState<ModulePermissionScope[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Accordion expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Accordion expanded guide flows
  const [expandedGuideFlows, setExpandedGuideFlows] = useState<Record<string, boolean>>({});

  const toggleGuideFlowExpand = (flowId: string) => {
    setExpandedGuideFlows((prev) => ({
      ...prev,
      [flowId]: !prev[flowId],
    }));
  };

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
  const normalizeModules = (mods: ModulePermissionScope[]): ModulePermissionScope[] => {
    let normalized = mods.map((m) => {
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

    // ตรวจสอบโมดูลหมวด GUIDE: หากยังไม่มีครบทั้ง 9 Flows ใน matrix ให้เพิ่มเข้ามาอัตโนมัติ
    GUIDE_FLOW_CONFIGS.forEach((flow) => {
      const exists = normalized.some((m) => m.moduleCode === flow.moduleCode);
      if (!exists) {
        const def = () => ({ view: false, create: false, edit: false, approve: false });
        normalized.push({
          moduleCode: flow.moduleCode,
          moduleName: flow.title,
          groupName: 'GUIDE',
          categoryCode: 'GUIDE',
          categoryName: 'วิธีการใช้งาน',
          dataScope: 'SELF',
          canView: false,
          canCreate: false,
          canEdit: false,
          canApprove: false,
          self: def(),
          team: def(),
          department: def(),
          division: def(),
          organization: def(),
        });
      }
    });

    // ตรวจสอบโมดูลหมวด ANNOUNCEMENTS: หากมีโมดูลเก่า ANNOUNCEMENTS หรือยังไม่มี ANNOUNCEMENTS_GENERAL / ANNOUNCEMENTS_ACTIVITY ให้แปลง/เพิ่มเข้ามา
    const legacyAnnounce = normalized.find((m) => m.moduleCode === 'ANNOUNCEMENTS');
    const hasGeneral = normalized.some((m) => m.moduleCode === 'ANNOUNCEMENTS_GENERAL');
    const hasActivity = normalized.some((m) => m.moduleCode === 'ANNOUNCEMENTS_ACTIVITY');

    if (!hasGeneral) {
      const def = () => ({ view: false, create: false, edit: false, approve: false });
      normalized.push({
        moduleCode: 'ANNOUNCEMENTS_GENERAL',
        moduleName: 'ประกาศข่าวสารทั่วไป',
        groupName: 'ANNOUNCEMENTS',
        categoryCode: 'ANNOUNCEMENTS',
        categoryName: 'จัดการประกาศ',
        dataScope: legacyAnnounce?.dataScope || 'ORGANIZATION',
        canView: legacyAnnounce?.canView || false,
        canCreate: legacyAnnounce?.canCreate || false,
        canEdit: legacyAnnounce?.canEdit || false,
        canApprove: legacyAnnounce?.canApprove || false,
        self: legacyAnnounce?.self ? { ...legacyAnnounce.self } : def(),
        team: legacyAnnounce?.team ? { ...legacyAnnounce.team } : def(),
        department: legacyAnnounce?.department ? { ...legacyAnnounce.department } : def(),
        division: legacyAnnounce?.division ? { ...legacyAnnounce.division } : def(),
        organization: legacyAnnounce?.organization ? { ...legacyAnnounce.organization } : def(),
      });
    }

    if (!hasActivity) {
      const def = () => ({ view: false, create: false, edit: false, approve: false });
      normalized.push({
        moduleCode: 'ANNOUNCEMENTS_ACTIVITY',
        moduleName: 'ประกาศกิจกรรม',
        groupName: 'ANNOUNCEMENTS',
        categoryCode: 'ANNOUNCEMENTS',
        categoryName: 'จัดการประกาศ',
        dataScope: legacyAnnounce?.dataScope || 'ORGANIZATION',
        canView: legacyAnnounce?.canView || false,
        canCreate: legacyAnnounce?.canCreate || false,
        canEdit: legacyAnnounce?.canEdit || false,
        canApprove: legacyAnnounce?.canApprove || false,
        self: legacyAnnounce?.self ? { ...legacyAnnounce.self } : def(),
        team: legacyAnnounce?.team ? { ...legacyAnnounce.team } : def(),
        department: legacyAnnounce?.department ? { ...legacyAnnounce.department } : def(),
        division: legacyAnnounce?.division ? { ...legacyAnnounce.division } : def(),
        organization: legacyAnnounce?.organization ? { ...legacyAnnounce.organization } : def(),
      });
    }

    if (legacyAnnounce) {
      normalized = normalized.filter((m) => m.moduleCode !== 'ANNOUNCEMENTS');
    }

    // ตรวจสอบโมดูลหมวด GUIDE: จัดการแปลง GUIDE_PAYROLL เดิมเป็น 3 เมนูย่อย
    const legacyGuidePayroll = normalized.find((m) => m.moduleCode === 'GUIDE_PAYROLL');
    const hasPayrollHr = normalized.some((m) => m.moduleCode === 'GUIDE_PAYROLL_HR');
    const hasPayrollFinance = normalized.some((m) => m.moduleCode === 'GUIDE_PAYROLL_FINANCE');
    const hasPayrollCeo = normalized.some((m) => m.moduleCode === 'GUIDE_PAYROLL_CEO');

    if (!hasPayrollHr) {
      const def = () => ({ view: false, create: false, edit: false, approve: false });
      normalized.push({
        moduleCode: 'GUIDE_PAYROLL_HR',
        moduleName: 'ไกด์: การประมวลผลรอบเงินเดือน (ฝ่ายบุคคล / HR)',
        groupName: 'GUIDE',
        categoryCode: 'GUIDE',
        categoryName: 'วิธีการใช้งาน',
        dataScope: legacyGuidePayroll?.dataScope || 'ORGANIZATION',
        canView: legacyGuidePayroll?.canView || false,
        canCreate: legacyGuidePayroll?.canCreate || false,
        canEdit: legacyGuidePayroll?.canEdit || false,
        canApprove: legacyGuidePayroll?.canApprove || false,
        self: legacyGuidePayroll?.self ? { ...legacyGuidePayroll.self } : def(),
        team: legacyGuidePayroll?.team ? { ...legacyGuidePayroll.team } : def(),
        department: legacyGuidePayroll?.department ? { ...legacyGuidePayroll.department } : def(),
        division: legacyGuidePayroll?.division ? { ...legacyGuidePayroll.division } : def(),
        organization: legacyGuidePayroll?.organization ? { ...legacyGuidePayroll.organization } : def(),
      });
    }

    if (!hasPayrollFinance) {
      const def = () => ({ view: false, create: false, edit: false, approve: false });
      normalized.push({
        moduleCode: 'GUIDE_PAYROLL_FINANCE',
        moduleName: 'ไกด์: การตรวจสอบและจ่ายเงินเดือน (ฝ่ายการเงิน)',
        groupName: 'GUIDE',
        categoryCode: 'GUIDE',
        categoryName: 'วิธีการใช้งาน',
        dataScope: legacyGuidePayroll?.dataScope || 'ORGANIZATION',
        canView: legacyGuidePayroll?.canView || false,
        canCreate: legacyGuidePayroll?.canCreate || false,
        canEdit: legacyGuidePayroll?.canEdit || false,
        canApprove: legacyGuidePayroll?.canApprove || false,
        self: legacyGuidePayroll?.self ? { ...legacyGuidePayroll.self } : def(),
        team: legacyGuidePayroll?.team ? { ...legacyGuidePayroll.team } : def(),
        department: legacyGuidePayroll?.department ? { ...legacyGuidePayroll.department } : def(),
        division: legacyGuidePayroll?.division ? { ...legacyGuidePayroll.division } : def(),
        organization: legacyGuidePayroll?.organization ? { ...legacyGuidePayroll.organization } : def(),
      });
    }

    if (!hasPayrollCeo) {
      const def = () => ({ view: false, create: false, edit: false, approve: false });
      normalized.push({
        moduleCode: 'GUIDE_PAYROLL_CEO',
        moduleName: 'ไกด์: การอนุมัติรอบเงินเดือน (ผู้บริหาร / CEO)',
        groupName: 'GUIDE',
        categoryCode: 'GUIDE',
        categoryName: 'วิธีการใช้งาน',
        dataScope: legacyGuidePayroll?.dataScope || 'ORGANIZATION',
        canView: legacyGuidePayroll?.canView || false,
        canCreate: legacyGuidePayroll?.canCreate || false,
        canEdit: legacyGuidePayroll?.canEdit || false,
        canApprove: legacyGuidePayroll?.canApprove || false,
        self: legacyGuidePayroll?.self ? { ...legacyGuidePayroll.self } : def(),
        team: legacyGuidePayroll?.team ? { ...legacyGuidePayroll.team } : def(),
        department: legacyGuidePayroll?.department ? { ...legacyGuidePayroll.department } : def(),
        division: legacyGuidePayroll?.division ? { ...legacyGuidePayroll.division } : def(),
        organization: legacyGuidePayroll?.organization ? { ...legacyGuidePayroll.organization } : def(),
      });
    }

    if (legacyGuidePayroll) {
      normalized = normalized.filter((m) => m.moduleCode !== 'GUIDE_PAYROLL');
    }

    // ตรวจสอบโมดูลหมวด GUIDE: หากขั้นตอนใน Flow ถูกติ๊กไม่ครบ ให้ถือว่า Flow นั้นไม่ถูกใช้งาน (ปิด canView ของ GUIDE_xxx)
    GUIDE_FLOW_CONFIGS.forEach((flow) => {
      const isScopeActive = (m: ModulePermissionScope) =>
        m.canView ||
        m.self?.view || m.self?.create || m.self?.edit || m.self?.approve ||
        m.team?.view || m.team?.create || m.team?.edit || m.team?.approve ||
        m.department?.view || m.department?.create || m.department?.edit || m.department?.approve ||
        m.division?.view || m.division?.create || m.division?.edit || m.division?.approve ||
        m.organization?.view || m.organization?.create || m.organization?.edit || m.organization?.approve;

      const allStepsActive = flow.steps.length > 0 && flow.steps.every((s) => {
        const m = normalized.find((mod) => mod.moduleCode === s.targetModuleCode);
        return m ? isScopeActive(m) : false;
      });

      if (!allStepsActive) {
        const idx = normalized.findIndex((m) => m.moduleCode === flow.moduleCode);
        if (idx !== -1) {
          const def = () => ({ view: false, create: false, edit: false, approve: false });
          normalized[idx] = {
            ...normalized[idx],
            canView: false,
            self: def(),
            team: def(),
            department: def(),
            division: def(),
            organization: def(),
          };
        }
      }
    });

    return normalized;
  };

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
  const filteredRoles = roles
    .filter(
      (r) =>
        r.roleCode.toLowerCase().includes(searchRole.toLowerCase().trim()) ||
        r.roleName.toLowerCase().includes(searchRole.toLowerCase().trim())
    )
    .sort((a, b) => {
      if (a.isSystemDefault && !b.isSystemDefault) return -1;
      if (!a.isSystemDefault && b.isSystemDefault) return 1;
      return a.id - b.id;
    });

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
        const isCurrentModDashboard =
          m.categoryCode === 'DASHBOARD' || m.groupName === 'DASHBOARD';

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
          if (isCurrentModDashboard) {
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

  // Helper: ตรวจสอบว่า Flow ไกด์เปิดใช้งานอยู่หรือไม่ (ต้องติ๊กสเต็ปย่อยครบทุกขั้นตอนเท่านั้น หากไม่ครบจะถือว่าไม่ได้ใช้งาน)
  const isGuideFlowActive = (flow: GuideFlowConfig) => {
    if (!flow.steps.length) return false;
    return flow.steps.every((s) => {
      const m = localModules.find((mod) => mod.moduleCode === s.targetModuleCode);
      return m ? isModuleActive(m) : false;
    });
  };

  // Helper: นับจำนวนสเต็ปที่เปิดสิทธิ์อยู่ใน Flow
  const getGuideFlowActiveStepsCount = (flow: GuideFlowConfig) => {
    return flow.steps.filter((s) => {
      const m = localModules.find((mod) => mod.moduleCode === s.targetModuleCode);
      return m ? isModuleActive(m) : false;
    }).length;
  };

  // Helper: ตรวจสอบว่าสเต็ปนี้มีเงื่อนไขเตือน (ต้องแก้ไขสิทธิ์ เช่น ขาดสิทธิ์ Create/Edit)
  const checkStepWarning = (step: GuideStepConfig, targetMod?: ModulePermissionScope): boolean => {
    if (!targetMod) return true;
    if (!isModuleActive(targetMod)) return true;

    if (step.requiresWrite) {
      const scopes: Array<'self' | 'team' | 'department' | 'division' | 'organization'> = [
        'self',
        'team',
        'department',
        'division',
        'organization',
      ];
      const hasWrite = scopes.some((s) => targetMod[s]?.create || targetMod[s]?.edit);
      return !hasWrite;
    }

    return false;
  };

  // Helper: นับจำนวนสเต็ปที่เปิดใช้แต่มีคำเตือนต้องแก้ไขสิทธิ์
  const getGuideFlowWarningCount = (flow: GuideFlowConfig) => {
    return flow.steps.filter((s) => {
      const m = localModules.find((mod) => mod.moduleCode === s.targetModuleCode);
      const isStepActive = m ? isModuleActive(m) : false;
      return isStepActive && checkStepWarning(s, m);
    }).length;
  };

  // Handler สำหรับติ๊กเปิด/ปิดสเต็ปย่อยใน Flow (หากติ๊กไม่ครบทุกสเต็ป จะถือว่า Flow นี้ปิดใช้งาน)
  const handleToggleFlowStep = (step: GuideStepConfig, flow: GuideFlowConfig) => {
    setLocalModules((prev) => {
      const targetMod = prev.find((m) => m.moduleCode === step.targetModuleCode);
      const willStepBeActive = targetMod ? !isModuleActive(targetMod) : true;

      // ตรวจสอบว่าหลังจากสลับสเต็ปนี้แล้ว ทุกสเต็ปใน Flow จะเปิดครบทั้งหมดหรือไม่
      const allStepsWillBeActive = flow.steps.every((s) => {
        if (s.targetModuleCode === step.targetModuleCode) {
          return willStepBeActive;
        }
        const otherMod = prev.find((pm) => pm.moduleCode === s.targetModuleCode);
        return otherMod ? isModuleActive(otherMod) : false;
      });

      const empty = { view: false, create: false, edit: false, approve: false };

      return prev.map((m) => {
        // 1. อัปเดตโมดูลเป้าหมายของสเต็ปที่คลิก
        if (m.moduleCode === step.targetModuleCode) {
          if (willStepBeActive) {
            return {
              ...m,
              canView: true,
              self: { view: true, create: false, edit: false, approve: false },
            };
          } else {
            return {
              ...m,
              canView: false,
              self: { ...empty },
              team: { ...empty },
              department: { ...empty },
              division: { ...empty },
              organization: { ...empty },
            };
          }
        }

        // 2. อัปเดตโมดูลหลักของ Flow (GUIDE_xxx): เปิดเฉพาะเมื่อทุกสเต็ปใน Flow ถูกติ๊กครบทั้งหมดเท่านั้น
        if (m.moduleCode === flow.moduleCode) {
          if (allStepsWillBeActive) {
            return {
              ...m,
              canView: true,
              self: { view: true, create: false, edit: false, approve: false },
            };
          } else {
            return {
              ...m,
              canView: false,
              self: { ...empty },
              team: { ...empty },
              department: { ...empty },
              division: { ...empty },
              organization: { ...empty },
            };
          }
        }

        return m;
      });
    });
    setIsDirty(true);
  };

  // Handler สำหรับ Master Toggle ของแต่ละ Flow ไกด์ (เปิด/ปิดทั้งโมดูล GUIDE_xxx และทุกเมนูย่อยใน Flow)
  const handleToggleGuideFlow = (flow: GuideFlowConfig) => {
    const currentlyActive = isGuideFlowActive(flow);
    const targetCodes = new Set([flow.moduleCode, ...flow.steps.map((s) => s.targetModuleCode)]);

    setLocalModules((prev) => {
      const empty = { view: false, create: false, edit: false, approve: false };
      return prev.map((m) => {
        if (targetCodes.has(m.moduleCode)) {
          if (currentlyActive) {
            // หากเปิดครบอยู่แล้ว เมื่อกดปิด → ปิดทั้ง Flow และทุกสเต็ป
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
            // หากยังเปิดไม่ครบ หรือปิดอยู่ เมื่อกดเปิด → เปิดทั้ง Flow และทุกสเต็ปให้ครบสมบูรณ์
            return {
              ...m,
              canView: true,
              self: { view: true, create: false, edit: false, approve: false },
            };
          }
        }
        return m;
      });
    });
    setIsDirty(true);
  };

  // Handler สำหรับ Master Toggle ของหมวด "วิธีการใช้งาน" ทั้งหมด (เปิด/ปิดทั้ง 9 Flows)
  const handleToggleGuideCategory = () => {
    const anyActive = GUIDE_FLOW_CONFIGS.some((flow) => isGuideFlowActive(flow));
    const allTargetCodes = new Set<string>();
    GUIDE_FLOW_CONFIGS.forEach((flow) => {
      allTargetCodes.add(flow.moduleCode);
      flow.steps.forEach((s) => allTargetCodes.add(s.targetModuleCode));
    });

    setLocalModules((prev) => {
      const empty = { view: false, create: false, edit: false, approve: false };
      return prev.map((m) => {
        if (allTargetCodes.has(m.moduleCode)) {
          if (anyActive) {
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
            return {
              ...m,
              canView: true,
              self: { view: true, create: false, edit: false, approve: false },
            };
          }
        }
        return m;
      });
    });
    setIsDirty(true);
  };

  // Master switch per category
  const handleToggleCategory = (catCode: string) => {
    if (catCode === 'GUIDE') {
      handleToggleGuideCategory();
      return;
    }

    const cat = categories.find((c) => c.code === catCode);
    if (!cat) return;

    const isDashboardCat = catCode === 'DASHBOARD';
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
          if (isDashboardCat) {
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
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchRole}
              onChange={(e) => setSearchRole(e.target.value)}
              placeholder="ค้นหาบทบาท..."
              className="w-full h-9.5 pl-8 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {canCreateRole && (
            <Button
              onClick={onAddRoleClick}
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              เพิ่มบทบาท
            </Button>
          )}
        </div>

        {/* Roles List */}
        <div
          style={{ maxHeight: rightPaneHeight ? `${Math.max(380, rightPaneHeight - 52)}px` : 'calc(100vh - 280px)' }}
          className="space-y-2.5 overflow-y-auto pr-1"
        >
          {filteredRoles.map((role) => {
            const isSelected = selectedRoleMatrix?.id === role.id;
            const roleColor = role.color || '#2563EB';
            return (
              <div
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'stat-panel text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: roleColor,
                        borderColor: roleColor,
                      }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: isSelected ? '#FFFFFF' : roleColor }}
                      />
                      <span
                        className={`font-bold text-sm tracking-tight ${
                          isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {role.roleName}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const isCurrentUserRole = currentUser?.roles?.some(
                      (r) => r.toUpperCase() === role.roleCode.toUpperCase()
                    );
                    const isRoleActive = role.status === 'ACTIVE';

                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                          isSelected
                            ? 'text-white'
                            : isCurrentUserRole
                            ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60'
                            : isRoleActive
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                            : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                        }`}
                        style={isSelected ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : undefined}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: isSelected
                              ? '#FFFFFF'
                              : isCurrentUserRole
                              ? '#3B82F6'
                              : isRoleActive
                              ? '#10B981'
                              : '#94A3B8',
                          }}
                        />
                        {isCurrentUserRole ? 'บทบาทของคุณ' : isRoleActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    );
                  })()}
                </div>

                {role.description && (
                  <p
                    className={`text-[11px] line-clamp-2 mt-2 leading-relaxed ${
                      isSelected
                        ? 'text-white/85'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {role.description}
                  </p>
                )}

                {canEditRole && (
                  <div
                    className={`mt-3 pt-2.5 border-t flex items-center justify-end gap-3.5 text-[11px] ${
                      isSelected
                        ? 'border-white/20'
                        : 'border-slate-100 dark:border-slate-700/60'
                    }`}
                  >
                    {role.isSystemDefault ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRoleClick(role);
                          }}
                          className={`flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-white hover:text-white/80'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>แก้ไข</span>
                        </button>
                        <span
                          className={`flex items-center gap-1 cursor-not-allowed select-none text-[11px] ${
                            isSelected
                              ? 'text-white/40'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                          title="บทบาทเริ่มต้นของระบบ ไม่สามารถลบได้"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>ลบ</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRoleClick(role);
                          }}
                          className={`flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-white hover:text-white/80'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRoleClick(role);
                          }}
                          className={`flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-white hover:text-white/80'
                              : 'text-rose-500 hover:text-rose-700'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>ลบ</span>
                        </button>
                      </>
                    )}
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
                  <span
                    className="flex items-center gap-1.5 font-bold"
                    style={{ color: selectedRoleMatrix.color || '#2563EB' }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: selectedRoleMatrix.color || '#2563EB' }}
                    />
                    {selectedRoleMatrix.roleName}
                  </span>
                </h2>
                {selectedRoleMatrix.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedRoleMatrix.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                  {localModules.length} โมดูลในระบบ
                </span>
              </div>
            </div>

            {/* 2. Top Toolbar: Search (Left) | Actions (Right) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {/* Left: Search Bar */}
              <div className="relative max-w-sm w-full shrink-0">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchModuleQuery}
                  onChange={(e) => setSearchModuleQuery(e.target.value)}
                  placeholder="ค้นหากลุ่มหรือสิทธิ์..."
                  className="w-full pl-9 pr-8 py-2 bg-[#F1F5F9] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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

              {/* Right: Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCollapseAll}
                >
                  หุบทั้งหมด
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleExpandAll}
                >
                  ขยายทั้งหมด
                </Button>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectAll}
                  icon={<CheckSquare className="w-3.5 h-3.5 text-emerald-600" />}
                >
                  เลือกทั้งหมด
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDeselectAll}
                >
                  ยกเลิกทั้งหมด
                </Button>
              </div>
            </div>

            {/* 3. Accordion Group List */}
            <div className="space-y-3 pt-2">
              {filteredCategories.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400 text-xs">
                  ไม่พบโมดูลหรือสิทธิ์ที่ค้นหา &quot;{searchModuleQuery}&quot;
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const isExpanded = expandedCategories.has(cat.code);
                  const IconComp = CATEGORY_ICONS[cat.code] || Layers;
                  const isGuideCat = cat.code === 'GUIDE';

                  // สำหรับหมวดหมู่ GUIDE คำนวณจำนวนไกด์ที่เปิดใช้งานอยู่
                  const guideActiveFlowsCount = isGuideCat
                    ? GUIDE_FLOW_CONFIGS.filter((flow) => isGuideFlowActive(flow)).length
                    : 0;

                  const activeModulesCount = isGuideCat
                    ? guideActiveFlowsCount
                    : cat.modules.filter((m) => isModuleActive(m)).length;
                  const isCatAllActive = isGuideCat
                    ? guideActiveFlowsCount === GUIDE_FLOW_CONFIGS.length
                    : activeModulesCount === cat.modules.length && cat.modules.length > 0;
                  const isCatPartial = isGuideCat
                    ? guideActiveFlowsCount > 0 && guideActiveFlowsCount < GUIDE_FLOW_CONFIGS.length
                    : activeModulesCount > 0 && activeModulesCount < cat.modules.length;
                  const isCatOff = isGuideCat ? guideActiveFlowsCount === 0 : activeModulesCount === 0; // ปิดทั้งหมด → พื้นเทา

                  return (
                    <div
                      key={cat.code}
                      className={`rounded-2xl border overflow-hidden transition-all ${
                        isCatOff
                          ? 'border-slate-200 bg-slate-100 dark:bg-slate-900/70 dark:border-slate-700'
                          : 'border-slate-200/90 bg-white dark:bg-slate-800 shadow-2xs'
                      }`}
                    >
                      {/* Group Header */}
                      <div
                        onClick={() => toggleCategoryExpand(cat.code)}
                        className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                          isCatOff
                            ? `bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-900/70 ${isExpanded ? 'border-b border-slate-200/80 dark:border-slate-700' : ''}`
                            : isExpanded
                            ? 'bg-slate-50/90 border-b border-slate-200/80'
                            : 'bg-white hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-transform"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                            )}
                          </button>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCatOff ? 'bg-slate-200/70 text-slate-400 dark:bg-slate-800' : 'bg-primary/10 text-primary dark:text-blue-300'}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-xs tracking-tight ${isCatOff ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {cat.name}
                            </span>

                            {ESS_CATEGORY_CODES.has(cat.code) && (
                              <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 px-2 py-0.5 rounded-full hidden sm:inline">
                                เฉพาะข้อมูลตนเอง (Self Only)
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isGuideCat
                                  ? guideActiveFlowsCount > 0
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                  : activeModulesCount > 0
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
                                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                              }`}
                            >
                              {isGuideCat
                                ? `${guideActiveFlowsCount}/${GUIDE_FLOW_CONFIGS.length} ไกด์เปิดใช้`
                                : `${activeModulesCount}/${cat.modules.length} เปิดใช้`}
                            </span>
                          </div>
                        </div>

                        {/* Master Category Toggle */}
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400 hidden sm:inline">
                            {isCatAllActive
                              ? 'เปิดทั้งหมด'
                              : isCatPartial
                              ? 'เปิดบางส่วน'
                              : 'ปิดทั้งหมด'}
                          </span>
                          <ToggleSwitch
                            checked={isGuideCat ? guideActiveFlowsCount > 0 : activeModulesCount > 0}
                            onChange={() => handleToggleCategory(cat.code)}
                            disabled={!canEditRole}
                          />
                        </div>
                      </div>

                      {/* Group Content (Modules) */}
                      {isExpanded && (
                        isGuideCat ? (
                          /* View สำหรับหมวด "วิธีการใช้งาน": แสดงรายการไกด์ทั้ง 9 Flows ในรูปแบบ Accordion Stepper Timeline ตามดีไซน์ */
                          <div className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-800">
                            {GUIDE_FLOW_CONFIGS.map((flow) => {
                              const isFlowActive = isGuideFlowActive(flow);
                              const activeStepsCount = getGuideFlowActiveStepsCount(flow);
                              const warningCount = getGuideFlowWarningCount(flow);
                              const isFlowExpanded = expandedGuideFlows[flow.id] ?? (flow.id === 'hr-onboarding');
                              const FlowIcon = flow.icon;
                              const cleanFlowTitle = flow.title.replace(/^ไกด์:\s*/, '');

                              return (
                                <div key={flow.id} className="transition-colors">
                                  {/* Flow Header Row */}
                                  <div
                                    onClick={() => toggleGuideFlowExpand(flow.id)}
                                    className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                                      isFlowActive
                                        ? 'bg-white dark:bg-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/40'
                                        : 'bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                                    }`}
                                  >
                                    {/* Left: Caret + Icon + Title + Badges + Subtitle */}
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      {/* Chevron Expand Indicator */}
                                      <div className="text-slate-400 dark:text-slate-500 shrink-0">
                                        <ChevronDown
                                          className={`w-4 h-4 transition-transform duration-200 ${
                                            isFlowExpanded ? 'rotate-0' : '-rotate-90'
                                          }`}
                                        />
                                      </div>

                                      {/* Flow Icon Container */}
                                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                                        <FlowIcon className="w-4.5 h-4.5" />
                                      </div>

                                      {/* Title, Badges and Subtitle */}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug">
                                            {cleanFlowTitle}
                                          </span>
                                          <span
                                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                              isFlowActive
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50'
                                                : activeStepsCount > 0
                                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700'
                                            }`}
                                          >
                                            {activeStepsCount}/{flow.steps.length} ขั้นตอน
                                          </span>
                                          {warningCount > 0 && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 flex items-center gap-1">
                                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                              <span>{warningCount} ต้องแก้ไข</span>
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                                          {flow.subtitle}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Right: Master Toggle Switch */}
                                    <div
                                      className="shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ToggleSwitch
                                        checked={isFlowActive}
                                        onChange={() => handleToggleGuideFlow(flow)}
                                        disabled={!canEditRole}
                                      />
                                    </div>
                                  </div>

                                  {/* Expanded Sub-steps (Stepper Timeline View) */}
                                  {isFlowExpanded && (
                                    <div className="pt-1 pb-4 px-4 sm:px-6 bg-slate-50/40 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80">
                                      <div className="relative pl-7 sm:pl-9 pr-2 py-2 space-y-4">
                                        {flow.steps.map((step, idx) => {
                                          const targetMod = localModules.find((m) => m.moduleCode === step.targetModuleCode);
                                          const isStepActive = targetMod ? isModuleActive(targetMod) : false;
                                          const isWarning = isStepActive && checkStepWarning(step, targetMod);
                                          const isLast = idx === flow.steps.length - 1;

                                          return (
                                            <div
                                              key={`${flow.id}-${step.step}-${step.targetModuleCode}`}
                                              className="relative flex items-center justify-between gap-3 group"
                                            >
                                              {/* Vertical Connecting Line to next step */}
                                              {!isLast && (
                                                <div
                                                  className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-slate-200 dark:bg-slate-700"
                                                  aria-hidden="true"
                                                />
                                              )}

                                              {/* Step Number Circle + Title + Route */}
                                              <div
                                                onClick={() => canEditRole && handleToggleFlowStep(step, flow)}
                                                className="flex items-center gap-3 min-w-0 z-10 cursor-pointer select-none flex-1"
                                              >
                                                <div
                                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 transition-all ${
                                                    isWarning
                                                      ? 'bg-[#C2410C] ring-2 ring-orange-200 dark:ring-orange-950/60'
                                                      : isStepActive
                                                      ? 'bg-[#0B2046] dark:bg-blue-600'
                                                      : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                  }`}
                                                  title={
                                                    isWarning
                                                      ? 'ขั้นตอนนี้ต้องการสิทธิ์ สร้าง/แก้ไข (Create/Edit) ในโมดูลเป้าหมายเพื่อทำรายการได้ครบถ้วน'
                                                      : undefined
                                                  }
                                                >
                                                  {step.step}
                                                </div>

                                                <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                                                  <span
                                                    className={`text-xs sm:text-sm font-semibold transition-colors ${
                                                      isStepActive
                                                        ? 'text-slate-800 dark:text-slate-200'
                                                        : 'text-slate-400 dark:text-slate-500'
                                                    }`}
                                                  >
                                                    {step.label.replace(/^\d+\.\s*/, '')}
                                                  </span>
                                                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                                    {step.route}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Toggle Switch */}
                                              <div
                                                className="shrink-0 z-10"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <ToggleSwitch
                                                  size="sm"
                                                  checked={isStepActive}
                                                  onChange={() => handleToggleFlowStep(step, flow)}
                                                  disabled={!canEditRole}
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Alert Box when there are steps needing attention */}
                                      {warningCount > 0 && (
                                        <div className="mt-3 ml-7 sm:ml-9 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                          <div className="space-y-0.5">
                                            <p className="font-semibold">มี {warningCount} ขั้นตอนที่ต้องแก้ไขสิทธิ์เพิ่มเติม</p>
                                            <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                                              ขั้นตอนที่มีสัญลักษณ์สีส้มต้องการสิทธิ์ สร้าง/แก้ไข (Create/Edit) หรือการเปิดสิทธิ์ในโมดูลที่เกี่ยวข้อง เพื่อให้พนักงานที่มีบทบาทนี้สามารถทำรายการตามขั้นตอนได้ครบถ้วน
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
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
                                className={`px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${ modActive ? 'bg-white dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-900/70'
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
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 font-mono mt-0.5">
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
                                    disabled={!canEditRole}
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
                                            disabled={!modActive || !canEditRole}
                                            onClick={(e) => handleOpenPopover(e, mod.moduleCode, scope.key)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer select-none ${ !modActive || !canEditRole ? 'bg-slate-100 text-slate-300 border-slate-200/60 cursor-not-allowed'
                                                : isScopeActive
                                                ? 'bg-primary hover:bg-primary-hover text-white border-primary shadow-2xs'
                                                : isPopoverOpen
                                                ? 'bg-slate-100 dark:bg-slate-800 text-primary dark:text-blue-300 border-slate-300 ring-2 ring-primary/20'
                                                : 'bg-white hover:bg-slate-100 text-slate-600 dark:text-slate-400 border-slate-200 hover:border-slate-300'
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
                        )
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
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (selectedRoleMatrix) {
                        setLocalModules(normalizeModules(selectedRoleMatrix.modules));
                        setIsDirty(false);
                      }
                    }}
                  >
                    ยกเลิก
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={!isDirty || !canEditRole}
                  loading={isSavingMatrix}
                  onClick={handleSave}
                >
                  บันทึกสิทธิ์การใช้งาน
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-24 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium text-xs">
            เลือกบทบาททางด้านซ้ายเพื่อตั้งค่าสิทธิ์การเข้าถึง
          </div>
        )}
      </div>

      {/* Scope Details Popover Portal */}
      {activePopover && activeMod && activeScopeConfig && (
        <ModalShell
          className="z-[99999] bg-transparent"
          innerClassName="p-0"
          onBackdropClick={() => setActivePopover(null)}
        >
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
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-400 truncate">
                  {activeMod.moduleName}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span>ระดับ: {activeScopeConfig.label}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePopover(null)}
                className="text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
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
                        : 'bg-slate-50/50 border-slate-200/70 text-slate-600 dark:text-slate-400 hover:bg-slate-100/70'
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
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/20 pointer-events-none cursor-pointer"
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
                className="text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                ล้างทั้งหมด
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

