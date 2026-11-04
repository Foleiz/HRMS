'use client';

import React, { useState } from 'react';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { ModalShell } from '@/components/ui/ModalShell';
import { Button } from '@/components/ui';
import {
  FileSpreadsheet,
  Download,
  Clock,
  CalendarDays,
  Sparkles,
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

// 1. Summary Format without Date (Auto detected as Full Month of selected period)
const SUMMARY_SAMPLE: SheetSample = {
  columns: colLetters(7),
  titleRows: [
    ['รายงานสรุปยอดขายและค่าคอมมิชชั่นพนักงานประจำเดือน (ตรวจจับเป็นทั้งเดือนอัตโนมัติ)'],
    ['รอบเดือน: 10/2569 (ตุลาคม 2026)'],
  ],
  headerRows: [
    [
      { text: 'รหัสพนักงาน*', tooltip: 'รหัสพนักงานในระบบ (จำเป็นต้องมี)' },
      { text: 'ชื่อ-นามสกุล', tooltip: 'ชื่อ-สกุลพนักงาน' },
      { text: 'แผนก/ตำแหน่ง', tooltip: 'แผนกหรือตำแหน่งงาน' },
      { text: 'ยอดขาย (บาท)*', tooltip: 'ยอดขายรวมทั้งเดือน (จำเป็นต้องมี)' },
      { text: 'อัตรา (%)', tooltip: 'เปอร์เซ็นต์ค่าคอมมิชชั่น (ระบบใช้อัตราตามงวด)' },
      { text: 'เงินพิเศษ (บาท)', tooltip: 'เงินรางวัลหรือเงินพิเศษเพิ่มเติม' },
      { text: 'หมายเหตุ', tooltip: 'บันทึกเพิ่มเติม' },
    ],
    [
      { text: 'Emp_ID' },
      { text: 'Employee_Name' },
      { text: 'Department' },
      { text: 'Sales_Amount' },
      { text: 'Commission_Rate' },
      { text: 'Special_Amount' },
      { text: 'Note' },
    ],
  ],
  dataRows: [
    ['EMP-001', 'สมชาย ใจดี', 'ฝ่ายขาย (Sales Rep)', '250,000.00', '5.00', '2,000.00', 'ยอดขาย Q3'],
    ['EMP-002', 'สมหญิง รักงาน', 'ฝ่ายขาย (Senior Sales)', '480,000.00', '7.50', '5,000.00', 'Top Spender'],
    ['EMP-003', 'ประสิทธิ์ มุ่งมั่น', 'วิศวกรรมการขาย (Sales Eng)', '180,000.00', '5.00', '0.00', ''],
    ['EMP-004', 'นภา สดใส', 'ฝ่ายขาย (Key Account)', '620,000.00', '10.00', '10,000.00', 'ปิดดีลโครงการใหญ่'],
  ],
};

// 2. Transaction Format with Date (Auto detected as Single Day or Date Range)
const TRANSACTION_SAMPLE: SheetSample = {
  columns: colLetters(7),
  titleRows: [
    ['รายการยอดขายและบิล (POS / ERP Export — ตรวจจับวันเดียวหรือช่วงวันอัตโนมัติ)'],
  ],
  headerRows: [
    [
      { text: 'เลขที่บิล', tooltip: 'เลขที่เอกสารหรือบิลขาย' },
      { text: 'วันที่ทำรายการ (วว/ดด/ปปปป)*', tooltip: 'วันที่ขายสินค้าหรือทำรายการ (จำเป็นต้องมี)' },
      { text: 'รหัสพนักงาน*', tooltip: 'รหัสพนักงานในระบบ (จำเป็นต้องมี)' },
      { text: 'ชื่อพนักงาน', tooltip: 'ชื่อพนักงานผู้ขาย' },
      { text: 'ชื่อลูกค้า/รายการ', tooltip: 'ข้อมูลลูกค้าหรือรายการสินค้า' },
      { text: 'ยอดขาย (บาท)*', tooltip: 'ยอดเงินขายสุทธิ (จำเป็นต้องมี)' },
      { text: 'หมายเหตุ', tooltip: 'บันทึกเพิ่มเติม' },
    ],
    [
      { text: 'Invoice_No' },
      { text: 'Date' },
      { text: 'Emp_Code' },
      { text: 'Emp_Name' },
      { text: 'Customer_Product' },
      { text: 'Net_Sales' },
      { text: 'Note' },
    ],
  ],
  dataRows: [
    ['INV-20261001', '15/10/2026', 'EMP-001', 'สมชาย ใจดี', 'ลูกค้า บจก. เอแอนด์บี', '75,000.00', 'ออเดอร์เช้า'],
    ['INV-20261002', '15/10/2026', 'EMP-001', 'สมชาย ใจดี', 'ลูกค้า ร้านค้าปลีก กะรัต', '120,000.00', 'ออเดอร์บ่าย'],
    ['INV-20261003', '15/10/2026', 'EMP-002', 'สมหญิง รักงาน', 'โครงการคอนโด A', '280,000.00', 'ปิดการขาย'],
    ['INV-20261004', '15/10/2026', 'EMP-003', 'ประสิทธิ์ มุ่งมั่น', 'ลูกค้า โรงงานทอผ้า', '55,000.00', ''],
  ],
};

// 3. Official System Template
const TEMPLATE_SAMPLE: SheetSample = {
  columns: colLetters(7),
  titleRows: [
    ['เทมเพลตนำเข้าค่าคอมมิชชั่นมาตรฐาน (HRMS Official Template)'],
  ],
  headerRows: [
    [
      { text: 'วันที่ (วว/ดด/ปปปป หรือ เว้นว่างถ้าทั้งเดือน)', tooltip: 'ระบุวันที่หากเป็นยอดรายวัน หรือเว้นว่างหากเป็นยอดสรุปทั้งเดือน' },
      { text: 'รหัสพนักงาน*', tooltip: 'รหัสพนักงานในระบบ (จำเป็นต้องมี)' },
      { text: 'ชื่อ-นามสกุล', tooltip: 'ชื่อ-สกุลพนักงาน' },
      { text: 'แผนก', tooltip: 'แผนกสังกัด' },
      { text: 'ตำแหน่ง', tooltip: 'ตำแหน่งงาน' },
      { text: 'ยอดขายรวม (บาท)*', tooltip: 'ยอดขายสุทธิ (จำเป็นต้องมี)' },
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
    ['15/10/2026', 'EMP0001', 'นายสมชาย ตัวอย่าง', 'ฝ่ายขายและการตลาด', 'เจ้าหน้าที่ฝ่ายขาย', '250,000.00', 'ตัวอย่างยอดขายรายวัน'],
    ['', 'EMP0002', 'นางสาวสมหญิง ตัวอย่าง', 'ฝ่ายขายและการตลาด', 'เจ้าหน้าที่ฝ่ายขายอาวุโส', '480,000.00', 'ตัวอย่างยอดขายทั้งเดือน (เว้นว่างวันที่)'],
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
                  className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-sans"
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

type FormatTab = 'summary' | 'transaction' | 'template';

export default function SupportedCommissionFormatsModal({ isOpen, onClose }: Props) {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<FormatTab>('summary');
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

  const tabs: {
    key: FormatTab;
    label: string;
    sub: string;
    Icon: React.ElementType;
    badge?: string;
  }[] = [
    {
      key: 'summary',
      label: 'ไฟล์สรุปทั้งเดือน',
      sub: 'ไฟล์ที่มีข้อมูลสรุปยอดของทั้งเดือน',
      Icon: CalendarDays,
      badge: 'แนะนำ',
    },
    {
      key: 'transaction',
      label: 'ไฟล์บันทึกรายวัน',
      sub: 'ไฟล์ยอดขายรายวัน หรือส่งออกจาก POS / ERP',
      Icon: Clock,
    },
    {
      key: 'template',
      label: 'เทมเพลตมาตรฐานระบบ',
      sub: 'แบบฟอร์มมาตรฐานของระบบ HRMS',
      Icon: FileSpreadsheet,
    },
  ];

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
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* Tabs Selector Bar (ลักษณะเดียวกับเมนูนำเข้าไฟล์บันทึกเวลา) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {tabs.map(({ key, label, sub, Icon, badge }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`py-2 px-3 rounded-lg text-left transition-all cursor-pointer ${
                  activeTab === key
                    ? 'bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'hover:bg-white/60 dark:hover:bg-slate-900/40'
                }`}
              >
                <span
                  className={`flex items-center gap-1.5 font-bold ${
                    activeTab === key
                      ? 'text-primary dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {badge && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 pl-5">
                  {sub}
                </span>
              </button>
            ))}
          </div>

          {/* Description & Table for Active Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                เป็นไฟล์ที่มีข้อมูลสรุปยอดขายหรือค่าคอมมิชชั่นของพนักงานตลอดทั้งเดือน (ไม่มีคอลัมน์วันที่ หรือเว้นว่างช่องวันที่ไว้) ระบบจะตรวจจับและบันทึกเป็นยอดรวมประจำงวดเดือนที่เลือกให้อัตโนมัติ เหมาะสำหรับการสรุปยอดคอมมิชชั่นก่อนตัดรอบคำนวณเงินเดือน
              </p>
              <SheetPreview sample={SUMMARY_SAMPLE} />
            </div>
          )}

          {activeTab === 'transaction' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                เป็นไฟล์บันทึกรายการยอดขายตามวันที่ หรือประวัติรายการบิลที่ส่งออกจากระบบ POS / ERP (1 แถว = 1 รายการขาย) ที่มีคอลัมน์ &apos;วันที่ทำรายการ&apos; ระบบจะตรวจจับวันเดียวหรือช่วงวันให้อัตโนมัติ และนำไปรวมยอดให้พนักงานในงวดนั้นๆ
              </p>
              <SheetPreview sample={TRANSACTION_SAMPLE} />
            </div>
          )}

          {activeTab === 'template' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                เป็นแบบฟอร์มไฟล์ Excel มาตรฐานที่ดาวน์โหลดจากระบบ สามารถเลือกกรอกได้ทั้ง 2 รูปแบบ: หากต้องการสรุปยอดทั้งเดือนให้เว้นว่างช่องวันที่ไว้ หรือหากต้องการคิดยอดตามวันให้กรอกวันที่ทำรายการ (วว/ดด/ปปปป)
              </p>
              <SheetPreview sample={TEMPLATE_SAMPLE} />
            </div>
          )}
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
