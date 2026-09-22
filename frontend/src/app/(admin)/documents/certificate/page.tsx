'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  ChevronLeft,
  Search,
  Filter,
  Loader2,
  Building2,
  FileText,
  Calendar,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { CertificateRequest, CertificateType } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';

const PURPOSE_SUGGESTIONS = [
  'เพื่อใช้ยื่นขอสินเชื่อที่อยู่อาศัยกับสถาบันการเงิน',
  'เพื่อใช้ประกอบการขอวีซ่าเดินทางต่างประเทศ',
  'เพื่อใช้สมัครเข้าศึกษาต่อในระดับอุดมศึกษา',
  'เพื่อใช้เป็นหลักฐานแสดงการทำงานและรายได้',
  'เพื่อใช้เปิดบัญชีหรือทำธุรกรรมทางการเงิน',
];

export default function CertificatePage() {
  const { setBreadcrumb } = useBreadcrumb();

  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [types, setTypes] = useState<CertificateType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // New Request Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<number | ''>('');
  const [purpose, setPurpose] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'TH' | 'EN'>('TH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Preview Modal State
  const [previewRequestId, setPreviewRequestId] = useState<number | null>(null);

  // Cancel Action State
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    setBreadcrumb({ section: 'ยื่นเอกสาร', page: 'ขอหนังสือรับรอง' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [typeList, reqList] = await Promise.all([
        certificateService.getCertificateTypes(),
        certificateService.getMyRequests(),
      ]);
      setTypes(typeList);
      setRequests(reqList);
      if (typeList.length > 0 && selectedTypeId === '') {
        setSelectedTypeId(typeList[0].id);
      }
    } catch (err) {
      console.error('Error loading certificate data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTypeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId || !purpose.trim()) {
      setCreateError('กรุณาเลือกประเภทหนังสือรับรองและระบุวัตถุประสงค์');
      return;
    }

    try {
      setIsSubmitting(true);
      setCreateError(null);
      await certificateService.createRequest({
        certificateTypeId: Number(selectedTypeId),
        purpose: purpose.trim(),
        language: selectedLanguage,
        notes: notes.trim() || undefined,
      });

      setIsCreateModalOpen(false);
      setPurpose('');
      setNotes('');
      await loadData();
    } catch (err: any) {
      console.error('Error submitting certificate request:', err);
      setCreateError(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการยื่นคำขอ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('คุณต้องการยกเลิกคำขอหนังสือรับรองฉบับนี้ใช่หรือไม่?')) return;
    try {
      setCancellingId(id);
      await certificateService.cancelRequest(id);
      await loadData();
    } catch (err) {
      console.error('Error cancelling certificate request:', err);
      alert('ไม่สามารถยกเลิกคำขอได้');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const months = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
      ];
      const thaiYear = d.getFullYear() + 543;
      return `${d.getDate()} ${months[d.getMonth()]} ${thaiYear}`;
    } catch {
      return isoString;
    }
  };

  // Stats counters
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED' || r.status === 'ISSUED').length;
  const cancelledCount = requests.filter((r) => r.status === 'CANCELLED' || r.status === 'REJECTED').length;

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (activeFilter === 'PENDING' && r.status !== 'PENDING') return false;
    if (activeFilter === 'APPROVED' && r.status !== 'APPROVED' && r.status !== 'ISSUED') return false;
    if (activeFilter === 'CANCELLED' && r.status !== 'CANCELLED' && r.status !== 'REJECTED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchType = r.certificateName?.toLowerCase().includes(q);
      const matchPurpose = r.purpose?.toLowerCase().includes(q);
      return matchType || matchPurpose;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation Back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          ย้อนกลับสู่ศูนย์รวมเอกสาร
        </Link>

        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-2xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          ยื่นขอหนังสือรับรองใหม่
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B2046] to-[#1E3A8A] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-2xs font-semibold text-white/90 mb-3 border border-white/10">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-300" />
            ระบบบริการตนเองของพนักงาน
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            ขอหนังสือรับรองเงินเดือนและการทำงาน
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 mt-2 leading-relaxed">
            ยื่นขอหนังสือรับรองผ่านระบบออนไลน์ พร้อมติดตามสถานะการอนุมัติ
            และพิมพ์เอกสารทางการที่มีลายเซ็นดิจิทัลรับรองถูกต้องได้ทันที
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute right-6 -bottom-6 opacity-10 pointer-events-none">
          <FileText className="w-56 h-56 text-white" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xs text-slate-400 block">คำขอทั้งหมด</span>
            <span className="text-base font-bold text-slate-900">{totalCount} รายการ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xs text-slate-400 block">รอดำเนินการ</span>
            <span className="text-base font-bold text-amber-600">{pendingCount} รายการ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xs text-slate-400 block">อนุมัติแล้ว</span>
            <span className="text-base font-bold text-emerald-600">{approvedCount} รายการ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xs text-slate-400 block">ยกเลิกหรือปฏิเสธ</span>
            <span className="text-base font-bold text-slate-600">{cancelledCount} รายการ</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Filter & Search Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100/70 p-1 rounded-2xl text-xs gap-1">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ทั้งหมด ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'PENDING'
                  ? 'bg-white text-amber-700 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              รอดำเนินการ ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'APPROVED'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              อนุมัติแล้ว ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'CANCELLED'
                  ? 'bg-white text-slate-700 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ยกเลิก ({cancelledCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามวัตถุประสงค์..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#0B2046]" />
              <p className="text-xs">กำลังโหลดรายการคำขอ...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <FileCheck2 className="w-10 h-10 text-slate-300" />
              <p className="text-xs">ไม่พบรายการคำขอหนังสือรับรอง</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-5">วันที่ยื่นคำขอ</th>
                  <th className="py-3 px-5">ประเภทหนังสือรับรอง</th>
                  <th className="py-3 px-5">วัตถุประสงค์</th>
                  <th className="py-3 px-5">สถานะ</th>
                  <th className="py-3 px-5">วันที่ออกเอกสาร</th>
                  <th className="py-3 px-5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRequests.map((req) => {
                  const isApproved = req.status === 'APPROVED' || req.status === 'ISSUED';
                  const isPending = req.status === 'PENDING';
                  const isCancelled = req.status === 'CANCELLED';
                  const isRejected = req.status === 'REJECTED';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-slate-600">
                        {formatDate(req.requestedAt)}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-semibold text-slate-900 block">
                          {req.certificateName}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 max-w-xs">
                        <span className="text-slate-600 block truncate" title={req.purpose}>
                          {req.purpose || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            อนุมัติแล้ว
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            รอดำเนินการ
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            ไม่อนุมัติ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-slate-100 text-slate-600">
                            ยกเลิกแล้ว
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 font-mono">
                        {req.issuedAt ? formatDate(req.issuedAt) : '-'}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => setPreviewRequestId(req.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-2xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              ดูเอกสารและพิมพ์
                            </button>
                          )}

                          {req.canCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancel(req.id)}
                              disabled={cancellingId === req.id}
                              className="px-2.5 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-2xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {cancellingId === req.id ? 'กำลังยกเลิก...' : 'ยกเลิกคำขอ'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCreateModalOpen(false)}
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ยื่นคำขอหนังสือรับรองใหม่
                  </h3>
                  <p className="text-2xs text-slate-400 mt-0.5">
                    เลือกประเภทและระบุวัตถุประสงค์เพื่อส่งให้ฝ่ายบุคคลอนุมัติ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Certificate Type Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  ประเภทหนังสือรับรอง <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  required
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.certificateName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purpose Input & Suggestions */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  วัตถุประสงค์ในการขอหนังสือรับรอง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="เช่น เพื่อใช้ยื่นขอสินเชื่อที่อยู่อาศัย..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  required
                />

                {/* Quick suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PURPOSE_SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPurpose(s)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-600 transition-colors cursor-pointer"
                    >
                      + {s.length > 25 ? s.substring(0, 25) + '...' : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  รูปแบบภาษาของเอกสาร
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedLanguage === 'TH'
                        ? 'bg-blue-50/60 border-blue-300 text-[#0B2046] font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="certLang"
                        checked={selectedLanguage === 'TH'}
                        onChange={() => setSelectedLanguage('TH')}
                        className="accent-[#0B2046]"
                      />
                      <span>ภาษาไทย</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedLanguage === 'EN'
                        ? 'bg-blue-50/60 border-blue-300 text-[#0B2046] font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="certLang"
                        checked={selectedLanguage === 'EN'}
                        onChange={() => setSelectedLanguage('EN')}
                        className="accent-[#0B2046]"
                      />
                      <span>ฉบับสากล</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Additional Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="ระบุข้อมูลเพิ่มเติมถึงฝ่ายบุคคล..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      กำลังส่งคำขอ...
                    </>
                  ) : (
                    'ยืนยันการยื่นคำขอ'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Certificate Preview & Print Modal */}
      <CertificatePreviewModal
        isOpen={previewRequestId !== null}
        onClose={() => setPreviewRequestId(null)}
        requestId={previewRequestId}
      />
    </div>
  );
}
