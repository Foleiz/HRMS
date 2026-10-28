'use client';

import { Button } from '@/components/ui';
import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText } from 'lucide-react';
import { organizationService } from '@/services/organizationService';
import { getAvatarUrl } from '@/lib/api-client';
import { approvalService } from '@/services/approvalService';
import { employeeService } from '@/services/employeeService';
import { useAuth } from '@/context/AuthContext';
import {
  sarabun,
  DEFAULT_COMPANY_ADDRESS,
  Fill,
  type ApprovalSlot,
  DEFAULT_SLOTS,
  toThaiShortDate,
  signatureUrl as buildSignatureUrl,
  getDocumentFinalizedAt,
  ApprovalSignatureTable,
  SignatureLine,
  extractPrefixAndName,
  type ExtractedPrefixInfo,
} from './documentFormParts';
import type { ApprovalTimeline } from '@/types/leave';
import { type ApprovalStep } from '@/types/approval';

export interface GeneralDocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    /** มีเมื่อยื่นคำร้องแล้ว (ไม่จำลองสายอนุมัติซ้ำ) */
    id?: number | string | null;
    requestNo?: string | null;
    employeeName: string;
    employeeCode: string;
    /** รหัสพนักงานผู้ยื่น ใช้ดึงรูปลายเซ็น และจำลองสายอนุมัติ GENERAL_REQUEST */
    employeeId?: number | null;
    signatureUrl?: string | null;
    /** เวลาที่ยื่นเอกสาร (ISO) — ใช้ดึงลายเซ็นผู้ยื่นที่ใช้อยู่ตอนนั้น (เอกสารเก่าไม่เปลี่ยนตามลายเซ็นใหม่) */
    signedAt?: string | null;
    titlePrefix?: string;
    positionTitle: string;
    departmentName: string;
    /** วันที่ยื่น (dd/mm/yyyy พ.ศ. หรือ ISO) */
    issueDate: string;
    /** คงไว้เพื่อความเข้ากันได้กับหน้าที่เรียกใช้เดิม — ไม่แสดงในคำร้อง */
    expiryDate?: string;
    /** ประเภทคำร้อง = เรื่อง */
    documentType: string;
    /** รายละเอียดคำร้อง */
    purpose: string;
    notes?: string;
    fileName?: string;
    addressedTo?: string;
    timeline?: ApprovalTimeline | null;
    canApproveCurrentStep?: boolean;
    companyLogo?: string | null;
    companyAddress?: string | null;
  } | null;
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

interface ThaiDateParts {
  day: string;
  month: string;
  monthNum: string;
  year: string;
  formatted: string;
}

const parseThaiDateParts = (dateInput?: string): ThaiDateParts => {
  if (!dateInput || dateInput === '-' || dateInput.trim() === '') {
    return {
      day: '.......',
      month: '...........................',
      monthNum: '.......',
      year: '...................',
      formatted: '......./......./.......',
    };
  }

  const clean = dateInput.trim();

  // Case 1: DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [dStr, mStr, yStr] = clean.split('/');
    const d = parseInt(dStr, 10);
    const m = parseInt(mStr, 10);
    let y = parseInt(yStr, 10);
    if (y < 2400) y += 543;
    const monthName = THAI_MONTH_NAMES[m - 1] || mStr;
    const paddedM = String(m).padStart(2, '0');
    return {
      day: String(d),
      month: monthName,
      monthNum: paddedM,
      year: String(y),
      formatted: `${String(d).padStart(2, '0')}/${paddedM}/${y}`,
    };
  }

  // Case 2: YYYY-MM-DD or ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.split('T')[0].split('-');
    let y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (y < 2400) y += 543;
    const monthName = THAI_MONTH_NAMES[m - 1] || String(m);
    const paddedM = String(m).padStart(2, '0');
    return {
      day: String(d),
      month: monthName,
      monthNum: paddedM,
      year: String(y),
      formatted: `${String(d).padStart(2, '0')}/${paddedM}/${y}`,
    };
  }

  // Fallback: Date object
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const d = parsed.getDate();
    const m = parsed.getMonth();
    let y = parsed.getFullYear();
    if (y < 2400) y += 543;
    const paddedM = String(m + 1).padStart(2, '0');
    return {
      day: String(d),
      month: THAI_MONTH_NAMES[m],
      monthNum: paddedM,
      year: String(y),
      formatted: `${String(d).padStart(2, '0')}/${paddedM}/${y}`,
    };
  }

  return {
    day: '.......',
    month: '...........................',
    monthNum: '.......',
    year: '...................',
    formatted: clean,
  };
};

