'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Calendar,
  X,
  Eye,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { attendanceImportService } from '@/services/attendanceImportService';
import {
  AttendanceImportBatch,
  AttendanceImportResult,
  AttendanceImportError,
  AttendanceImportFilterQuery
} from '@/types/attendanceImport';

export default function AttendanceImportPage() {
  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [source, setSource] = useState<string>('FINGERPRINT');
  const [deviceName, setDeviceName] = useState<string>('');
  const [allowDuplicate, setAllowDuplicate] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<AttendanceImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Batches Table State
  const [batches, setBatches] = useState<AttendanceImportBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Error Log Modal State
  const [selectedBatchForErrors, setSelectedBatchForErrors] = useState<AttendanceImportBatch | null>(null);
  const [errorLogs, setErrorLogs] = useState<AttendanceImportError[]>([]);
  const [isLoadingErrors, setIsLoadingErrors] = useState<boolean>(false);
  const [errorPage, setErrorPage] = useState<number>(1);
  const [errorTotalPages, setErrorTotalPages] = useState<number>(1);
  const [errorTotalCount, setErrorTotalCount] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Batches
  const loadBatches = async () => {
    try {
      setIsLoadingBatches(true);
      const query: AttendanceImportFilterQuery = {
        page,
        pageSize: 10,
        source: filterSource,
        status: filterStatus,
        search: searchQuery || undefined,
      };
      const res = await attendanceImportService.getBatches(query);
      setBatches(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.totalCount);
    } catch (err: any) {
      console.error('Failed to load batches:', err);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [page, filterSource, filterStatus]);

  // Handle Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadBatches();
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      setErrorMessage('ระบบรองรับเฉพาะไฟล์นามสกุล .xlsx, .xls หรือ .csv เท่านั้น');
      setSelectedFile(null);
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
    setUploadResult(null);
  };

  // Upload Submission
  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setErrorMessage(null);

      const res = await attendanceImportService.uploadFile(
        selectedFile,
        source,
        deviceName || undefined,
        allowDuplicate,
        (percent) => setUploadProgress(percent)
      );

      if (res.success && res.data) {
        setUploadResult(res.data);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadBatches();
      } else {
        setErrorMessage(res.message || 'เกิดข้อผิดพลาดในการประมวลผลไฟล์');
        if (res.data) setUploadResult(res.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Download Template
  const handleDownloadTemplate = async () => {
    try {
      await attendanceImportService.downloadTemplate('xlsx');
    } catch (err: any) {
      alert('ไม่สามารถดาวน์โหลดไฟล์แม่แบบได้ในขณะนี้: ' + (err.message || 'ข้อผิดพลาด'));
    }
  };

  // Open Error Modal
  const handleOpenErrors = async (batch: AttendanceImportBatch) => {
    setSelectedBatchForErrors(batch);
    setErrorPage(1);
    await loadErrorLogs(batch.id, 1);
  };

  const loadErrorLogs = async (batchId: number, targetPage: number) => {
    try {
      setIsLoadingErrors(true);
      const res = await attendanceImportService.getBatchErrors(batchId, targetPage, 20);
      setErrorLogs(res.items);
      setErrorTotalPages(res.totalPages);
      setErrorTotalCount(res.totalCount);
    } catch (err: any) {
      console.error('Failed to load error logs:', err);
    } finally {
      setIsLoadingErrors(false);
    }
  };

  // Format Helpers
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatThaiDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' น.';
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IMPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            สำเร็จครบถ้วน
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            สำเร็จบางส่วน
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            ล้มเหลว
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getSourceLabel = (src?: string | null) => {
    switch (src) {
      case 'FINGERPRINT':
        return 'เครื่องสแกนลายนิ้วมือ';
      case 'FACE_SCAN':
        return 'เครื่องสแกนใบหน้า';
      case 'EXCEL':
        return 'ไฟล์ Excel บันทึกเวลา';
      case 'CSV':
        return 'ไฟล์ CSV';
      case 'EXTERNAL':
        return 'ระบบภายนอก';
      default:
        return src || '-';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                นำเข้าเวลาสแกนนิ้วและไฟล์บันทึกเวลา
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                อัปโหลดไฟล์ Excel/CSV จากเครื่องสแกนเพื่อคำนวณเวลาเข้า-ออกงาน อัตราการมาสาย และ OT อัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" />
            ดาวน์โหลดไฟล์ตัวอย่าง (Template)
          </button>
          <Link
            href="/attendance/daily"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Clock className="w-4 h-4" />
            ตรวจบันทึกเวลาประจำวัน
          </Link>
        </div>
      </div>

      {/* 2. Upload Section Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            อัปโหลดไฟล์ข้อมูลเวลาเข้างาน
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            รองรับไฟล์ Excel (.xlsx, .xls) และ CSV พร้อมระบบตรวจจับคอลัมน์อัตโนมัติ (รหัสพนักงาน, วันที่, เวลา, สถานะเข้า/ออก)
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">ขนาด: {formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  ยกเลิกเลือกไฟล์
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    ลากไฟล์มาวางที่นี่ หรือ <span className="text-blue-600 hover:underline">คลิกเพื่อเลือกไฟล์</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    รองรับไฟล์ประเภท .xlsx, .xls หรือ .csv (ขนาดไม่เกิน 20MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                แหล่งที่มาของข้อมูล (Source)
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="FINGERPRINT">เครื่องสแกนลายนิ้วมือ</option>
                <option value="FACE_SCAN">เครื่องสแกนใบหน้า</option>
                <option value="EXCEL">ไฟล์ Excel บันทึกเวลา</option>
                <option value="CSV">ไฟล์ CSV ข้อมูลเวลา</option>
                <option value="EXTERNAL">ระบบภายนอก</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ชื่อเครื่องสแกน / จุดบันทึก (ระบุหรือไม่ก็ได้)
              </label>
              <input
                type="text"
                placeholder="เช่น เครื่องสแกนประตูหน้า ชั้น 1"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowDuplicate}
                  onChange={(e) => setAllowDuplicate(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">
                  อนุญาตให้อัปโหลดซ้ำ (บังคับนำเข้ากรณีตรวจพบไฟล์เดิม)
                </span>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">แจ้งเตือนข้อผิดพลาด</p>
                <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  กำลังส่งข้อมูลและประมวลผลกะการทำงาน...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!selectedFile || isUploading}
              onClick={handleUploadSubmit}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all ${
                !selectedFile || isUploading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-[0.98]'
              }`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังประมวลผล...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  เริ่มประมวลผลนำเข้าไฟล์
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Upload Result Banner */}
      {uploadResult && (
        <div className={`p-6 rounded-2xl border shadow-sm ${
          uploadResult.status === 'IMPORTED'
            ? 'bg-emerald-50/50 border-emerald-200'
            : uploadResult.status === 'PARTIAL'
            ? 'bg-amber-50/50 border-amber-200'
            : 'bg-rose-50/50 border-rose-200'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                {uploadResult.status === 'IMPORTED' && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                {uploadResult.status === 'PARTIAL' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                {uploadResult.status === 'FAILED' && <AlertCircle className="w-6 h-6 text-rose-600" />}
                <h3 className="text-base font-bold text-slate-900">
                  {uploadResult.status === 'IMPORTED' && 'นำเข้าข้อมูลเวลาสำเร็จครบถ้วน!'}
                  {uploadResult.status === 'PARTIAL' && 'นำเข้าข้อมูลสำเร็จบางส่วน (พบข้อผิดพลาดบางรายการ)'}
                  {uploadResult.status === 'FAILED' && 'การนำเข้าล้มเหลว ไม่พบข้อมูลที่ถูกต้อง'}
                </h3>
                {getStatusBadge(uploadResult.status)}
              </div>
              <p className="text-xs text-slate-600">
                ไฟล์: <span className="font-semibold text-slate-900">{uploadResult.fileName}</span> | ชุดที่: #{uploadResult.batchId}
                {uploadResult.dateFrom && uploadResult.dateTo && (
                  <> | ช่วงวันที่: <span className="font-semibold">{uploadResult.dateFrom} ถึง {uploadResult.dateTo}</span></>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {uploadResult.failedRecords > 0 && (
                <button
                  onClick={() => {
                    const mockBatch: AttendanceImportBatch = {
                      id: uploadResult.batchId,
                      fileName: uploadResult.fileName,
                      fileHash: uploadResult.fileHash,
                      source: uploadResult.source,
                      deviceName: null,
                      unitName: null,
                      dateFrom: uploadResult.dateFrom,
                      dateTo: uploadResult.dateTo,
                      importedByUserId: null,
                      importedByUserName: null,
                      importedAt: new Date().toISOString(),
                      totalRecords: uploadResult.totalRecords,
                      successRecords: uploadResult.successRecords,
                      failedRecords: uploadResult.failedRecords,
                      status: uploadResult.status,
                    };
                    handleOpenErrors(mockBatch);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-100/80 hover:bg-rose-200 border border-rose-300 transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                  ดูข้อผิดพลาด ({uploadResult.failedRecords} รายการ)
                </button>
              )}

              <Link
                href="/attendance/daily"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-300 transition-colors"
              >
                ดูข้อมูลที่นำเข้าในหน้าตรวจบันทึกเวลา
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={() => setUploadResult(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
                title="ปิดกล่องแจ้งเตือนนี้"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200/60">
            <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 text-center">
              <p className="text-xs font-semibold text-slate-500">จำนวนแถวทั้งหมด</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{uploadResult.totalRecords.toLocaleString()} แถว</p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 text-center">
              <p className="text-xs font-semibold text-emerald-700">สำเร็จ</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">{uploadResult.successRecords.toLocaleString()} รายการ</p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-rose-200 text-center">
              <p className="text-xs font-semibold text-rose-700">ข้อผิดพลาด</p>
              <p className="text-xl font-black text-rose-600 mt-0.5">{uploadResult.failedRecords.toLocaleString()} รายการ</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Batch History Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header & Filters */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              ประวัติการนำเข้าไฟล์ย้อนหลัง
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              รายการชุดข้อมูลไฟล์บันทึกเวลาทั้งหมดที่เคยนำเข้าสู่ระบบ ({totalCount.toLocaleString()} รายการ)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="ค้นหาชื่อไฟล์, อุปกรณ์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-56"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </form>

            {/* Source Filter */}
            <select
              value={filterSource}
              onChange={(e) => {
                setFilterSource(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">แหล่งที่มา: ทั้งหมด</option>
              <option value="FINGERPRINT">เครื่องสแกนลายนิ้วมือ</option>
              <option value="FACE_SCAN">เครื่องสแกนใบหน้า</option>
              <option value="EXCEL">ไฟล์ Excel</option>
              <option value="CSV">ไฟล์ CSV</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">สถานะ: ทั้งหมด</option>
              <option value="IMPORTED">สำเร็จครบถ้วน</option>
              <option value="PARTIAL">สำเร็จบางส่วน</option>
              <option value="FAILED">ล้มเหลว</option>
            </select>

            <button
              onClick={() => {
                setPage(1);
                loadBatches();
              }}
              className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              title="รีเฟรชตาราง"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingBatches ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Responsive Table with whitespace-nowrap */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap">ชุดที่</th>
                <th className="py-3.5 px-4 whitespace-nowrap">วันที่นำเข้า</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ชื่อไฟล์</th>
                <th className="py-3.5 px-4 whitespace-nowrap">แหล่งที่มา</th>
                <th className="py-3.5 px-4 whitespace-nowrap">เครื่องสแกน / อุปกรณ์</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ช่วงวันที่ข้อมูล</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">รวม (แถว)</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">สำเร็จ</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">ผิดพลาด</th>
                <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ผู้นำเข้า</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingBatches ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    กำลังโหลดข้อมูลประวัติการนำเข้า...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    ไม่พบรายการประวัติการนำเข้าไฟล์
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      #{batch.id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      {formatThaiDate(batch.importedAt)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate whitespace-nowrap" title={batch.fileName || ''}>
                      {batch.fileName || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg text-slate-700 bg-slate-100 border border-slate-200 text-2xs font-semibold">
                        {getSourceLabel(batch.source)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {batch.deviceName || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {batch.dateFrom && batch.dateTo ? (
                        <span>{batch.dateFrom} ถึง {batch.dateTo}</span>
                      ) : batch.dateFrom ? (
                        <span>{batch.dateFrom}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 whitespace-nowrap">
                      {batch.totalRecords.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                      {batch.successRecords.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold whitespace-nowrap">
                      {batch.failedRecords > 0 ? (
                        <span className="text-rose-600">{batch.failedRecords.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(batch.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {batch.importedByUserName || 'ระบบอัตโนมัติ'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {batch.failedRecords > 0 && (
                          <button
                            onClick={() => handleOpenErrors(batch)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            ดูข้อผิดพลาด
                          </button>
                        )}
                        <Link
                          href={`/attendance/daily?date=${batch.dateFrom || ''}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          ตรวจเวลา
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            แสดงหน้า <span className="font-bold text-slate-800">{page}</span> จาก{' '}
            <span className="font-bold text-slate-800">{totalPages || 1}</span> หน้า
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Error Log Detail Modal */}
      {selectedBatchForErrors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    รายการข้อผิดพลาดของการนำเข้า (Error Logs)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ชุดที่ #{selectedBatchForErrors.id} | ไฟล์: {selectedBatchForErrors.fileName} ({errorTotalCount.toLocaleString()} รายการ)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatchForErrors(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Table */}
            <div className="p-5 overflow-y-auto flex-1">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">แถวที่</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">รหัสพนักงาน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">ชื่อพนักงาน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">แผนก</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">วันเวลาที่สแกน</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-rose-600">สาเหตุข้อผิดพลาด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingErrors ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
                          กำลังโหลด Error Logs...
                        </td>
                      </tr>
                    ) : errorLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          ไม่พบรายการข้อผิดพลาดในชุดนี้
                        </td>
                      </tr>
                    ) : (
                      errorLogs.map((err) => (
                        <tr key={err.id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="py-3 px-3.5 text-center font-bold text-slate-700 whitespace-nowrap">
                            {err.rowNumber}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                            {err.employeeCode || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-800 whitespace-nowrap">
                            {err.employeeName || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                            {err.departmentName || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                            {err.rawPunchTimestamp || '-'}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-rose-600 whitespace-nowrap">
                            {err.errorMessage}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                แสดงหน้า {errorPage} จาก {errorTotalPages || 1} หน้า
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={errorPage <= 1}
                  onClick={() => {
                    const nextP = errorPage - 1;
                    setErrorPage(nextP);
                    loadErrorLogs(selectedBatchForErrors.id, nextP);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  ย้อนกลับ
                </button>
                <button
                  disabled={errorPage >= errorTotalPages}
                  onClick={() => {
                    const nextP = errorPage + 1;
                    setErrorPage(nextP);
                    loadErrorLogs(selectedBatchForErrors.id, nextP);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  ถัดไป
                </button>
                <button
                  onClick={() => setSelectedBatchForErrors(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors ml-2"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
