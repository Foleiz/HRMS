'use client';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { ModalShell, Button } from '@/components/ui';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AlertCircle, FileText, Trash2, ArrowRight, ArrowDown, Paperclip, Info } from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { organizationService } from '@/services/organizationService';
import { transferService } from '@/services/transferService';
import { Employee } from '@/types/employee';
import { Department, Position, EmployeeLevel } from '@/types/organization';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TransferTypeBadges, classifyTransfer } from './TransferTypeBadges';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const labelCls = 'block text-xs font-semibold text-slate-700 dark:text-slate-300';
const inputCls =
  'w-full h-11 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400';

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <dt className="text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
      <dd className="m-0 font-semibold text-slate-800 dark:text-slate-200 text-right min-w-0 break-words">{value || '-'}</dd>
    </div>
  );
}

export default function CreateTransferModal({ isOpen, onClose, onSuccess }: CreateTransferModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [levels, setLevels] = useState<EmployeeLevel[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [toDepartmentId, setToDepartmentId] = useState<string>('');
  const [toPositionId, setToPositionId] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('');

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSelectedEmployeeId('');
    setToDepartmentId('');
    setToPositionId('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setReason('');
    setAttachedFile(null);
    setFileBase64('');
    const load = async () => {
      try {
        setLoadingData(true);
        const [emps, depts, poss, lvls] = await Promise.all([
          employeeService.getAll(),
          organizationService.getDepartments(),
          organizationService.getPositions(),
          organizationService.getLevels().catch(() => [] as EmployeeLevel[]),
        ]);
        setEmployees(emps || []);
        setDepartments(depts || []);
        setPositions(poss || []);
        setLevels(lvls || []);
      } catch (err: any) {
        setError(err.message || 'ไม่สามารถโหลดข้อมูลพนักงานและแผนกได้');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [isOpen]);

  const employee = employees.find((e) => e.id === Number(selectedEmployeeId));
  const rankOf = (positionId?: number | null) => {
    const pos = positions.find((p) => p.id === positionId);
    const lvl = levels.find((l) => l.id === pos?.employeeLevelId);
    return lvl?.levelRank ?? null;
  };
  const levelNameOf = (positionId?: number | null) => positions.find((p) => p.id === positionId)?.levelName;

  const targetDept = departments.find((d) => d.id === Number(toDepartmentId));
  const targetPos = positions.find((p) => p.id === Number(toPositionId));
  const filteredPositions = toDepartmentId ? positions.filter((p) => p.departmentId === Number(toDepartmentId)) : [];

  const types = useMemo(
    () =>
      employee && toDepartmentId && toPositionId
        ? classifyTransfer({
            fromDepartmentId: employee.departmentId ?? null,
            toDepartmentId: Number(toDepartmentId),
            fromPositionId: employee.positionId ?? null,
            toPositionId: Number(toPositionId),
            fromRank: rankOf(employee.positionId),
            toRank: rankOf(Number(toPositionId)),
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employee, toDepartmentId, toPositionId, positions, levels]
  );
  const ready = !!employee && !!toDepartmentId && !!toPositionId;
  const noChange = ready && types.length === 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('ขนาดไฟล์เอกสารต้องไม่เกิน 10MB');
      return;
    }
    setAttachedFile(file);
    const reader = new FileReader();
    reader.onload = () => setFileBase64(((reader.result as string) || '').split(',')[1] || '');
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setAttachedFile(null);
    setFileBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return setError('กรุณาเลือกพนักงาน');
    if (!toDepartmentId) return setError('กรุณาเลือกแผนกปลายทาง');
    if (!toPositionId) return setError('กรุณาเลือกตำแหน่งปลายทาง');
    if (noChange) return setError('แผนกและตำแหน่งปลายทางเหมือนปัจจุบัน ไม่มีการเปลี่ยนแปลงให้บันทึก');
    if (!effectiveDate) return setError('กรุณาระบุวันที่มีผล');
    try {
      setSubmitting(true);
      setError(null);
      await transferService.create({
        employeeId: Number(selectedEmployeeId),
        toDivisionId: targetDept?.divisionId,
        toDepartmentId: Number(toDepartmentId),
        toPositionId: Number(toPositionId),
        effectiveDate,
        reason: reason.trim() || undefined,
        autoApprove: true,
        recordType: 'ARCHIVE',
        documentName: attachedFile ? attachedFile.name : undefined,
        documentContentType: attachedFile ? attachedFile.type : undefined,
        documentBase64: fileBase64 || undefined,
        documentSize: attachedFile ? attachedFile.size : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'ไม่สามารถบันทึกคำสั่งโยกย้ายได้');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        <ModalHeader title="บันทึกคำสั่งแต่งตั้ง / โยกย้าย" onClose={onClose} />

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 bg-slate-50/70 dark:bg-slate-900/40">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className={labelCls}>
                พนักงาน <span className="text-rose-500">*</span>
              </label>
              <EmployeeSelect
                employees={employees}
                value={selectedEmployeeId ? Number(selectedEmployeeId) : ''}
                onChange={(empId) => {
                  setSelectedEmployeeId(empId ? String(empId) : '');
                  setToDepartmentId('');
                  setToPositionId('');
                }}
                placeholder="เลือกพนักงาน หรือพิมพ์ค้นหา..."
                disabled={loadingData}
                required
              />
            </div>

            {/* ปัจจุบัน → ปลายทาง */}
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] gap-3 items-stretch">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ปัจจุบัน</div>
                {employee ? (
                  <dl className="m-0 divide-y divide-slate-100 dark:divide-slate-700/60">
                    <InfoRow label="ฝ่าย" value={employee.divisionName} />
                    <InfoRow label="แผนก" value={employee.departmentName} />
                    <InfoRow label="ตำแหน่ง" value={employee.positionName} />
                    <InfoRow label="ระดับ" value={levelNameOf(employee.positionId)} />
                  </dl>
                ) : (
                  <p className="m-0 py-6 text-center text-xs text-slate-400">เลือกพนักงานเพื่อดูตำแหน่งปัจจุบัน</p>
                )}
              </div>

              <div className="flex items-center justify-center text-primary dark:text-blue-300">
                <ArrowRight className="w-6 h-6 hidden md:block" strokeWidth={2.2} />
                <ArrowDown className="w-6 h-6 md:hidden" strokeWidth={2.2} />
              </div>

              <div className="p-4 rounded-xl border-[1.5px] border-primary/70 dark:border-blue-400/60 bg-white dark:bg-slate-800 text-sm space-y-3">
                <div className="text-xs font-bold text-primary dark:text-blue-300">ปลายทาง</div>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    แผนก <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect
                    className="w-full"
                    value={toDepartmentId}
                    onChange={(e) => {
                      setToDepartmentId(e.target.value);
                      setToPositionId('');
                    }}
                    disabled={!employee}
                  >
                    <option value="">เลือกแผนก...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentName}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    ตำแหน่ง <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect
                    className="w-full"
                    value={toPositionId}
                    onChange={(e) => setToPositionId(e.target.value)}
                    disabled={!toDepartmentId}
                  >
                    <option value="">{toDepartmentId ? 'เลือกตำแหน่ง...' : 'เลือกแผนกก่อน'}</option>
                    {filteredPositions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.positionName}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
                <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
                  ฝ่าย: <b className="text-slate-800 dark:text-slate-200">{targetDept?.divisionName || '-'}</b> · ระดับ:{' '}
                  <b className="text-slate-800 dark:text-slate-200">{targetPos?.levelName || '-'}</b>
                </p>
              </div>
            </div>

            {/* ประเภท — ระบบจัดให้ */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ประเภทการปรับเปลี่ยน</span>
              {!ready ? (
                <span className="text-xs text-slate-400">เลือกพนักงานและปลายทาง แล้วระบบจะระบุประเภทให้</span>
              ) : noChange ? (
                <span className="text-xs text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> ปลายทางเหมือนตำแหน่งปัจจุบัน
                </span>
              ) : (
                <TransferTypeBadges types={types} size="md" />
              )}
              <span className="text-[11px] text-slate-400 sm:ml-auto">ระบบเลือกให้จากการเปลี่ยนแผนกและระดับตำแหน่ง</span>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>
                วันที่มีผล <span className="text-rose-500">*</span>
              </label>
              <ThaiDatePicker value={effectiveDate} onChange={setEffectiveDate} placeholder="เลือกวันที่มีผล" />
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>เหตุผล / หมายเหตุ</label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุเหตุผลการโยกย้าย..."
                className="w-full text-sm p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl outline-none resize-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>

            <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
            {attachedFile ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{attachedFile.name}</p>
                  <p className="m-0 text-xs text-slate-500">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  aria-label="ลบไฟล์"
                  className="w-9 h-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                <Paperclip className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0 text-sm">
                  <b className="text-slate-800 dark:text-slate-200">ไฟล์คำสั่งแต่งตั้ง/โยกย้าย</b>{' '}
                  <span className="text-xs text-slate-500">· PDF, JPG, PNG ไม่เกิน 10 MB (ถ้ามี)</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  แนบไฟล์
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary" loading={submitting} disabled={noChange}>
              บันทึกคำสั่ง
            </Button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
