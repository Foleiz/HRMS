'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Loader2,
  UploadCloud,
  AlertTriangle,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Paperclip,
} from 'lucide-react';
import { employeeDocumentService } from '@/services/employeeDocumentService';
import { masterDataService } from '@/services/masterDataService';
import { EmployeeDocument } from '@/types/employeeDocument';
import { DocumentTypeItem } from '@/types/master';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { RowActionButton } from '@/components/ui';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
const MAX_FILES_PER_UPLOAD = 5;

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** ข้อความ error จาก API (ApiResponse.message) */
const apiMessage = (err: unknown, fallback: string): string => {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
};

const todayIso = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

interface Props {
  employeeId: number;
  /** ฝ่ายบุคคล/แอดมิน — เพิ่มและลบเอกสารได้ */
  canManage: boolean;
  /** หน้าโปรไฟล์ของตัวเอง — อัปโหลดเอกสารเข้าแฟ้มตัวเองได้ และลบได้เฉพาะไฟล์ที่ตัวเองอัปโหลด */
  isSelf?: boolean;
}

export default function EmployeeDocumentsTab({ employeeId, canManage, isSelf = false }: Props) {
  const canUpload = canManage || isSelf;
  const isOwnUpload = (doc: EmployeeDocument) =>
    isSelf && doc.uploadedByEmployeeId === employeeId && !doc.sourceGeneralRequestId;
  const toast = useToast();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // รายการหัวข้อเอกสาร (ประเภทเอกสารจากข้อมูลหลัก) — กดหัวข้อเพื่อเปิดช่องอัปโหลด
  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [expandedTypeId, setExpandedTypeId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const typeId = expandedTypeId ?? '';
  const [files, setFiles] = useState<File[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    employeeDocumentService
      .getByEmployee(employeeId)
      .then((items) => {
        if (!active) return;
        setDocuments(items);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(apiMessage(err, 'ไม่สามารถโหลดเอกสารของพนักงานได้'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [employeeId, reloadKey]);

  useEffect(() => {
    masterDataService
      .getDocumentTypes('ACTIVE')
      .then(setDocTypes)
      .catch(() => toast.error('ไม่สามารถโหลดประเภทเอกสารได้'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const summary = useMemo(
    () => ({
      total: documents.length,
      expiring: documents.filter((d) => d.expiryStatus === 'EXPIRING_SOON').length,
      expired: documents.filter((d) => d.expiryStatus === 'EXPIRED').length,
    }),
    [documents],
  );

  // หัวข้อคงที่ = ประเภทเอกสารที่เปิดใช้งาน + ประเภทที่ปิดไปแล้วแต่ยังมีไฟล์อยู่ในแฟ้ม
  const rows = useMemo(() => {
    const list: { id: number; name: string; type?: DocumentTypeItem }[] = docTypes.map((t) => ({ id: t.id, name: t.documentName, type: t }));
    documents.forEach((d) => {
      if (!list.some((r) => r.id === d.documentTypeId)) list.push({ id: d.documentTypeId, name: d.documentTypeName });
    });
    return list.map((r) => ({
      ...r,
      docs: documents
        .filter((d) => d.documentTypeId === r.id)
        .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || '')),
    }));
  }, [docTypes, documents]);

  const selectedType = docTypes.find((t) => t.id === typeId);

  const resetUploadForm = () => {
    setFiles([]);
    setExpiryDate('');
  };

  const sourceLabel = (doc: EmployeeDocument) =>
    doc.sourceRequestNo
      ? `คำขอ ${doc.sourceRequestNo}`
      : doc.uploadedByEmployeeId != null && doc.uploadedByEmployeeId === doc.employeeId
      ? 'พนักงานอัปโหลดเอง'
      : 'ฝ่ายบุคคลอัปโหลด';

  const toggleRow = (id: number) => {
    resetUploadForm();
    setShowHistory(false);
    setExpandedTypeId((cur) => (cur === id ? null : id));
  };

  // เลือกได้หลายไฟล์ (เช่น หน้า-หลังบัตร) — ไฟล์ใหม่จะเพิ่มต่อจากไฟล์เดิมในแฟ้ม
  const acceptFiles = (list: FileList | File[] | null) => {
    const picked = Array.from(list ?? []);
    if (picked.length === 0) return;
    const tooBig = picked.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length > 0) toast.warning(`ไฟล์ต้องมีขนาดไม่เกิน 5 MB (ข้าม ${tooBig.length} ไฟล์)`);
    const ok = picked.filter((f) => f.size <= MAX_FILE_BYTES);
    setFiles((prev) => {
      const merged = [...prev, ...ok];
      if (merged.length > MAX_FILES_PER_UPLOAD) toast.warning(`อัปโหลดได้สูงสุด ${MAX_FILES_PER_UPLOAD} ไฟล์ต่อครั้ง`);
      return merged.slice(0, MAX_FILES_PER_UPLOAD);
    });
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFiles(e.target.files);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!typeId) return toast.warning('กรุณาเลือกประเภทเอกสาร');
    if (files.length === 0) return toast.warning('กรุณาแนบไฟล์เอกสาร');
    const hasValidity = (selectedType?.validityMonths ?? 0) > 0;
    // มีอายุเอกสารในข้อมูลหลัก → ระบบคำนวณวันหมดอายุให้เอง / ต้องมีวันหมดอายุแต่ไม่ได้กำหนดอายุ → ต้องกรอกวันหมดอายุ
    if (selectedType?.isExpiryRequired && !hasValidity && !expiryDate) return toast.warning('เอกสารประเภทนี้ต้องระบุวันหมดอายุ');

    setSaving(true);
    try {
      for (const f of files) {
        await employeeDocumentService.upload(employeeId, {
          documentTypeId: Number(typeId),
          fileName: f.name,
          fileData: await readAsDataUrl(f),
          // มีอายุเอกสาร → ใช้วันที่อัปโหลดเป็นวันที่ออก (หลังบ้านคำนวณวันหมดอายุ)
          issuedDate: hasValidity ? todayIso() : undefined,
          expiryDate: !hasValidity && expiryDate ? expiryDate : undefined,
        });
      }
      toast.success(`อัปโหลดเอกสารเข้าแฟ้มเรียบร้อย (${files.length} ไฟล์)`);
      resetUploadForm();
      reload();
    } catch (err: unknown) {
      toast.error(apiMessage(err, 'ไม่สามารถเพิ่มเอกสารได้'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    setDownloadingId(doc.id);
    try {
      const blob = await employeeDocumentService.download(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || `${doc.documentTypeName}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('ไม่สามารถดาวน์โหลดเอกสารได้');
    } finally {
      setDownloadingId(null);
    }
  };

  /** ข้อความใต้วันหมดอายุ: อีก N วัน / หมดอายุแล้ว N วัน */
  const expiryHint = (doc: EmployeeDocument) => {
    if (doc.daysToExpiry == null) return null;
    if (doc.daysToExpiry < 0) return { text: `หมดอายุแล้ว ${Math.abs(doc.daysToExpiry)} วัน`, cls: 'text-rose-600' };
    if (doc.daysToExpiry === 0) return { text: 'หมดอายุวันนี้', cls: 'text-rose-600' };
    return { text: `อีก ${doc.daysToExpiry} วัน`, cls: doc.expiryStatus === 'EXPIRING_SOON' ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300' };
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await employeeDocumentService.remove(deleteTarget.id);
      toast.success('ลบเอกสารเรียบร้อย');
      setDeleteTarget(null);
      reload();
    } catch (err: unknown) {
      toast.error(apiMessage(err, 'ไม่สามารถลบเอกสารได้'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="pt-6 flex-1 text-xs animate-in fade-in duration-150 space-y-4">
      {/* หัวข้อ + สรุป */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <FolderOpen className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">แฟ้มเอกสารพนักงาน</h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-300 text-[11px]">ทั้งหมด {summary.total}</span>
          {summary.expiring > 0 && (
            <span className="px-2 py-0.5 rounded-full border bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 text-[11px]">
              ใกล้หมดอายุ {summary.expiring}
            </span>
          )}
          {summary.expired > 0 && (
            <span className="px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 text-[11px]">
              หมดอายุแล้ว {summary.expired}
            </span>
          )}
        </div>
      </div>

      {/* รายการหัวข้อเอกสาร — กดหัวข้อเพื่อดูไฟล์และอัปโหลด */}
      {loading && docTypes.length === 0 ? (
        <div className="py-16 flex items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดเอกสาร...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
          <table className="table-standard text-xs w-full min-w-[760px]">
            <thead className="bg-slate-50 text-slate-500 text-[11px]">
              <tr className="whitespace-nowrap">
                <th className="text-left font-semibold px-5 py-2.5">เอกสาร</th>
                <th className="text-left font-semibold px-4 py-2.5">ไฟล์</th>
                <th className="text-left font-semibold px-4 py-2.5">อัปโหลดล่าสุด</th>
                <th className="text-left font-semibold px-4 py-2.5">หมดอายุ</th>
                <th className="text-right font-semibold px-5 py-2.5">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {rows.map((row) => {
                const isOpen = expandedTypeId === row.id;
                // ไฟล์ปัจจุบัน = ยังไม่หมดอายุ / ประวัติไฟล์เดิม = หมดอายุแล้ว
                const current = row.docs.filter((d) => d.expiryStatus !== 'EXPIRED');
                const history = row.docs.filter((d) => d.expiryStatus === 'EXPIRED');
                const latest = row.docs[0];
                const hint = latest ? expiryHint(latest) : null;
                const needsExpiryInput = !!row.type?.isExpiryRequired && !((row.type?.validityMonths ?? 0) > 0);

                const renderFileCard = (doc: EmployeeDocument) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-100 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 break-all">
                        {doc.fileName || '-'} <span className="font-normal text-[11px] text-slate-400">{formatSize(doc.fileSize)}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        อัปโหลดโดย {doc.uploadedByName || sourceLabel(doc)} {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.hasFile && (
                        <>
                          <button
                            type="button"
                            title="ดาวน์โหลด"
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingId === doc.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary cursor-pointer disabled:opacity-50"
                          >
                            {downloadingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                      {(canManage || isOwnUpload(doc)) && (
                        <RowActionButton action="delete" onClick={() => setDeleteTarget(doc)} />
                      )}
                    </div>
                  </div>
                );

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => toggleRow(row.id)}
                      className={`cursor-pointer transition-colors ${
                        isOpen
                          ? 'bg-amber-100/80 dark:bg-amber-900/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100">{row.name}</td>
                      <td className="px-4 py-3.5">
                        {row.docs.length > 0 ? (
                          <>
                            <p className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-100">
                              <Paperclip className="w-3.5 h-3.5 text-slate-500" /> {row.docs.length} ไฟล์
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-400">ยังไม่ได้อัปโหลด</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {latest ? (
                          <>
                            <p className="text-slate-800 dark:text-slate-100">{formatDate(latest.uploadedAt)}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{sourceLabel(latest)}</p>
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {!latest ? (
                          <span className="text-slate-400">-</span>
                        ) : latest.expiryDate ? (
                          <>
                            <p className="text-slate-800 dark:text-slate-100">{formatDate(latest.expiryDate)}</p>
                            {hint && <p className={`text-[11px] font-semibold ${hint.cls}`}>{hint.text}</p>}
                          </>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">ไม่มีวันหมดอายุ</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {latest?.hasFile && (
                            <button
                              type="button"
                              title="ดาวน์โหลดไฟล์ล่าสุด"
                              onClick={() => handleDownload(latest)}
                              disabled={downloadingId === latest.id}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-white/70 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                            >
                              {downloadingId === latest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            type="button"
                            title={isOpen ? 'ปิด' : 'เปิด'}
                            onClick={() => toggleRow(row.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-white/70 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-orange-50/70 dark:bg-amber-900/15">
                        <td colSpan={5} className="px-5 pb-5 pt-3 space-y-3">
                          {/* ไฟล์ปัจจุบัน */}
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">ไฟล์ปัจจุบัน</span>
                            <span className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-300">
                              {current.length}
                            </span>
                          </div>
                          {current.length > 0 ? (
                            <div className="space-y-2">{current.map(renderFileCard)}</div>
                          ) : (
                            <p className="text-slate-400">ยังไม่มีไฟล์ที่ใช้งานได้ในหัวข้อนี้</p>
                          )}

                          {/* ช่องอัปโหลด */}
                          {canUpload && row.type && (
                            <div className="space-y-3">
                              <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={handlePickFile} />
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => fileRef.current?.click()}
                                onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setDragOver(true);
                                }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOver(false);
                                  acceptFiles(e.dataTransfer.files);
                                }}
                                className={`px-4 py-5 rounded-xl border border-dashed text-center cursor-pointer transition-colors ${
                                  dragOver
                                    ? 'border-amber-500 bg-amber-50 dark:bg-slate-800'
                                    : 'border-amber-300/80 dark:border-slate-600 hover:border-amber-500 hover:bg-white/60 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <p className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                  <UploadCloud className="w-5 h-5 text-slate-500" />
                                  ลากไฟล์วางที่นี่ หรือ
                                  <span className="font-bold underline text-primary dark:text-white">เลือกไฟล์</span>
                                </p>
                                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                  เอกสารนี้เก็บได้หลายไฟล์ — ไฟล์ใหม่จะเพิ่มต่อจากไฟล์เดิม
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  รองรับ .pdf .jpg .png .doc .docx · ไม่เกิน 5 MB ต่อไฟล์ · สูงสุด {MAX_FILES_PER_UPLOAD} ไฟล์ต่อครั้ง
                                </p>
                              </div>

                              {files.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    {files.map((f, i) => (
                                      <span
                                        key={`${f.name}-${i}`}
                                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                                      >
                                        <Paperclip className="w-3 h-3 text-slate-400" />
                                        <span className="break-all">{f.name}</span>
                                        <span className="text-[10px] text-slate-400">{formatSize(f.size)}</span>
                                        <button
                                          type="button"
                                          title="เอาออก"
                                          onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                          className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-rose-600"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                  {needsExpiryInput && (
                                    <div className="max-w-xs">
                                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        วันหมดอายุ <span className="text-rose-500">*</span>
                                      </label>
                                      <ThaiDatePicker value={expiryDate} minDate={todayIso()} onChange={(val) => setExpiryDate(val)} />
                                    </div>
                                  )}
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={resetUploadForm}
                                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                      ยกเลิก
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleSave}
                                      disabled={saving}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover cursor-pointer disabled:opacity-60"
                                    >
                                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                      อัปโหลด {files.length > 1 ? `(${files.length} ไฟล์)` : ''}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ประวัติไฟล์เดิม (หมดอายุแล้ว) */}
                          {history.length > 0 && (
                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => setShowHistory((v) => !v)}
                                className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                              >
                                <ChevronRight className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                                ประวัติไฟล์เดิม ({history.length})
                              </button>
                              {showHistory && <div className="space-y-2 opacity-80">{history.map(renderFileCard)}</div>}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        type="danger"
        title="ลบเอกสารออกจากแฟ้ม"
        message={`ต้องการลบ "${deleteTarget?.documentTypeName ?? ''}" (${deleteTarget?.fileName ?? '-'}) ออกจากแฟ้มพนักงานใช่ไหม? ลบแล้วกู้คืนไม่ได้`}
        confirmText="ยืนยันการลบ"
      />
    </div>
  );
}
