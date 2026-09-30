'use client';

import React from 'react';
import { X, Printer, FileText, Paperclip } from 'lucide-react';

interface GeneralDocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    employeeName: string;
    employeeCode: string;
    positionTitle: string;
    departmentName: string;
    issueDate: string;
    expiryDate?: string;
    documentType: string;
    purpose: string;
    notes?: string;
    fileName?: string;
  } | null;
}

export const GeneralDocumentPreviewModal: React.FC<GeneralDocumentPreviewModalProps> = ({
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
            <h3 className="text-base font-bold">ตัวอย่างคำร้องขอเอกสารทั่วไป</h3>
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
              แบบคำร้องขอเอกสารทั่วไป (General Document Request)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              วันที่เอกสาร: {data.issueDate}
            </p>
          </div>

          {/* Details Table */}
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-gray-500 font-medium">ชื่อ-นามสกุล ผู้ยื่นคำร้อง:</p>
                <p className="text-gray-900 font-bold mt-0.5">{data.employeeName}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">รหัสพนักงาน:</p>
                <p className="text-gray-900 font-bold mt-0.5">{data.employeeCode}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">ตำแหน่ง:</p>
                <p className="text-gray-900 mt-0.5">{data.positionTitle}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">แผนก / สังกัด:</p>
                <p className="text-gray-900 mt-0.5">{data.departmentName}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-100 pb-2.5">
                <span className="text-gray-600 font-medium">ประเภทเอกสารที่ขอ:</span>
                <span className="text-gray-900 font-bold">{data.documentType}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-100 pb-2.5">
                <span className="text-gray-600 font-medium">วันที่ออก:</span>
                <span className="text-gray-900">{data.issueDate}</span>
              </div>
              {data.expiryDate && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-100 pb-2.5">
                  <span className="text-gray-600 font-medium">วันหมดอายุ (มีผลบังคับใช้):</span>
                  <span className="text-gray-900">{data.expiryDate}</span>
                </div>
              )}
              <div>
                <p className="text-gray-600 font-medium mb-1">เอกสารนี้ใช้สำหรับ (วัตถุประสงค์):</p>
                <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{data.purpose}</p>
              </div>
              {data.notes && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">หมายเหตุเพิ่มเติม:</p>
                  <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg">{data.notes}</p>
                </div>
              )}
              {data.fileName && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                  <Paperclip className="w-3.5 h-3.5 shrink-0" />
                  <span>เอกสารแนบประกอบ: <strong>{data.fileName}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Signature Box */}
          <div className="pt-4 border-t border-gray-100 flex justify-end text-center">
            <div className="w-52 space-y-1.5 text-xs">
              <p className="text-gray-500">ลงชื่อผู้ยื่นคำร้อง</p>
              <div className="h-8 flex items-center justify-center">
                <span className="font-serif italic text-sm text-slate-700 underline decoration-slate-300">
                  {data.employeeName}
                </span>
              </div>
              <p className="font-medium text-gray-800">({data.employeeName})</p>
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
