'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Eye,
  Upload,
  Trash2,
  Paperclip,
  ExternalLink,
  RefreshCw,
  FileCheck,
  User,
  Building,
  Briefcase,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Maximize2,
} from 'lucide-react';
import { EmploymentContract } from '@/types/contract';
import { contractService } from '@/services/contractService';
import { useToast } from '@/context/ToastContext';

interface ContractDetailModalProps {
  contract: EmploymentContract | null;
  isOpen: boolean;
  onClose: () => void;
  onTerminate: (id: number, reason: string) => Promise<void>;
  onUpdateContract?: (updated: EmploymentContract) => void;
}

export default function ContractDetailModal({
  contract,
  isOpen,
  onClose,
  onTerminate,
  onUpdateContract,
}: ContractDetailModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for current contract (allows immediate UI updates when attaching/deleting docs)
  const [currentContract, setCurrentContract] = useState<EmploymentContract | null>(contract);

  // Terminate form state
  const [showTerminateForm, setShowTerminateForm] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [isTerminating, setIsTerminating] = useState(false);

  // Document upload state
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Document preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [previewMimeType, setPreviewMimeType] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Sync prop changes
  useEffect(() => {
    setCurrentContract(contract);
    setShowTerminateForm(false);
    setTerminateReason('');
    // Clean up preview URL if any
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [contract, isOpen]);

  if (!isOpen || !currentContract) return null;

  // Handle Terminate Contract
  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminateReason.trim()) {
      toast.warning('กรุณาระบุเหตุผลในการสิ้นสุดสัญญา');
      return;
    }
    try {
      setIsTerminating(true);
      await onTerminate(currentContract.id, terminateReason.trim());
      setShowTerminateForm(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถสิ้นสุดสัญญาได้');
    } finally {
      setIsTerminating(false);
    }
  };

  // Handle Upload or Replace Document
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('ไฟล์มีขนาดเกิน 10 MB กรุณาเลือกไฟล์ใหม่');
      return;
    }

    try {
      setIsUploadingDoc(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const updated = await contractService.uploadDocument(currentContract.id, base64Data, file.name);
          setCurrentContract(updated);
          if (onUpdateContract) onUpdateContract(updated);
          toast.success(`แนบเอกสาร "${file.name}" เรียบร้อยแล้ว`);
        } catch (uploadErr: any) {
          toast.error(uploadErr.message || 'ไม่สามารถอัปโหลดเอกสารสัญญาได้');
        } finally {
          setIsUploadingDoc(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingDoc(false);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์');
    }
  };

  // Handle Delete Document
  const handleDeleteDocument = async () => {
    if (!window.confirm('คุณต้องการลบไฟล์เอกสารสัญญาจ้างนี้ออกจากระบบใช่หรือไม่?')) {
      return;
    }

    try {
      setIsDeletingDoc(true);
      const updated = await contractService.deleteDocument(currentContract.id);
      setCurrentContract(updated);
      if (onUpdateContract) onUpdateContract(updated);
      toast.success('ลบเอกสารสัญญาเรียบร้อยแล้ว');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setIsPreviewOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถลบเอกสารสัญญาได้');
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Handle Download Document
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const { blob, fileName } = await contractService.getDocumentBlob(currentContract.id, false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentContract.documentFileName || fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('เริ่มการดาวน์โหลดเอกสารสัญญา');
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถดาวน์โหลดเอกสารสัญญาได้');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Preview Document
  const handleOpenPreview = async () => {
    try {
      setIsLoadingPreview(true);
      const { blob, fileName, mimeType } = await contractService.getDocumentBlob(currentContract.id, true);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewFileName(currentContract.documentFileName || fileName);
      setPreviewMimeType(mimeType);
      setIsPreviewOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถเปิดดูเอกสารสัญญาได้');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  // Format date display
  const formatDateTh = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700/60 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* 1. Modern Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-slate-50 via-white to-blue-50/20 dark:from-slate-800 dark:to-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B2046] text-white flex items-center justify-center shadow-xs">
                <FileText className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    รายละเอียดสัญญาจ้างงาน
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    #{currentContract.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ข้อมูลสัญญาและการแนบเอกสารสัญญาจ้างงานรายบุคคล
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Badge */}
              {currentContract.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  ใช้งาน (Active)
                </span>
              ) : currentContract.status === 'PENDING_APPROVAL' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/60">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  รออนุมัติ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  {currentContract.statusDisplay || 'สิ้นสุดแล้ว'}
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* 2.1 Employee Info Card */}
            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
                  {currentContract.employeeName?.slice(0, 1) || 'E'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                      {currentContract.employeeName}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {currentContract.employeeCode}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {currentContract.departmentName || 'ไม่ระบุแผนก'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {currentContract.positionTitle || 'ไม่ระบุตำแหน่ง'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-xs px-3 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
                  {currentContract.employeeTypeName || currentContract.contractTypeDisplay}
                </span>
              </div>
            </div>

            {/* 2.2 Contract Key Details Grid */}
            <div>
              <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                ข้อกำหนดและระยะเวลาสัญญา
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-2xs">
                  <span className="text-xs text-slate-400 dark:text-slate-500 block mb-1">
                    ประเภทการจ้าง
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {currentContract.employeeTypeName || currentContract.contractTypeDisplay}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-2xs">
                  <span className="text-xs text-slate-400 dark:text-slate-500 block mb-1">
                    รูปแบบค่าจ้าง
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {currentContract.wageType === 'DAILY' ? 'รายวัน (Daily)' : 'รายเดือน (Monthly)'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-2xs">
                  <span className="text-xs text-slate-400 dark:text-slate-500 block mb-1">
                    วันที่เริ่มสัญญา
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {currentContract.startDateDisplay || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-2xs">
                  <span className="text-xs text-slate-400 dark:text-slate-500 block mb-1">
                    สิ้นสุด / ครบทดลองงาน
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {currentContract.effectiveEndDateDisplay || 'ไม่มีกำหนด'}
                  </span>
                </div>

                {currentContract.probationPassedDate && (
                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-2xs">
                    <span className="text-xs text-slate-400 dark:text-slate-500 block mb-1">
                      วันที่ผ่านทดลองงาน
                    </span>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatDateTh(currentContract.probationPassedDate)}
                    </span>
                  </div>
                )}

                {currentContract.terminationDate && (
                  <div className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 shadow-2xs">
                    <span className="text-xs text-rose-500 block mb-1">วันที่สิ้นสุดจริง</span>
                    <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                      {formatDateTh(currentContract.terminationDate)}
                    </span>
                    <p className="text-[11px] text-rose-600/80 mt-0.5 truncate">
                      {currentContract.terminationReason || 'สิ้นสุดสัญญา'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2.3 Attached Contract Document (ส่วนเอกสารสัญญาจ้างแนบ) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4.5 bg-slate-50/40 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      เอกสารสัญญาจ้างแนบ
                    </h5>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      แนบไฟล์สัญญาจ้างงานเพื่อเก็บเป็นหลักฐานและดาวน์โหลดได้ตลอดเวลา
                    </p>
                  </div>
                </div>

                {/* Hidden File Input for uploading/replacing */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileSelected}
                  className="hidden"
                />

                {currentContract.hasDocument && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingDoc}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                  >
                    {isUploadingDoc ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>เปลี่ยนไฟล์</span>
                  </button>
                )}
              </div>

              {/* Case 1: Has Attached Document */}
              {currentContract.hasDocument ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/40 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {currentContract.documentFileName || 'เอกสารสัญญาจ้างงาน.pdf'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {currentContract.documentFileSize && (
                          <span>{formatFileSize(currentContract.documentFileSize)}</span>
                        )}
                        {currentContract.documentUploadedAt && (
                          <>
                            <span>•</span>
                            <span>แนบเมื่อ {formatDateTh(currentContract.documentUploadedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Document */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={handleOpenPreview}
                      disabled={isLoadingPreview}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors cursor-pointer"
                      title="ดูตัวอย่างเอกสาร"
                    >
                      {isLoadingPreview ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      <span>ดูตัวอย่าง</span>
                    </button>

                    {/* Download Button */}
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors cursor-pointer"
                      title="ดาวน์โหลดเอกสาร"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>ดาวน์โหลด</span>
                    </button>

                    {/* Delete Document Button */}
                    <button
                      type="button"
                      onClick={handleDeleteDocument}
                      disabled={isDeletingDoc}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer"
                      title="ลบเอกสารสัญญา"
                    >
                      {isDeletingDoc ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Case 2: No Document Attached Yet */
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mb-2">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    ยังไม่มีเอกสารสัญญาจ้างแนบสำหรับสัญญานี้
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 mb-3">
                    สามารถแนบไฟล์สัญญาต้นฉบับ (PDF, JPG, PNG, DOCX) ขนาดไม่เกิน 10 MB
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingDoc}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0B2046] hover:bg-[#07152d] transition-all shadow-xs cursor-pointer"
                  >
                    {isUploadingDoc ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังอัปโหลด...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>+ แนบเอกสารสัญญาจ้าง</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 2.4 Terminate Contract Form (Collapsible) */}
            {showTerminateForm && (
              <form
                onSubmit={handleTerminateSubmit}
                className="border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-xl space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ยืนยันการสิ้นสุด / บอกเลิกสัญญาจ้าง
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowTerminateForm(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ปิด
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-slate-700 dark:text-slate-300 font-medium mb-1">
                    เหตุผลในการสิ้นสุดสัญญา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={terminateReason}
                    onChange={(e) => setTerminateReason(e.target.value)}
                    placeholder="เช่น สิ้นสุดระยะเวลาตามสัญญา, ลาออก, ไม่ผ่านการทดลองงาน"
                    required
                    className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTerminateForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isTerminating}
                    className="px-4 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-lg font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {isTerminating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    ยืนยันสิ้นสุดสัญญา
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 3. Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/40 dark:bg-slate-800/40 shrink-0">
            {currentContract.status === 'ACTIVE' && !showTerminateForm ? (
              <button
                type="button"
                onClick={() => setShowTerminateForm(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>สิ้นสุด / บอกเลิกสัญญา</span>
              </button>
            ) : (
              <div></div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>

      {/* 4. Document Preview Modal (Embedded Lightbox) */}
      {isPreviewOpen && previewUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Preview Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {previewFileName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1"
                  title="เปิดในแท็บใหม่"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1"
                  title="ดาวน์โหลดไฟล์"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewOpen(false);
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  aria-label="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="p-4 bg-slate-100 dark:bg-slate-950 flex-1 overflow-auto flex items-center justify-center min-h-[450px]">
              {previewMimeType.includes('pdf') ? (
                <iframe
                  src={previewUrl}
                  title="Contract PDF Preview"
                  className="w-full h-[65vh] rounded-lg border border-slate-300 dark:border-slate-800 bg-white"
                />
              ) : previewMimeType.includes('image') ? (
                <img
                  src={previewUrl}
                  alt={previewFileName}
                  className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-md"
                />
              ) : (
                <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xs max-w-sm">
                  <FileText className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    ไฟล์ประเภทนี้ไม่สามารถแสดงตัวอย่างได้โดยตรง
                  </p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    กรุณาดาวน์โหลดไฟล์เพื่อเปิดดูบนเครื่องของคุณ
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0B2046] hover:bg-[#07152d]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดไฟล์</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
