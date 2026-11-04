'use client';

import React, { useState } from 'react';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { ModalShell } from '@/components/ui/ModalShell';
import { Button } from '@/components/ui';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
} from 'lucide-react';
import { commissionService } from '@/services/commissionService';
import { useToast } from '@/context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Cell = string;

interface HeaderCell {
  text: string;
  colSpan?: number;
  rowSpan?: number;
  tooltip?: string;
}

interface SheetSample {
  columns: string[];
  titleRows?: Cell[][];
  headerRows: HeaderCell[][];
  dataRows: Cell[][];
}

const colLetters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)); // A, B, C, ...

// Official Single Standard Template
const TEMPLATE_SAMPLE: SheetSample = {
  columns: colLetters(7),
  titleRows: [
    ['เทมเพลตนำเข้าค่าคอมมิชชั่นมาตรฐาน (HRMS Official Template)'],
  ],
  headerRows: [
    [
      { text: 'วันที่ (วว/ดด/ปปปป หรือ เว้นว่างถ้าทั้งเดือน)', tooltip: 'ระบุวันที่หากต้องการคิดรายวัน หรือเว้นว่างหากต้องการคิดสรุปทั้งเดือน' },
      { text: 'รหัสพนักงาน (จำเป็น)*', tooltip: 'รหัสพนักงานในระบบ (จำเป็นต้องมี)' },
      { text: 'ชื่อ-นามสกุล', tooltip: 'ชื่อ-นามสกุลพนักงาน' },
      { text: 'แผนก', tooltip: 'แผนกสังกัด' },
      { text: 'ตำแหน่ง', tooltip: 'ตำแหน่งงาน' },
      { text: 'ยอดขายรวม (บาท)*', tooltip: 'ยอดขายสุทธิที่นำมาคิดคอมมิชชั่น (จำเป็นต้องมี)' },
      { text: 'หมายเหตุ', tooltip: 'บันทึกเพิ่มเติม' },
    ],
    [
      { text: 'Date' },
      { text: 'EmployeeCode' },
      { text: 'EmployeeName' },
      { text: 'Department' },
      { text: 'Position' },
      { text: 'SalesAmount' },
      { text: 'Note' },
    ],
  ],
  dataRows: [
    ['15/10/2026', 'EMP0001', 'นายสมชาย ตัวอย่าง', 'ฝ่ายขายและการตลาด', 'เจ้าหน้าที่ฝ่ายขาย', '250,000.00', 'ตัวอย่างยอดขายรายวัน (มีวันที่)'],
    ['(เว้นว่าง)', 'EMP0002', 'นางสาวสมหญิง ตัวอย่าง', 'ฝ่ายขายและการตลาด', 'เจ้าหน้าที่ฝ่ายขายอาวุโส', '480,000.00', 'ตัวอย่างยอดขายทั้งเดือน (เว้นว่างวันที่)'],
    ['20/10/2026', 'EMP0003', 'นายประสิทธิ์ ตัวอย่าง', 'วิศวกรรมการขาย', 'วิศวกรฝ่ายขาย', '180,000.00', 'ตัวอย่างยอดขายรายวัน (มีวันที่)'],
  ],
};

const SheetPreview: React.FC<{ sample: SheetSample }> = ({ sample }) => {
  const rowNo =
    'px-1 text-center text-slate-400 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 font-normal align-middle select-none';
  return (
    <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-x-auto shadow-2xs">
      <table className="text-[11px] text-left border-collapse font-mono w-full">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-center">
            <th className="w-8 px-1 py-1 border-r border-slate-300 dark:border-slate-700 font-normal" />
            {sample.columns.map((c) => (
              <th
                key={c}
                className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 font-normal"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          {sample.titleRows?.map((row, r) => (
            <tr key={`t${r}`} className="border-t border-slate-200 dark:border-slate-700">
              <td className={rowNo}>{r + 1}</td>
              <td
                colSpan={sample.columns.length}
                className="px-2 py-1.5 font-semibold text-slate-800 dark:text-slate-200"
              >
                {row[0]}
              </td>
            </tr>
          ))}
          {sample.headerRows.map((row, r) => (
            <tr
              key={`h${r}`}
              className="border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60"
            >
              <td className={rowNo}>{(sample.titleRows?.length || 0) + r + 1}</td>
              {row.map((cell, i) => (
                <td
                  key={i}
                  colSpan={cell.colSpan || 1}
                  rowSpan={cell.rowSpan || 1}
                  title={cell.tooltip}
                  className={`px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-sans align-middle ${
                    cell.colSpan && cell.colSpan > 1 ? 'text-center' : ''
                  } ${
                    cell.tooltip
                      ? 'cursor-help hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors'
                      : ''
                  }`}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
          {sample.dataRows.map((row, r) => (
            <tr key={`d${r}`} className="border-t border-slate-200 dark:border-slate-700">
              <td className={rowNo}>
                {(sample.titleRows?.length || 0) + sample.headerRows.length + r + 1}
              </td>
              {row.map((v, i) => (
                <td
                  key={i}
                  className={`px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-sans ${
                    i === 0 && v === '(เว้นว่าง)'
                      ? 'text-slate-400 italic'
                      : ''
                  }`}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function SupportedCommissionFormatsModal({ isOpen, onClose }: Props) {
  const { success, error } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      const blob = await commissionService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HRMS_Commission_Template_${new Date().getFullYear()}.xlsx`;
      a.rel = 'noopener';
      a.style.position = 'fixed';
      a.style.left = '-9999px';
      a.style.top = '-9999px';
      document.body.appendChild(a);
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      }, 2000);
      success('ดาวน์โหลดเทมเพลตค่าคอมมิชชั่นเรียบร้อยแล้ว');
    } catch (err: any) {
      error(err?.response?.data?.message || 'ดาวน์โหลดเทมเพลตไม่สำเร็จ');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ModalShell
      className="z-50 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150"
      innerClassName="items-center justify-center p-3 sm:p-6"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <ModalHeader
          icon={FileSpreadsheet}
          title="รูปแบบไฟล์ที่รองรับ"
          onClose={onClose}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <p className="leading-relaxed text-slate-600 dark:text-slate-300">
            เทมเพลตนำเข้าค่าคอมมิชชั่นมาตรฐานของระบบ รองรับไฟล์นามสกุล <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">.xlsx</code>, <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">.xls</code> และ <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">.csv</code> โดยสามารถเลือกกรอกข้อมูลได้ทั้ง 2 รูปแบบในไฟล์เดียวกัน:
          </p>

          {/* Format Explanation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>1. คิดยอดแบบรายวัน / รายบิล</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                ระบุวันที่ในช่อง <span className="font-semibold text-slate-700 dark:text-slate-300">วันที่ (วว/ดด/ปปปป)</span> เช่น 15/10/2026 ระบบจะตรวจจับและบันทึกยอดขายแยกตามวันที่จริงให้อัตโนมัติ
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>2. คิดยอดแบบสรุปทั้งเดือน</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">เว้นว่างช่องวันที่</span> ระบบจะตรวจจับและบันทึกเป็นยอดขายรวมทั้งเดือนประจำงวดที่เลือกให้อัตโนมัติ
              </p>
            </div>
          </div>

          {/* Excel Mock Preview */}
          <div className="pt-2">
            <SheetPreview sample={TEMPLATE_SAMPLE} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 flex items-center justify-end gap-3 shrink-0">
          <Button
            onClick={handleDownloadTemplate}
            loading={isDownloading}
            icon={<Download className="w-4 h-4" />}
          >
            ดาวน์โหลดไฟล์ตัวอย่าง
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            ปิดหน้าต่าง
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
