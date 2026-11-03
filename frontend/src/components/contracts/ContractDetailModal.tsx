'use client';

import { ModalShell, ModalHeader, Button, ActionDropdown, type ActionDropdownItem } from '@/components/ui';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  XCircle,
  Loader2,
  Download,
  Upload,
  Trash2,
  Paperclip,
  ExternalLink,
  Plus,
  ImageIcon,
} from 'lucide-react';
import { EmploymentContract, ContractDocument } from '@/types/contract';
import { contractService } from '@/services/contractService';
import { employeeService } from '@/services/employeeService';
import { reviewCardCls, reviewTitleCls } from '@/components/approvals/ReviewInfoPanels';
import { useToast } from '@/context/ToastContext';
import { confirmAction } from '@/lib/sweetalert';

interface ContractDetailModalProps {
  contract: EmploymentContract | null;
  isOpen: boolean;
  onClose: () => void;
  onTerminate: (id: number, reason: string) => Promise<void>;
  onUpdateContract?: (updated: EmploymentContract) => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    reader.readAsDataURL(file);
  });

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
};

const formatDateTh = (dateStr?: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const fileExt = (name?: string) => (name?.split('.').pop() || 'FILE').toUpperCase().slice(0, 4);

const isImage = (mime?: string, name?: string) =>
  (mime || '').startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(name || '');

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
      <dd className="m-0 font-semibold text-slate-800 dark:text-slate-200 text-right min-w-0 break-words">{children}</dd>
    </div>
  );
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

  const [currentContract, setCurrentContract] = useState<EmploymentContract | null>(contract);

  // ฟอร์มสิ้นสุดสัญญา
  const [showTerminateForm, setShowTerminateForm] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [isTerminating, setIsTerminating] = useState(false);

  // ไฟล์แนบ
  const [isUploading, setIsUploading] = useState(false);
  const [busyDocId, setBusyDocId] = useState<number | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  // ตัวอย่างไฟล์ (เก็บ object URL ต่อไฟล์ไว้ใช้ซ้ำ)
  const urlCache = useRef(new Map<number, string>());
  const [preview, setPreview] = useState<{ docId: number; url: string; mime: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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

  const revokeAll = useCallback(() => {
    urlCache.current.forEach((u) => URL.revokeObjectURL(u));
    urlCache.current.clear();
  }, []);

  // ข้อมูลสัญญาอัปเดตจากหน้าแม่ (เช่น หลังแนบ/ลบไฟล์) — ไม่รีเซ็ตไฟล์ที่เลือก
  useEffect(() => {
    setCurrentContract(contract);
  }, [contract]);

  // เปิดสัญญาใหม่ → รีเซ็ต
  useEffect(() => {
    setShowTerminateForm(false);
    setTerminateReason('');
    setPreview(null);
    setPreviewError(null);
    revokeAll();
    const docs = contract?.documents || [];
    setSelectedDocId(docs.length ? docs[docs.length - 1].id : null);
  }, [contract?.id, isOpen, revokeAll]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => revokeAll(), [revokeAll]);

  const documents: ContractDocument[] = currentContract?.documents || [];
  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  // โหลดตัวอย่างของไฟล์ที่เลือก — ใช้เลขคำขอล่าสุดแทน flag ต่อ effect
  // (สลับไฟล์ระหว่างโหลดแล้วสถานะโหลดไม่ค้าง)
  const previewReq = useRef(0);
  const [previewNonce, setPreviewNonce] = useState(0);
  const contractId = currentContract?.id;
  const docId = selectedDoc?.id;
  const docMime = selectedDoc?.mimeType || '';
  useEffect(() => {
    const req = ++previewReq.current;
    if (!isOpen || !contractId || !docId) {
      setPreview(null);
      setIsLoadingPreview(false);
      return;
    }
    setPreviewError(null);
    const cached = urlCache.current.get(docId);
    if (cached) {
      setPreview({ docId, url: cached, mime: docMime });
      setIsLoadingPreview(false);
      return;
    }
    setIsLoadingPreview(true);
    contractService
      .getDocumentFileBlob(contractId, docId, true)
      .then(({ blob, mimeType }) => {
        const url = URL.createObjectURL(blob);
        urlCache.current.set(docId, url);
        if (req === previewReq.current) setPreview({ docId, url, mime: mimeType || docMime });
      })
      .catch((err: any) => {
        if (req === previewReq.current) setPreviewError(err?.message || 'ไม่สามารถเปิดดูไฟล์ได้');
      })
      .finally(() => {
        if (req === previewReq.current) setIsLoadingPreview(false);
      });
  }, [isOpen, contractId, docId, previewNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !currentContract) return null;

  const isActive = currentContract.status === 'ACTIVE';
  const isEnded =
    currentContract.status === 'TERMINATED' || currentContract.status === 'COMPLETED' || !!currentContract.terminationDate;
  const canEditDocument = !isEnded;

  const applyUpdated = (updated: EmploymentContract) => {
    setCurrentContract(updated);
    onUpdateContract?.(updated);
  };

  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminateReason.trim()) {
      toast.warning('กรุณาระบุเหตุผลในการยกเลิกสัญญา');
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

  // แนบไฟล์ (เลือกได้หลายไฟล์ในครั้งเดียว)
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!files.length) return;

    const tooBig = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length) toast.error(`ไฟล์เกิน 10 MB: ${tooBig.map((f) => f.name).join(', ')}`);
    const ok = files.filter((f) => f.size <= MAX_FILE_BYTES);
    if (!ok.length) return;

    setIsUploading(true);
    let latest: EmploymentContract | null = null;
    let done = 0;
    for (const file of ok) {
      try {
        const data = await readAsDataUrl(file);
        latest = await contractService.uploadDocument(currentContract.id, data, file.name);
        done++;
      } catch (err: any) {
        toast.error(`${file.name}: ${err?.message || 'อัปโหลดไม่สำเร็จ'}`);
      }
    }
    setIsUploading(false);
    if (latest) {
      applyUpdated(latest);
      const docs = latest.documents || [];
      if (docs.length) setSelectedDocId(docs[docs.length - 1].id);
      toast.success(done > 1 ? `แนบไฟล์ ${done} ไฟล์เรียบร้อยแล้ว` : `แนบไฟล์ "${ok[0].name}" เรียบร้อยแล้ว`);
    }
  };

  const handleDownload = async (doc: ContractDocument) => {
    try {
      setBusyDocId(doc.id);
      const { blob } = await contractService.getDocumentFileBlob(currentContract.id, doc.id, false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถดาวน์โหลดไฟล์ได้');
    } finally {
      setBusyDocId(null);
    }
  };

  const handleDelete = async (doc: ContractDocument) => {
    const confirmed = await confirmAction({
      title: 'ลบไฟล์แนบ',
      text: `ต้องการลบไฟล์ "${doc.fileName}" ออกจากสัญญานี้ใช่หรือไม่?`,
      confirmButtonText: 'ลบไฟล์',
      cancelButtonText: 'ยกเลิก',
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      setBusyDocId(doc.id);
      const updated = await contractService.deleteDocumentById(currentContract.id, doc.id);
      const cached = urlCache.current.get(doc.id);
      if (cached) {
        URL.revokeObjectURL(cached);
        urlCache.current.delete(doc.id);
      }
      applyUpdated(updated);
      if (selectedDocId === doc.id) {
        const docs = updated.documents || [];
        setSelectedDocId(docs.length ? docs[docs.length - 1].id : null);
      }
      toast.success('ลบไฟล์แนบเรียบร้อยแล้ว');
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถลบไฟล์ได้');
    } finally {
      setBusyDocId(null);
    }
  };

  const fileMenu = (doc: ContractDocument): ActionDropdownItem[] => [
    { id: 'download', label: 'ดาวน์โหลดไฟล์แนบ', icon: <Download className="w-4 h-4" />, onClick: () => handleDownload(doc) },
    ...(canEditDocument
      ? [{ id: 'delete', label: 'ลบไฟล์', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDelete(doc), danger: true }]
      : []),
  ];

  const previewMime = preview?.mime || selectedDoc?.mimeType || '';

  return (
    <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans" innerClassName="items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <ModalHeader title="รายละเอียดสัญญาจ้าง" onClose={onClose} />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={handleFilesSelected}
          className="hidden"
        />

        <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[400px_minmax(0,1fr)] overflow-y-auto md:overflow-hidden">
          {/* ซ้าย: รายละเอียดสัญญา + รายการไฟล์ */}
          <section
            aria-label="รายละเอียดสัญญา"
            className={`md:min-h-0 md:overflow-y-auto bg-slate-50/70 dark:bg-slate-900/40 md:border-r border-slate-200 dark:border-slate-700 px-5 py-5 space-y-4 transition-opacity ${
              showTerminateForm ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {currentContract.terminationDate && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 px-4 py-3 text-xs">
                <dl className="m-0 space-y-1">
                  <div className="flex justify-between gap-4">
                    <dt>วันที่ยกเลิกสัญญา</dt>
                    <dd className="m-0 font-semibold">{formatDateTh(currentContract.terminationDate)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0">เหตุผล</dt>
                    <dd className="m-0 font-semibold text-right break-words">{currentContract.terminationReason || '-'}</dd>
                  </div>
                </dl>
              </div>
            )}

            <div className={`${reviewCardCls} text-sm`}>
              <div className={reviewTitleCls}>
                <FileText className="w-3.5 h-3.5 text-slate-500" /> ข้อมูลสัญญา
              </div>
              <dl className="m-0 divide-y divide-slate-100 dark:divide-slate-700/60">
                <InfoRow label="ชื่อ-นามสกุล">
                  {currentContract.employeeName}{' '}
                  <span className="font-medium text-slate-500 dark:text-slate-400">({currentContract.employeeCode})</span>
                </InfoRow>
                <InfoRow label="ฝ่าย">{divisionName || '-'}</InfoRow>
                <InfoRow label="แผนก">{currentContract.departmentName || '-'}</InfoRow>
              </dl>
              <dl className="m-0 mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
                <InfoRow label="ตำแหน่งตามสัญญา">{currentContract.positionTitle || '-'}</InfoRow>
                <InfoRow label="ประเภทการจ้าง">{currentContract.employeeTypeName || currentContract.contractTypeDisplay}</InfoRow>
                <InfoRow label="รูปแบบค่าจ้าง">{currentContract.wageType === 'DAILY' ? 'รายวัน' : 'รายเดือน'}</InfoRow>
                <InfoRow label="วันที่เริ่มสัญญา">
                  <span className="text-primary dark:text-blue-300">{currentContract.startDateDisplay || '-'}</span>
                </InfoRow>
                <InfoRow label="สิ้นสุด / ครบทดลองงาน">{currentContract.effectiveEndDateDisplay || 'ไม่มีกำหนด'}</InfoRow>
                {currentContract.probationPassedDate && (
                  <InfoRow label="วันที่ผ่านทดลองงาน">
                    <span className="text-emerald-600">{formatDateTh(currentContract.probationPassedDate)}</span>
                  </InfoRow>
                )}
              </dl>
            </div>

            <div className={`${reviewCardCls} text-sm`}>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className={reviewTitleCls.replace('mb-2.5', 'mb-0')}>
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" /> ไฟล์สัญญาจ้าง
                  {documents.length > 0 && <span className="text-slate-400 font-medium">({documents.length})</span>}
                </div>
                {canEditDocument && documents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-60"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    แนบเพิ่ม
                  </button>
                )}
              </div>

              {documents.length > 0 ? (
                <ul className="m-0 p-0 list-none space-y-2">
                  {documents.map((doc) => {
                    const active = doc.id === selectedDocId;
                    return (
                      <li
                        key={doc.id}
                        className={`flex items-center gap-2 rounded-xl border transition-colors ${
                          active
                            ? 'border-primary/60 bg-blue-50/60 dark:border-blue-400/60 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedDocId(doc.id)}
                          aria-pressed={active}
                          className="flex-1 min-w-0 flex items-center gap-3 p-2.5 text-left cursor-pointer"
                        >
                          <span className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                            {fileExt(doc.fileName)}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.fileName}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {[formatFileSize(doc.fileSize), `แนบเมื่อ ${formatDateTh(doc.uploadedAt)}`].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </button>
                        {busyDocId === doc.id && <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />}
                        <div className="pr-2 shrink-0">
                          <ActionDropdown
                            menuClassName="w-48"
                            title="ตัวเลือกไฟล์"
                            triggerClassName="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center justify-center transition-colors cursor-pointer"
                            items={fileMenu(doc)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40">
                  <div className="flex-1 min-w-0">
                    <p className="m-0 font-semibold text-amber-700 dark:text-amber-300">รอไฟล์แนบ</p>
                    <p className="m-0 text-xs text-slate-500 dark:text-slate-400">PDF, JPG, PNG, DOCX ไฟล์ละไม่เกิน 10 MB</p>
                  </div>
                  {canEditDocument && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      loading={isUploading}
                      icon={!isUploading ? <Upload className="w-3.5 h-3.5" /> : undefined}
                    >
                      แนบเอกสาร
                    </Button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ขวา: ตัวอย่างไฟล์ที่เลือก */}
          <section aria-label="ตัวอย่างไฟล์" className="md:min-h-0 flex flex-col bg-white dark:bg-slate-800 min-h-[480px]">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <div className="min-w-0 text-sm">
                <span className="font-bold text-slate-900 dark:text-slate-100">ตัวอย่างเอกสาร</span>
              </div>
              {selectedDoc && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => preview && window.open(preview.url, '_blank')}
                    disabled={!preview}
                    className="h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-primary dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> เปิดในแท็บใหม่
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedDoc)}
                    className="h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-primary dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> ดาวน์โหลด
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 p-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-auto">
              {!selectedDoc ? (
                <div className="text-center text-slate-500 dark:text-slate-400">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="m-0 text-sm font-medium">ยังไม่มีไฟล์แนบ</p>
                  <p className="m-0 text-xs mt-0.5">แนบไฟล์สัญญาจ้างจากด้านซ้าย แล้วตัวอย่างจะแสดงที่นี่</p>
                </div>
              ) : previewError ? (
                <div className="text-center">
                  <p className="m-0 text-sm text-rose-600">{previewError}</p>
                  <button
                    type="button"
                    onClick={() => setPreviewNonce((n) => n + 1)}
                    className="mt-3 h-9 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-primary dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                  >
                    ลองอีกครั้ง
                  </button>
                </div>
              ) : isLoadingPreview || !preview || preview.docId !== selectedDoc.id ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : previewMime.includes('pdf') ? (
                <iframe src={preview.url} title={selectedDoc.fileName} className="w-full h-full min-h-[440px] rounded-lg border border-slate-300 dark:border-slate-800 bg-white" />
              ) : isImage(previewMime, selectedDoc.fileName) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={selectedDoc.fileName} className="max-h-full max-w-full rounded-lg object-contain shadow-md bg-white" />
              ) : (
                <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xs max-w-sm">
                  <FileText className="w-12 h-12 text-primary mx-auto mb-3" />
                  <p className="m-0 text-sm font-semibold text-slate-800 dark:text-slate-200">ไฟล์ประเภทนี้แสดงตัวอย่างไม่ได้</p>
                  <p className="m-0 text-xs text-slate-400 mt-1 mb-4">ดาวน์โหลดเพื่อเปิดดูบนเครื่องของคุณ</p>
                  <Button type="button" variant="primary" size="sm" onClick={() => handleDownload(selectedDoc)} icon={<Download className="w-3.5 h-3.5" />}>
                    ดาวน์โหลดไฟล์
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer / ฟอร์มสิ้นสุดสัญญา */}
        {showTerminateForm ? (
          <form
            onSubmit={handleTerminateSubmit}
            className="border-t-2 border-rose-300 dark:border-rose-800 px-5 sm:px-6 py-4 space-y-3 bg-white dark:bg-slate-800 shrink-0 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
              <XCircle className="w-4.5 h-4.5" /> ยกเลิกสัญญาจ้าง
            </div>
            <label className="block space-y-1.5">
              <span className="block text-xs font-semibold text-rose-700 dark:text-rose-300">
                เหตุผลในการยกเลิกสัญญา <span className="text-rose-500">*</span>
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
                ยืนยันยกเลิกสัญญาจ้าง
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
                ยกเลิกสัญญาจ้าง
              </button>
            ) : (
              <span className="text-xs text-slate-400">{isEnded ? 'อ่านอย่างเดียว' : ''}</span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              ปิด
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
