'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Upload,
  FileText,
  Trash2,
  GitPullRequest,
  Archive,
  Info,
} from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { organizationService } from '@/services/organizationService';
import { transferService } from '@/services/transferService';
import { Employee } from '@/types/employee';
import { Department, Position } from '@/types/organization';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';

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
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [recordType, setRecordType] = useState<'REQUEST' | 'ARCHIVE'>('REQUEST');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [transferType, setTransferType] = useState<string>('DEPARTMENT_TRANSFER');
  const [fromDisplay, setFromDisplay] = useState<string>('');
  const [toDepartmentId, setToDepartmentId] = useState<string>('');
  const [toPositionId, setToPositionId] = useState<string>('');
  const [toManagerId, setToManagerId] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [orderNo, setOrderNo] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [autoApprove, setAutoApprove] = useState<boolean>(false);

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
          const [emps, depts, poss] = await Promise.all([
            employeeService.getAll(),
            organizationService.getDepartments(),
            organizationService.getPositions(),
          ]);
          setEmployees(emps || []);
          setDepartments(depts || []);
          setPositions(poss || []);
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
    if (!effectiveDate) {
      setError('กรุณาระบุวันที่มีผล');
      return;
    }
    if (recordType === 'ARCHIVE' && !orderNo.trim()) {
      setError('กรุณาระบุเลขที่คำสั่งย้ายสำหรับการบันทึกย้อนหลัง');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const targetDept = departments.find((d) => d.id === Number(toDepartmentId));

      await transferService.create({
        employeeId: Number(selectedEmployeeId),
        transferType,
        toDivisionId: targetDept?.divisionId,
        toDepartmentId: Number(toDepartmentId),
        toPositionId: Number(toPositionId),
        toManagerId: toManagerId ? Number(toManagerId) : undefined,
        effectiveDate,
        orderNo: orderNo.trim() || undefined,
        reason: reason.trim() || undefined,
        autoApprove: recordType === 'ARCHIVE' ? true : autoApprove,
        recordType,
        documentName: attachedFile ? attachedFile.name : undefined,
        documentContentType: attachedFile ? attachedFile.type : undefined,
        documentBase64: fileBase64 || undefined,
        documentSize: attachedFile ? attachedFile.size : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create transfer request:', err);
      setError(err.response?.data?.message || err.message || 'ไม่สามารถสร้างคำขอย้ายได้');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 tracking-tight">
              {recordType === 'ARCHIVE' ? 'บันทึกคำสั่งย้ายย้อนหลัง' : 'สร้างคำขอย้าย / เลื่อนตำแหน่ง'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {recordType === 'ARCHIVE'
                ? 'บันทึกประวัติคำสั่งแต่งตั้ง/โยกย้าย พร้อมแนบไฟล์เอกสาร'
                : 'ยื่นคำขอย้ายแผนกเพื่อดำเนินการตามสายการอนุมัติ'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-7 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Segmented Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => {
                setRecordType('REQUEST');
                setAutoApprove(false);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                recordType === 'REQUEST'
                  ? 'bg-white text-[#0B2046] shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>ยื่นขออนุมัติตามสายงาน</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRecordType('ARCHIVE');
                setAutoApprove(true);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                recordType === 'ARCHIVE'
                  ? 'bg-white text-[#0B2046] shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>บันทึกคำสั่งย้อนหลัง</span>
            </button>
          </div>

          {/* Mode Explanatory Banner */}
          {recordType === 'REQUEST' ? (
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">ระบบส่งต่อสายการอนุมัติ (Workflow):</span>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  คำขอจะถูกส่งให้หัวหน้างานและผู้มีอำนาจอนุมัติตามลำดับขั้น เช่นเดียวกับใบลา
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
              <Archive className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">บันทึกคำสั่งแต่งตั้ง/โยกย้ายย้อนหลัง:</span>
                <p className="text-emerald-700 text-[11px] mt-0.5">
                  บันทึกข้อมูลและแนบไฟล์คำสั่งเป็นหลักฐาน ระบบจะอัปเดตประวัติตำแหน่งงานทันทีโดยไม่ต้องรอขั้นตอนอนุมัติ
                </p>
              </div>
            </div>
          )}

          {/* 1. พนักงาน * (Searchable Combobox) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">
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

          {/* 2. ประเภทคำขอ * */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">
              ประเภทคำขอ <span className="text-rose-500">*</span>
            </label>
            <select
              value={transferType}
              onChange={(e) => setTransferType(e.target.value)}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
              required
            >
              <option value="DEPARTMENT_TRANSFER">ย้ายแผนก</option>
              <option value="PROMOTION">เลื่อนตำแหน่ง</option>
              <option value="TRANSFER_AND_PROMOTION">โอนย้ายและเลื่อนตำแหน่ง</option>
              <option value="PROMOTION_AND_SUPERVISOR">เลื่อนตำแหน่ง + เปลี่ยนหัวหน้างาน</option>
            </select>
          </div>

          {/* 3. จากตำแหน่ง/แผนกเดิม (Auto-filled read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">
              จากตำแหน่ง/แผนกเดิม
            </label>
            <input
              type="text"
              readOnly
              value={fromDisplay}
              placeholder="เช่น ฝ่ายขาย"
              className="w-full h-10 px-3.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none cursor-not-allowed"
            />
          </div>

          {/* 4. ไปยัง * (แผนก + ตำแหน่งเป้าหมาย) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 block">
              ไปยัง <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <select
                value={toDepartmentId}
                onChange={(e) => {
                  setToDepartmentId(e.target.value);
                  setToPositionId('');
                }}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                required
              >
                <option value="">เลือกแผนกเป้าหมาย...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.departmentName}
                  </option>
                ))}
              </select>

              <select
                value={toPositionId}
                onChange={(e) => setToPositionId(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                required
              >
                <option value="">เลือกตำแหน่งเป้าหมาย...</option>
                {filteredPositions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.positionName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. วันที่มีผล และ เลขที่คำสั่ง */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 block">
                วันที่มีผล <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full h-10 pl-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  required
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 block">
                เลขที่คำสั่ง {recordType === 'ARCHIVE' && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder={recordType === 'ARCHIVE' ? 'เช่น คำสั่งที่ 15/2569' : 'เช่น คำสั่งที่ 15/2569 (ถ้ามี)'}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                required={recordType === 'ARCHIVE'}
              />
            </div>
          </div>

          {/* 6. หัวหน้างานสายตรงเป้าหมาย (ถ้ามี) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">
              หัวหน้างานสายตรงใหม่ (ถ้ามี)
            </label>
            <EmployeeSelect
              employees={employees.filter((emp) => emp.id !== Number(selectedEmployeeId))}
              value={toManagerId ? Number(toManagerId) : ''}
              onChange={(empId) => setToManagerId(empId ? String(empId) : '')}
              placeholder="ไม่ระบุ / คงเดิม (พิมพ์ค้นหา...)"
              disabled={loadingData}
              required={false}
            />
          </div>

          {/* 7. อัปโหลดไฟล์เอกสารคำสั่งย้าย (สำหรับ RecordType = ARCHIVE หรือแนบประกอบคำขอ) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
              <span>
                เอกสารคำสั่งแต่งตั้ง/โยกย้าย {recordType === 'ARCHIVE' ? '(แนบไฟล์หลักฐาน)' : '(แนบเอกสารเพิ่มเติมถ้ามี)'}
              </span>
              <span className="text-[11px] text-slate-400 font-normal">PDF, JPG, PNG (ไม่เกิน 10MB)</span>
            </label>

            {!attachedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-[#0B2046]/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs text-slate-700 font-medium">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                <p className="text-[11px] text-slate-400 mt-0.5">ไฟล์คำสั่งแต่งตั้ง, ประกาศ หรือหนังสือส่งตัว</p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-slate-800 truncate">{attachedFile.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {(attachedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                  title="ลบไฟล์"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 8. เหตุผล / หมายเหตุ */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">
              เหตุผลการโอนย้าย / หมายเหตุ
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลความจำเป็นในการโยกย้าย..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            />
          </div>

          {/* 9. ตัวเลือกมีผลทันที (แสดงเฉพาะใน REQUEST mode เพื่อให้สิทธิ์ HR ข้าม workflow ได้) */}
          {recordType === 'REQUEST' && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoApprove"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="w-4 h-4 text-[#0B2046] border-slate-300 rounded focus:ring-[#0B2046]"
              />
              <label htmlFor="autoApprove" className="text-xs text-slate-600 cursor-pointer">
                อนุมัติและปรับปรุงประวัติตำแหน่งงานทันที (Auto-Approve ข้ามสายการอนุมัติ)
              </label>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-medium text-slate-600 bg-slate-200/70 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-medium text-white bg-[#0B2046] hover:bg-[#081836] transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{recordType === 'ARCHIVE' ? 'บันทึกคำสั่งย้อนหลัง' : 'ส่งคำขอย้าย'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
