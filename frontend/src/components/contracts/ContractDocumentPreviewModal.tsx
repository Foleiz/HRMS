'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { contractService } from '@/services/contractService';
import { useToast } from '@/context/ToastContext';

interface ContractDocumentPreviewModalProps {
  contractId: number | null;
  fileName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractDocumentPreviewModal({
  contractId,
  fileName,
  isOpen,
  onClose,
}: ContractDocumentPreviewModalProps) {
  const toast = useToast();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [actualFileName, setActualFileName] = useState<string>(fileName || 'contract_document');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !contractId) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    contractService
      .getDocumentBlob(contractId, true)
      .then((res) => {
        if (!isMounted) return;
        const url = URL.createObjectURL(res.blob);
        setBlobUrl(url);
        setMimeType(res.mimeType);
        if (res.fileName) setActualFileName(res.fileName);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load contract document preview:', err);
        setError(err.message || 'ไม่สามารถโหลดตัวอย่างเอกสารสัญญาได้');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, contractId]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!contractId) return;
    try {
      const res = await contractService.getDocumentBlob(contractId, false);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = actualFileName || res.fileName || 'contract_document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('เริ่มการดาวน์โหลดเอกสารสัญญา');
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถดาวน์โหลดเอกสารได้');
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Toolbar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {actualFileName}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                เอกสารสัญญาจ้างงานต้นฉบับ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {blobUrl && (
              <>
                <button
                  type="button"
                  onClick={() => window.open(blobUrl, '_blank')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="เปิดในหน้าต่างใหม่"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">เปิดแท็บใหม่</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  title="ดาวน์โหลดไฟล์"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ดาวน์โหลด</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 flex-1 overflow-auto flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">กำลังโหลดเอกสารสัญญา...</p>
            </div>
          ) : error ? (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xs max-w-md border border-slate-200 dark:border-slate-700">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2.5" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                เกิดข้อผิดพลาดในการโหลดเอกสาร
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          ) : blobUrl && mimeType.includes('pdf') ? (
            <iframe
              src={blobUrl}
              title="PDF Contract Preview"
              className="w-full h-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white shadow-xs"
            />
          ) : blobUrl && mimeType.includes('image') ? (
            <div className="max-h-full max-w-full overflow-auto flex items-center justify-center p-2">
              <img
                src={blobUrl}
                alt={actualFileName}
                className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xs max-w-sm border border-slate-200 dark:border-slate-700">
              <FileText className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                ไฟล์ประเภทนี้ไม่สามารถแสดงผลแบบพรีวิวได้
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                กรุณาดาวน์โหลดเพื่อเปิดดูผ่านโปรแกรมบนอุปกรณ์ของคุณ
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0B2046] hover:bg-[#07152d] shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดไฟล์</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
