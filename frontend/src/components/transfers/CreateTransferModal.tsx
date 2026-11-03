'use client';
import { ModalHeader } from '@/components/ui/ModalHeader';

import { ModalShell, Button } from '@/components/ui';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Upload,
  FileText,
  Trash2,
} from 'lucide-react';
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

export default function CreateTransferModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTransferModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [levels, setLevels] = useState<EmployeeLevel[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [fromDisplay, setFromDisplay] = useState<string>('');
  const [toDepartmentId, setToDepartmentId] = useState<string>('');
  const [toPositionId, setToPositionId] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState<string>('');

  // File state for document archiving
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load master data on open
  useEffect(() => {
    if (isOpen) {
      const loadOptions = async () => {
        try {
          setLoadingData(true);
          setError(null);
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
          console.error('Failed to load modal master data:', err);
          setError(err.message || 'ไม่สามารถโหลดข้อมูลพนักงานและแผนกได้');
        } finally {
          setLoadingData(false);
        }
      };
      loadOptions();
    }
  }, [isOpen]);

  // When selected employee changes, update "จากตำแหน่ง/แผนกเดิม"
  useEffect(() => {
    if (!selectedEmployeeId) {
      setFromDisplay('');
      return;
    }
    const emp = employees.find((e) => e.id === Number(selectedEmployeeId));
    if (emp) {
      const dept = emp.departmentName || '';
      const pos = emp.positionName || '';
      if (dept && pos) {
        setFromDisplay(`${dept} (${pos})`);
      } else if (dept) {
        setFromDisplay(dept);
      } else if (pos) {
        setFromDisplay(pos);
      } else {
        setFromDisplay('ยังไม่มีข้อมูลสังกัดเดิม');
      }
    }
  }, [selectedEmployeeId, employees]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('ขนาดไฟล์เอกสารต้องไม่เกิน 10MB');
      return;
    }

    setAttachedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setAttachedFile(null);
    setFileBase64('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter positions by selected department
  const filteredPositions = toDepartmentId
    ? positions.filter((p) => p.departmentId === Number(toDepartmentId))
    : positions;

  // ประเภทการปรับเปลี่ยน — ระบบจัดให้จากการเทียบแผนกและระดับตำแหน่ง (backend คำนวณซ้ำตอนบันทึก)
  const rankOf = (positionId?: number | null) => {
    const pos = positions.find((p) => p.id === positionId);
    return levels.find((l) => l.id === pos?.employeeLevelId)?.levelRank ?? null;
  };
  const selectedEmployee = employees.find((e) => e.id === Number(selectedEmployeeId));
  const ready = !!selectedEmployee && !!toDepartmentId && !!toPositionId;
  const transferTypes = useMemo(
    () =>
      ready
        ? classifyTransfer({
            fromDepartmentId: selectedEmployee?.departmentId ?? null,
            toDepartmentId: Number(toDepartmentId),
            fromPositionId: selectedEmployee?.positionId ?? null,
            toPositionId: Number(toPositionId),
            fromRank: rankOf(selectedEmployee?.positionId),
            toRank: rankOf(Number(toPositionId)),
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, selectedEmployee, toDepartmentId, toPositionId, positions, levels]
  );
  const noChange = ready && transferTypes.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setError('กรุณาเลือกพนักงาน');
      return;
    }
    if (!toDepartmentId) {
      setError('กรุณาเลือกแผนกเป้าหมาย');
      return;
    }
    if (!toPositionId) {
      setError('กรุณาเลือกตำแหน่งเป้าหมาย');
      return;
    }
    if (noChange) {
      setError('แผนกและตำแหน่งปลายทางเหมือนปัจจุบัน ไม่มีการเปลี่ยนแปลงให้บันทึก');
      return;
    }
    if (!effectiveDate) {
      setError('กรุณาระบุวันที่มีผล');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);

      const targetDept = departments.find((d) => d.id === Number(toDepartmentId));

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
      console.error('Failed to create transfer order:', err);
      setError(err.response?.data?.message || err.message || 'ไม่สามารถบันทึกคำสั่งโยกย้ายได้');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700/60 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <ModalHeader
          title="บันทึกคำสั่งโยกย้ายพนักงาน"
          onClose={onClose}
        />

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-7 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. พนักงาน * (Searchable Combobox) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              พนักงาน <span className="text-rose-500">*</span>
            </label>
            <EmployeeSelect
              employees={employees}
              value={selectedEmployeeId ? Number(selectedEmployeeId) : ''}
              onChange={(empId) => setSelectedEmployeeId(empId ? String(empId) : '')}
              placeholder="เลือกพนักงาน หรือพิมพ์ค้นหา..."
              disabled={loadingData}
              required
            />
          </div>

          {/* 3. จากตำแหน่ง/แผนกเดิม (Auto-filled read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              จากตำแหน่ง/แผนกเดิม
            </label>
            <input
              type="text"
              readOnly
              value={fromDisplay}
              placeholder="เช่น ฝ่ายขาย"
              className="w-full h-10 px-3.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 focus:outline-none cursor-not-allowed dark:bg-slate-700 dark:text-slate-300"
            />
          </div>

          {/* 4. ไปยัง * (แผนก + ตำแหน่งเป้าหมาย) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              ไปยัง <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <CustomSelect
                value={toDepartmentId}
                onChange={(e) => {
                  const nextDeptId = e.target.value;
                  setToDepartmentId(nextDeptId);
                  setToPositionId('');
                }}
                className="w-full"
              >
                <option value="">เลือกแผนกเป้าหมาย...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.departmentName}
                  </option>
                ))}
              </CustomSelect>

              <CustomSelect
                value={toPositionId}
                onChange={(e) => setToPositionId(e.target.value)}
                className="w-full"
              >
                <option value="">เลือกตำแหน่งเป้าหมาย...</option>
                {filteredPositions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.positionName}
                  </option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* ประเภทการปรับเปลี่ยน — ระบบระบุให้อัตโนมัติ */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">ประเภทการปรับเปลี่ยน</label>
            <div className="min-h-10 px-3.5 py-2 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center">
              {!ready ? (
                <span className="text-xs text-slate-400">ระบบระบุให้หลังเลือกพนักงานและปลายทาง</span>
              ) : noChange ? (
                <span className="text-xs text-amber-700 dark:text-amber-300">ปลายทางเหมือนตำแหน่งปัจจุบัน</span>
              ) : (
                <TransferTypeBadges types={transferTypes} />
              )}
            </div>
          </div>

          {/* 5. วันที่มีผล */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              วันที่มีผล <span className="text-rose-500">*</span>
            </label>
            <ThaiDatePicker
              value={effectiveDate}
              onChange={setEffectiveDate}
              placeholder="เลือกวันที่มีผล"
              className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dark:focus:border-blue-500"
            />
          </div>

          {/* หัวหน้ามาจากทีมของพนักงาน — ไม่ต้องเลือกหัวหน้างานในการโยกย้าย */}

          {/* 7. อัปโหลดไฟล์เอกสารคำสั่งแต่งตั้ง/โยกย้าย */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">แนบเอกสารโยกย้ายพนักงาน</label>

            {!attachedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-slate-400 dark:text-slate-500 mx-auto mb-1.5" />
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">PDF, JPG, PNG (ไม่เกิน 10MB)</p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{attachedFile.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {(attachedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="ลบไฟล์"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 8. เหตุผล / หมายเหตุ */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              เหตุผลการโอนย้าย / หมายเหตุ
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลความจำเป็นในการโยกย้าย..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dark:focus:border-blue-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
            >
              บันทึก
            </Button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
