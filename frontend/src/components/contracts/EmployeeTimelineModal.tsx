'use client';
import { ModalHeader } from '@/components/ui/ModalHeader';

import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  AlertCircle,
  History,
} from 'lucide-react';
import { contractService } from '@/services/contractService';
import { EmployeeCareerTimeline } from '@/types/contract';

interface EmployeeTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number | null;
  employeeName: string;
  employeeCode: string;
}

export default function EmployeeTimelineModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeCode,
}: EmployeeTimelineModalProps) {
  const [timeline, setTimeline] = useState<EmployeeCareerTimeline[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && employeeId) {
      const fetchTimeline = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await contractService.getCareerTimeline(employeeId);
          setTimeline(data);
        } catch (err: any) {
          console.error('Failed to load employee timeline:', err);
          setError(err.message || 'ไม่สามารถโหลดประวัติตำแหน่งงานได้');
        } finally {
          setLoading(false);
        }
      };
      fetchTimeline();
    }
  }, [isOpen, employeeId]);

  if (!isOpen) return null;

  return (
    <ModalShell className="z-50 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
      <ModalHeader
        icon={History}
        title={<><span>ไทม์ไลน์ตำแหน่งของ</span> <span className="text-[#16a34a]">{employeeName} · {employeeCode}</span></>}
        onClose={onClose}
      />
    </ModalShell>
  );
}
