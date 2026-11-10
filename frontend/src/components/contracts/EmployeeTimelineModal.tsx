'use client';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Loader2,
  AlertCircle,
  FileText,
  Briefcase,
  Paperclip,
  Clock,
  ArrowUpDown,
  Download,
  Eye,
} from 'lucide-react';
import { contractService } from '@/services/contractService';
import { EmployeeCareerTimeline, EmploymentContract } from '@/types/contract';
import { useToast } from '@/context/ToastContext';

interface EmployeeTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number | null;
  employeeName: string;
  employeeCode: string;
  onViewContractDoc?: (contract: EmploymentContract) => void;
}

interface UnifiedTimelineItem {
  id: string;
  type: 'CAREER' | 'CONTRACT';
  rawDate: string;
  dateRangeDisplay: string;
  title: string;
  subtitle: string;
  isCurrent: boolean;
  statusBadge: {
    text: string;
    className: string;
  };
  contract?: EmploymentContract;
  terminationReason?: string | null;
}

const formatDateTh = (dateStr?: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function EmployeeTimelineModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeCode,
  onViewContractDoc,
}: EmployeeTimelineModalProps) {
  const toast = useToast();
  const [careerList, setCareerList] = useState<EmployeeCareerTimeline[]>([]);
  const [contractsList, setContractsList] = useState<EmploymentContract[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tab filter: 'ALL' | 'CONTRACT' | 'CAREER'
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONTRACT' | 'CAREER'>('ALL');
  // Sort order: 'ASC' (เก่า -> ใหม่) | 'DESC' (ใหม่ -> เก่า)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  useEffect(() => {
    if (isOpen && employeeId) {
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);
          const [careerData, contractData] = await Promise.all([
            contractService.getCareerTimeline(employeeId),
            contractService.getByEmployeeId(employeeId),
          ]);
          setCareerList(careerData || []);
          setContractsList(contractData || []);
        } catch (err: any) {
          console.error('Failed to load employee timeline:', err);
          setError(err.message || 'ไม่สามารถโหลดประวัติและไทม์ไลน์ได้');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, employeeId]);

  // รวมรายการเหตุการณ์ทั้งหมดเข้าเป็น Unified Timeline
  const unifiedItems: UnifiedTimelineItem[] = useMemo(() => {
    const items: UnifiedTimelineItem[] = [];

    // 1. ตำแหน่งงาน (Career Assignments)
    for (const c of careerList) {
      items.push({
        id: `career-${c.id}`,
        type: 'CAREER',
        rawDate: c.effectiveFrom,
        dateRangeDisplay: c.dateRangeDisplay,
        title: c.positionName,
        subtitle: c.hierarchyDisplay,
        isCurrent: c.isCurrent,
        statusBadge: c.isCurrent
          ? {
              text: 'ตำแหน่งปัจจุบัน',
              className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
            }
          : {
              text: 'ตำแหน่งเดิม',
              className: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
            },
      });
    }

    // 2. สัญญาจ้างงาน (Employment Contracts)
    for (const ct of contractsList) {
      const isCurrent = ct.status === 'ACTIVE';
      const startDisplay = ct.startDateDisplay || formatDateTh(ct.startDate);
      const endDisplay =
        ct.effectiveEndDateDisplay ||
        (ct.contractEndDate
          ? formatDateTh(ct.contractEndDate)
          : ct.probationEndDate
          ? formatDateTh(ct.probationEndDate)
          : 'ไม่มีกำหนด');
      const dateRange = `${startDisplay} – ${endDisplay}`;

      let statusBadge = {
        text: 'สิ้นสุดสัญญาแล้ว',
        className: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      };
      if (isCurrent) {
        statusBadge = {
          text: 'สัญญาปัจจุบัน',
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
        };
      } else if (ct.status === 'TERMINATED') {
        statusBadge = {
          text: 'ยกเลิกสัญญา',
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50',
        };
      }

      items.push({
        id: `contract-${ct.id}`,
        type: 'CONTRACT',
        rawDate: ct.startDate,
        dateRangeDisplay: dateRange,
        title: `สัญญาจ้างงาน: ${ct.employeeTypeName || ct.contractTypeDisplay}`,
        subtitle: `รูปแบบค่าจ้าง: ${ct.wageType === 'DAILY' ? 'รายวัน' : 'รายเดือน'}${
          ct.positionTitle ? ` · ตำแหน่งตามสัญญา: ${ct.positionTitle}` : ''
        }`,
        isCurrent,
        statusBadge,
        contract: ct,
        terminationReason: ct.terminationReason,
      });
    }

    // เรียงลำดับตามวันที่
    items.sort((a, b) => {
      const timeA = new Date(a.rawDate).getTime();
      const timeB = new Date(b.rawDate).getTime();
      if (sortOrder === 'ASC') {
        return timeA - timeB;
      } else {
        return timeB - timeA;
      }
    });

    return items;
  }, [careerList, contractsList, sortOrder]);

  // กรองตามแท็บที่เลือก
  const filteredItems = useMemo(() => {
    if (activeTab === 'CONTRACT') {
      return unifiedItems.filter((i) => i.type === 'CONTRACT');
    }
    if (activeTab === 'CAREER') {
      return unifiedItems.filter((i) => i.type === 'CAREER');
    }
    return unifiedItems;
  }, [unifiedItems, activeTab]);

  const handleDownloadDoc = async (ct: EmploymentContract) => {
    try {
      const res = await contractService.getDocumentBlob(ct.id, false);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ct.documentFileName || res.fileName || 'contract_file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('ดาวน์โหลดไฟล์แนบสัญญาสำเร็จ');
    } catch {
      toast.error('ไม่สามารถดาวน์โหลดเอกสารสัญญาได้');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans"
      innerClassName="items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
        <ModalHeader
          title={
            <>
              ไทม์ไลน์และประวัติของ <span className="text-emerald-600 dark:text-emerald-400">{employeeName} · {employeeCode}</span>
            </>
          }
          onClose={onClose}
        />

        {/* Toolbar: Filter Tabs & Sort Toggle */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2.5">
          {/* Tabs */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              ทั้งหมด ({unifiedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CONTRACT')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'CONTRACT'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              สัญญาจ้าง ({contractsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CAREER')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'CAREER'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              ตำแหน่งงาน ({careerList.length})
            </button>
          </div>

          {/* Sort order toggle */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            title="สลับลำดับการแสดงผล"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortOrder === 'ASC' ? 'เก่า → ใหม่' : 'ใหม่ → เก่า'}</span>
          </button>
        </div>

        {/* Content Body: Unified Timeline */}
        <div className="p-7 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-blue-300" />
              <span className="text-xs">กำลังโหลดไทม์ไลน์และประวัติ...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2.5 text-rose-800 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              ไม่พบรายการประวัติในหมวดที่เลือก
            </div>
          ) : (
            <div className="relative pl-6 space-y-7">
              {filteredItems.map((item, index) => {
                const isLast = index === filteredItems.length - 1;
                const isContract = item.type === 'CONTRACT';
                const hasDoc =
                  item.contract &&
                  (item.contract.hasDocument || (item.contract.documents && item.contract.documents.length > 0));

                return (
                  <div key={item.id} className="relative flex items-start group">
                    {/* เส้นเชื่อมโยงไทม์ไลน์แนวตั้ง */}
                    {!isLast && (
                      <span
                        className="absolute left-[-17px] top-[14px] w-[2px] bg-slate-300 dark:bg-slate-600 bottom-[-32px]"
                        aria-hidden="true"
                      />
                    )}

                    {/* จุด Node ของไทม์ไลน์ */}
                    <span
                      className={`absolute left-[-24px] top-[3px] flex items-center justify-center w-4 h-4 rounded-full transition-all ${
                        item.isCurrent
                          ? 'bg-slate-900 dark:bg-slate-100 border-2 border-slate-900 dark:border-slate-100 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-500'
                      }`}
                    >
                      {item.isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </span>

                    {/* เนื้อหาเหตุการณ์ในไทม์ไลน์ */}
                    <div className="flex-1 min-w-0 bg-slate-50/60 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition">
                      {/* 1. ช่วงเวลา & Badge ประเภท */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {isContract ? (
                            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <Briefcase className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          <span>{item.dateRangeDisplay}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${item.statusBadge.className}`}>
                          {item.statusBadge.text}
                        </span>
                      </div>

                      {/* 2. หัวข้อเหตุการณ์ */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                      </div>

                      {/* 3. รายละเอียดประกอบ */}
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.subtitle}
                      </div>

                      {/* 4. เหตุผลการยกเลิกสัญญา (ถ้ามี) */}
                      {item.terminationReason && (
                        <div className="mt-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-300">
                          <span className="font-semibold">เหตุผลที่ยกเลิก:</span> {item.terminationReason}
                        </div>
                      )}

                      {/* 5. ปุ่มเปิดดูหรือดาวน์โหลดเอกสารสัญญา (กรณีเป็นสัญญาจ้างและมีไฟล์) */}
                      {isContract && item.contract && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            {hasDoc ? 'มีเอกสารสัญญาแนบ' : 'ยังไม่มีไฟล์แนบ'}
                          </span>

                          {hasDoc && (
                            <div className="flex items-center gap-1.5">
                              {onViewContractDoc && (
                                <button
                                  type="button"
                                  onClick={() => onViewContractDoc(item.contract!)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" /> ดูตัวอย่างไฟล์
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDownloadDoc(item.contract!)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition cursor-pointer"
                              >
                                <Download className="w-3 h-3" /> ดาวน์โหลด
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            รวมประวัติทั้งสัญญาจ้างและการดำรงตำแหน่งงาน
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
