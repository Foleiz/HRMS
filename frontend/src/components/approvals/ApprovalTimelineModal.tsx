'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  ArrowRight,
  ShieldCheck,
  User,
  Calendar,
  MessageSquare,
  FileText,
  Loader2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { ApprovalTimeline, LeaveRequest } from '@/types/leave';
import { leaveService } from '@/services/leaveService';
import { showError } from '@/lib/sweetalert';

export interface GenericApprovalRequestInfo {
  id: number;
  requestNo: string;
  employeeName: string;
  subtitle?: string;
  fetchTimeline: (id: number) => Promise<ApprovalTimeline>;
}

interface ApprovalTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequest?: LeaveRequest | null;
  requestInfo?: GenericApprovalRequestInfo | null;
}

const formatDateTime = (d?: string | null) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
};

const formatDateOnly = (d?: string | null) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d;
  }
};

export const ApprovalTimelineModal: React.FC<ApprovalTimelineModalProps> = ({
  isOpen,
  onClose,
  leaveRequest,
  requestInfo,
}) => {
  const [timeline, setTimeline] = useState<ApprovalTimeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadDoc = async (reqId: number, docId: number, fileName: string) => {
    try {
      const blob = await leaveService.downloadLeaveDocument(reqId, docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError('ไม่สามารถดาวน์โหลดเอกสารได้');
    }
  };

  const effectiveRequest: GenericApprovalRequestInfo | null = leaveRequest
    ? {
        id: leaveRequest.id,
        requestNo: leaveRequest.requestNo,
        employeeName: leaveRequest.employeeName,
        subtitle: `ผู้ยื่น: ${leaveRequest.employeeName} (${leaveRequest.departmentName}) • ${leaveRequest.leaveTypeName}`,
        fetchTimeline: (id: number) => leaveService.getApprovalTimeline(id),
      }
    : requestInfo || null;

  useEffect(() => {
    if (isOpen && effectiveRequest) {
      loadTimeline(effectiveRequest);
    } else {
      setTimeline(null);
      setError(null);
    }
  }, [isOpen, leaveRequest?.id, requestInfo?.id]);

  const loadTimeline = async (req: GenericApprovalRequestInfo) => {
    setLoading(true);
    setError(null);
    try {
      const data = await req.fetchTimeline(req.id);
      setTimeline(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'ไม่สามารถโหลดผังการอนุมัติได้');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !effectiveRequest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 transition-all flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B2046]/10 flex items-center justify-center text-[#0B2046]">
              <ShieldCheck className="w-5 h-5 text-[#0B2046]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  รายละเอียดเอกสารคำขอลา
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-medium">
                  {effectiveRequest.requestNo}
                </span>
              </div>
              {effectiveRequest.subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {effectiveRequest.subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* ข้อมูลเอกสารคำขอลา */}
          {leaveRequest && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                <FileText className="w-3.5 h-3.5 text-[#0B2046]" /> ข้อมูลคำขอลา
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-slate-600">
                <div>
                  <span className="text-slate-400">พนักงานผู้ขอ: </span>
                  <strong className="text-slate-800">{leaveRequest.employeeName}</strong>
                  {leaveRequest.departmentName && (
                    <span className="text-slate-500"> ({leaveRequest.departmentName})</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400">ประเภทการลา: </span>
                  <strong className="text-slate-800">{leaveRequest.leaveTypeName}</strong>
                </div>
                <div>
                  <span className="text-slate-400">ช่วงวันที่ลา: </span>
                  <span className="text-slate-800 font-medium">
                    {formatDateOnly(leaveRequest.startDate ?? leaveRequest.startDatetime)}
                    {(leaveRequest.endDate ?? leaveRequest.endDatetime) &&
                      (leaveRequest.endDate ?? leaveRequest.endDatetime) !==
                        (leaveRequest.startDate ?? leaveRequest.startDatetime) && (
                        <span> - {formatDateOnly(leaveRequest.endDate ?? leaveRequest.endDatetime)}</span>
                      )}{' '}
                    ({leaveRequest.leaveDays} วัน)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">ติดต่อระหว่างลา: </span>
                  <span className="text-slate-800">{leaveRequest.contactDuringLeave || '-'}</span>
                </div>
                {leaveRequest.reason && (
                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-slate-400">เหตุผลการลา: </span>
                    <span className="text-slate-800">{leaveRequest.reason}</span>
                  </div>
                )}
                {leaveRequest.documents && leaveRequest.documents.length > 0 && (
                  <div className="col-span-1 sm:col-span-2 flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400">เอกสารแนบ: </span>
                    <div className="flex flex-wrap gap-2">
                      {leaveRequest.documents.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() =>
                            handleDownloadDoc(leaveRequest.id, doc.id, doc.fileName || 'document')
                          }
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{doc.fileName || 'ดาวน์โหลดเอกสาร'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#0B2046]" />
              <p className="text-xs">กำลังโหลดข้อมูลผังการอนุมัติ...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{error}</span>
            </div>
          ) : timeline ? (
            <>
              {/* Flow Info Strip */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                <div>
                  <span className="text-slate-500">สายการอนุมัติ: </span>
                  <span className="font-bold text-slate-800">{timeline.flowName}</span>
                  <span className="ml-1 text-slate-400">({timeline.flowCode})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">สถานะรวม:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                      timeline.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : timeline.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : timeline.status === 'CANCELLED'
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {timeline.status === 'APPROVED'
                      ? 'อนุมัติครบถ้วน'
                      : timeline.status === 'REJECTED'
                      ? 'ปฏิเสธแล้ว'
                      : timeline.status === 'CANCELLED'
                      ? 'ยกเลิกคำขอ'
                      : `รอการอนุมัติ (ขั้นที่ ${timeline.currentStepNo || 1}/${timeline.totalSteps})`}
                  </span>
                </div>
              </div>

              {/* 1. Horizontal Stepper Pipeline (ตาม Pattern ของระบบ) */}
              <div>
                <div className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> แผนภาพลำดับการอนุมัติ (Sequential Pipeline)
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    {timeline.steps.map((step, idx) => {
                      const isCompleted = step.status === 'COMPLETED';
                      const isWaiting = step.status === 'WAITING';
                      const isRejected = step.status === 'REJECTED';
                      const isCancelled = step.status === 'CANCELLED';

                      return (
                        <React.Fragment key={step.stepNo}>
                          <div className="flex items-center gap-3">
                            {/* Step Badge */}
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : isRejected
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : isWaiting
                                  ? 'bg-amber-500 text-white shadow-xs ring-4 ring-amber-100 animate-pulse'
                                  : isCancelled
                                  ? 'bg-slate-400 text-white'
                                  : 'bg-slate-100 text-slate-500 border border-slate-300'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isRejected ? (
                                <XCircle className="w-4 h-4" />
                              ) : isCancelled ? (
                                <Ban className="w-4 h-4" />
                              ) : (
                                step.stepNo
                              )}
                            </div>

                            {/* Step Text */}
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                {step.approverTitle}
                              </div>
                              <div className="text-[11px] font-medium mt-0.5">
                                {isCompleted ? (
                                  <span className="text-emerald-600">อนุมัติแล้ว</span>
                                ) : isRejected ? (
                                  <span className="text-rose-600">ปฏิเสธ</span>
                                ) : isWaiting ? (
                                  <span className="text-amber-600 font-semibold">กำลังรอพิจารณา</span>
                                ) : (
                                  <span className="text-slate-400">รอลำดับถัดไป</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Arrow Connector */}
                          {idx < timeline.steps.length - 1 && (
                            <div className="hidden sm:flex items-center text-slate-300 px-1">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Step Details & Action History Log */}
              <div>
                <div className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> รายละเอียดและประวัติการลงความเห็น (Audit Trail)
                </div>
                <div className="space-y-3">
                  {timeline.steps.map((step) => {
                    const isCompleted = step.status === 'COMPLETED';
                    const isWaiting = step.status === 'WAITING';
                    const isRejected = step.status === 'REJECTED';

                    return (
                      <div
                        key={step.stepNo}
                        className={`p-4 rounded-xl border transition-all ${
                          isWaiting
                            ? 'bg-amber-50/40 border-amber-200'
                            : isCompleted
                            ? 'bg-emerald-50/20 border-emerald-200/70'
                            : isRejected
                            ? 'bg-rose-50/20 border-rose-200/70'
                            : 'bg-slate-50/40 border-slate-200/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#0B2046] text-white text-[10px] font-bold flex items-center justify-center">
                              {step.stepNo}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              ขั้นตอนที่ {step.stepNo}: {step.approverTitle}
                            </span>
                          </div>

                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : isWaiting
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200/70 text-slate-600'
                            }`}
                          >
                            {isCompleted
                              ? 'อนุมัติแล้ว'
                              : isRejected
                              ? 'ปฏิเสธ'
                              : isWaiting
                              ? 'กำลังรอพิจารณา'
                              : 'ยังไม่ถึงขั้นตอน'}
                          </span>
                        </div>

                        {/* Approver Details */}
                        <div className="mt-2.5 text-xs text-slate-600 space-y-1 pl-7">
                          {step.actionByEmployeeName && (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                ดำเนินการโดย: <strong className="text-slate-800">{step.actionByEmployeeName}</strong>
                              </span>
                            </div>
                          )}

                          {step.actionAt && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>วันและเวลา: {formatDateTime(step.actionAt)}</span>
                            </div>
                          )}

                          {step.comment && (
                            <div className="mt-1.5 p-2.5 bg-white rounded-lg border border-slate-200/80 text-slate-700 flex items-start gap-2">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium text-slate-500 text-[11px] block">ความเห็นผู้อนุมัติ:</span>
                                <span>{step.comment}</span>
                              </div>
                            </div>
                          )}

                          {isWaiting && (
                            <div className="text-amber-700 italic text-[11px]">
                              * คำขอกำลังรอการอนุมัติจากผู้มีสิทธิ์ในขั้นตอนนี้
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