type GeneralData = NonNullable<GeneralDocumentPreviewModalProps['data']>;


/**
 * หน้ากระดาษ A4 ของ "แบบคำร้องทั่วไป" — รูปแบบเดียวกับใบลาออก/ใบลา
 * หัวกระดาษโลโก้ · ชื่อเอกสาร · เขียนที่/วันที่ · เรื่อง/เรียน · เนื้อความ · ลงนามผู้ยื่น · ผลการพิจารณา · ที่อยู่บริษัทท้ายกระดาษ
 */
const GeneralPaper: React.FC<{
  data: GeneralData;
  companyLogo: string | null;
  companyAddress: string;
  companyName: string;
  signatureSrc: string | null;
  onSignatureError?: () => void;
  approvalSlots: ApprovalSlot[];
  fixedApprovalZoom?: number;
  onApprovalZoom?: (zoom: number) => void;
}> = ({ data, companyLogo, companyAddress, companyName, signatureSrc, onSignatureError, approvalSlots, fixedApprovalZoom, onApprovalZoom }) => {
  const dateParts = parseThaiDateParts(data.issueDate);
  const { prefix, displayName } = extractPrefixAndName(data.employeeName, data.titlePrefix);
  const fullName = prefix && displayName ? `${prefix} ${displayName}` : data.employeeName || '';
  const has = (v: string) => !v.startsWith('.');
  const detail = data.purpose?.trim() && data.purpose.trim() !== 'ยังไม่ได้ระบุวัตถุประสงค์' ? data.purpose.trim() : '';

  // ตารางผลการพิจารณาต้องจบก่อนเส้นท้ายกระดาษ — ล้นเมื่อไรย่อให้พอดี (ฉบับพิมพ์ใช้ค่าที่วัดจากฉบับบนจอ)
  const paperRef = useRef<HTMLDivElement>(null);
  const approvalRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const paper = paperRef.current;
    const box = approvalRef.current;
    if (!paper || !box) return;
    if (fixedApprovalZoom !== undefined) {
      box.style.zoom = String(fixedApprovalZoom);
      return;
    }
    const fit = () => {
      box.style.zoom = '1';
      const pr = paper.getBoundingClientRect();
      if (pr.height === 0) return;
      const pxPerMm = pr.height / 297;
      const limit = pr.top + 281 * pxPerMm;
      const br = box.getBoundingClientRect();
      const available = limit - br.top;
      const z = br.height > available && available > 0 ? Math.max(0.55, available / br.height) : 1;
      box.style.zoom = String(z);
      onApprovalZoom?.(z);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box.firstElementChild ?? box);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvalSlots, data, fixedApprovalZoom]);

  const underline: React.CSSProperties = {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationThickness: '1px',
    textUnderlineOffset: '4px',
    padding: '0 1.5mm',
    overflowWrap: 'break-word', // ตัดบรรทัดตามคำ (เดิม anywhere ทำให้คำขาดกลางคำ)
  };
  /** ย่อหน้าเนื้อความ — จัดชิดขอบทั้งสองด้านให้ต้น/ท้ายบรรทัดตรงกัน */
  const bodyPara: React.CSSProperties = { textIndent: '12.5mm', textAlign: 'justify', margin: 0 };
  const strike = (p: 'นาย' | 'นาง' | 'นางสาว') =>
    prefix && prefix !== p ? { textDecoration: 'line-through', textDecorationThickness: '1.5px' } : undefined;
  /** บรรทัดเส้นประว่างเต็มความกว้าง (เว้นที่ให้เขียนเพิ่มเมื่อรายละเอียดสั้น) */
  const BlankLine = () => <div style={{ borderBottom: '1px dotted #000', height: '1.68em' }} />;

  return (
    <div
      ref={paperRef}
      className={`general-paper theme-light ${sarabun.className}`}
      style={{
        position: 'relative',
        width: '210mm',
        height: '297mm',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '26mm 23mm 20mm 25mm',
        background: '#fff',
        color: '#000',
        fontSize: '10.5pt',
        lineHeight: 1.68,
      }}
    >
      {/* ===== หัวกระดาษ: โลโก้กึ่งกลาง + เส้นซ้าย/ขวา ===== */}
      <div style={{ position: 'absolute', top: '6mm', left: '6mm', right: '5mm', height: '15mm', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, borderTop: '1px solid #000', marginBottom: '3.3mm' }} />
        {companyLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={companyLogo} alt="Company Logo" style={{ height: '15mm', width: 'auto', objectFit: 'contain', margin: '0 2mm' }} />
        ) : (
          <div style={{ height: '15mm', width: '35mm', margin: '0 2mm' }} />
        )}
        <div style={{ flex: 1, borderTop: '1px solid #000', marginBottom: '3.3mm' }} />
      </div>

      {/* ===== ชื่อเอกสาร ===== */}
      <div style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 700, marginBottom: '6mm' }}>แบบคำร้องทั่วไป</div>

      {/* ===== เลขที่ / เขียนที่ / วันที่ (ชิดขวา) ===== */}
      <div style={{ marginLeft: '88mm', marginBottom: '5mm', whiteSpace: 'nowrap' }}>
        {data.requestNo ? <div>เลขที่<Fill value={data.requestNo} minWidth="50mm" /></div> : null}
        <div>เขียนที่<Fill value={companyName} minWidth="50mm" /></div>
        <div>
          วันที่<Fill value={has(dateParts.day) ? dateParts.day : ''} minWidth="8mm" />
          เดือน<Fill value={has(dateParts.month) ? dateParts.month : ''} minWidth="20mm" />
          พ.ศ.<Fill value={has(dateParts.year) ? dateParts.year : ''} minWidth="12mm" />
        </div>
      </div>

      {/* ===== เรื่อง / เรียน ===== */}
      <div style={{ marginBottom: '4mm' }}>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '13mm', flexShrink: 0 }}>เรื่อง</span>
          <span>{data.documentType || '-'}</span>
        </div>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '13mm', flexShrink: 0 }}>เรียน</span>
          <span>{data.addressedTo || 'ผู้จัดการฝ่ายทรัพยากรบุคคล'}</span>
        </div>
      </div>

      {/* ===== เนื้อความ ===== */}
      {/* เนื้อความ + รายละเอียดอยู่ย่อหน้าเดียวกัน จัดชิดขอบซ้าย-ขวา (เหมือนหนังสือลาออก) */}
      <p style={bodyPara}>
        ข้าพเจ้า <span style={strike('นาย')}>นาย</span>/ <span style={strike('นาง')}>นาง</span>/{' '}
        <span style={strike('นางสาว')}>นางสาว</span>
        <Fill value={displayName} minWidth="40mm" /> รหัสพนักงาน<Fill value={data.employeeCode} minWidth="18mm" />
        {' '}ตำแหน่ง<Fill value={data.positionTitle} minWidth="30mm" />
        {data.departmentName ? (
          <>
            {' '}สังกัด<Fill value={data.departmentName} minWidth="20mm" />
          </>
        ) : null}{' '}
        มีความประสงค์ยื่นคำร้องเรื่อง{' '}
        <span style={{ ...underline, whiteSpace: 'nowrap' }}>{data.documentType || '-'}</span> โดยมีรายละเอียดดังนี้
        {detail ? (
          <>
            {' '}
            <span style={underline}>{detail}</span>
          </>
        ) : null}
      </p>
      {detail.length < 90 ? <BlankLine /> : null}
      {!detail ? <BlankLine /> : null}

      {data.notes?.trim() ? (
        <p style={{ ...bodyPara, margin: '2mm 0 0 0' }}>
          หมายเหตุ <span style={underline}>{data.notes.trim()}</span>
        </p>
      ) : null}

      <p style={{ textIndent: '12.5mm', margin: '3mm 0 0 0' }}>จึงเรียนมาเพื่อโปรดพิจารณา</p>

      {/* ===== ลงนามผู้ยื่นคำร้อง (ชิดขวา) ===== */}
      <div style={{ marginLeft: '88mm', width: '74mm', textAlign: 'center', marginTop: '5mm', whiteSpace: 'nowrap' }}>
        <div>ขอแสดงความนับถือ</div>
        <div style={{ marginTop: '9mm' }}>
          (ลงชื่อ)
          <SignatureLine src={signatureSrc} onError={onSignatureError} alt="ลายเซ็นผู้ยื่นคำร้อง" fallbackText={displayName} />
          ผู้ยื่นคำร้อง
        </div>
        <div>
          (<Fill value={fullName} minWidth="50mm" />)
        </div>
        <div>
          วันที่<Fill value={has(dateParts.day) ? dateParts.day : ''} minWidth="12mm" />/
          <Fill value={has(dateParts.monthNum) ? dateParts.monthNum : ''} minWidth="12mm" />/
          <Fill value={has(dateParts.year) ? dateParts.year : ''} minWidth="14mm" />
        </div>
      </div>

      {/* ===== ผลการพิจารณา ===== */}
      <div style={{ textAlign: 'center', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px', marginTop: '6mm' }}>
        ผลการพิจารณา
      </div>
      <div ref={approvalRef}>
        <ApprovalSignatureTable slots={approvalSlots} />
      </div>

      {/* ===== ท้ายกระดาษ: เส้นคั่น + ที่อยู่บริษัท ===== */}
      <div style={{ position: 'absolute', left: '6mm', right: '2mm', top: '284mm' }}>
        <div style={{ borderTop: '1px solid #1f2937' }} />
        <div style={{ fontSize: '8.5pt', lineHeight: 1.4, color: '#2E75B6', marginTop: '1mm', fontFamily: 'Arial, Helvetica, sans-serif' }}>
          {companyAddress}
        </div>
      </div>
    </div>
  );
};

