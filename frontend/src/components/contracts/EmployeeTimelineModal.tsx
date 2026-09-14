'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { contractService } from '@/services/contractService';
import { EmployeeCareerTimeline } from '@/types/contract';

interface EmployeeTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number | null;
  employeeName: string;
  employeeCode: string;
}

export default function EmployeeTimelineModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeCode,
}: EmployeeTimelineModalProps) {
  const [timeline, setTimeline] = useState<EmployeeCareerTimeline[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && employeeId) {
      const fetchTimeline = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await contractService.getCareerTimeline(employeeId);
          setTimeline(data);
        } catch (err: any) {
          console.error('Failed to load employee timeline:', err);
          setError(err.message || 'ไม่สามารถโหลดประวัติตำแหน่งงานได้');
        } finally {
          setLoading(false);
        }
      };
      fetchTimeline();
    }
  }, [isOpen, employeeId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header ตรงตาม Mockup: ไทม์ไลน์ตำแหน่งของ {ชื่อ} · {รหัส} */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <h3 className="text-base font-medium text-slate-800">
            ไทม์ไลน์ตำแหน่งของ{' '}
            <span className="text-[#16a34a] font-semibold">
              {employeeName} · {employeeCode}
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body ตรงตาม Mockup 100% */}
        <div className="p-7 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#0B2046]" />
              <span className="text-xs">กำลังโหลดไทม์ไลน์ตำแหน่งงาน...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              ไม่พบข้อมูลประวัติตำแหน่งงานของพนักงานคนนี้
            </div>
          ) : (
            <div className="relative pl-6 space-y-8">
              {timeline.map((item, index) => {
                const isLast = index === timeline.length - 1;
                const isCurrent = item.isCurrent;

                return (
                  <div key={item.id} className="relative flex items-start group">
                    {/* เส้นเชื่อมโยงไทม์ไลน์แนวตั้ง (Connecting Vertical Line) */}
                    {!isLast && (
                      <span
                        className="absolute left-[-17px] top-[14px] w-[2px] bg-slate-400 bottom-[-36px]"
                        aria-hidden="true"
                      />
                    )}

                    {/* จุด Node ของไทม์ไลน์: วงกลมกลวง (อดีต) / วงกลมทึบสีดำ (ปัจจุบัน) */}
                    <span
                      className={`absolute left-[-24px] top-[3px] flex items-center justify-center w-4 h-4 rounded-full transition-all ${
                        isCurrent
                          ? 'bg-slate-900 border-2 border-slate-900'
                          : 'bg-white border-2 border-slate-700'
                      }`}
                    />

                    {/* เนื้อหาไทม์ไลน์ตรงตามรูป Mockup */}
                    <div className="flex-1">
                      {/* 1. ช่วงเวลา: 01/03/2567 – 31/07/2569 */}
                      <div className="text-xs text-slate-600 font-normal">
                        {item.dateRangeDisplay}
                      </div>

                      {/* 2. ชื่อตำแหน่ง + Badge ปัจจุบัน */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">
                          {item.positionName}
                        </span>
                        {isCurrent && (
                          <span className="bg-[#bbf7d0] text-[#15803d] text-xs px-2 py-0.5 rounded-md font-medium inline-flex items-center">
                            ปัจจุบัน
                          </span>
                        )}
                      </div>

                      {/* 3. สังกัดสายงาน / แผนก / สาขา · หัวหน้างาน */}
                      <div className="mt-1 text-xs text-slate-500">
                        {item.hierarchyDisplay}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-7 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-200/80 hover:bg-slate-300 rounded-xl transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
