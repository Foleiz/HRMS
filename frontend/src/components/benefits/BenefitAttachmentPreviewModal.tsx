'use client';

import React, { useState, useEffect } from 'react';
import { ModalShell } from '@/components/ui/ModalShell';
import {
  FileText,
  Download,
  X,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import { benefitService } from '@/services/benefitService';
import { useToast } from '@/context/ToastContext';

interface BenefitAttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimId: number | null;
  fileName?: string | null;
  title?: string;
  requestNo?: string | null;
}

export default function BenefitAttachmentPreviewModal({
  isOpen,
  onClose,
  claimId,
  fileName,
  title = 'เอกสารแนบ / ใบเสร็จรับเงิน',
  requestNo,
}: BenefitAttachmentPreviewModalProps) {
  const toast = useToast();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [actualFileName, setActualFileName] = useState<string>(fileName || 'receipt');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !claimId) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setError(null);
      setZoomLevel(1);
      setRotation(0);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setZoomLevel(1);
    setRotation(0);

    benefitService
      .downloadClaimAttachment(claimId)
      .then((blob) => {
        if (!isMounted) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setMimeType(blob.type || '');
        if (fileName) {
          setActualFileName(fileName);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load attachment:', err);
        setError('ไม่สามารถเปิดไฟล์แนบได้ หรือไม่มีสิทธิ์เข้าถึงไฟล์นี้');
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
  }, [isOpen, claimId, fileName]);

  if (!isOpen) return null;

  const effectiveFileName = actualFileName || fileName || 'receipt';
  const lowerName = effectiveFileName.toLowerCase();
  const isImage =
    mimeType.startsWith('image/') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.gif') ||
    lowerName.endsWith('.bmp');

  const isPdf = mimeType.includes('pdf') || lowerName.endsWith('.pdf');

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = effectiveFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('ดาวน์โหลดไฟล์แนบเรียบร้อยแล้ว');
  };

  const handleOpenInNewTab = () => {
    if (!blobUrl) return;
    window.open(blobUrl, '_blank');
  };

  const zoomIn = () => setZoomLevel((z) => Math.min(3, z + 0.25));
  const zoomOut = () => setZoomLevel((z) => Math.max(0.5, z - 0.25));
  const rotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <ModalShell
      className="no-print z-50 bg-slate-900/70 backdrop-blur-xs font-sans"
      innerClassName="items-center justify-center p-2 sm:p-4"
      portal={false}
    >
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[950px] max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 min-w-0">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
              {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {requestNo ? `เลขที่คำขอ: ${requestNo} • ` : ''}
                {effectiveFileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {blobUrl && (
              <button
                type="button"
                onClick={handleOpenInNewTab}
                title="เปิดในแท็บใหม่"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950/80 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[350px]">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium">กำลังโหลดเอกสารแนบ...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600 dark:text-rose-400 max-w-md px-4">
              <Paperclip className="w-10 h-10 text-rose-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold">{error}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบหากปัญหายังคงอยู่
              </p>
            </div>
          ) : blobUrl && isPdf ? (
            <div className="w-full max-w-[880px] h-[72vh] shadow-lg rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white">
              <iframe
                src={blobUrl}
                title={effectiveFileName}
                className="w-full h-full bg-white"
              />
            </div>
          ) : blobUrl && isImage ? (
            <div className="w-full flex flex-col items-center justify-center">
              {/* Image Controls toolbar */}
              <div className="flex items-center gap-1.5 mb-3 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1 shadow-xs">
                <button
                  type="button"
                  onClick={zoomOut}
                  title="ย่อขนาด (-)"
                  className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={zoomIn}
                  title="ขยายขนาด (+)"
                  className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={rotate}
                  title="หมุนรูปภาพ 90°"
                  className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Image Container with Scroll & Zoom */}
              <div className="w-full max-h-[68vh] overflow-auto flex items-center justify-center p-2">
                <img
                  src={blobUrl}
                  alt={effectiveFileName}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-md border border-slate-200 dark:border-slate-700 bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                ไฟล์ประเภทนี้ไม่สามารถแสดงตัวอย่างบนเบราว์เซอร์ได้โดยตรง
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                คุณสามารถกดปุ่มดาวน์โหลดด้านล่างเพื่อเปิดไฟล์บนเครื่องของคุณ
              </p>
              {blobUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  ดาวน์โหลดไฟล์ ({effectiveFileName})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-800 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[320px]">
            <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{effectiveFileName}</span>
          </div>

          <div className="flex items-center gap-2">
            {blobUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                ดาวน์โหลด
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
