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
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { employeeDocumentService } from '@/services/employeeDocumentService';
import { masterDataService } from '@/services/masterDataService';
import { EmployeeDocument, DocumentExpiryStatus } from '@/types/employeeDocument';
import { DocumentTypeItem } from '@/types/master';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx';

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

const EXPIRY_BADGE: Record<DocumentExpiryStatus, { label: string; className: string }> = {
  VALID: { label: 'ใช้งานได้', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  EXPIRING_SOON: { label: 'ใกล้หมดอายุ', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  EXPIRED: { label: 'หมดอายุแล้ว', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  NO_EXPIRY: { label: 'ไม่มีวันหมดอายุ', className: 'bg-slate-50 text-slate-500 dark:text-slate-400 border-slate-200' },
};

/** ข้อความ error จาก API (ApiResponse.message) */
const apiMessage = (err: unknown, fallback: string): string => {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
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
  const [file, setFile] = useState<File | null>(null);
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [remarks, setRemarks] = useState('');
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
  // ประเภทเอกสารกำหนดอายุไว้ → คำนวณวันหมดอายุจากวันที่ออก (ถ้ายังไม่ได้กรอกเอง)
  const autoExpiry = useMemo(() => {
    const months = selectedType?.validityMonths;
    if (!months || !issuedDate) return '';
    const [y, m, d] = issuedDate.split('-').map(Number);
    const date = new Date(y, m - 1 + months, d);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }, [selectedType, issuedDate]);
  const effectiveExpiry = expiryDate || autoExpiry;

  const resetUploadForm = () => {
    setFile(null);
    setIssuedDate('');
    setExpiryDate('');
    setRemarks('');
  };

  const sourceLabel = (doc: EmployeeDocument) =>
    doc.sourceRequestNo
      ? `คำขอ ${doc.sourceRequestNo}`
      : doc.uploadedByEmployeeId != null && doc.uploadedByEmployeeId === doc.employeeId
      ? 'พนักงานอัปโหลดเอง'
      : 'ฝ่ายบุคคลอัปโหลด';

  const toggleRow = (id: number) => {
    resetUploadForm();
    setExpandedTypeId((cur) => (cur === id ? null : id));
  };

  const acceptFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      toast.warning('ไฟล์ต้องมีขนาดไม่เกิน 5 MB');
      return;
    }
    setFile(f);
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    acceptFile(f);
  };

  const handleSave = async () => {
    if (!typeId) return toast.warning('กรุณาเลือกประเภทเอกสาร');
    if (!file) return toast.warning('กรุณาแนบไฟล์เอกสาร');
    if (selectedType?.isExpiryRequired && !effectiveExpiry) return toast.warning('เอกสารประเภทนี้ต้องระบุวันหมดอายุ');
    if (issuedDate && effectiveExpiry && effectiveExpiry < issuedDate) return toast.warning('วันหมดอายุต้องไม่ก่อนวันที่ออกเอกสาร');

    setSaving(true);
    try {
      await employeeDocumentService.upload(employeeId, {
        documentTypeId: Number(typeId),
        fileName: file.name,
        fileData: await readAsDataUrl(file),
        issuedDate: issuedDate || undefined,
        expiryDate: effectiveExpiry || undefined,
        remarks: remarks.trim() || undefined,
      });
      toast.success('อัปโหลดเอกสารเข้าแฟ้มเรียบร้อย');
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
          <FolderOpen className="w-4 h-4 text-[#0B2046]" />
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

      {/* รายการหัวข้อเอกสาร — กดหัวข้อเพื่อเปิดช่องอัปโหลด */}
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
          <table className="table-standard text-xs w-full min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500 text-[11px]">
              <tr className="whitespace-nowrap">
                <th className="w-20 text-left font-semibold px-3 py-2.5">ลำดับ</th>
                <th className="text-left font-semibold px-4 py-2.5">เอกสาร</th>
                <th className="text-left font-semibold px-4 py-2.5">ไฟล์</th>
                <th className="text-left font-semibold px-4 py-2.5">วันที่อัปโหลด</th>
                <th className="text-left font-semibold px-4 py-2.5">วันหมดอายุ</th>
                <th className="text-left font-semibold px-4 py-2.5">ที่มา</th>
                <th className="text-right font-semibold px-4 py-2.5">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {rows.map((row, idx) => {
                const latest = row.docs[0];
                const isOpen = expandedTypeId === row.id;
                const badge = latest ? EXPIRY_BADGE[latest.expiryStatus] ?? EXPIRY_BADGE.NO_EXPIRY : null;
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => toggleRow(row.id)}
                      className={`cursor-pointer transition-colors ${isOpen ? 'bg-slate-50 dark:bg-slate-800/60' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <CheckCircle2 className={`w-5 h-5 ${latest ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{row.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {latest ? (
                          <>
                            <p className="break-all max-w-[200px]">{latest.fileName || '-'}</p>
                            <p className="text-[10px] text-slate-400">
                              {formatSize(latest.fileSize)}
                              {row.docs.length > 1 && ` · มีไฟล์ก่อนหน้า ${row.docs.length - 1} ไฟล์`}
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-400">ยังไม่ได้อัปโหลด</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">{latest ? formatDate(latest.uploadedAt) : '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {latest ? (
                          <>
                            <p className="text-slate-600 dark:text-slate-400">{formatDate(latest.expiryDate)}</p>
                            {badge && (
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${badge.className}`}>
                                {badge.label}
                                {latest.expiryStatus === 'EXPIRING_SOON' && latest.daysToExpiry != null ? ` (อีก ${latest.daysToExpiry} วัน)` : ''}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {latest ? (
                          <>
                            <p className="text-slate-700 dark:text-slate-300">{sourceLabel(latest)}</p>
                            {latest.uploadedByName && <p className="text-[10px] text-slate-400">{latest.uploadedByName}</p>}
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {latest?.hasFile && (
                            <button
                              type="button"
                              title="ดาวน์โหลด"
                              onClick={() => handleDownload(latest)}
                              disabled={downloadingId === latest.id}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0B2046] cursor-pointer disabled:opacity-50"
                            >
                              {downloadingId === latest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            </button>
                          )}
                          {latest && (canManage || isOwnUpload(latest)) && (
                            <button
                              type="button"
                              title="ลบ"
                              onClick={() => setDeleteTarget(latest)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            title={isOpen ? 'ปิด' : canUpload ? 'อัปโหลดเอกสาร' : 'ดูไฟล์'}
                            onClick={() => toggleRow(row.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-white dark:bg-slate-900/40">
                        <td colSpan={7} className="px-4 pb-4 pt-2 space-y-3">
                          {/* ไฟล์ก่อนหน้าในหัวข้อนี้ (ไฟล์ล่าสุดแสดงในแถวแล้ว) */}
                          {row.docs.length > 1 && (
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-semibold text-slate-500">ไฟล์ก่อนหน้า</p>
                              {row.docs.slice(1).map((doc) => {
                                const b = EXPIRY_BADGE[doc.expiryStatus] ?? EXPIRY_BADGE.NO_EXPIRY;
                                return (
                                  <div key={doc.id} className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div className="flex-1 min-w-[180px]">
                                      <p className="text-slate-800 dark:text-slate-200 break-all" title={doc.remarks || undefined}>
                                        {doc.fileName || '-'} <span className="text-[10px] text-slate-400">{formatSize(doc.fileSize)}</span>
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        ออก {formatDate(doc.issuedDate)} · หมดอายุ {formatDate(doc.expiryDate)} ·{' '}
                                        {sourceLabel(doc)}{' '}
                                        {formatDate(doc.uploadedAt)}
                                        {doc.uploadedByName ? ` · ${doc.uploadedByName}` : ''}
                                      </p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${b.className}`}>{b.label}</span>
                                    <div className="flex items-center gap-1">
                                      {doc.hasFile && (
                                        <button
                                          type="button"
                                          title="ดาวน์โหลด"
                                          onClick={() => handleDownload(doc)}
                                          disabled={downloadingId === doc.id}
                                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0B2046] cursor-pointer disabled:opacity-50"
                                        >
                                          {downloadingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                        </button>
                                      )}
                                      {(canManage || isOwnUpload(doc)) && (
                                        <button
                                          type="button"
                                          title="ลบ"
                                          onClick={() => setDeleteTarget(doc)}
                                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* ช่องอัปโหลด (ลากไฟล์มาวาง หรือกดเลือกไฟล์) */}
                          {canUpload && row.type && (
                            <div className="space-y-3">
                              <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={handlePickFile} />
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
                                  acceptFile(e.dataTransfer.files?.[0] ?? null);
                                }}
                                className={`flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-dashed cursor-pointer transition-colors ${
                                  dragOver
                                    ? 'border-[#0B2046] bg-slate-50 dark:bg-slate-800'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-[#0B2046] hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <UploadCloud className="w-9 h-9 text-slate-300 dark:text-slate-500" />
                                {file ? (
                                  <p className="text-slate-700 dark:text-slate-200 break-all px-4 text-center">
                                    {file.name} <span className="text-slate-400">({formatSize(file.size)})</span>
                                    <span className="block text-[10px] text-slate-400 mt-0.5">กดอีกครั้งเพื่อเปลี่ยนไฟล์</span>
                                  </p>
                                ) : (
                                  <p className="text-slate-500 dark:text-slate-400">
                                    ลากไฟล์วางที่นี่หรือ<span className="font-bold text-slate-700 dark:text-slate-200">เลือกไฟล์</span>
                                  </p>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400">ประเภทไฟล์ .pdf .jpg .png .doc (ไม่เกิน 5 MB)</p>

                              {file && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                  <div>
                                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">วันที่ออกเอกสาร</label>
                                    <ThaiDatePicker value={issuedDate} onChange={(val) => setIssuedDate(val)} />
                                  </div>
                                  <div>
                                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                      วันหมดอายุ {row.type.isExpiryRequired && <span className="text-rose-500">*</span>}
                                    </label>
                                    <ThaiDatePicker value={effectiveExpiry} minDate={issuedDate || undefined} onChange={(val) => setExpiryDate(val)} />
                                    {!expiryDate && autoExpiry && (
                                      <p className="text-[10px] text-slate-400 mt-1">คำนวณจากอายุเอกสาร {row.type.validityMonths} เดือน</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">หมายเหตุ</label>
                                    <input
                                      value={remarks}
                                      onChange={(e) => setRemarks(e.target.value)}
                                      className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none"
                                    />
                                  </div>
                                  <div className="sm:col-span-3 flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={resetUploadForm}
                                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                      ยกเลิก
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleSave}
                                      disabled={saving}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B2046] text-white hover:bg-[#153468] cursor-pointer disabled:opacity-60"
                                    >
                                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                      อัปโหลด
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {!canUpload && row.docs.length <= 1 && (
                            <p className="py-4 text-center text-slate-400">{row.docs.length === 0 ? 'ยังไม่มีไฟล์ในหัวข้อนี้' : 'ไม่มีไฟล์ก่อนหน้า'}</p>
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
