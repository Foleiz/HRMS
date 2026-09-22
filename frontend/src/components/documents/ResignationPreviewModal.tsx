'use client';

import React from 'react';
import { X, Printer, FileText } from 'lucide-react';

interface ResignationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    employeeName: string;
    employeeCode: string;
    positionTitle: string;
    departmentName: string;
    submissionDate: string;
    requestedLastWorkingDate: string;
    reasonCategoryLabel: string;
    reasonDetail: string;
    handoverNotes?: string;
    contactAfterResignation?: string;
    noticeDays: number;
  } | null;
}

export const ResignationPreviewModal: React.FC<ResignationPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95 duration-200">
        {/* Header Actions */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-[#0B2046]" />
            <h3 className="text-base font-bold">ตัวอย่างหนังสือแสดงความประสงค์ขอลาออกจากงาน</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Document Preview */}
        <div className="border border-gray-200 rounded-2xl p-6 sm:p-8 bg-white shadow-xs space-y-6 text-slate-800 text-sm leading-relaxed">
          {/* Header */}
          <div className="text-center pb-4 border-b border-gray-200">
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              บริษัท ฟิวเจอร์ เทค คอร์ปอเรชั่น จำกัด (มหาชน)
            </p>
            <h2 className="text-lg font-bold text-gray-900 mt-1">
              หนังสือแสดงความประสงค์ขอลาออกจากงาน
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              วันที่ยื่นคำขอ: {data.submissionDate}
            </p>
          </div>

          {/* Letter Body */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between text-xs text-gray-600 gap-1">
              <span><strong>เรื่อง:</strong> ขอลาออกจากงานและขอยุติสัญญาจ้าง</span>
              <span><strong>วันที่ทำงานวันสุดท้าย:</strong> {data.requestedLastWorkingDate}</span>
            </div>
            <p className="text-xs text-gray-600">
              <strong>เรียน:</strong> ผู้บังคับบัญชาตามสายงาน และ ฝ่ายทรัพยากรบุคคล
            </p>

            <p className="indent-8 text-justify">
              ข้าพเจ้า <strong>{data.employeeName}</strong> รหัสพนักงาน <strong>{data.employeeCode}</strong> ปัจจุบันดำรงตำแหน่ง <strong>{data.positionTitle}</strong> สังกัด <strong>{data.departmentName}</strong> มีความประสงค์ขอลาออกจากการเป็นพนักงานของบริษัทฯ โดยขอให้มีผลตั้งแต่วันที่ <strong>{data.requestedLastWorkingDate}</strong> เป็นต้นไป (บอกกล่าวล่วงหน้าจำนวน {data.noticeDays} วัน)
            </p>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100 text-xs">
              <p>
                <strong className="text-gray-700">สาเหตุการลาออก:</strong>{' '}
                <span className="text-gray-900 font-medium">{data.reasonCategoryLabel}</span>
              </p>
              <p>
                <strong className="text-gray-700">รายละเอียดเหตุผล:</strong>{' '}
                <span className="text-gray-800">{data.reasonDetail}</span>
              </p>
              {data.handoverNotes && (
                <p>
                  <strong className="text-gray-700">แผนและรายละเอียดการส่งมอบงาน:</strong>{' '}
                  <span className="text-gray-800">{data.handoverNotes}</span>
                </p>
              )}
              {data.contactAfterResignation && (
                <p>
                  <strong className="text-gray-700">ข้อมูลติดต่อหลังพ้นสภาพพนักงาน:</strong>{' '}
                  <span className="text-gray-800">{data.contactAfterResignation}</span>
                </p>
              )}
            </div>

            <p className="indent-8 text-justify text-xs text-gray-600">
              ข้าพเจ้าจะดำเนินการส่งมอบงาน ทรัพย์สิน และเอกสารต่าง ๆ ของบริษัทฯ ให้แก่ผู้รับมอบหมายด้วยความเรียบร้อยก่อนถึงวันทำงานวันสุดท้าย และขอขอบพระคุณบริษัทฯ และผู้บังคับบัญชาที่ได้ให้โอกาสและการสนับสนุนที่ดีตลอดระยะเวลาการทำงาน
            </p>
          </div>

          {/* Signature Box */}
          <div className="pt-6 border-t border-gray-100 flex justify-end text-center">
            <div className="w-56 space-y-2 text-xs">
              <p className="text-gray-500">ขอแสดงความนับถือ</p>
              <div className="h-10 flex items-center justify-center">
                <span className="font-serif italic text-base text-slate-700 underline decoration-slate-300">
                  {data.employeeName}
                </span>
              </div>
              <p className="font-medium text-gray-800">({data.employeeName})</p>
              <p className="text-gray-400">ผู้ยื่นคำขอลาออก</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            พิมพ์เอกสาร
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
