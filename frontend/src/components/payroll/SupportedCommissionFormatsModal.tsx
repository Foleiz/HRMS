'use client';

import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Info,
  Layers,
  FileText,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { commissionService } from '@/services/commissionService';
import { useToast } from '@/context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Cell = string;
interface SheetSample {
  columns: string[];
  used: number[]; // Index of columns used by system
  titleRows?: Cell[][];
  headerRows: Cell[][];
  dataRows: Cell[][];
}

const colLetters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)); // A, B, C, ...

// 1. Transaction Format with Date (Auto detected as Single Day or Date Range)
const TRANSACTION_SAMPLE: SheetSample = {
  columns: colLetters(7),
  used: [1, 2, 5],
  titleRows: [
    ['รายการยอดขายและบิล (POS / ERP Export — ตรวจจับวันเดียวหรือช่วงวันอัตโนมัติ)'],
  ],
  headerRows: [
    ['เลขที่บิล', 'วันที่ทำรายการ (วว/ดด/ปปปป)*', 'รหัสพนักงาน*', 'ชื่อพนักงาน', 'ชื่อลูกค้า/รายการ', 'ยอดขาย (บาท)*', 'หมายเหตุ'],
    ['Invoice_No', 'Date', 'Emp_Code', 'Emp_Name', 'Customer_Product', 'Net_Sales', 'Note'],
  ],
  dataRows: [
    ['INV-20261001', '15/10/2026', 'EMP-001', 'สมชาย ใจดี', 'ลูกค้า บจก. เอแอนด์บี', '75,000.00', 'ออเดอร์เช้า'],
    ['INV-20261002', '15/10/2026', 'EMP-001', 'สมชาย ใจดี', 'ลูกค้า ร้านค้าปลีก กะรัต', '120,000.00', 'ออเดอร์บ่าย'],
    ['INV-20261003', '15/10/2026', 'EMP-002', 'สมหญิง รักงาน', 'โครงการคอนโด A', '280,000.00', 'ปิดการขาย'],
    ['INV-20261004', '15/10/2026', 'EMP-003', 'ประสิทธิ์ มุ่งมั่น', 'ลูกค้า โรงงานทอผ้า', '55,000.00', ''],
  ],
};

// 2. Summary Format without Date (Auto detected as Full Month of selected period)
const SUMMARY_SAMPLE: SheetSample = {
  columns: colLetters(7),
  used: [0, 3, 4, 5],
  titleRows: [
    ['รายงานสรุปยอดขายและค่าคอมมิชชั่นพนักงานประจำเดือน (ตรวจจับเป็นทั้งเดือนอัตโนมัติ)'],
    ['รอบเดือน: 10/2569 (ตุลาคม 2026)'],
  ],
  headerRows: [
    ['รหัสพนักงาน*', 'ชื่อ-นามสกุล', 'แผนก/ตำแหน่ง', 'ยอดขาย (บาท)*', 'อัตรา (%)', 'เงินพิเศษ (บาท)', 'หมายเหตุ'],
    ['Emp_ID', 'Employee_Name', 'Department', 'Sales_Amount', 'Commission_Rate', 'Special_Amount', 'Note'],
  ],
  dataRows: [
    ['EMP-001', 'สมชาย ใจดี', 'ฝ่ายขาย (Sales Rep)', '250,000.00', '5.00', '2,000.00', 'ยอดขาย Q3'],
    ['EMP-002', 'สมหญิง รักงาน', 'ฝ่ายขาย (Senior Sales)', '480,000.00', '7.50', '5,000.00', 'Top Spender'],
    ['EMP-003', 'ประสิทธิ์ มุ่งมั่น', 'วิศวกรรมการขาย (Sales Eng)', '180,000.00', '5.00', '0.00', ''],
    ['EMP-004', 'นภา สดใส', 'ฝ่ายขาย (Key Account)', '620,000.00', '10.00', '10,000.00', 'ปิดดีลโครงการใหญ่'],
  ],
};

// 3. Template Format
const TEMPLATE_SAMPLE: SheetSample = {
  columns: colLetters(7),
  used: [0, 1, 5],
  headerRows: [
    ['วันที่ (วว/ดด/ปปปป หรือ เว้นว่างถ้าทั้งเดือน)', 'รหัสพนักงาน*', 'ชื่อ-นามสกุล', 'แผนก', 'ตำแหน่ง', 'ยอดขายรวม (บาท)*', 'หมายเหตุ'],
    ['Date', 'EmployeeCode', 'EmployeeName', 'Department', 'Position', 'SalesAmount', 'Note'],
  ],
  dataRows: [
    ['15/10/2026', 'EMP0001', 'นายสมชาย ตัวอย่าง', 'ฝ่ายขายและการตลาด', 'เจ้าหน้าที่ฝ่ายขาย', '250,000.00', 'ตัวอย่างยอดขาย'],
  ],
};

