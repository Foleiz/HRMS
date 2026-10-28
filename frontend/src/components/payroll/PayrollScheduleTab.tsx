'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Save,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  RotateCcw,
  Building2,
  Banknote
} from 'lucide-react';
import {
  PayrollScheduleSettings,
  DEFAULT_PAYROLL_SCHEDULE_SETTINGS,
  getPayrollScheduleSettings,
  savePayrollScheduleSettings,
} from '@/services/payrollScheduleService';
import { useToast } from '@/context/ToastContext';

interface PayrollScheduleTabProps {
  canEdit?: boolean;
}

export default function PayrollScheduleTab({
  canEdit = true,
}: PayrollScheduleTabProps) {
  const toast = useToast();
  const [settings, setSettings] = useState<PayrollScheduleSettings>(DEFAULT_PAYROLL_SCHEDULE_SETTINGS);
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  useEffect(() => {
    setSettings(getPayrollScheduleSettings());
  }, []);

  const handleSave = () => {
    savePayrollScheduleSettings(settings);
    setIsSavedRecently(true);
    toast.success('บันทึกการกำหนดวันตัดรอบและจ่ายเงินเรียบร้อยแล้ว');
    setTimeout(() => setIsSavedRecently(false), 3000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_PAYROLL_SCHEDULE_SETTINGS);
    savePayrollScheduleSettings(DEFAULT_PAYROLL_SCHEDULE_SETTINGS);
    toast.success('รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นของระบบแล้ว');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-[#0B2046] dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">กำหนดวันตัดรอบและจ่ายเงิน</h2>
              <span className="text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                นำไปใช้สร้างรอบอัตโนมัติ
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              กำหนดช่วงเวลาคำนวณเงินเดือนประจำรอบ กำหนดวันจ่ายเงิน และวันตัดรอบเบิกสวัสดิการ เพื่อให้ระบบสร้างรอบเงินเดือนประจำเดือนให้อัตโนมัติในคลิกเดียว โดยไม่ต้องกรอกวันเริ่ม-สิ้นสุดซ้ำซ้อนในทุกๆ เดือน
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={handleReset}
              className="h-10 px-3.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              title="รีเซ็ตกลับเป็นค่าเริ่มต้น"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตค่าเริ่มต้น</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-10 px-5 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
            >
              {isSavedRecently ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{isSavedRecently ? 'บันทึกเรียบร้อย' : 'บันทึกการกำหนดวัน'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: ช่วงเวลาคำนวณรอบเงินเดือน (Calculation Window) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-700/80">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">ช่วงเวลาคำนวณประจำรอบ</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">วันเริ่มต้นและวันสิ้นสุดของงวดคำนวณ</p>
              </div>
            </div>

            {/* วันเริ่มคำนวณ */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">วันเริ่มคำนวณ</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <input
                    type="radio"
                    name="startDayType"
                    checked={settings.startDayType === 'FIRST_DAY'}
                    onChange={() => setSettings({ ...settings, startDayType: 'FIRST_DAY' })}
                    className="text-[#0B2046] focus:ring-[#0B2046]"
                  />
                  <div>
                    <span className="font-semibold">ทุกวันที่ 1 ของเดือน</span>
                    <p className="text-[11px] text-slate-400">คำนวณตั้งแต่วันแรกของแต่ละเดือน (เช่น 01/xx/2569)</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <input
                    type="radio"
                    name="startDayType"
                    checked={settings.startDayType === 'CUSTOM_DAY'}
                    onChange={() => setSettings({ ...settings, startDayType: 'CUSTOM_DAY' })}
                    className="text-[#0B2046] focus:ring-[#0B2046]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">กำหนดวันที่เริ่มต้นเอง</span>
                      {settings.startDayType === 'CUSTOM_DAY' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">วันที่</span>
                          <input
                            type="number"
                            min={1}
                            max={28}
                            value={settings.startDay}
                            onChange={(e) => setSettings({ ...settings, startDay: Number(e.target.value) || 1 })}
                            className="w-16 px-2 py-1 text-center font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* วันสิ้นสุดคำนวณ */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">วันสิ้นสุดคำนวณ</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <input
                    type="radio"
                    name="endDayType"
                    checked={settings.endDayType === 'LAST_DAY'}
                    onChange={() => setSettings({ ...settings, endDayType: 'LAST_DAY' })}
                    className="text-[#0B2046] focus:ring-[#0B2046]"
                  />
                  <div>
                    <span className="font-semibold">วันสิ้นเดือนของแต่ละเดือน</span>
                    <p className="text-[11px] text-slate-400">ระบบปรับตามจริง เช่น 28, 29, 30 หรือ 31</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <input
                    type="radio"
                    name="endDayType"
                    checked={settings.endDayType === 'CUSTOM_DAY'}
                    onChange={() => setSettings({ ...settings, endDayType: 'CUSTOM_DAY' })}
                    className="text-[#0B2046] focus:ring-[#0B2046]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">กำหนดวันที่สิ้นสุดเอง</span>
                      {settings.endDayType === 'CUSTOM_DAY' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">วันที่</span>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={settings.endDay}
                            onChange={(e) => setSettings({ ...settings, endDay: Number(e.target.value) || 30 })}
                            className="w-16 px-2 py-1 text-center font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>ระบบจะนำช่วงเวลานี้ไปคำนวณฐานเงินเดือน สถิติการมาทำงาน และรายการได้/หักประจำงวด</span>
          </div>
        </div>

        {/* Card 2: วันกำหนดจ่ายเงินเดือน (Payment Date) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-700/80">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">วันกำหนดจ่ายเงินเดือน</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">วันที่โอนจ่ายเงินเดือนให้พนักงานในแต่ละเดือน</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">วันที่กำหนดจ่ายประจำเดือน</label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">ทุกวันที่:</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={settings.paymentDay}
                  onChange={(e) => setSettings({ ...settings, paymentDay: Number(e.target.value) || 29 })}
                  className="w-20 px-3 py-1.5 text-center font-bold text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">ของแต่ละเดือน (เช่น 29)</span>
              </div>
            </div>

            {/* Weekend Adjustment Policy */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.adjustWeekend}
                  onChange={(e) => setSettings({ ...settings, adjustWeekend: e.target.checked })}
                  className="mt-0.5 rounded text-[#0B2046] focus:ring-[#0B2046]"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    ปรับเลื่อนวันจ่ายล่วงหน้าหากตรงกับเสาร์-อาทิตย์
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    หากวันที่กำหนดจ่ายตรงกับวันเสาร์หรือวันอาทิตย์ ระบบจะปรับกำหนดวันจ่ายเป็น <strong>วันศุกร์ก่อนหน้า</strong> ให้อัตโนมัติ เพื่อให้พนักงานได้รับเงินเดือนก่อนวันหยุด
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>วันกำหนดจ่ายเงินนี้จะถูกนำไปใช้ในไฟล์โอนเงินธนาคาร และแสดงในสลิปเงินเดือนของพนักงาน</span>
          </div>
        </div>

        {/* Card 3: วันตัดรอบเงินเบิกสวัสดิการ (Benefit Claim Cutoff) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-700/80">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">วันตัดรอบเงินเบิกสวัสดิการ</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">กำหนดเส้นตายของคำขอเบิกสวัสดิการที่จะจ่ายในรอบ</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">นโยบายวันตัดรอบเบิกสวัสดิการ</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <input
                    type="radio"
                    name="claimCutoffType"
                    checked={settings.claimCutoffType === 'CUSTOM_DAY'}
                    onChange={() => setSettings({ ...settings, claimCutoffType: 'CUSTOM_DAY' })}
                    className="text-[#0B2046] focus:ring-[#0B2046]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold">กำหนดวันตัดรอบเฉพาะ</span>
                        <p className="text-[11px] text-slate-400">ตัดรอบก่อนวันจ่ายเงินเดือน</p>
                      </div>
                      {settings.claimCutoffType === 'CUSTOM_DAY' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">วันที่</span>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={settings.claimCutoffDay}
                            onChange={(e) => setSettings({ ...settings, claimCutoffDay: Number(e.target.value) || 25 })}
                            className="w-16 px-2 py-1 text-center font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <input
                    type="radio"
                    name="claimCutoffType"
                    checked={settings.claimCutoffType === 'SAME_AS_PAYMENT'}
                    onChange={() => setSettings({ ...settings, claimCutoffType: 'SAME_AS_PAYMENT' })}
                    className="text-[#0B2046] focus:ring-[#0B2046]"
                  />
                  <div>
                    <span className="font-semibold">ใช้วันเดียวกับวันกำหนดจ่ายเงิน</span>
                    <p className="text-[11px] text-slate-400">อนุมัติก่อนถึงวันจ่ายเงินเดือนจะถูกนับรวมในรอบทันที</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>คำขอเบิกสวัสดิการที่อนุมัติหลังวันตัดรอบนี้ จะถูกยกยอดไปจ่ายในรอบเงินเดือนถัดไปโดยอัตโนมัติ</span>
          </div>
        </div>
      </div>

      {/* Card 4: เลือกวิธีการจ่ายเงินเดือน (Payment Method) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0B2046] dark:text-blue-400 flex items-center justify-center font-bold text-xs">
            4
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">เลือกวิธีการจ่ายเงินเดือน</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">เลือกรูปแบบการจ่ายเงินเดือนหลักที่บริษัทใช้งานสำหรับรอบเงินเดือน</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Model 1: Bank Batch */}
          <button
            type="button"
            onClick={() => setSettings({ ...settings, paymentMethod: 'BANK_BATCH' })}
            disabled={!canEdit}
            className={`flex flex-col items-start gap-3 p-5 rounded-2xl transition-all cursor-pointer text-left border-2 ${
              settings.paymentMethod === 'BANK_BATCH'
                ? 'border-[#0B2046] dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-[#0B2046]/10 dark:ring-blue-500/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-[#0B2046] dark:text-blue-300 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              {settings.paymentMethod === 'BANK_BATCH' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0B2046] text-white dark:bg-blue-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  เลือกใช้งาน
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">ส่งไฟล์ธนาคาร (Bank Batch)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                ดาวน์โหลดไฟล์ .CSV ส่งให้ธนาคาร ธนาคารจะโอนเงินให้พนักงานอัตโนมัติ (สำหรับบริษัทขนาดใหญ่)
              </div>
            </div>
          </button>

          {/* Model 2: Direct Transfer */}
          <button
            type="button"
            onClick={() => setSettings({ ...settings, paymentMethod: 'DIRECT_TRANSFER' })}
            disabled={!canEdit}
            className={`flex flex-col items-start gap-3 p-5 rounded-2xl transition-all cursor-pointer text-left border-2 ${
              settings.paymentMethod === 'DIRECT_TRANSFER'
                ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/10 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
              {settings.paymentMethod === 'DIRECT_TRANSFER' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white dark:bg-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  เลือกใช้งาน
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">โอนเองทีละคน</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                โอนเงินผ่าน Internet Banking ทีละคน แนบสลิปยืนยัน แล้วยืนยันการจ่ายเงินทั้งหมด
              </div>
            </div>
          </button>
        </div>

        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-800/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>ระบบจะนำวิธีการจ่ายเงินเดือนนี้ไปใช้เป็นค่าเริ่มต้นเมื่อ CEO อนุมัติรอบเงินเดือน</span>
        </div>
      </div>
    </div>
  );
}
