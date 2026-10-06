'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Network,
  Search,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  Mail,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  UserX,
  Users,
  X,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { organizationService } from '@/services/organizationService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getAvatarUrl } from '@/lib/api-client';
import type { OrgChart, OrgChartDepartment, OrgChartDivision, OrgChartPerson } from '@/types/organization';

// ---------------------------------------------------------------------------
// สีประจำระดับ
// ---------------------------------------------------------------------------
const CEO_COLOR = '#F59E0B';
const DIVISION_COLORS = ['#06B6D4', '#EC4899', '#EAB308'];
const DEPARTMENT_COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#14B8A6'];

const divColor = (i: number) => DIVISION_COLORS[i % DIVISION_COLORS.length];
const deptColor = (i: number) => DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length];

const divKey = (id: number) => `div-${id}`;
const deptKey = (id: number) => `dept-${id}`;

interface OpenPerson {
  person: OrgChartPerson;
  unit?: string;
}

// ---------------------------------------------------------------------------
// ส่วนประกอบย่อย (ประกาศนอกคอมโพเนนต์หลัก เพื่อไม่ให้ถูกสร้างใหม่ทุกครั้งที่ render)
// ---------------------------------------------------------------------------

/** วาดลูกเป็นแถวแนวนอนพร้อมเส้นเชื่อมแบบต้นไม้ */
function OrgRow({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  if (items.length === 0) return null;
  if (items.length === 1) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-px h-5 bg-slate-300" />
        {items[0]}
      </div>
    );
  }
  return (
    <div className="flex items-start">
      {items.map((child, i) => (
        <div key={i} className="flex flex-col items-center px-2">
          <div className="w-[calc(100%+1rem)] -mx-2 flex">
            <div className={`flex-1 h-5 ${i === 0 ? '' : 'border-t border-slate-300'}`} />
            <div className="w-px h-5 bg-slate-300 shrink-0" />
            <div className={`flex-1 h-5 ${i === items.length - 1 ? '' : 'border-t border-slate-300'}`} />
          </div>
          {child}
        </div>
      ))}
    </div>
  );
}