export default function SupportedCommissionFormatsModal({ isOpen, onClose }: Props) {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'transaction' | 'summary' | 'template'>('transaction');
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

  const currentSample =
    activeTab === 'transaction'
      ? TRANSACTION_SAMPLE
      : activeTab === 'summary'
      ? SUMMARY_SAMPLE
      : TEMPLATE_SAMPLE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shadow-sm">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  รูปแบบไฟล์ที่รองรับ & ระบบตรวจจับอัตโนมัติ
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                นำเข้าไฟล์ Excel (.xls, .xlsx) หรือ CSV ได้ทันที ระบบจะตรวจจับ วันเดียว / ช่วงวัน / ทั้งเดือน ให้เองโดยอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feature Highlights Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <span><strong>ตรวจจับอัตโนมัติ:</strong> ตรวจจากคอลัมน์วันที่ในไฟล์ ไม่ต้องเลือกโหมด</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Layers className="h-4 w-4 text-blue-600 shrink-0" />
              <span><strong>ทับเฉพาะวันที่ซ้ำ:</strong> แทนที่เฉพาะวันที่ซ้ำของพนักงานคนนั้น</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Calendar className="h-4 w-4 text-purple-600 shrink-0" />
              <span><strong>กู้คืนได้เสมอ:</strong> ยกเลิกชุดนำเข้าและคืนค่ายอดเดิมได้ตลอดเวลา</span>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-2 dark:border-slate-800 dark:bg-slate-950/40 gap-2">
          <button
            onClick={() => setActiveTab('transaction')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'transaction'
                ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>มีคอลัมน์วันที่ (รายวัน / ช่วงวัน)</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
              ตรวจจับอัตโนมัติ
            </span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>ไม่ระบุวันที่ (ทั้งเดือน)</span>
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'template'
                ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>ดาวน์โหลดเทมเพลตมาตรฐาน</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Active Tab Explanation */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-slate-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-300">
            {activeTab === 'transaction' && (
              <div className="space-y-1">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> ไฟล์ที่มีคอลัมน์วันที่ (เช่น วันที่ขาย, วันที่ทำรายการ, Date)
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  ระบบจะตรวจจับวันที่ในไฟล์ทันที: หากข้อมูลในไฟล์เป็นวันเดียวกันทั้งหมด ระบบจะบันทึกเป็นยอด <strong>รายวัน (Day)</strong> หากข้อมูลครอบคลุมหลายวันจะบันทึกเป็น <strong>ช่วงวัน (Date Range)</strong> และนำยอดไปบวกสะสมรวมเป็นยอดรายเดือนให้โดยอัตโนมัติ หากนำเข้าไฟล์ของวันที่เคยมีอยู่แล้ว ระบบจะ <strong>แทนที่เฉพาะวันที่นั้น</strong> ให้โดยไม่กระทบวันอื่น
                </p>
              </div>
            )}
            {activeTab === 'summary' && (
              <div className="space-y-1">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> ไฟล์สรุปยอดรวมที่ไม่ระบุคอลัมน์วันที่
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  หากในไฟล์ไม่มีคอลัมน์วันที่ ระบบจะถือว่าเป็นยอด <strong>ทั้งเดือน (Full Month)</strong> ของงวดเดือนและปีที่ท่านกำลังเลือกดูอยู่ในขณะนั้นโดยอัตโนมัติ
                </p>
              </div>
            )}
            {activeTab === 'template' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> เทมเพลตมาตรฐาน HRMS พร้อมรายชื่อพนักงาน
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    ดาวน์โหลดไฟล์ Excel เปล่าที่มีคอลัมน์วันที่และรายชื่อพนักงานในระบบ กรอกยอดขายแล้วอัปโหลดกลับเข้ามาได้ทันที
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={isDownloading}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>ดาวน์โหลดเทมเพลต Excel (.xlsx)</span>
                </button>
              </div>
            )}
          </div>

          {/* Excel Mock Grid */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <th className="w-10 border-r border-slate-200 dark:border-slate-800 px-2 py-1 text-center font-mono text-[11px] text-slate-400">
                      #
                    </th>
                    {currentSample.columns.map((col, idx) => (
                      <th
                        key={idx}
                        className={`border-r border-slate-200 px-3 py-1 font-mono text-center text-[11px] dark:border-slate-800 ${
                          currentSample.used.includes(idx)
                            ? 'bg-emerald-100/70 font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-mono dark:divide-slate-800/60">
                  {currentSample.titleRows?.map((row, rIdx) => (
                    <tr key={`t-${rIdx}`} className="bg-slate-50/50 dark:bg-slate-900/40">
                      <td className="border-r border-slate-200 dark:border-slate-800 px-2 py-1 text-center text-[10px] text-slate-400">
                        {rIdx + 1}
                      </td>
                      <td
                        colSpan={currentSample.columns.length}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        {row[0]}
                      </td>
                    </tr>
                  ))}

                  {currentSample.headerRows.map((hRow, hIdx) => {
                    const rowNumber = (currentSample.titleRows?.length || 0) + hIdx + 1;
                    return (
                      <tr
                        key={`h-${hIdx}`}
                        className="bg-emerald-50/60 dark:bg-emerald-950/30 font-semibold"
                      >
                        <td className="border-r border-slate-200 dark:border-slate-800 px-2 py-1 text-center text-[10px] text-slate-400">
                          {rowNumber}
                        </td>
                        {hRow.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`border-r border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs ${
                              currentSample.used.includes(cIdx)
                                ? 'bg-emerald-100/50 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200 font-bold'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}

                  {currentSample.dataRows.map((dRow, dIdx) => {
                    const rowNumber =
                      (currentSample.titleRows?.length || 0) +
                      currentSample.headerRows.length +
                      dIdx +
                      1;
                    return (
                      <tr
                        key={`d-${dIdx}`}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                      >
                        <td className="border-r border-slate-200 dark:border-slate-800 px-2 py-1 text-center text-[10px] text-slate-400">
                          {rowNumber}
                        </td>
                        {dRow.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`border-r border-slate-200 dark:border-slate-800 px-3 py-1 text-xs ${
                              currentSample.used.includes(cIdx)
                                ? 'bg-emerald-50/30 dark:bg-emerald-950/20 font-medium text-slate-900 dark:text-slate-100'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>คอลัมน์สีเขียวเข้มคือคอลัมน์ที่ระบบอ่านค่าเป็นหลัก (คอลัมน์อื่นสามารถมีหรือไม่มีก็ได้)</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition cursor-pointer"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
}
