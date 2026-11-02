'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { EmploymentContract } from '@/types/contract';
import { contractService } from '@/services/contractService';
import { useToast } from '@/context/ToastContext';

interface AttachContractModalProps {
  contract: EmploymentContract | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedContract: EmploymentContract) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function AttachContractModal({
  contract,
  isOpen,
  onClose,
  onSuccess,
}: AttachContractModalProps) {
  const toast = useToast();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setUploadFile(null);
  }, [contract, isOpen]);

  if (!isOpen || !contract) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setIsSubmitting(true);
      const base64 = await fileToBase64(uploadFile);
      const updated = await contractService.uploadDocument(contract.id, base64, uploadFile.name);
      toast.success(`แนบเอกสารสัญญาสำหรับ ${contract.employeeName} สำเร็จแล้ว`);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to attach document:', err);
      toast.error(err.message || 'ไม่สามารถอัปโหลดเอกสารสัญญาได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtitle = [
    contract.employeeCode,
    contract.employeeName,
    contract.employeeTypeName || contract.contractTypeDisplay || 'สัญญาจ้าง',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="แนบเอกสารเพิ่ม"
      subtitle={subtitle}
      onSubmit={handleSubmit}
      footer={
        <ModalFooter
          onCancel={onClose}
          cancelText="ยกเลิก"
          submitText="แนบเอกสาร"
          loading={isSubmitting}
          loadingText="กำลังอัปโหลด..."
        />
      }
    >
      <div className="space-y-3">
        <FileDropzone
          file={uploadFile}
          onChange={setUploadFile}
          accept={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
          maxSizeMB={10}
          required
        />
      </div>
    </Modal>
  );
}
