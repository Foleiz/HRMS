'use client';

import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Info,
  CheckCircle2,
  Clock,
  HardDrive,
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

export const AttendanceFileFormatModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeFormatTab, setActiveFormatTab] = useState<'punch' | 'summary'>('punch');
  const [isDownloading, setIsDownloading] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await attendanceImportService.downloadTemplate('xlsx');
      toast.success('ดาวน์โหลดไฟล์แม่แบบตัวอย่าง (attendance_import_template.xlsx) เรียบร้อยแล้ว');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'ไม่สามารถดาวน์โหลดไฟล์แม่แบบได้');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                รูปแบบไฟล์ต้นฉบับสำหรับนำเข้าบันทึกเวลา
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                โครงสร้างคอลัมน์และรูปแบบไฟล์ Excel (.xlsx, .xls) หรือ CSV ที่ระบบรองรับ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0B2046] hover:bg-[#112d5e] dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>ดาวน์โหลดไฟล์แม่แบบ (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Format Selector Tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveFormatTab('punch')}
              className={`flex-1 min-w-[200px] py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeFormatTab === 'punch'
                  ? 'bg-white dark:bg-slate-900 text-[#0B2046] dark:text-blue-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>รูปแบบที่ 1: ไฟล์สแกนเข้า-ออกรายครั้ง (Punch Log)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">
                แนะนำ
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFormatTab('summary')}
              className={`flex-1 min-w-[200px] py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeFormatTab === 'summary'
                  ? 'bg-white dark:bg-slate-900 text-[#0B2046] dark:text-blue-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>รูปแบบที่ 2: สรุปเวลาจากเครื่องสแกน (Daily Summary / Syaco)</span>
            </button>
          </div>

          {/* TAB 1: PUNCH LOG */}
          {activeFormatTab === 'punch' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-950 dark:text-blue-200 space-y-1">
                  <p className="font-bold">ลักษณะของไฟล์รูปแบบที่ 1 (Punch Log):</p>
                  <p className="leading-relaxed">
                    เหมาะสำหรับไฟล์สแกนนิ้ว/สแกนใบหน้าที่ส่งออกจากเครื่องสแกนโดยตรง โดยในแต่ละแถวจะแสดงการบันทึกเวลา 1 ครั้ง (เข้างาน หรือ ออกงาน) ระบบจะทำการจับคู่เวลาเข้างานแรกสุด (First-In) และเวลาออกงานล่าสุด (Last-Out) ของวันให้อัตโนมัติ
                  </p>
                </div>
              </div>

              {/* Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    ตัวอย่างข้อมูลในไฟล์ Excel (แถวที่ 1 เป็นหัวตาราง):
                  </span>
                  <span className="text-[11px] text-slate-500">
                    * ชื่อหัวคอลัมน์สามารถใช้ภาษาไทยหรืออังกฤษได้
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#0B2046] text-white">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">
                          รหัส <span className="text-rose-400">*</span>
                        </th>
                        <th className="py-2.5 px-3 font-semibold">ชื่อ-สกุล</th>
                        <th className="py-2.5 px-3 font-semibold">แผนก-ฝ่าย.</th>
                        <th className="py-2.5 px-3 font-semibold">
                          วันที่-เวลา <span className="text-rose-400">*</span>
                        </th>
                        <th className="py-2.5 px-3 font-semibold">
                          สถานะ <span className="text-rose-400">*</span>
                        </th>
                        <th className="py-2.5 px-3 font-semibold">เครื่อง</th>
                        <th className="py-2.5 px-3 font-semibold">ประมวลผล</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800 font-mono">
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50">
                        <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">EMP001</td>
                        <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-200">ธนพล สิริโภคินทร์</td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400">ฝ่ายบริหาร</td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">2026-08-03 08:25:00</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            เข้า
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400">Syaco</td>
                        <td className="py-2.5 px-3 font-sans text-slate-500">สำเร็จ</td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 bg-slate-50/30 dark:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">EMP001</td>
                        <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-200">ธนพล สิริโภคินทร์</td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400">ฝ่ายบริหาร</td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">2026-08-03 17:35:00</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            ออก
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400">Syaco</td>
                        <td className="py-2.5 px-3 font-sans text-slate-500">สำเร็จ</td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50">
                        <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">EMP002</td>
                        <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-200">พิมพ์ใจ กิตติพาณิชย์</td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400">ฝ่ายบุคคล</td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">2026-08-03 08:45:00</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            เข้า
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400">Syaco</td>
                        <td className="py-2.5 px-3 font-sans text-slate-500">สำเร็จ</td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 bg-slate-50/30 dark:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">EMP002</td>
                        <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-200">พิมพ์ใจ กิตติพาณิชย์</td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400">ฝ่ายบุคคล</td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">2026-08-03 17:30:00</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            ออก
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400">Syaco</td>
                        <td className="py-2.5 px-3 font-sans text-slate-500">สำเร็จ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Column Definitions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>คอลัมน์รหัสพนักงาน (จำเป็น)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    หัวคอลัมน์ที่รองรับ: <code className="text-blue-600 dark:text-blue-400 font-mono">รหัส</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">รหัสพนักงาน</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">EmployeeCode</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">EmpCode</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">UserId</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">BadgeNo</code>
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>คอลัมน์วันที่และเวลา (จำเป็น)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    หัวคอลัมน์ที่รองรับ: <code className="text-blue-600 dark:text-blue-400 font-mono">วันที่-เวลา</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">เวลา</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">DateTime</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">Timestamp</code>, หรือแยกคอลัมน์ <code className="text-blue-600 dark:text-blue-400 font-mono">วันที่</code> + <code className="text-blue-600 dark:text-blue-400 font-mono">เวลา</code>
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>คอลัมน์สถานะ (จำเป็น)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    หัวคอลัมน์ที่รองรับ: <code className="text-blue-600 dark:text-blue-400 font-mono">สถานะ</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">เข้า-ออก</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">PunchState</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">Type</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">InOut</code> (ค่าที่รองรับ: เข้า, ออก, Check-in, Check-out, IN, OUT)
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    <span>คอลัมน์เสริมอื่นๆ</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ชื่อพนักงาน, แผนก, เครื่องสแกน (มีหรือไม่ก็ได้ ระบบจะดึงชื่อและแผนกจริงของพนักงานจากฐานข้อมูล HR เสมอ)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DAILY SUMMARY */}
          {activeFormatTab === 'summary' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 flex items-start gap-3">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-950 dark:text-purple-200 space-y-1">
                  <p className="font-bold">ลักษณะของไฟล์รูปแบบที่ 2 (Daily Summary / เช่น เครื่องสแกน Syaco):</p>
                  <p className="leading-relaxed">
                    ไฟล์รายงานสรุปรายวันจากเครื่องสแกน ที่มีเวลาเข้าและเวลาออกอยู่ในแถวเดียวกัน พร้อมการคำนวณชั่วโมงทำงานและนาทีมาสาย ระบบสามารถอ่านหัวไฟล์ต้นฉบับ (เช่น <code className="font-mono bg-purple-100/70 dark:bg-purple-900/40 px-1 py-0.5 rounded">unit: Syaco date from: ... to: ...</code>) และแยกวิเคราะห์เข้าสู่ระบบได้ทันที
                  </p>
                </div>
              </div>

              {/* Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    ตัวอย่างข้อมูลในไฟล์ Daily Summary:
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    รองรับรหัสคอลัมน์ของเครื่อง Syaco
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1e1b4b] text-white">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">
                          รหัส (UserId) <span className="text-rose-400">*</span>
                        </th>
                        <th className="py-2.5 px-3 font-semibold">ชื่อพนักงาน</th>
                        <th className="py-2.5 px-3 font-semibold">
                          วันที่ (dkrq) <span className="text-rose-400">*</span>
                        </th>
                        <th className="py-2.5 px-3 font-semibold">เวลาเข้า (TimeIn)</th>
                        <th className="py-2.5 px-3 font-semibold">เวลาออก (TimeOut)</th>
                        <th className="py-2.5 px-3 font-semibold">ชม.ทำงาน (Shichu2)</th>
                        <th className="py-2.5 px-3 font-semibold">นาทีสาย (Cdshi)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800 font-mono">
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50">
                        <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">100001</td>
                        <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-200">ธนพล สิริโภคินทร์</td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">2026-09-01</td>
                        <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-semibold">08:25</td>
                        <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 font-semibold">17:35</td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">8.00</td>
                        <td className="py-2.5 px-3 text-slate-500">0</td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 bg-slate-50/30 dark:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">100001</td>
                        <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-200">ธนพล สิริโภคินทร์</td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">2026-09-02</td>
                        <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-semibold">08:45</td>
                        <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 font-semibold">17:30</td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">7.75</td>
                        <td className="py-2.5 px-3 text-rose-600 font-semibold">15</td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50">
                        <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">100002</td>
                        <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-200">พิมพ์ใจ กิตติพาณิชย์</td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">2026-09-01</td>
                        <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-semibold">08:15</td>
                        <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 font-semibold">17:30</td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">8.00</td>
                        <td className="py-2.5 px-3 text-slate-500">0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Guidelines & Important Notes Alert */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>ข้อแนะนำสำคัญในการจัดเตรียมไฟล์</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90 dark:text-amber-200/90 pl-1">
              <li>
                <strong>การจับคู่พนักงาน:</strong> รหัสในคอลัมน์รหัสต้องตรงกับ <strong>รหัสพนักงาน (Employee Code)</strong> เช่น <code className="font-mono">EMP001</code> หรือ <strong>รหัสเครื่องสแกน (Biometric ID)</strong> เช่น <code className="font-mono">100001</code> ที่ผูกไว้ในระบบ HRMS
              </li>
              <li>
                <strong>รูปแบบวันที่และเวลา:</strong> รองรับรูปแบบ <code className="font-mono">YYYY-MM-DD</code> (เช่น 2026-08-03) หรือ <code className="font-mono">DD/MM/YYYY</code> ทั้งปี ค.ศ. และ พ.ศ.
              </li>
              <li>
                <strong>ขนาดไฟล์และประเภทที่รองรับ:</strong> ไฟล์ Excel นามสกุล <code className="font-mono">.xlsx</code>, <code className="font-mono">.xls</code> หรือไฟล์ <code className="font-mono">.csv</code> (ขนาดไม่เกิน 20MB)
              </li>
              <li>
                <strong>ป้องกันไฟล์ซ้ำ:</strong> ระบบตรวจสอบ SHA-256 Hash ของไฟล์ หากไฟล์ซ้ำระบบจะแจ้งเตือนทันทีเพื่อป้องกันข้อมูลทับซ้อน
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            สามารถดาวน์โหลดไฟล์ตัวอย่างไปแก้ไขและทดลองอัปโหลดเข้าสู่ระบบได้ทันที
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0B2046] hover:bg-[#112d5e] dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)</span>
            </button>

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
    </div>
  );
};
