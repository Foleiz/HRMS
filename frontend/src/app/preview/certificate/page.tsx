'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { Printer, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { CertificateDocument } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';
import { CertificatePaper } from '@/components/documents/CertificatePreviewModal';
import {
  useCompanyDocumentInfo,
  useApprovalSlots,
  useEmployeeSignature,
} from '@/components/documents/documentFormParts';

function CertificatePreviewContent() {
  const searchParams = useSearchParams();

  const typeIdStr = searchParams.get('typeId');
  const requestIdStr = searchParams.get('requestId');
  const lang = searchParams.get('lang') || 'TH';

  const typeId = typeIdStr ? Number(typeIdStr) : null;
  const requestId = requestIdStr ? Number(requestIdStr) : null;

  const [doc, setDoc] = useState<CertificateDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { companyLogo, companyAddress } = useCompanyDocumentInfo(true);

  useEffect(() => {
    let active = true;
    const fetchDoc = async () => {
      try {
        setLoading(true);
        setError(null);
        if (requestId) {
          const res = await certificateService.getDocument(requestId, lang);
          if (active) setDoc(res);
        } else if (typeId) {
          const res = await certificateService.previewDocument(typeId, '', lang);
          if (active) setDoc(res);
        } else {
          if (active) setError('ไม่พบรหัสประเภทหนังสือรับรอง');
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || err.message || 'ไม่สามารถโหลดตัวอย่างหนังสือรับรองได้');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDoc();
    return () => {
      active = false;
    };
  }, [typeId, requestId, lang]);

  const approvalSlots = useApprovalSlots({
    isOpen: !!doc,
    documentType: 'CERTIFICATE_REQUEST',
    employeeId: doc?.employeeId,
    timeline: doc?.approvalTimeline,
    isExistingDocument: !!requestId,
  });

  const requesterSignature = useEmployeeSignature(!!doc, doc?.employeeId, doc?.requestedAt);

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.close();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans">
      {/* Top Header Toolbar */}
      <header className="no-print sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="w-5 h-5 text-primary dark:text-blue-400 shrink-0" />
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
            {doc?.certificateTitle || 'ตัวอย่างหนังสือรับรอง'}
          </h1>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md font-medium shrink-0 hidden sm:inline">
            เปิดในแท็บใหม่ (A4)
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            type="button"
            onClick={() => window.print()}
            disabled={loading || !doc}
            icon={<Printer className="w-4 h-4" />}
          >
            พิมพ์เอกสาร
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={handleClose}
            icon={<X className="w-4 h-4" />}
          >
            ปิดหน้านี้
          </Button>
        </div>
      </header>

      {/* Preview Area */}
      <main className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-blue-400" />
            <p className="text-sm font-medium">กำลังจัดเตรียมหนังสือรับรอง...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center max-w-md">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="text-sm text-rose-600 font-medium mb-4">{error}</p>
            <Button variant="secondary" onClick={handleClose}>
              ปิดหน้านี้
            </Button>
          </div>
        ) : doc ? (
          <div className="shadow-lg border border-slate-300 dark:border-slate-700 bg-white">
            <CertificatePaper
              doc={doc}
              companyLogo={companyLogo}
              companyAddress={companyAddress}
              approvalSlots={approvalSlots}
              requesterSignatureSrc={requesterSignature.src}
              onRequesterSignatureError={requesterSignature.clear}
            />
          </div>
        ) : null}
      </main>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body,
          html {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function CertificatePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
          <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-blue-400" />
        </div>
      }
    >
      <CertificatePreviewContent />
    </Suspense>
  );
}
