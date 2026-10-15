'use client';

import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Info,
  Clock,
  CalendarDays,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { attendanceImportService } from '@/services/attendanceImportService';
import { useToast } from '@/context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ตัวอย่างอ้างอิงจากไฟล์จริงที่ส่งออกจากเครื่องสแกน Syaco
 *   - deliy  : รายงานสรุปรายวัน (1 แถว = พนักงาน 1 คน × 1 วัน) ใช้นำเข้าทั้งเดือน
 *   - record : บันทึกการสแกนทุกครั้ง (1 แถว = สแกน 1 ครั้ง)
 * ข้อมูลในไฟล์เริ่มที่คอลัมน์ D (A–C ว่าง) มีแถวหัวเรื่อง 2 แถว แล้วตามด้วยหัวคอลัมน์รหัส + หัวคอลัมน์ภาษาไทย
 * ชื่อพนักงานในตัวอย่างเป็นชื่อสมมติ
 * ───────────────────────────────────────────────────────────────────────────── */

type Cell = string;
interface SheetSample {
  /** ตัวอักษรคอลัมน์ Excel เริ่มที่ D */
  columns: string[];
  /** index ของคอลัมน์ที่ระบบนำไปใช้ (ไฮไลต์) */
  used: number[];
  titleRows: Cell[][];
  headerRows: Cell[][];
  dataRows: Cell[][];
}

const colLetters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(68 + i)); // D, E, F, ...

