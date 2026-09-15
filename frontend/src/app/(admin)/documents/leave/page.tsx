'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Download,
  Calendar,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { leaveService } from '@/services/leaveService';
import { LeaveType, LeavePolicy, LeaveBalance, LeaveRequest } from '@/types/leave';
import { MyLeaveRequestForm } from '@/components/leave/MyLeaveRequestForm';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';

// ─── Helpers ─────────────────────────────────────────────────

const formatDate = (d?: string | null) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'รอการอนุมัติ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'ปฏิเสธแล้ว', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: <Ban className="w-3.5 h-3.5" /> },
};

// ─── Component ────────────────────────────────────────────────

export default function MyLeaveRequestPage() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmType;
    singleButton?: boolean;
    isLoading?: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({ isOpen: false, title: '', message: '' });
  const closeConfirm = () => setConfirmConfig((p) => ({ ...p, isOpen: false }));

  // ─── Fetch ────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [typesData, policiesData, balancesData, requestsData] = await Promise.all([
        leaveService.getLeaveTypes(),
        leaveService.getLeavePolicies(),
        user?.employeeId
          ? leaveService.getLeaveBalances({ employeeId: user.employeeId, year: currentYear })
          : Promise.resolve([]),
        leaveService.getMyLeaveRequests({ pageSize: 100 }),
      ]);
      setLeaveTypes(typesData.filter((t) => t.status === 'ACTIVE'));
      setLeavePolicies(policiesData);
      setBalances(balancesData);
      setRequests(requestsData);
    } catch (err) {
      console.error('Failed to load my leave data', err);
    } finally {
      setLoading(false);
    }
  }, [user?.employeeId, currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Actions ────────────────────────────────────────────────

  const handleCreate = async (payload: Parameters<typeof leaveService.createMyLeaveRequest>[0]) => {
    await leaveService.createMyLeaveRequest(payload);
    showToast('ยื่นคำขอลาสำเร็จ รอการอนุมัติจากฝ่ายบุคคล');
    fetchData();
  };

  const handleCancel = (req: LeaveRequest) => {
    setConfirmConfig({
      isOpen: true,
      singleButton: false,
      isLoading: false,
      title: 'ยกเลิกคำขอลา',
      message: `ยกเลิกคำขอลา "${req.leaveTypeName}" วันที่ ${formatDate(req.startDatetime)} - ${formatDate(req.endDatetime)} ใช่หรือไม่?`,
      confirmText: 'ยกเลิกคำขอ',
      cancelText: 'ปิด',
      type: 'danger',
      onConfirm: async () => {
        try {
          await leaveService.cancelMyLeaveRequest(req.id);
          closeConfirm();
          showToast('ยกเลิกคำขอลาสำเร็จ');
          fetchData();
        } catch (err: any) {
          closeConfirm();
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
        }
      },
    });
  };

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
      showToast('ไม่สามารถดาวน์โหลดเอกสารได้');
    }
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <Link href="/documents" className="hover:text-gray-600">ยื่นเอกสาร</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">เอกสารการลา</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">เอกสารการลา</h1>
        <p className="text-sm text-gray-500 mt-0.5">กรอกแบบฟอร์มยื่นคำขอลาและติดตามสถานะคำขอของคุณ</p>
      </div>

      {/* Leave Balance Cards */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {balances.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                <Wallet className="w-3.5 h-3.5" />
                <span className="truncate">{b.leaveTypeName}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {b.netRemainingLeaveDays} <span className="text-sm font-normal text-gray-400">วัน</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">ใช้ไปแล้ว {b.usedDays} วัน</div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* ยื่นคำขอลา — ฟอร์มแบบเต็มหน้าจอ */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">
          <div className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            กำลังโหลดข้อมูล...
          </div>
        </div>
      ) : (
        <MyLeaveRequestForm
          leaveTypes={leaveTypes}
          leavePolicies={leavePolicies}
          balances={balances}
          requests={requests}
          profile={{
            fullName: user?.fullName ?? '-',
            positionTitle: balances[0]?.positionTitle,
            departmentName: balances[0]?.departmentName,
          }}
          onSubmit={handleCreate}
        />
      )}

      {/* Table: คำขอลาของฉัน */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">คำขอลาของฉัน</h3>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังโหลดคำขอลา...
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">คุณยังไม่เคยยื่นคำขอลา</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ประเภทลา</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">วันที่ลา</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">จำนวนวัน</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะ</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">เอกสารแนบ</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req) => {
                  const statusConf = STATUS_CONFIG[req.status] ?? STATUS_CONFIG['PENDING'];
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-700">{req.leaveTypeName ?? '-'}</td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-300" />
                          <span>{formatDate(req.startDatetime)}</span>
                          {req.startDatetime !== req.endDatetime && (
                            <span className="text-gray-400">– {formatDate(req.endDatetime)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-gray-900">{req.leaveDays}</span>
                        <span className="text-gray-400 text-xs ml-1">วัน</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConf.color}`}>
                          {statusConf.icon}
                          {statusConf.label}
                        </span>
                        {req.rejectReason && (
                          <div className="text-xs text-red-400 mt-1 max-w-36 truncate" title={req.rejectReason}>
                            เหตุผล: {req.rejectReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {req.documents && req.documents.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {req.documents.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => handleDownloadDoc(req.id, doc.id, doc.fileName ?? 'attachment')}
                                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <Download className="w-3.5 h-3.5" />
                                {doc.fileName}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">ไม่มีเอกสาร</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {req.status === 'PENDING' ? (
                          <button
                            onClick={() => handleCancel(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-all"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            ยกเลิกคำขอ
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText ?? 'ยืนยัน'}
        cancelText={confirmConfig.cancelText ?? 'ยกเลิก'}
        type={confirmConfig.type}
        singleButton={confirmConfig.singleButton ?? false}
        isLoading={confirmConfig.isLoading ?? false}
        onConfirm={confirmConfig.onConfirm ?? (() => {})}
        onClose={closeConfirm}
      />
    </div>
  );
}
