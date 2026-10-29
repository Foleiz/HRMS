'use client';

import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Clock,
  CalendarDays,
  FileText,
  Info,
} from 'lucide-react';
import { attendanceImportService } from '@/services/attendanceImportService';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ตัวอย่างอ้างอิงจากไฟล์จริงที่ส่งออกจากเครื่องสแกน Syaco
 *   - deliy  : ไฟล์สรุปทั้งเดือน (มีข้อมูลของทั้งเดือน สรุป 1 แถว = พนักงาน 1 คน × 1 วัน)
 *   - record : ไฟล์บันทึกรายวัน (เลือกแบบรายวัน หรือบางวันมาใส่ 1 แถว = สแกน 1 ครั้ง)
 * ───────────────────────────────────────────────────────────────────────────── */

type Cell = string;
interface HeaderCell {
  text: string;
  colSpan?: number;
  rowSpan?: number;
}
interface SheetSample {
  /** ตัวอักษรคอลัมน์ Excel เริ่มที่ D */
  columns: string[];
  titleRows: Cell[][];
  headerRows: HeaderCell[][];
  dataRows: Cell[][];
}

const colLetters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(68 + i)); // D, E, F, ...

const DELIY: SheetSample = {
  columns: colLetters(24),
  titleRows: [
    ['deliy'],
    ['unit: Syaco    date from: 2026-08-01 to 2026-08-31 23:59'],
  ],
  headerRows: [
    [
      { text: 'รหัส', rowSpan: 2 },
      { text: 'ชื่อ-สกุล', rowSpan: 2 },
      { text: 'แผนก', rowSpan: 2 },
      { text: 'วันที่', rowSpan: 2 },
      { text: 'สัปดาห์', rowSpan: 2 },
      { text: 'เข้า-ออก', rowSpan: 2 },
      { text: 'กะการทำงาน', colSpan: 2 },
      { text: 'วันทำงาน', colSpan: 2 },
      { text: 'ขาด', rowSpan: 2 },
      { text: 'สาย', colSpan: 2 },
      { text: 'ออกก่อน', colSpan: 2 },
      { text: 'ไม่ลงเวลา', colSpan: 2 },
      { text: 'วันหยุด', colSpan: 2 },
      { text: 'การลา', colSpan: 2 },
      { text: 'สัญลักษณ์', colSpan: 2 },
      { text: 'Lock', rowSpan: 2 },
    ],
    [
      { text: 'วัน' },
      { text: 'ชั่วโมง' },
      { text: 'วัน' },
      { text: 'ชั่วโมง' },
      { text: 'ครั้ง' },
      { text: 'นาที.' },
      { text: 'ครั้ง' },
      { text: 'นาที.' },
      { text: 'เข้า' },
      { text: 'ออก' },
      { text: 'สัปดาห์' },
      { text: 'ประจำปี' },
      { text: 'ครั้ง' },
      { text: 'ชั่วโมง' },
      { text: 'กะ' },
      { text: 'ลา' },
    ],
  ],
  dataRows: [
    ['100001', 'สมชาย', 'Syaco', '2026-08-02', '7', '', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '0', '0', '0', 'W', '', '0'],
    ['100001', 'สมชาย', 'Syaco', '2026-08-03', '1', '09:49-18:08', '1', '8', '1', '8', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', 'DV', '', '0'],
    ['100001', 'สมชาย', 'Syaco', '2026-08-04', '2', '10:35L-17:30', '1', '8', '1', '8', '0', '1', '35', '0', '0', '0', '0', '0', '0', '0', '0', 'DV', '', '0'],
    ['100002', 'สมหญิง', 'Syaco', '2026-08-03', '1', 'N-N', '1', '8', '0', '0', '1', '0', '0', '0', '0', '1', '1', '0', '0', '0', '0', 'DV', '', '0'],
    ['100002', 'สมหญิง', 'Syaco', '2026-08-12', '3', '', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '0', '0', 'H', '', '0'],
  ],
};

const RECORD: SheetSample = {
  columns: colLetters(10),
  titleRows: [
    ['record'],
    ['unit: Syaco    date from: 2026-08-03 to 2026-08-03 23:59'],
  ],
  headerRows: [
    [
      { text: 'รหัส', rowSpan: 2 },
      { text: 'ชื่อ-สกุล', rowSpan: 2 },
      { text: 'แผนก-ฝ่าย.', rowSpan: 2 },
      { text: 'วันที่-เวลา', rowSpan: 2 },
      { text: 'สถานะ', rowSpan: 2 },
      { text: 'ลงเวลาด้วย', rowSpan: 2 },
      { text: 'การตรวจอุณหภูมิ', colSpan: 2 },
      { text: 'เครื่อง', rowSpan: 2 },
      { text: 'ประมวลผล', rowSpan: 2 },
    ],
    [
      { text: 'อุณหภูมิ' },
      { text: 'องศา' },
    ],
  ],
  dataRows: [
    ['100001', 'สมชาย', 'Syaco', '2026-08-03 09:49:12', 'AUTO', 'l', 'AUTO', '', 'Attendance', 'IN'],
    ['100001', 'สมชาย', 'Syaco', '2026-08-03 12:54:49', 'AUTO', 'l', 'AUTO', '', 'Attendance', 'EARLY'],
    ['100001', 'สมชาย', 'Syaco', '2026-08-03 13:04:08', 'AUTO', 'l', 'AUTO', '', 'Attendance', 'INVALID'],
    ['100001', 'สมชาย', 'Syaco', '2026-08-03 18:08:31', 'AUTO', 'l', 'AUTO', '', 'Attendance', 'OUT'],
  ],
};

const SheetPreview: React.FC<{ sample: SheetSample }> = ({ sample }) => {
  const rowNo = 'px-1 text-center text-slate-400 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 font-normal align-middle';
  return (
    <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-x-auto shadow-2xs">
      <table className="text-[11px] text-left border-collapse font-mono">
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
          {sample.titleRows.map((row, r) => (
            <tr key={`t${r}`} className="border-t border-slate-200 dark:border-slate-700">
              <td className={rowNo}>{r + 1}</td>
              <td colSpan={sample.columns.length} className="px-2 py-1.5 font-semibold text-slate-800 dark:text-slate-200">
                {row[0]}
              </td>
            </tr>
          ))}
          {sample.headerRows.map((row, r) => (
            <tr key={`h${r}`} className="border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60">
              <td className={rowNo}>{sample.titleRows.length + r + 1}</td>
              {row.map((cell, i) => (
                <td
                  key={i}
                  colSpan={cell.colSpan || 1}
                  rowSpan={cell.rowSpan || 1}
                  className={`px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-sans align-middle ${
                    cell.colSpan && cell.colSpan > 1 ? 'text-center' : ''
                  }`}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
          {sample.dataRows.map((row, r) => (
            <tr key={`d${r}`} className="border-t border-slate-200 dark:border-slate-700">
              <td className={rowNo}>{sample.titleRows.length + sample.headerRows.length + r + 1}</td>
              {row.map((v, i) => (
                <td key={i} className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

type FormatTab = 'deliy' | 'record' | 'template';

export const AttendanceFileFormatModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<FormatTab>('deliy');
  const [isDownloading, setIsDownloading] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await attendanceImportService.downloadTemplate('xlsx');
      toast.success('ดาวน์โหลดไฟล์แม่แบบ (attendance_import_template.xlsx) เรียบร้อยแล้ว');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'ไม่สามารถดาวน์โหลดไฟล์แม่แบบได้');
    } finally {
      setIsDownloading(false);
    }
  };

  const tabs: { key: FormatTab; label: string; sub: string; Icon: React.ElementType; badge?: string }[] = [
    { key: 'deliy', label: 'ไฟล์สรุปทั้งเดือน (deliy)', sub: 'ไฟล์ที่มีข้อมูลของทั้งเดือน', Icon: CalendarDays, badge: 'แนะนำ' },
    { key: 'record', label: 'ไฟล์บันทึกรายวัน (record)', sub: 'ไฟล์ที่เลือกแบบรายวัน หรือบางวันมาใส่', Icon: Clock },
    { key: 'template', label: 'ทำไฟล์เองจาก Excel', sub: 'กรณีไม่มีไฟล์จากเครื่อง', Icon: FileText },
  ];

  return (
    <ModalShell className="z-50 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150" innerClassName="items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">รูปแบบไฟล์ที่รองรับ</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                อัปโหลดไฟล์ .xls / .xlsx ที่ส่งออกจากเครื่องสแกน Syaco ได้ทันที ไม่ต้องแก้ไขไฟล์
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700 dark:text-slate-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {tabs.map(({ key, label, sub, Icon, badge }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`py-2 px-3 rounded-lg text-left transition-all cursor-pointer ${
                  tab === key
                    ? 'bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'hover:bg-white/60 dark:hover:bg-slate-900/40'
                }`}
              >
                <span className={`flex items-center gap-1.5 font-bold ${tab === key ? 'text-primary dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {badge && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 pl-5">{sub}</span>
              </button>
            ))}
          </div>

          {tab === 'deliy' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="leading-relaxed">
                รายงาน <strong>deliy</strong> จากเครื่องสแกน เป็นไฟล์ที่มีข้อมูลสรุปของทั้งเดือน (สรุปเวลาเข้า-ออก ชั่วโมงทำงาน สาย และขาดงานของพนักงานทุกคนตลอดทั้งเดือน)
                เหมาะสำหรับนำเข้าทั้งเดือนก่อนคำนวณเงินเดือน ระบบรู้ว่าเป็นไฟล์ชนิดนี้จากคำว่า <code className="font-mono">deliy</code> ในแถวแรก
              </p>
              <SheetPreview sample={DELIY} />

              {/* คำอธิบายคอลัมน์กะการทำงาน vs วันทำงาน */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] space-y-2 text-slate-600 dark:text-slate-400">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>คำอธิบาย: ความแตกต่างระหว่างคอลัมน์ &quot;กะการทำงาน&quot; และ &quot;วันทำงาน&quot;</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-0.5 text-slate-600 dark:text-slate-300">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/50 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                      กะการทำงาน (วัน / ชั่วโมง) — แผนงาน
                    </div>
                    <p className="leading-relaxed text-slate-600 dark:text-slate-400 text-[11px]">
                      คือ <strong>เกณฑ์มาตรฐานตามกะที่พนักงานควรมาทำงาน</strong> (Scheduled Work) เช่น วันทำงานปกติ = 1 วัน (8 ชม.) ส่วนวันหยุดประจำสัปดาห์ = 0 วัน (0 ชม.) โดยระบบ HRMS จะตรวจสอบและยึดตารางกะจริงในระบบเป็นหลัก
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/50 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      วันทำงาน (วัน / ชั่วโมง) — ผลงานจริง
                    </div>
                    <p className="leading-relaxed text-slate-600 dark:text-slate-400 text-[11px]">
                      คือ <strong>ผลการมาทำงานจริงของพนักงาน</strong> (Actual Worked) ที่เครื่องสรุปได้ เช่น มาทำงานครบ = 1 วัน (8 ชม.), หากขาดงาน = 0 วัน (0 ชม.) และช่องขาดจะเป็น 1 วัน โดยระบบจะนำ &quot;ชั่วโมงทำงานจริง&quot; ไปบันทึกลงตารางประจำวันเพื่อใช้คำนวณเงินเดือน
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'record' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="leading-relaxed">
                รายงาน <strong>record</strong> จากเครื่องสแกน เป็นไฟล์บันทึกการสแกนที่เลือกแบบรายวัน หรือเลือกบางวันมาใส่ (1 แถว = สแกน 1 ครั้ง) ระบบจะรวมการสแกนในวันเดียวกันเป็นรายวันให้อัตโนมัติ
                โดยใช้การสแกนแรกเป็นเวลาเข้า และการสแกนสุดท้ายเป็นเวลาออก แล้วคำนวณสาย/ออกก่อนเทียบกับกะการทำงาน
              </p>
              <SheetPreview sample={RECORD} />
            </div>
          )}

          {tab === 'template' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="leading-relaxed">
                ถ้าไม่มีไฟล์จากเครื่องสแกน ให้ดาวน์โหลดไฟล์แม่แบบ แล้วกรอก 1 แถวต่อการสแกน 1 ครั้ง (หัวคอลัมน์อยู่แถวแรก)
              </p>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2 px-3 font-semibold">หัวคอลัมน์</th>
                      <th className="py-2 px-3 font-semibold">จำเป็น</th>
                      <th className="py-2 px-3 font-semibold">ตัวอย่าง / ค่าที่รองรับ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-2 px-3 font-semibold">รหัส</td>
                      <td className="py-2 px-3 text-rose-600">ใช่</td>
                      <td className="py-2 px-3">รหัสพนักงาน (EMP0001) หรือรหัสเครื่องสแกน (100001)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">วันที่-เวลา</td>
                      <td className="py-2 px-3 text-rose-600">ใช่</td>
                      <td className="py-2 px-3">
                        <code className="font-mono">2026-08-03 08:25:00</code> — ใช้รูปแบบ ปี-เดือน-วัน (ค.ศ.) หรือเซลล์วันที่ของ Excel
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">สถานะ</td>
                      <td className="py-2 px-3 text-slate-500">ไม่บังคับ</td>
                      <td className="py-2 px-3">
                        เข้า / ออก, IN / OUT, C/In / C/Out — ถ้าไม่ใส่ ระบบใช้การสแกนแรกของวันเป็นเวลาเข้า และสุดท้ายเป็นเวลาออก
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">ชื่อ-สกุล, แผนก-ฝ่าย., เครื่อง</td>
                      <td className="py-2 px-3 text-slate-500">ไม่บังคับ</td>
                      <td className="py-2 px-3">ใส่ไว้ดูได้ ระบบใช้ชื่อและแผนกจากข้อมูลพนักงานในระบบ</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Button
                onClick={handleDownload}
                loading={isDownloading}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                ดาวน์โหลดไฟล์แม่แบบ (.xlsx)
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 flex justify-end shrink-0">
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
};
