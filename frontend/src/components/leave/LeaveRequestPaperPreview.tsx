'use client';

import React from 'react';
import { X } from 'lucide-react';

interface LeaveRequestPaperPreviewProps {
  fullName: string;
  positionTitle?: string | null;
  departmentName?: string | null;
  leaveTypeName?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
  leaveDays: number;
  contactDuringLeave?: string;
  onClose: () => void;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const toThaiDateParts = (dateStr?: string) => {
  if (!dateStr) return { day: '', month: '', yearBE: '' };
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return { day: '', month: '', yearBE: '' };
  return {
    day: String(d.getDate()),
    month: THAI_MONTHS[d.getMonth()],
    yearBE: String(d.getFullYear() + 543),
  };
};

// ช่องข้อความแบบเส้นประ (จำลองรูปแบบฟอร์มกระดาษ) — ถ้ายังไม่มีค่าจะแสดงเป็นช่องว่างรอกรอก
const Dotted: React.FC<{ value?: string; minWidth?: string; className?: string }> = ({
  value,
  minWidth = '4rem',
  className = '',
}) => (
  <span
    className={`inline-block border-b border-dotted border-gray-400 px-1 text-center align-bottom ${className}`}
    style={{ minWidth }}
  >
    {value || ' '}
  </span>
);

const CheckBox: React.FC<{ checked?: boolean; label: string }> = ({ checked, label }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="w-3.5 h-3.5 border border-gray-500 inline-flex items-center justify-center text-[10px] leading-none shrink-0">
      {checked ? '✓' : ''}
    </span>
    {label}
  </span>
);

/**
 * ตัวอย่างเอกสารใบลา จำลองรูปแบบฟอร์มกระดาษราชการ "ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว"
 * (ตัดตารางสถิติการลาในปีงบประมาณและส่วนที่ผู้บังคับบัญชา/ผู้ตรวจสอบเป็นผู้กรอกออก
 * เนื่องจากเป็นเพียงตัวอย่างคำขอที่พนักงานกำลังจะยื่น ยังไม่ผ่านการอนุมัติ)
 */
export const LeaveRequestPaperPreview: React.FC<LeaveRequestPaperPreviewProps> = ({
  fullName,
  positionTitle,
  departmentName,
  leaveTypeName,
  reason,
  startDate,
  endDate,
  leaveDays,
  contactDuringLeave,
  onClose,
}) => {
  const issueDate = toThaiDateParts(new Date().toISOString().slice(0, 10));
  const start = toThaiDateParts(startDate);
  const end = toThaiDateParts(endDate);

  const isSick = !!leaveTypeName?.includes('ป่วย');
  const isPersonal = !!leaveTypeName && !isSick && !leaveTypeName.includes('คลอด');
  const isMaternity = !!leaveTypeName?.includes('คลอด');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">ตัวอย่างเอกสารใบลา</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Paper */}
        <div className="p-6 sm:p-10 font-serif text-[13.5px] leading-relaxed text-gray-900 max-h-[75vh] overflow-y-auto">
          <h2 className="text-center text-base font-bold mb-8">ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว</h2>

          <div className="text-right mb-1">
            เขียนที่ <Dotted minWidth="10rem" />
          </div>
          <div className="text-right mb-6">
            วันที่ <Dotted value={issueDate.day} minWidth="2rem" /> เดือน{' '}
            <Dotted value={issueDate.month} minWidth="6rem" /> พ.ศ. <Dotted value={issueDate.yearBE} minWidth="3rem" />
          </div>

          <div className="mb-3">
            เรื่อง <Dotted value={leaveTypeName ? `ขอลา${leaveTypeName}` : undefined} minWidth="20rem" />
          </div>
          <div className="mb-3">
            เรียน <Dotted minWidth="26rem" />
          </div>

          <div className="mb-1 pl-6">
            ข้าพเจ้า <Dotted value={fullName} minWidth="13rem" /> ตำแหน่ง{' '}
            <Dotted value={positionTitle || undefined} minWidth="10rem" />
          </div>
          <div className="mb-4">
            สังกัด <Dotted value={departmentName || undefined} minWidth="30rem" />
          </div>

          <div className="mb-4 pl-6 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="shrink-0">ขอลา</span>
              <CheckBox checked={isSick} label="ป่วย" />
              <CheckBox checked={isPersonal} label="กิจส่วนตัว" />
              <span>
                เนื่องจาก <Dotted value={reason || undefined} minWidth="14rem" />
              </span>
            </div>
            <div className="flex items-center gap-x-4 pl-10">
              <CheckBox checked={isMaternity} label="คลอดบุตร" />
            </div>
          </div>

          <div className="mb-1">
            ตั้งแต่วันที่{' '}
            <Dotted value={startDate ? `${start.day} ${start.month} ${start.yearBE}` : undefined} minWidth="10rem" /> ถึงวันที่{' '}
            <Dotted value={endDate ? `${end.day} ${end.month} ${end.yearBE}` : undefined} minWidth="10rem" /> มีกำหนด{' '}
            <Dotted value={leaveDays ? String(leaveDays) : undefined} minWidth="3rem" /> วัน
          </div>
          <div className="mb-1">
            ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <Dotted value={contactDuringLeave || undefined} minWidth="22rem" />
          </div>

          <div className="text-right mt-10 mb-1">ขอแสดงความนับถือ</div>
          <div className="text-right mb-1">
            (ลงชื่อ) <Dotted minWidth="10rem" />
          </div>
          <div className="text-right">
            (<Dotted value={fullName} minWidth="12rem" />)
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
