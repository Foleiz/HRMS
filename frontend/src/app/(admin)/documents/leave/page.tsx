'use client';

import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { leaveService } from '@/services/leaveService';
import { LeaveType, LeavePolicy, LeaveBalance, LeaveRequest, CreateMyLeaveRequestPayload } from '@/types/leave';
import { MyLeaveRequestForm, MyLeaveRequestFormHandle } from '@/components/leave/MyLeaveRequestForm';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

// ─── Component ────────────────────────────────────────────────

// useSearchParams() ต้องอยู่ภายใต้ Suspense boundary ตามข้อกำหนดของ Next.js App Router
export default function MyLeaveRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">
          <div className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            กำลังโหลดข้อมูล...
          </div>
        </div>
      }
    >
      <MyLeaveRequestPageContent />
    </Suspense>
  );
}

function MyLeaveRequestPageContent() {
  const { user } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'ยื่นเอกสาร', page: 'ยื่นคำขอลา' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // ถ้ามาจากหน้า "ประวัติเอกสาร" พร้อม ?draftId=... ให้โหลดแบบร่างเดิมมาเติมในฟอร์มต่อ
  const draftIdParam = searchParams.get('draftId');
  const draftIdNum = draftIdParam ? Number(draftIdParam) : undefined;

  // ปุ่ม "ล้างฟอร์ม" บน header เรียกใช้งานฟอร์มผ่าน ref แทนการมีปุ่มซ้ำอยู่ในฟอร์มด้านล่าง
  const formRef = useRef<MyLeaveRequestFormHandle>(null);

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

  // ─── Fetch ────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // ใช้ allSettled แทน all — ถ้า request ใดรายการหนึ่งพัง (เช่น /leave-requests/my)
      // จะได้ไม่ทำให้ผลลัพธ์ของรายการอื่นที่โหลดสำเร็จ (เช่น ประเภทการลา) หายไปด้วย
      const [typesRes, policiesRes, balancesRes, requestsRes] = await Promise.allSettled([
        leaveService.getLeaveTypes(),
        leaveService.getLeavePolicies(),
        user?.employeeId
          ? leaveService.getLeaveBalances({ employeeId: user.employeeId, year: currentYear })
          : Promise.resolve([]),
        leaveService.getMyLeaveRequests({ pageSize: 100 }),
      ]);

      if (typesRes.status === 'fulfilled') {
        setLeaveTypes(typesRes.value.filter((t) => t.status === 'ACTIVE'));
      } else {
        console.error('Failed to load leave types', typesRes.reason);
      }
      if (policiesRes.status === 'fulfilled') {
        setLeavePolicies(policiesRes.value);
      } else {
        console.error('Failed to load leave policies', policiesRes.reason);
      }
      if (balancesRes.status === 'fulfilled') {
        setBalances(balancesRes.value);
      } else {
        console.error('Failed to load leave balances', balancesRes.reason);
      }
      if (requestsRes.status === 'fulfilled') {
        setRequests(requestsRes.value);
      } else {
        console.error('Failed to load my leave requests', requestsRes.reason);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.employeeId, currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // แบบร่างที่กำลังแก้ไขต่อ (ถ้ามาจากหน้าประวัติเอกสารพร้อม ?draftId=...)
  const initialDraft = useMemo(
    () => (draftIdNum ? requests.find((r) => r.id === draftIdNum && r.status === 'DRAFT') : undefined),
    [requests, draftIdNum]
  );

  // ─── Actions ────────────────────────────────────────────────

  const handleCreate = async (payload: CreateMyLeaveRequestPayload, draftId?: number) => {
    if (draftId) {
      // ยื่นจริงจากแบบร่างเดิม — อัปเดตใบเดิมให้เปลี่ยนสถานะเป็นรออนุมัติ แทนที่จะสร้างใบใหม่
      await leaveService.updateMyLeaveRequest(draftId, { ...payload, saveAsDraft: false });
    } else {
      await leaveService.createMyLeaveRequest({ ...payload, saveAsDraft: false });
    }
    showToast('ยื่นคำขอลาสำเร็จ รอการอนุมัติจากฝ่ายบุคคล');
    router.replace('/documents/leave');
    fetchData();
  };

  const handleSaveDraft = async (payload: CreateMyLeaveRequestPayload, draftId?: number): Promise<LeaveRequest> => {
    const saved = draftId
      ? await leaveService.updateMyLeaveRequest(draftId, { ...payload, saveAsDraft: true })
      : await leaveService.createMyLeaveRequest({ ...payload, saveAsDraft: true });
    showToast('บันทึกแบบร่างสำเร็จ');
    fetchData();
    return saved;
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* เมนูย่อยในตัว — สลับไปมาระหว่าง "รายการเอกสาร" กับ "ประวัติเอกสาร" เหมือนเมนู "พนักงาน" */}
      {/* คงรูปแบบเดียวกันไว้ทุกหน้าในหมวด "ยื่นเอกสาร" รวมถึงหน้าฟอร์มย่อยนี้ด้วย ไม่ใช้ breadcrumb แบบเดิมซ้อนแยกต่างหาก */}
      <DocumentsSubNav />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">เอกสารการลา</h1>
          <p className="text-sm text-gray-500 mt-0.5">กรอกแบบฟอร์มยื่นคำขอลา ติดตามสถานะได้ที่หน้าประวัติเอกสาร</p>
        </div>
        <button
          type="button"
          onClick={() => formRef.current?.reset()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-medium transition-all shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          ล้างฟอร์ม
        </button>
      </div>

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
          ref={formRef}
          key={draftIdNum ?? 'new'}
          leaveTypes={leaveTypes}
          leavePolicies={leavePolicies}
          balances={balances}
          requests={requests}
          profile={{
            fullName: user?.fullName ?? '-',
            positionTitle: balances[0]?.positionTitle,
            departmentName: balances[0]?.departmentName,
          }}
          initialDraft={initialDraft}
          onSubmit={handleCreate}
          onSaveDraft={handleSaveDraft}
        />
      )}
    </div>
  );
}