export const GeneralDocumentPreviewModal: React.FC<GeneralDocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [companyLogo, setCompanyLogo] = useState<string | null>(data?.companyLogo || null);
  /** เวลาที่อนุมัติครบ (null = ยังไม่ครบ ใช้ข้อมูลบริษัทปัจจุบัน) */
  const docFinalizedAt = getDocumentFinalizedAt(data?.timeline);
  const [companyAddress, setCompanyAddress] = useState<string | null>(data?.companyAddress || null);
  const [companyName, setCompanyName] = useState<string>('');
  const [signatureSrc, setSignatureSrc] = useState<string | null>(null);
  // ค่าย่อตารางผลการพิจารณา (วัดจากฉบับบนจอ ส่งให้ฉบับพิมพ์ — ให้ตอนพิมพ์ตรงกับตอนดูตัวอย่าง)
  const [approvalZoom, setApprovalZoom] = useState<number>(1);
  const [simulatedSlots, setSimulatedSlots] = useState<ApprovalSlot[] | null>(null);

  // ช่องลงนามตามสายการอนุมัติ:
  // 1) คำขอที่ยื่นแล้ว → ใช้ timeline จริง (พร้อมชื่อ/วันที่/ลายเซ็นผู้ที่อนุมัติแล้ว)
  // 2) ยังไม่ยื่น → จำลองสายการอนุมัติ RESIGNATION_REQUEST ที่ตรงกับพนักงานคนนี้จากหน้าตั้งค่า
  // ผู้ใช้ที่กำลังเปิดดู (ใช้แสดงลายเซ็นล่วงหน้าในช่องของขั้นตอนที่รอผู้ใช้อนุมัติ)
  const { user } = useAuth();
  const [viewerPosition, setViewerPosition] = useState<string | null>(null);
  const showViewerPreview = !!(isOpen && data?.canApproveCurrentStep && user?.employeeId);

  useEffect(() => {
    if (!showViewerPreview || !user?.employeeId) {
      setViewerPosition(null);
      return;
    }
    let isMounted = true;
    employeeService
      .getById(user.employeeId)
      .then((emp) => {
        if (isMounted) setViewerPosition(emp?.positionName || null);
      })
      .catch(() => {
        if (isMounted) setViewerPosition(null);
      });
    return () => {
      isMounted = false;
    };
  }, [showViewerPreview, user?.employeeId]);

  const todayThai = toThaiShortDate(new Date().toISOString());

  const timelineSlots: ApprovalSlot[] | null =
    data?.timeline?.steps && data.timeline.steps.length > 0
      ? [...data.timeline.steps]
          .sort((a, b) => a.stepNo - b.stepNo)
          .map((s) => {
            const approved = s.status === 'COMPLETED' && (s.actionDecision === 'APPROVE' || !s.actionDecision);
            // ขั้นตอนที่รอผู้ใช้คนนี้อนุมัติ → แสดงลายเซ็น ชื่อ ตำแหน่ง และวันที่ปัจจุบันล่วงหน้า
            if (!approved && s.status === 'WAITING' && showViewerPreview && user) {
              return {
                stepNo: s.stepNo,
                approverType: s.approverType,
                approverLabel: s.approverTitle,
                signedName: user.fullName || null,
                signedEmployeeId: user.employeeId,
                signedDate: todayThai,
                positionHint: viewerPosition,
                status: s.status,
                isPreviewSignature: true,
              };
            }
            return {
              stepNo: s.stepNo,
              approverType: s.approverType,
              approverLabel: s.approverTitle,
              signedName: approved ? s.actionByEmployeeName || null : null,
              signedEmployeeId: approved ? s.actionByEmployeeId || null : null,
              signedDate: approved ? toThaiShortDate(s.actionAt) : null,
              signedAt: approved ? s.actionAt || null : null,
              positionHint: approved ? s.actionByPositionName || null : null,
              status: s.status,
            };
          })
      : null;

  useEffect(() => {
    if (!isOpen || timelineSlots || !data?.employeeId || data?.id) {
      setSimulatedSlots(null);
      return;
    }
    let isMounted = true;
    approvalService
      .simulateWorkflow({ employeeId: data.employeeId, documentType: 'GENERAL_REQUEST' })
      .then(async (res) => {
        if (!isMounted || !res?.success || !res.steps?.length) return;

        // หัวข้อช่องลงนาม = บทบาท / บุคคลที่เลือกไว้ในช่อง "เลือกบทบาทผู้มีสิทธิ์อนุมัติ" ของแต่ละขั้นตอน
        // ดึงจากตัวสายการอนุมัติโดยตรง เพื่อให้ได้ชื่อบทบาทเสมอ
        let flowSteps: ApprovalStep[] = [];
        if (res.flowId) {
          try {
            flowSteps = (await approvalService.getFlowById(res.flowId))?.steps ?? [];
          } catch {
            flowSteps = [];
          }
        }
        if (!isMounted) return;

        setSimulatedSlots(
          [...res.steps]
            .sort((a, b) => a.stepNo - b.stepNo)
            .map((s) => {
              const flowStep = flowSteps.find((fs) => fs.stepNo === s.stepNo);
              const approverLabel =
                s.approverType === 'EMPLOYEE'
                  ? flowStep?.approverEmployeeName || s.approver?.fullName
                  : flowStep?.approverRoleName || s.approverRoleName;
              return {
                stepNo: s.stepNo,
                approverType: s.approverType,
                approverLabel: approverLabel || null,
                positionHint: s.approver?.positionName || null,
              };
            })
        );
      })
      .catch((err) => console.error('Failed to load general request approval flow:', err));
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, data?.employeeId, !!timelineSlots]);

  // รูปลายเซ็นของผู้ยื่นคำร้อง (ดึงใหม่ทุกครั้งที่เปิด เพื่อให้ได้ลายเซ็นล่าสุด)
  useEffect(() => {
    if (!isOpen) {
      setSignatureSrc(null);
      return;
    }
    if (data?.signatureUrl) {
      setSignatureSrc(getAvatarUrl(data.signatureUrl));
    } else if (data?.employeeId) {
      // เอกสารที่ยื่นแล้ว: ลายเซ็น ณ เวลาที่ยื่น / ยังไม่ยื่น: ลายเซ็นปัจจุบัน
      setSignatureSrc(buildSignatureUrl(data.employeeId, data.signedAt));
    } else {
      setSignatureSrc(null);
    }
  }, [isOpen, data?.employeeId, data?.signatureUrl, data?.signedAt]);

  useEffect(() => {
    if (!isOpen) return;
    if (data?.companyLogo) setCompanyLogo(data.companyLogo);
    if (data?.companyAddress) setCompanyAddress(data.companyAddress);

    let isMounted = true;
    // อนุมัติครบแล้ว → ข้อมูลบริษัท ณ วันที่อนุมัติ (เปลี่ยนโลโก้ภายหลังไม่กระทบเอกสารเดิม)
    organizationService
      .getCompanyDocumentProfile(docFinalizedAt)
      .then((comp) => {
        if (!isMounted || !comp) return;
        if (!data?.companyLogo) setCompanyLogo(comp.logoData || null);
        if (comp.companyName?.trim()) setCompanyName(comp.companyName.trim());
        if (!data?.companyAddress && comp.address?.trim()) {
          setCompanyAddress(comp.address.trim());
        }
      })
      .catch((err) => {
        console.error('Failed to load company info for general request preview:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, data?.companyLogo, data?.companyAddress, docFinalizedAt]);

  if (!isOpen || !data) return null;

  const address = companyAddress || DEFAULT_COMPANY_ADDRESS;
  const approvalSlots = timelineSlots || (data.id ? DEFAULT_SLOTS : simulatedSlots) || DEFAULT_SLOTS;

  return (
    <>
      <ModalShell className="general-modal no-print z-50 bg-slate-900/60 backdrop-blur-xs" innerClassName="items-center justify-center p-2 sm:p-4" portal={false}>
        <div className="relative bg-white rounded-2xl w-full max-w-[900px] max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <FileText className="w-5 h-5 text-primary dark:text-blue-400" />
              <h3 className="text-base font-bold">ตัวอย่างแบบคำร้องทั่วไป</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-slate-400 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* พื้นที่แสดงกระดาษ A4 เต็มหน้า (เลื่อนดูได้) */}
          <div className="flex-1 overflow-auto bg-slate-200/70 py-6 px-4">
            <div className="mx-auto w-fit shadow-md border border-gray-300">
              <GeneralPaper
                data={data}
                companyLogo={companyLogo}
                companyAddress={address}
                companyName={companyName || 'บริษัท'}
                signatureSrc={signatureSrc}
                onSignatureError={() => setSignatureSrc(null)}
                approvalSlots={approvalSlots}
                onApprovalZoom={setApprovalZoom}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white border-t border-gray-100">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              พิมพ์เอกสาร
            </button>
            <Button
                variant="secondary"
                type="button"
                onClick={onClose}
              >
                ปิดหน้าต่าง
              </Button>
          </div>
        </div>
      </ModalShell>

      {/* สำเนาสำหรับพิมพ์: แยกออกมาไว้ใต้ <body> โดยตรง เพื่อให้พิมพ์ได้เต็มหน้า A4 ไม่ติดกรอบ modal / sidebar */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="general-print-root">
            <GeneralPaper
                data={data}
                companyLogo={companyLogo}
                companyAddress={address}
                companyName={companyName || 'บริษัท'}
                signatureSrc={signatureSrc}
                onSignatureError={() => setSignatureSrc(null)}
                approvalSlots={approvalSlots}
                fixedApprovalZoom={approvalZoom}
              />
          </div>,
          document.body
        )}

      <style jsx global>{`
        .general-print-root {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            min-height: 0 !important;
            height: auto !important;
          }

          /* ซ่อนทุกอย่างในหน้า ยกเว้นสำเนาเอกสาร */
          body > *:not(.general-print-root) {
            display: none !important;
          }

          .general-print-root {
            display: block !important;
          }

          .general-print-root .general-paper {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            break-inside: avoid;
            page-break-after: avoid;
          }

          .general-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
};

