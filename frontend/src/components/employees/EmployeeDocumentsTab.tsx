'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Plus,
  Loader2,
  X,
  Upload,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { employeeDocumentService } from '@/services/employeeDocumentService';
import { masterDataService } from '@/services/masterDataService';
import { EmployeeDocument, DocumentExpiryStatus } from '@/types/employeeDocument';
import { DocumentTypeItem } from '@/types/master';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

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
}

export default function EmployeeDocumentsTab({ employeeId, canManage }: Props) {
  const toast = useToast();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ฟอร์มเพิ่มเอกสาร
  const [showUpload, setShowUpload] = useState(false);
  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [typeId, setTypeId] = useState<number | ''>('');
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

  const openUpload = async () => {
    setTypeId('');
    setFile(null);
    setIssuedDate('');
    setExpiryDate('');
    setRemarks('');
    setShowUpload(true);
    if (docTypes.length === 0) {
      try {
        setDocTypes(await masterDataService.getDocumentTypes('ACTIVE'));
      } catch {
        toast.error('ไม่สามารถโหลดประเภทเอกสารได้');
      }
    }
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      toast.warning('ไฟล์ต้องมีขนาดไม่เกิน 5 MB');
      return;
    }
    setFile(f);
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
      toast.success('เพิ่มเอกสารเข้าแฟ้มเรียบร้อย');
      setShowUpload(false);
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
        {canManage && (
          <button
            type="button"
            onClick={openUpload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#0B2046] text-[#0B2046] text-xs font-medium rounded-lg hover:bg-[#0B2046] hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่มเอกสาร
          </button>
        )}
      </div>

      {/* รายการ */}
      {loading ? (
        <div className="py-16 flex items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดเอกสาร...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      ) : documents.length === 0 ? (
        <div className="p-10 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">ยังไม่มีเอกสารในแฟ้มของพนักงานท่านนี้</p>
          <p className="text-[11px]">เอกสารจากคำขอเอกสารทั่วไปที่อนุมัติแล้วจะถูกเก็บเข้าแฟ้มนี้อัตโนมัติ</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60  text-slate-500 dark:text-slate-400 text-[11px]">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5">ประเภทเอกสาร</th>
                <th className="text-left font-semibold px-4 py-2.5">ไฟล์</th>
                <th className="text-left font-semibold px-4 py-2.5">วันที่ออก</th>
                <th className="text-left font-semibold px-4 py-2.5">วันหมดอายุ</th>
                <th className="text-left font-semibold px-4 py-2.5">ที่มา</th>
                <th className="text-right font-semibold px-4 py-2.5">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => {
                const badge = EXPIRY_BADGE[doc.expiryStatus] ?? EXPIRY_BADGE.NO_EXPIRY;
                return (
                  <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40/60 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{doc.documentTypeName}</p>
                      {doc.remarks && <p className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5 break-words max-w-[220px]">{doc.remarks}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 dark:text-slate-300 break-all max-w-[200px]">{doc.fileName || '-'}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400">{formatSize(doc.fileSize)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(doc.issuedDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-slate-600 dark:text-slate-400">{formatDate(doc.expiryDate)}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${badge.className}`}>
                        {badge.label}
                        {doc.expiryStatus === 'EXPIRING_SOON' && doc.daysToExpiry != null ? ` (อีก ${doc.daysToExpiry} วัน)` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 dark:text-slate-300">
                        {doc.sourceRequestNo ? `คำขอ ${doc.sourceRequestNo}` : 'ฝ่ายบุคคลอัปโหลด'}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400">
                        {formatDate(doc.uploadedAt)}
                        {doc.uploadedByName ? ` · ${doc.uploadedByName}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {doc.hasFile && (
                          <button
                            type="button"
                            title="ดาวน์โหลด"
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingId === doc.id}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0B2046] cursor-pointer disabled:opacity-50"
                          >
                            {downloadingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            title="ลบ"
                            onClick={() => setDeleteTarget(doc)}
                            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal เพิ่มเอกสาร */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg text-xs">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">เพิ่มเอกสารเข้าแฟ้มพนักงาน</h3>
              <button type="button" onClick={() => setShowUpload(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ประเภทเอกสาร <span className="text-rose-500">*</span>
                </label>
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="">-- เลือกประเภทเอกสาร --</option>
                  {docTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.documentName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ไฟล์เอกสาร <span className="text-rose-500">*</span>
                </label>
                <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={handlePickFile} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-[#0B2046] hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer text-left"
                >
                  <Upload className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 shrink-0" />
                  <span className={`break-all ${file ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                    {file ? `${file.name} (${formatSize(file.size)})` : 'เลือกไฟล์ PDF, JPG, PNG, DOC (ไม่เกิน 5 MB)'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">วันที่ออกเอกสาร</label>
                  <input
                    type="date"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    วันหมดอายุ {selectedType?.isExpiryRequired && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="date"
                    value={effectiveExpiry}
                    min={issuedDate || undefined}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:outline-none"
                  />
                  {!expiryDate && autoExpiry && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1">คำนวณจากอายุเอกสาร {selectedType?.validityMonths} เดือน</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">หมายเหตุ</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:outline-none resize-none break-words"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
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
                บันทึก
              </button>
            </div>
          </div>
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