function Avatar({ person, size = 'md' }: { person: OrgChartPerson; size?: 'sm' | 'md' | 'lg' }) {
  const [broken, setBroken] = useState(false);
  const url = getAvatarUrl(person.avatarUrl);
  const cls = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-sm';
  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={person.fullName}
        onError={() => setBroken(true)}
        className={`${cls} rounded-full object-cover ring-2 ring-white shrink-0`}
      />
    );
  }
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-bold text-slate-600 ring-2 ring-white shrink-0`}>
      {person.fullName.replace(/^(นาย|นางสาว|นาง|น\.ส\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').charAt(0) || '?'}
    </div>
  );
}

interface NodeCardProps {
  person?: OrgChartPerson | null;
  roleFallback: string;
  unit?: string;
  color: string;
  highlight?: boolean;
  childCount?: number;
  expanded?: boolean;
  onToggle?: () => void;
  onOpen: (p: OpenPerson) => void;
  meta?: React.ReactNode;
}

/** การ์ดหัวหน้า/ผู้บริหารในแผนผัง — ถ้าไม่มีคน จะแสดงเป็น "ตำแหน่งว่าง" */
function NodeCard({ person, roleFallback, unit, color, highlight, childCount = 0, expanded, onToggle, onOpen, meta }: NodeCardProps) {
  const canToggle = !!onToggle && childCount > 0;
  const ring = highlight ? 'ring-2 ring-blue-400 border-blue-300' : '';

  return (
    <div
      className={`relative w-56 shrink-0 rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        person ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50'
      } ${ring}`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2.5">
          {person ? (
            <Avatar person={person} />
          ) : (
            <div className="w-9 h-9 rounded-full border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
              <UserX className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className={`text-xs font-bold truncate leading-tight ${person ? 'text-slate-900' : 'text-slate-500'}`}>
              {person ? person.fullName : 'ตำแหน่งว่าง'}
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">{person?.positionName || roleFallback}</div>
            {unit && <div className="text-[10px] font-medium truncate" style={{ color }}>{unit}</div>}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 flex items-center justify-between px-2 py-1 min-h-[32px]">
        <div className="flex items-center gap-0.5">
          {person?.workEmail && (
            <a
              href={`mailto:${person.workEmail}`}
              title={`อีเมล: ${person.workEmail}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors print:hidden"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}
          {person && (
            <button
              type="button"
              title="ดูข้อมูล"
              onClick={() => onOpen({ person, unit })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors print:hidden"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
          {meta}
        </div>
        {canToggle && (
          <button
            type="button"
            onClick={onToggle}
            title={expanded ? 'ยุบ' : 'ขยาย'}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors print:hidden"
          >
            <span>{childCount}</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="h-[3px] rounded-b-xl" style={{ background: color }} />

      {canToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? 'ยุบ' : 'ขยาย'}
          style={{ background: color }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow z-10 flex items-center justify-center print:hidden"
        >
          {expanded ? <ChevronUp className="w-2.5 h-2.5 text-white" /> : <ChevronDown className="w-2.5 h-2.5 text-white" />}
        </button>
      )}
    </div>
  );
}

/** รายชื่อพนักงานใต้แผนก — เรียงเป็นตาราง ไม่ให้แผนผังกว้างเกินจอเมื่อคนเยอะ */
function MemberGrid({
  members,
  unit,
  color,
  highlightIds,
  onOpen,
  columns = 2,
}: {
  members: OrgChartPerson[];
  unit?: string;
  color: string;
  highlightIds: Set<number>;
  onOpen: (p: OpenPerson) => void;
  columns?: 2 | 4;
}) {
  const cols = members.length === 1 ? 1 : columns;
  const width = cols === 1 ? 'w-56' : cols === 2 ? 'w-[464px]' : 'w-[920px]';
  const grid = cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : 'grid-cols-4';
  return (
    <div className={`${width} max-w-full rounded-2xl border border-slate-200 bg-white/80 p-2`} style={{ borderTop: `3px solid ${color}` }}>
      <div className={`grid ${grid} gap-1.5`}>
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onOpen({ person: m, unit })}
            className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-50 ${
              highlightIds.has(m.id) ? 'bg-blue-50 ring-2 ring-blue-300' : ''
            }`}
          >
            <Avatar person={m} size="sm" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-800 truncate">{m.fullName}</div>
              <div className="text-[10px] text-slate-500 truncate">{m.positionName || 'พนักงาน'}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function HeadcountBadge({ active, plan }: { active: number; plan?: number | null }) {
  if (!plan) {
    return (
      <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600" title="จำนวนพนักงาน">
        <Users className="w-3 h-3" /> {active}
      </span>
    );
  }
  const tone =
    active < plan ? 'bg-amber-50 text-amber-700' : active === plan ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
  return (
    <span className={`ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${tone}`} title="พนักงานจริง / อัตรากำลังตามแผน">
      <Users className="w-3 h-3" /> {active}/{plan}
    </span>
  );
}

interface TreeCtx {
  expanded: Set<string>;
  toggle: (key: string) => void;
  highlightPeople: Set<number>;
  highlightUnits: Set<string>;
  onOpen: (p: OpenPerson) => void;
}

function DepartmentNode({ dept, index, ctx }: { dept: OrgChartDepartment; index: number; ctx: TreeCtx }) {
  const key = deptKey(dept.id);
  const color = deptColor(index);
  const isOpen = ctx.expanded.has(key);
  const childCount = dept.members.length + dept.subDepartments.length;

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        person={dept.head}
        roleFallback="หัวหน้าแผนก"
        unit={dept.departmentName}
        color={color}
        highlight={(dept.head ? ctx.highlightPeople.has(dept.head.id) : false) || ctx.highlightUnits.has(key)}
        childCount={childCount}
        expanded={isOpen}
        onToggle={() => ctx.toggle(key)}
        onOpen={ctx.onOpen}
        meta={<HeadcountBadge active={dept.activeCount} plan={dept.headcountPlan} />}
      />
      {isOpen && (
        <>
          {dept.members.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="w-px h-5 bg-slate-300" />
              <MemberGrid
                members={dept.members}
                unit={dept.departmentName}
                color={color}
                highlightIds={ctx.highlightPeople}
                onOpen={ctx.onOpen}
              />
            </div>
          )}
          {dept.subDepartments.length > 0 && (
            <div className={dept.members.length > 0 ? 'mt-2' : ''}>
              <OrgRow>
                {dept.subDepartments.map((sub, i) => (
                  <DepartmentNode key={sub.id} dept={sub} index={index + i + 1} ctx={ctx} />
                ))}
              </OrgRow>
            </div>
          )}
          {childCount === 0 && <div className="mt-4 text-[11px] text-slate-400">ยังไม่มีพนักงานในแผนกนี้</div>}
        </>
      )}
    </div>
  );
}

function DivisionNode({ div, index, ctx }: { div: OrgChartDivision; index: number; ctx: TreeCtx }) {
  const key = divKey(div.id);
  const isOpen = ctx.expanded.has(key);
  return (
    <div className="flex flex-col items-center">
      <NodeCard
        person={div.head}
        roleFallback="หัวหน้าฝ่าย"
        unit={div.divisionName}
        color={divColor(index)}
        highlight={(div.head ? ctx.highlightPeople.has(div.head.id) : false) || ctx.highlightUnits.has(key)}
        childCount={div.departments.length}
        expanded={isOpen}
        onToggle={() => ctx.toggle(key)}
        onOpen={ctx.onOpen}
        meta={<HeadcountBadge active={div.activeCount} />}
      />
      {isOpen && div.departments.length > 0 && (
        <div className="mt-2">
          <OrgRow>
            {div.departments.map((d, i) => (
              <DepartmentNode key={d.id} dept={d} index={i} ctx={ctx} />
            ))}
          </OrgRow>
        </div>
      )}
      {isOpen && div.departments.length === 0 && <div className="mt-4 text-[11px] text-slate-400">ยังไม่มีแผนกในฝ่ายนี้</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ค้นหา: หา "คน/หน่วยงานที่ตรง" และโหนดที่ต้องกางเพื่อให้มองเห็น
// ---------------------------------------------------------------------------
function searchChart(chart: OrgChart, q: string) {
  const people = new Set<number>();
  const units = new Set<string>();
  const expand = new Set<string>();
  if (!q) return { people, units, expand, count: 0 };

  const match = (...texts: (string | null | undefined)[]) => texts.some((t) => (t || '').toLowerCase().includes(q));
  const personMatch = (p?: OrgChartPerson | null) => !!p && match(p.fullName, p.employeeCode, p.positionName);
  const openPath = (path: string[]) => path.forEach((k) => expand.add(k));

  if (personMatch(chart.ceo)) people.add(chart.ceo!.id);

  const walkDept = (d: OrgChartDepartment, path: string[]) => {
    const key = deptKey(d.id);
    if (match(d.departmentName, d.departmentCode)) {
      units.add(key);
      openPath(path);
    }
    if (personMatch(d.head)) {
      people.add(d.head!.id);
      openPath(path);
    }
    d.members.forEach((m) => {
      if (personMatch(m)) {
        people.add(m.id);
        openPath([...path, key]);
      }
    });
    d.subDepartments.forEach((s) => walkDept(s, [...path, key]));
  };

  chart.divisions.forEach((div) => {
    const key = divKey(div.id);
    const path = ['ceo'];
    if (match(div.divisionName, div.divisionCode)) {
      units.add(key);
      openPath(path);
    }
    if (personMatch(div.head)) {
      people.add(div.head!.id);
      openPath(path);
    }
    div.departments.forEach((d) => walkDept(d, [...path, key]));
  });

  chart.unassigned.forEach((p) => {
    if (personMatch(p)) people.add(p.id);
  });

  return { people, units, expand, count: people.size + units.size };
}

function allNodeKeys(chart: OrgChart) {
  const keys = new Set<string>(['ceo']);
  const walk = (d: OrgChartDepartment) => {
    keys.add(deptKey(d.id));
    d.subDepartments.forEach(walk);
  };
  chart.divisions.forEach((div) => {
    keys.add(divKey(div.id));
    div.departments.forEach(walk);
  });
  return keys;
}

// ---------------------------------------------------------------------------
// คอมโพเนนต์หลัก
// ---------------------------------------------------------------------------
export default function OrgChartView() {
  const router = useRouter();
  const toast = useToast();
  const { hasPermission, hasRole } = useAuth();
  const canViewEmployee =
    hasPermission('EMP_VIEW') || hasPermission('EMP_PROFILE_VIEW') || hasRole('ADMIN');

  const [chart, setChart] = useState<OrgChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['ceo']));
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [opened, setOpened] = useState<OpenPerson | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setChart(await organizationService.getOrgChart());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดแผนผังองค์กรได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const q = search.trim().toLowerCase();
  const found = useMemo(() => (chart ? searchChart(chart, q) : null), [chart, q]);
  const allKeys = useMemo(() => (chart ? allNodeKeys(chart) : new Set<string>()), [chart]);
  const effectiveExpanded = useMemo(() => {
    if (!found || found.expand.size === 0) return expanded;
    const merged = new Set(expanded);
    found.expand.forEach((k) => merged.add(k));
    return merged;
  }, [expanded, found]);
  const isAllExpanded = allKeys.size > 0 && [...allKeys].every((k) => expanded.has(k));

  /**
   * พิมพ์ด้วย iframe แยก: ได้เฉพาะแผนผัง (ไม่มี Sidebar/เมนู) ขนาด A4 แนวนอน
   * พร้อมหัวกระดาษ และย่อขนาดอัตโนมัติให้พอดีหน้ากระดาษ
   */
  const handlePrint = () => {
    const node = printAreaRef.current;
    if (!node || !chart) return;

    const clone = node.cloneNode(true) as HTMLElement;
    clone.style.zoom = '1';
    clone.classList.remove('min-w-full', 'py-10', 'px-12');
    clone.style.padding = '8px';

    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
    const title = esc(`แผนผังองค์กร${chart.companyName ? ` — ${chart.companyName}` : ''}`);
    const printedAt = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, { position: 'fixed', left: '-10000px', top: '0', width: '1200px', height: '800px', border: '0' });
    iframe.srcdoc = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${title}</title>${styles}
<style>
  @page { size: A4 landscape; margin: 8mm; }
  html, body { background: #fff !important; margin: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .oc-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; border-bottom: 1px solid #e2e8f0; padding: 0 4px 6px; margin-bottom: 10px; font-size: 11px; color: #64748b; }
  .oc-head h1 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
  #oc-sheet { display: flex; justify-content: center; }
</style></head><body>
<div class="oc-head"><h1>${title}</h1><span>${esc(`${chart.divisions.length} ฝ่าย · ${chart.totalDepartments} แผนก · ${chart.totalEmployees} คน · พิมพ์เมื่อ ${printedAt}`)}</span></div>
<div id="oc-sheet">${clone.outerHTML}</div>
</body></html>`;

    iframe.onload = () => {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      const content = doc?.getElementById('oc-sheet')?.firstElementChild as HTMLElement | null;
      if (!doc || !win || !content) {
        iframe.remove();
        return;
      }
      // พื้นที่พิมพ์ A4 แนวนอน (ขอบ 8 มม.) ≈ 1060 × 700 px — ย่อให้พอดีความกว้าง และพอดีหน้าเดียวถ้าย่อแล้วยังอ่านได้
      const pageW = 1060;
      const pageH = 680;
      const w = content.scrollWidth;
      const h = content.scrollHeight;
      let scale = Math.min(1, pageW / w);
      const fitOnePage = Math.min(1, pageW / w, pageH / h);
      if (h * scale > pageH && fitOnePage >= 0.4) scale = fitOnePage;
      content.style.zoom = String(scale);

      const cleanup = () => setTimeout(() => iframe.remove(), 300);
      win.addEventListener('afterprint', cleanup, { once: true });
      // รอรูป/ฟอนต์โหลดให้ครบก่อนสั่งพิมพ์
      const ready = doc.fonts ? doc.fonts.ready : Promise.resolve();
      ready.then(() => {
        setTimeout(() => {
          win.focus();
          win.print();
        }, 200);
      });
      setTimeout(() => iframe.remove(), 120000);
    };

    document.body.appendChild(iframe);
  };

  const ctx: TreeCtx = {
    expanded: effectiveExpanded,
    toggle,
    highlightPeople: found?.people ?? new Set(),
    highlightUnits: found?.units ?? new Set(),
    onOpen: setOpened,
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Network className="w-5 h-5 text-[#0B2046] dark:text-blue-400" />
            แผนผังองค์กร
          </h2>
          {chart && (
            <p className="text-xs text-slate-500 mt-0.5">
              {chart.companyName || 'บริษัท'} · {chart.divisions.length} ฝ่าย · {chart.totalDepartments} แผนก · {chart.totalEmployees} คน
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!chart}
            onClick={() => setExpanded(isAllExpanded ? new Set(['ceo']) : new Set(allKeys))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            {isAllExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {isAllExpanded ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!chart}
            title="พิมพ์แผนผังตามที่แสดงบนหน้าจอ (กางโหนดที่ต้องการก่อนพิมพ์) / บันทึกเป็น PDF"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Printer className="w-3.5 h-3.5" />
            พิมพ์
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/30">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ รหัส ตำแหน่ง ฝ่าย หรือแผนก..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="ล้างคำค้นหา"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {q && found && (
          <span className={`text-xs ${found.count > 0 ? 'text-slate-500' : 'text-rose-600'}`}>
            {found.count > 0 ? `พบ ${found.count} รายการ (ไฮไลต์สีฟ้า)` : 'ไม่พบผลลัพธ์'}
          </span>
        )}
      </div>

      {/* Canvas */}
      <div className="relative bg-slate-100/80 dark:bg-slate-900/40">
        <div className="overflow-auto overscroll-contain" style={{ minHeight: 520, maxHeight: 'calc(100vh - 220px)' }}>
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B2046]" />
              <p className="text-sm text-slate-500">กำลังโหลดแผนผังองค์กร...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center px-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm text-slate-600">{error}</p>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2046] text-white text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> ลองใหม่
              </button>
            </div>
          ) : chart ? (
            <div ref={printAreaRef} className="w-max min-w-full py-10 px-12" style={{ zoom }}>
              <div className="flex flex-col items-center">
                {/* ระดับ 0: CEO */}
                <NodeCard
                  person={chart.ceo}
                  roleFallback="ผู้บริหารสูงสุด (CEO)"
                  unit={chart.companyName}
                  color={CEO_COLOR}
                  highlight={chart.ceo ? ctx.highlightPeople.has(chart.ceo.id) : false}
                  childCount={chart.divisions.length}
                  expanded={effectiveExpanded.has('ceo')}
                  onToggle={() => toggle('ceo')}
                  onOpen={setOpened}
                />

                {/* ระดับ 1: ฝ่าย */}
                {effectiveExpanded.has('ceo') && chart.divisions.length > 0 && (
                  <div className="mt-2">
                    <OrgRow>
                      {chart.divisions.map((div, i) => (
                        <DivisionNode key={div.id} div={div} index={i} ctx={ctx} />
                      ))}
                    </OrgRow>
                  </div>
                )}
                {chart.divisions.length === 0 && <div className="mt-6 text-xs text-slate-400">ยังไม่มีฝ่ายในระบบ</div>}

                {/* พนักงานที่ยังไม่มีสังกัด */}
                {chart.unassigned.length > 0 && (
                  <div className="mt-12 flex flex-col items-center gap-2">
                    <div className="text-xs font-semibold text-slate-500">
                      ยังไม่ได้สังกัดแผนก ({chart.unassigned.length} คน)
                    </div>
                    <MemberGrid
                      members={chart.unassigned}
                      color="#94A3B8"
                      highlightIds={ctx.highlightPeople}
                      onOpen={setOpened}
                      columns={4}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Zoom */}
        {chart && (
          <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 z-10 print:hidden">
            <button
              type="button"
              title="ขยาย"
              onClick={() => setZoom((z) => Math.min(+(z + 0.1).toFixed(1), 1.5))}
              className="w-8 h-8 bg-white border border-slate-200 rounded-lg shadow flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="ย่อ"
              onClick={() => setZoom((z) => Math.max(+(z - 0.1).toFixed(1), 0.4))}
              className="w-8 h-8 bg-white border border-slate-200 rounded-lg shadow flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="ขนาดปกติ"
              onClick={() => setZoom(1)}
              className="w-8 h-8 bg-white border border-slate-200 rounded-lg shadow flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-8 text-center text-[10px] font-mono text-slate-500">{Math.round(zoom * 100)}%</div>
          </div>
        )}
      </div>

      {/* ข้อมูลพนักงาน */}
      {opened && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setOpened(null)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#0B2046] px-6 pt-6 pb-5 text-center text-white relative">
              <button
                type="button"
                onClick={() => setOpened(null)}
                aria-label="ปิด"
                className="absolute right-3 top-3 p-1 rounded-lg text-blue-100 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex justify-center mb-3">
                <Avatar person={opened.person} size="lg" />
              </div>
              <h3 className="text-base font-bold">{opened.person.fullName}</h3>
              <p className="text-xs text-blue-200 mt-0.5">{opened.person.positionName || 'พนักงาน'}</p>
              {opened.unit && <p className="text-[11px] text-blue-100/80 mt-0.5">{opened.unit}</p>}
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">รหัสพนักงาน</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{opened.person.employeeCode}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 shrink-0">อีเมลบริษัท</span>
                {opened.person.workEmail ? (
                  <span className="flex items-center gap-1 min-w-0">
                    <a href={`mailto:${opened.person.workEmail}`} className="font-semibold text-blue-700 hover:underline truncate">
                      {opened.person.workEmail}
                    </a>
                    <button
                      type="button"
                      title="คัดลอก"
                      onClick={() => {
                        navigator.clipboard?.writeText(opened.person.workEmail!);
                        toast.success('คัดลอกอีเมลแล้ว');
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
              {canViewEmployee && (
                <button
                  type="button"
                  onClick={() => router.push(`/employees/${opened.person.id}`)}
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0B2046] text-white text-xs font-semibold hover:bg-[#081836]"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> ดูโปรไฟล์พนักงาน
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
