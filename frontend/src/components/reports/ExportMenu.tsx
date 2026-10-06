'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileDown, Loader2, ChevronDown } from 'lucide-react';

export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';

/**
 * ปุ่มส่งออกรายงาน: Excel (.xlsx), CSV และ PDF (พิมพ์เฉพาะรายงาน)
 * ใช้เหมือนกันทุกแท็บในหน้ารายงาน
 */
export default function ExportMenu({
  onExport,
  disabled,
  label = 'ส่งออก',
  formats = ['xlsx', 'csv', 'pdf'],
}: {
  onExport: (format: ReportExportFormat) => Promise<void> | void;
  disabled?: boolean;
  label?: string;
  formats?: ReportExportFormat[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ReportExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const items: { key: ReportExportFormat; label: string; hint: string; icon: React.ReactNode }[] = [
    { key: 'xlsx', label: 'Excel (.xlsx)', hint: 'เปิดด้วย Excel / Google Sheets', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> },
    { key: 'csv', label: 'CSV', hint: 'ไฟล์ข้อความ นำเข้าระบบอื่น', icon: <FileDown className="w-4 h-4 text-slate-500" /> },
    { key: 'pdf', label: 'PDF / พิมพ์', hint: 'เลือก "บันทึกเป็น PDF" ในหน้าต่างพิมพ์', icon: <FileText className="w-4 h-4 text-rose-600" /> },
  ];

  const run = async (f: ReportExportFormat) => {
    setOpen(false);
    setBusy(f);
    try {
      await onExport(f);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={ref} className="relative print:hidden" data-print-hide>
      <button
        type="button"
        disabled={disabled || busy !== null}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0B2046] text-white text-xs font-medium hover:bg-[#081836] transition-colors disabled:opacity-50 shadow-sm"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {label}
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {items
            .filter((i) => formats.includes(i.key))
            .map((i) => (
              <button
                key={i.key}
                type="button"
                onClick={() => run(i.key)}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50"
              >
                <span className="mt-0.5">{i.icon}</span>
                <span>
                  <span className="block text-xs font-semibold text-slate-800">{i.label}</span>
                  <span className="block text-[10px] text-slate-400">{i.hint}</span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
