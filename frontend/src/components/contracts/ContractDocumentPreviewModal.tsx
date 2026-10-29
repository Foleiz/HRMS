'use client';

import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  Loader2,
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
    <ModalShell
      className="leave-modal no-print z-50 bg-slate-900/60 backdrop-blur-xs font-sans"
      innerClassName="items-center justify-center p-2 sm:p-4"
      portal={false}
    >
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[900px] max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header - Matching Image 1 (LeavePreviewModal) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <FileText className="w-5 h-5 text-primary dark:text-blue-400" />
            <h3 className="text-base font-bold">ตัวอย่างแบบฟอร์มเอกสารสัญญา</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Viewer Body - Matching Image 1 paper style */}
        <div className="flex-1 overflow-auto bg-slate-200/70 dark:bg-slate-950 py-6 px-4">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-blue-400" />
              <p className="text-xs">กำลังโหลดเอกสารสัญญา...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600 dark:text-rose-400 text-sm">
              {error}
            </div>
          ) : blobUrl && mimeType.includes('pdf') ? (
            <div className="mx-auto w-full max-w-[850px] h-[75vh] shadow-md border border-gray-300 dark:border-slate-700 bg-white">
              <iframe
                src={blobUrl}
                title="PDF Contract Preview"
                className="w-full h-full bg-white"
              />
            </div>
          ) : blobUrl && mimeType.includes('image') ? (
            <div className="mx-auto w-fit shadow-md border border-gray-300 dark:border-slate-700 bg-white">
              <img
                src={blobUrl}
                alt={actualFileName}
                className="max-h-[75vh] max-w-full object-contain bg-white block"
              />
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                ไฟล์ประเภทนี้ไม่สามารถแสดงผลแบบพรีวิวได้
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                กรุณาดาวน์โหลดเพื่อเปิดดูผ่านโปรแกรมบนอุปกรณ์ของคุณ
              </p>
            </div>
          )}
        </div>

        {/* Footer Toolbar - Matching Image 1 */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-800 flex-wrap">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[280px]">
            {actualFileName}
          </div>

          <div className="flex items-center gap-2">
            {blobUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลด
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
