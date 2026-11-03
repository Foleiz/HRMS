'use client';

import { ModalShell, ModalHeader, Button, ActionDropdown, type ActionDropdownItem } from '@/components/ui';
import { reviewCardCls, reviewTitleCls } from '@/components/approvals/ReviewInfoPanels';
import { employeeService } from '@/services/employeeService';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Eye,
  Upload,
  Trash2,
  Paperclip,
  ExternalLink,
  RefreshCw,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { EmploymentContract } from '@/types/contract';
import { contractService } from '@/services/contractService';
import { useToast } from '@/context/ToastContext';
import { confirmAction } from '@/lib/sweetalert';

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

  // ฝ่ายของพนักงาน (สัญญาไม่ได้ส่งมา — ดึงจากข้อมูลพนักงาน)
  const [divisionName, setDivisionName] = useState<string | null>(null);
  useEffect(() => {
    const empId = contract?.employeeId;
    if (!isOpen || !empId) return;
    let alive = true;
    employeeService
      .getById(empId)
      .then((e) => alive && setDivisionName(e?.divisionName || null))
      .catch(() => alive && setDivisionName(null));
    return () => {
      alive = false;
    };
  }, [contract?.employeeId, isOpen]);

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
    const isConfirmed = await confirmAction({
      title: 'ลบไฟล์เอกสารสัญญาจ้าง',
      text: 'คุณต้องการลบไฟล์เอกสารสัญญาจ้างนี้ออกจากระบบใช่หรือไม่?',
      confirmButtonText: 'ใช่, ลบเอกสาร',
      cancelButtonText: 'ยกเลิก',
      isDestructive: true,
    });
    if (!isConfirmed) return;

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

  const isActive = currentContract.status === 'ACTIVE';
  const isEnded = currentContract.status === 'TERMINATED' || currentContract.status === 'COMPLETED' || !!currentContract.terminationDate;
  const canEditDocument = !isEnded;

  const statusBanner = isActive
    ? { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300', Icon: CheckCircle2, label: 'สัญญาใช้งานอยู่ (Active)' }
    : currentContract.status === 'PENDING_APPROVAL'
      ? { cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300', Icon: Clock, label: 'รออนุมัติ' }
      : isEnded
        ? { cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300', Icon: XCircle, label: currentContract.statusDisplay || 'สิ้นสุดสัญญาแล้ว' }
        : { cls: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300', Icon: FileText, label: currentContract.statusDisplay || '-' };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
      <dd className="m-0 font-semibold text-slate-800 dark:text-slate-200 text-right min-w-0 break-words">{children}</dd>
    </div>
  );

  const fileMenuItems: ActionDropdownItem[] = [
    { id: 'download', label: 'ดาวน์โหลดไฟล์แนบ', icon: <Download className="w-4 h-4" />, onClick: handleDownload, disabled: isDownloading },
    ...(canEditDocument
      ? [
          { id: 'replace', label: 'เปลี่ยนไฟล์', icon: <RefreshCw className="w-4 h-4" />, onClick: () => fileInputRef.current?.click(), disabled: isUploadingDoc },
          { id: 'delete', label: 'ลบไฟล์', icon: <Trash2 className="w-4 h-4" />, onClick: handleDeleteDocument, danger: true, disabled: isDeletingDoc },
        ]
      : []),
  ];

  const fileExt = (currentContract.documentFileName?.split('.').pop() || 'FILE').toUpperCase().slice(0, 4);

  return (
    <>
      <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans" innerClassName="items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          <ModalHeader title="รายละเอียดสัญญาจ้าง" onClose={onClose} />

          <div className={`flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 bg-slate-50/70 dark:bg-slate-900/40 transition-opacity ${showTerminateForm ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* สถานะสัญญา */}
            <div className={`rounded-xl border px-4 py-3 text-sm ${statusBanner.cls}`}>
              <div className="flex items-center gap-2.5 font-semibold">
                <statusBanner.Icon className="w-4.5 h-4.5 shrink-0" strokeWidth={2.5} />
                <span>{statusBanner.label}</span>
                <span className="ml-auto text-xs font-medium">เลขที่ #{currentContract.id}</span>
              </div>
              {currentContract.terminationDate && (
                <dl className="m-0 mt-2 text-xs space-y-1">
                  <div className="flex justify-between gap-4">
                    <dt>วันที่สิ้นสุดจริง</dt>
                    <dd className="m-0 font-semibold">{formatDateTh(currentContract.terminationDate)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0">เหตุผล</dt>
                    <dd className="m-0 font-semibold text-right break-words">{currentContract.terminationReason || '-'}</dd>
                  </div>
                </dl>
              )}
            </div>

            {/* ข้อมูลสัญญา */}
            <div className={`${reviewCardCls} text-sm`}>
              <div className={reviewTitleCls}>
                <FileText className="w-3.5 h-3.5 text-slate-500" /> ข้อมูลสัญญา
              </div>
              <dl className="m-0 divide-y divide-slate-100 dark:divide-slate-700/60">
                <Row label="ชื่อ-นามสกุล">
                  {currentContract.employeeName}{' '}
                  <span className="font-medium text-slate-500 dark:text-slate-400">({currentContract.employeeCode})</span>
                </Row>
                <Row label="ฝ่าย">{divisionName || '-'}</Row>
                <Row label="แผนก">{currentContract.departmentName || '-'}</Row>
              </dl>
              <dl className="m-0 mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
                <Row label="ตำแหน่งตามสัญญา">{currentContract.positionTitle || '-'}</Row>
                <Row label="ประเภทการจ้าง">{currentContract.employeeTypeName || currentContract.contractTypeDisplay}</Row>
                <Row label="รูปแบบค่าจ้าง">{currentContract.wageType === 'DAILY' ? 'รายวัน' : 'รายเดือน'}</Row>
                <Row label="วันที่เริ่มสัญญา">
                  <span className="text-primary dark:text-blue-300">{currentContract.startDateDisplay || '-'}</span>
                </Row>
                <Row label="สิ้นสุด / ครบทดลองงาน">{currentContract.effectiveEndDateDisplay || 'ไม่มีกำหนด'}</Row>
                {currentContract.probationPassedDate && (
                  <Row label="วันที่ผ่านทดลองงาน">
                    <span className="text-emerald-600">{formatDateTh(currentContract.probationPassedDate)}</span>
                  </Row>
                )}
              </dl>
            </div>

            {/* ไฟล์สัญญาจ้าง */}
            <div className={`${reviewCardCls} text-sm`}>
              <div className={reviewTitleCls}>
                <Paperclip className="w-3.5 h-3.5 text-slate-500" /> ไฟล์สัญญาจ้าง
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileSelected}
                className="hidden"
              />
              {currentContract.hasDocument ? (
                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                    {fileExt}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {currentContract.documentFileName || 'เอกสารสัญญาจ้าง'}
                    </p>
                    <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
                      {[formatFileSize(currentContract.documentFileSize), currentContract.documentUploadedAt && `แนบเมื่อ ${formatDateTh(currentContract.documentUploadedAt)}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {(isUploadingDoc || isDeletingDoc || isDownloading) && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                  <ActionDropdown
                    menuClassName="w-48"
                    title="ตัวเลือกไฟล์"
                    triggerClassName="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center justify-center transition-colors cursor-pointer"
                    items={fileMenuItems}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40">
                  <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 inline-flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4.5 h-4.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 font-semibold text-amber-700 dark:text-amber-300">รอไฟล์แนบ</p>
                    <p className="m-0 text-xs text-slate-500 dark:text-slate-400">PDF, JPG, PNG, DOCX ไม่เกิน 10 MB</p>
                  </div>
                  {canEditDocument && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      loading={isUploadingDoc}
                      icon={!isUploadingDoc ? <Upload className="w-3.5 h-3.5" /> : undefined}
                    >
                      แนบเอกสาร
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer / ฟอร์มสิ้นสุดสัญญา */}
          {showTerminateForm ? (
            <form
              onSubmit={handleTerminateSubmit}
              className="border-t-2 border-rose-300 dark:border-rose-800 px-5 sm:px-6 py-4 space-y-3 bg-white dark:bg-slate-800 shrink-0 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] animate-in fade-in duration-150"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
                <XCircle className="w-4.5 h-4.5" /> สิ้นสุด / บอกเลิกสัญญา
              </div>
              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold text-rose-700 dark:text-rose-300">
                  เหตุผลในการสิ้นสุดสัญญา <span className="text-rose-500">*</span>
                </span>
                <textarea
                  rows={3}
                  autoFocus
                  value={terminateReason}
                  onChange={(e) => setTerminateReason(e.target.value)}
                  placeholder="เช่น สิ้นสุดระยะเวลาตามสัญญา, ลาออก, ไม่ผ่านการทดลองงาน"
                  required
                  className="w-full text-xs p-3 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl outline-none resize-none placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-slate-200"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowTerminateForm(false)} disabled={isTerminating}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="danger" loading={isTerminating}>
                  ยืนยันสิ้นสุดสัญญา
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
              {isActive ? (
                <button
                  type="button"
                  onClick={() => setShowTerminateForm(true)}
                  className="h-10 px-4 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  สิ้นสุด / บอกเลิกสัญญา
                </button>
              ) : (
                <span className="text-xs text-slate-400">{isEnded ? 'อ่านอย่างเดียว' : ''}</span>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  disabled={!currentContract.hasDocument || isLoadingPreview}
                  className="h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-primary dark:text-slate-200 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  ดูเอกสาร
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          )}
        </div>
      </ModalShell>

      {/* 4. Document Preview Modal (Embedded Lightbox) */}
      {isPreviewOpen && previewUrl && (
        <ModalShell className="z-60 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
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
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleDownload}
                    icon={<Download className="w-3.5 h-3.5" />}
                  >
                    ดาวน์โหลดไฟล์
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
