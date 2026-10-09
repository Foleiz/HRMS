'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  Paperclip,
  AlertCircle,
  Building,
  Briefcase,
  User,
} from 'lucide-react';
import { EmploymentContract } from '@/types/contract';
import { contractService } from '@/services/contractService';
import { useToast } from '@/context/ToastContext';

interface AttachContractModalProps {
  contract: EmploymentContract | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedContract: EmploymentContract) => void;
}

export default function AttachContractModal({
  contract,
  isOpen,
  onClose,
  onSuccess,
}: AttachContractModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFileData(null);
    setFileName('');
    setFileSize(0);
    setErrorMessage(null);
  }, [contract, isOpen]);

  if (!isOpen || !contract) return null;

  const processFile = (file: File) => {
    setErrorMessage(null);
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('ไฟล์มีขนาดเกิน 10 MB กรุณาเลือกไฟล์ใหม่');
      return;
    }

    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));
    if (!isValid) {
      setErrorMessage('รองรับเฉพาะไฟล์ PDF, PNG, JPG, DOCX เท่านั้น');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
      setFileName(file.name);
      setFileSize(file.size);
    };
    reader.onerror = () => {
      setErrorMessage('ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveSelectedFile = () => {
    setFileData(null);
    setFileName('');
    setFileSize(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileData || !fileName) {
      setErrorMessage('กรุณาเลือกไฟล์เอกสารสัญญาจ้างก่อนบันทึก');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const updated = await contractService.uploadDocument(contract.id, fileData, fileName);
      toast.success(`แนบเอกสารสัญญาสำหรับ ${contract.employeeName} สำเร็จแล้ว`);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to attach document:', err);
      setErrorMessage(err.message || 'ไม่สามารถอัปโหลดเอกสารสัญญาได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                แนบเอกสารสัญญาจ้างงาน
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                อัปโหลดไฟล์สัญญาจ้างงานเพื่อเก็บในระบบรายบุคคล
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Employee Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {contract.employeeName}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {contract.employeeCode}
                </span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                {contract.employeeTypeName || contract.contractTypeDisplay}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {contract.departmentName && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {contract.departmentName}
                </span>
              )}
              {contract.positionTitle && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {contract.positionTitle}
                  </span>
                </>
              )}
              <span>•</span>
              <span>เริ่ม {contract.startDateDisplay || '-'}</span>
            </div>
          </div>

          {/* Current Attached Document Alert (if already has file) */}
          {contract.hasDocument && !fileData && (
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    ไฟล์ปัจจุบัน: {contract.documentFileName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatFileSize(contract.documentFileSize)} • อัปโหลดไฟล์ใหม่ด้านล่างเพื่อแทนที่
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              เลือกไฟล์เอกสารสัญญาจ้างงาน <span className="text-rose-500">*</span>
            </label>

            {!fileData ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-[#0B2046] dark:hover:border-blue-400 bg-slate-50/40 dark:bg-slate-800/40 hover:bg-blue-50/20'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    รองรับไฟล์ PDF, PNG, JPG, DOCX (ขนาดสูงสุด 10 MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {fileName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatFileSize(fileSize)} • พร้อมอัปโหลด
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSelectedFile}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="ยกเลิกไฟล์นี้"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fileData}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B2046] hover:bg-[#07152d] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>บันทึกเอกสารสัญญา</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