const DELIY: SheetSample = {
  columns: colLetters(24),
  used: [0, 3, 5, 9, 10, 12, 14, 21],
  titleRows: [
    ['deliy'],
    ['unit: Syaco    date from: 2026-08-01 to 2026-08-31 23:59'],
  ],
  headerRows: [
    ['user_no', 'user_lname', 'user_depname', 'dkrq', 'dkrq', 'Sj1', 'Yingchu1', 'Yingchu2', 'Shichu1', 'Shichu2', 'Kugong', 'Cdci', 'Cdshi', 'Ztci', 'Ztshi', 'Wqd', 'Wqt', 'Xxr', 'Jjr', 'Qjcs', 'Qjsj', 'Yfh', 'Qjfh', 'Shenhe'],
    ['รหัส', 'ชื่อ-สกุล', 'แผนก', 'วันที่', 'สัปดาห์', 'เข้า-ออก', 'กะการทำงาน', '', 'วันทำงาน', '', '', 'สาย', '', 'ออกก่อน', '', 'ไม่ลงเวลา', '', 'วันหยุด', '', 'การลา', '', 'สัญลักษณ์', '', 'Lock'],
    ['', '', '', '', '', '', 'วัน', 'ชั่วโมง', 'วัน', 'ชั่วโมง', 'ขาด', 'ครั้ง', 'นาที.', 'ครั้ง', 'นาที.', 'เข้า', 'ออก', 'สัปดาห์', 'ประจำปี', 'ครั้ง', 'ชั่วโมง', 'กะ', 'ลา', ''],
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
  used: [0, 3],
  titleRows: [
    ['record'],
    ['unit: Syaco    date from: 2026-08-03 to 2026-08-03 23:59'],
  ],
  headerRows: [
    ['user_no', 'user_lname', 'user_depname', 'sj', 'fx', 'iden', 'healthstatus', 'body_temp', 'dev_serial', 'lx'],
    ['รหัส', 'ชื่อ-สกุล', 'แผนก-ฝ่าย.', 'วันที่-เวลา', 'สถานะ', 'ลงเวลาด้วย', 'การตรวจอุณหภูมิ', '', 'เครื่อง', 'ประมวลผล'],
    ['', '', '', '', '', '', 'อุณหภูมิ', 'องศา', '', ''],
  ],
  dataRows: [
    ['100001', 'สมชาย', 'Syaco', '2026-08-03 09:49:12', 'AUTO', 'l', 'AUTO', '', 'Attendance', 'IN'],
    ['100001', 'สมชาย', 'Syaco', '2026-08-03 12:54:49', 'AUTO', 'l', 'AUTO', '', 'Attendance', 'EARLY'],
    ['100001', 'สมชาย', 'Syaco', '2026-08-03 13:04:08', 'AUTO', 'l', 'AUTO', '', 'Attendance', 'INVALID'],
    ['100001', 'สมชาย', 'Syaco', '2026-08-03 18:08:31', 'AUTO', 'l', 'AUTO', '', 'Attendance', 'OUT'],
  ],
};

interface ColumnUse {
  code: string;
  name: string;
  use: string;
}

const DELIY_COLUMNS: ColumnUse[] = [
  { code: 'user_no', name: 'รหัส', use: 'รหัสในเครื่องสแกน ใช้จับคู่กับ "รหัสเครื่องสแกน (Biometric ID)" ของพนักงาน (หรือรหัสพนักงาน)' },
  { code: 'dkrq', name: 'วันที่', use: 'วันที่ทำงาน (คอลัมน์ dkrq ตัวแรก)' },
  { code: 'Sj1', name: 'เข้า-ออก', use: 'เวลาเข้า-ออกจริง เช่น 09:49-18:08 (N = ไม่ได้สแกน, L = มาสาย, E = ออกก่อน, ว่าง = ไม่ใช่วันทำงาน)' },
  { code: 'Shichu2', name: 'วันทำงาน (ชั่วโมง)', use: 'ชั่วโมงทำงานจริงของวันนั้น' },
  { code: 'Kugong', name: 'ขาด', use: 'จำนวนวันขาดงานที่เครื่องสรุป (1 = ขาดทั้งวัน, 0.5 = ครึ่งวัน)' },
  { code: 'Cdshi', name: 'สาย (นาที)', use: 'ใช้เมื่อไม่มีเวลาเข้า — ปกติระบบคำนวณนาทีสายเองจากเวลาเข้าเทียบกะ' },
  { code: 'Ztshi', name: 'ออกก่อน (นาที)', use: 'ใช้เมื่อไม่มีเวลาออก — ปกติระบบคำนวณเองจากเวลาออกเทียบกะ' },
  { code: 'Yfh', name: 'สัญลักษณ์ (กะ)', use: 'DV = วันทำงาน, W = วันหยุดประจำสัปดาห์, H = วันหยุดนักขัตฤกษ์' },
];

const RECORD_COLUMNS: ColumnUse[] = [
  { code: 'user_no', name: 'รหัส', use: 'รหัสในเครื่องสแกน ใช้จับคู่กับ "รหัสเครื่องสแกน (Biometric ID)" ของพนักงาน' },
  { code: 'sj', name: 'วันที่-เวลา', use: 'เวลาที่สแกน — ระบบใช้การสแกนแรกของวันเป็นเวลาเข้า และการสแกนสุดท้ายเป็นเวลาออก' },
  { code: 'lx', name: 'ประมวลผล', use: 'ผลจากเครื่อง (IN / OUT / EARLY / LATE / INVALID) ใช้ประกอบเท่านั้น ไม่ต้องแก้ไข' },
];

const SheetPreview: React.FC<{ sample: SheetSample }> = ({ sample }) => {
  const usedSet = new Set(sample.used);
  const cellCls = (i: number) =>
    `px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap ${
      usedSet.has(i) ? 'bg-sky-50 dark:bg-sky-950/40' : ''
    }`;
  const rowNo = 'px-1 text-center text-slate-400 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 font-normal';
  return (
    <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-x-auto shadow-2xs">
      <table className="text-[11px] text-left border-collapse font-mono">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-center">
            <th className="w-8 px-1 py-1 border-r border-slate-300 dark:border-slate-700 font-normal" />
            {sample.columns.map((c, i) => (
              <th
                key={c}
                className={`px-2 py-1 border-r border-slate-200 dark:border-slate-700 font-normal ${usedSet.has(i) ? 'text-sky-700 dark:text-sky-300 font-bold' : ''}`}
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
              {row.map((v, i) => (
                <td key={i} className={`${cellCls(i)} font-sans`}>{v}</td>
              ))}
            </tr>
          ))}
          {sample.dataRows.map((row, r) => (
            <tr key={`d${r}`} className="border-t border-slate-200 dark:border-slate-700">
              <td className={rowNo}>{sample.titleRows.length + sample.headerRows.length + r + 1}</td>
              {row.map((v, i) => (
                <td key={i} className={cellCls(i)}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ColumnTable: React.FC<{ rows: ColumnUse[] }> = ({ rows }) => (
  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
    <table className="w-full text-xs text-left">
      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
        <tr>
          <th className="py-2 px-3 font-semibold w-28">คอลัมน์</th>
          <th className="py-2 px-3 font-semibold w-36">หัวภาษาไทย</th>
          <th className="py-2 px-3 font-semibold">ระบบนำไปใช้อย่างไร</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((c) => (
          <tr key={c.code}>
            <td className="py-2 px-3 font-mono text-sky-700 dark:text-sky-300 font-semibold">{c.code}</td>
            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{c.name}</td>
            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{c.use}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const UsedLegend: React.FC<{ note: string }> = ({ note }) => (
  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
    <span className="inline-block w-3 h-3 rounded bg-sky-100 border border-sky-200 shrink-0" />
    {note}
  </p>
);

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
    { key: 'deliy', label: 'ไฟล์สรุปรายวัน (deliy)', sub: '1 แถว = 1 คน × 1 วัน', Icon: CalendarDays, badge: 'แนะนำ' },
    { key: 'record', label: 'ไฟล์บันทึกการสแกน (record)', sub: '1 แถว = สแกน 1 ครั้ง', Icon: Clock },
    { key: 'template', label: 'ทำไฟล์เองจาก Excel', sub: 'กรณีไม่มีไฟล์จากเครื่อง', Icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 sm:p-6 animate-in fade-in duration-150">
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
                <span className={`flex items-center gap-1.5 font-bold ${tab === key ? 'text-[#0B2046] dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
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
                รายงาน <strong>deliy</strong> จากเครื่องสแกน สรุปเวลาเข้า-ออก ชั่วโมงทำงาน สาย และขาดงานของแต่ละคนรายวัน
                เหมาะสำหรับนำเข้าทั้งเดือนก่อนคำนวณเงินเดือน ระบบรู้ว่าเป็นไฟล์ชนิดนี้จากคำว่า <code className="font-mono">deliy</code> ในแถวแรก
              </p>
              <SheetPreview sample={DELIY} />
              <UsedLegend note="คอลัมน์ที่ระบบนำไปใช้ — คอลัมน์อื่น (ชื่อ, แผนก, กะ, วันหยุด, การลา ฯลฯ) ระบบใช้ข้อมูลในระบบเอง" />
              <ColumnTable rows={DELIY_COLUMNS} />
            </div>
          )}

          {tab === 'record' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="leading-relaxed">
                รายงาน <strong>record</strong> แสดงการสแกนทุกครั้ง (หลายแถวต่อคนต่อวัน) ระบบรวมเป็นรายวันให้อัตโนมัติ
                โดยใช้การสแกนแรกเป็นเวลาเข้า และการสแกนสุดท้ายเป็นเวลาออก แล้วคำนวณสาย/ออกก่อนเทียบกับกะหรือเวลาทำงานบริษัท
              </p>
              <SheetPreview sample={RECORD} />
              <UsedLegend note='คอลัมน์ที่ระบบนำไปใช้ — คอลัมน์ "สถานะ" เป็น AUTO ทุกแถว ไม่ต้องแก้ไข' />
              <ColumnTable rows={RECORD_COLUMNS} />
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
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0B2046] hover:bg-[#112d5e] dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>ดาวน์โหลดไฟล์แม่แบบ (.xlsx)</span>
              </button>
            </div>
          )}

          {/* ข้อควรรู้ก่อนนำเข้า */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>ข้อควรรู้ก่อนนำเข้า</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90 dark:text-amber-200/90 pl-1">
              <li>
                <strong>อัปโหลดไฟล์จากเครื่องตามเดิม</strong> ไม่ต้องลบแถวหัวเรื่อง แถวหัวคอลัมน์ หรือแถว Total ท้ายไฟล์
              </li>
              <li>
                <strong>เลือกเดือน/ช่วงวันที่ให้ตรงกับไฟล์</strong> แถวที่วันที่อยู่นอกช่วงที่เลือกจะไม่ถูกนำเข้า
              </li>
              <li>
                <strong>รหัสต้องตรงกับพนักงาน:</strong> รหัสในไฟล์ (เช่น 100001) ต้องตรงกับ &quot;รหัสเครื่องสแกน&quot; ในข้อมูลพนักงาน
                แถวที่หาพนักงานไม่เจอจะถูกข้าม — เพิ่มรหัสเครื่องสแกนให้พนักงานภายหลังได้ ระบบจะนำแถวที่ค้างเข้าให้อัตโนมัติ
              </li>
              <li>
                <strong>อัปไฟล์เดิมซ้ำ</strong> ระบบจะเตือนก่อน เพื่อกันข้อมูลซ้ำ
              </li>
            </ul>
          </div>

          <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            ตัวอย่างอ้างอิงจากไฟล์จริงที่ส่งออกจากเครื่องสแกน (ชื่อพนักงานเป็นชื่อสมมติ)
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
