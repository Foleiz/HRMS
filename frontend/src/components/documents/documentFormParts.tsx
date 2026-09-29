'use client';

/**
 * ส่วนประกอบร่วมของเอกสารแบบฟอร์มบริษัท (ใบลาออก, ใบลา ฯลฯ)
 * - ฟอนต์ Sarabun, ช่องกรอกเส้นประ, หัว/ท้ายกระดาษ
 * - ตาราง "ผลการพิจารณา" ที่สร้างตามสายการอนุมัติ + ลายเซ็นผู้อนุมัติ
 * - hooks: ข้อมูลบริษัท (โลโก้/ที่อยู่), จำลองสายการอนุมัติ, ช่องลงนามจาก timeline
 */

import React, { useState, useEffect } from 'react';
import { Sarabun } from 'next/font/google';
import { organizationService } from '@/services/organizationService';
import { getAvatarUrl } from '@/lib/api-client';
import { approvalService } from '@/services/approvalService';
import { employeeService } from '@/services/employeeService';
import { useAuth } from '@/context/AuthContext';
import type { ApprovalTimeline } from '@/types/leave';
import { APPROVER_TYPE_LABELS, type ApprovalStep } from '@/types/approval';

// ฟอนต์เอกสารราชการ/ฟอร์มบริษัท ให้ใกล้เคียงต้นฉบับ Word (TH Sarabun)
export const sarabun = Sarabun({
  weight: ['400', '500', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
});

// ที่อยู่บริษัทตามต้นฉบับเอกสาร (ใช้เมื่อยังไม่ได้ตั้งค่าที่อยู่ในหน้าข้อมูลบริษัท)
export const DEFAULT_COMPANY_ADDRESS = '451/14 M.Pantiya Suwinthawong 11, Saensab, Minburi, Bangkok 10510';

/** ช่องกรอกแบบเส้นประ (เหมือนจุดไข่ปลาในต้นฉบับ) พร้อมข้อความที่กรอกอยู่ด้านบนเส้น */
export const Fill: React.FC<{ value?: React.ReactNode; minWidth: string; align?: 'center' | 'left' }> = ({
  value,
  minWidth,
  align = 'center',
}) => (
  <span
    style={{
      display: 'inline-block',
      minWidth,
      borderBottom: '1px dotted #000',
      lineHeight: 1.15,
      textAlign: align,
      padding: '0 1.5mm',
      verticalAlign: 'baseline',
    }}
  >
    {value || ' '}
  </span>
);

/** ช่องลงนามหนึ่งช่องในตาราง "ผลการพิจารณา" (สร้างตามขั้นตอนของสายการอนุมัติ) */
export interface ApprovalSlot {
  stepNo: number;
  approverType: string;
  /** ชื่อบทบาท / ชื่อบุคคล (สำหรับ ROLE / EMPLOYEE) */
  approverLabel?: string | null;
  /** ตำแหน่งที่แสดงล่วงหน้า เช่น "กรรมการผู้จัดการ" */
  positionHint?: string | null;
  /** ข้อมูลเมื่ออนุมัติแล้ว */
  signedName?: string | null;
  signedEmployeeId?: number | null;
  signedDate?: string | null;
  /** สถานะขั้นตอน (จาก timeline): COMPLETED, WAITING, PENDING_FUTURE, REJECTED */
  status?: string | null;
  /** true = แสดงข้อมูลผู้อนุมัติล่วงหน้า (ยังไม่ได้กดอนุมัติ) */
  isPreviewSignature?: boolean;
}

/**
 * หัวข้อช่องลงนาม = ชื่อตามที่ตั้งค่าในสายการอนุมัติตรง ๆ
 * - ระบุตามบทบาท → ชื่อบทบาท, ระบุตัวบุคคล → ชื่อพนักงาน
 * - ประเภทแบบเดิม (หัวหน้าแผนก, หัวหน้าฝ่าย ฯลฯ) → ชื่อประเภทตามหน้าตั้งค่า
 */
export const getSlotHeading = (slot: ApprovalSlot): string => {
  const type = (slot.approverType || '').toUpperCase();
  if (type === 'ROLE' || type === 'EMPLOYEE') {
    return slot.approverLabel?.trim() || APPROVER_TYPE_LABELS[type] || type;
  }
  return APPROVER_TYPE_LABELS[type] || slot.approverLabel?.trim() || type;
};

/** ช่องลงนามเริ่มต้น (ใช้เมื่อยังไม่พบสายการอนุมัติ) — ตรงกับต้นฉบับ 3 ขั้นตอน */
export const DEFAULT_SLOTS: ApprovalSlot[] = [
  { stepNo: 1, approverType: 'ROLE', approverLabel: 'ผู้บังคับบัญชาพิจารณาเห็นชอบ' },
  { stepNo: 2, approverType: 'ROLE', approverLabel: 'ฝ่ายบุคคลรับทราบเพื่อดำเนินการ' },
  { stepNo: 3, approverType: 'ROLE', approverLabel: 'อนุมัติโดยกรรมการผู้จัดการ', positionHint: 'กรรมการผู้จัดการ' },
];

/**
 * ตำแหน่งช่องในตาราง 2 x 2 (แถว, คอลัมน์) ตามจำนวนขั้นตอน
 * - 3 ขั้นตอน: ซ้ายบน, ซ้ายล่าง, ขวาล่าง (ขวาบนว่าง) — ตามต้นฉบับ
 * - 4 ขั้นตอน: ซ้ายบน, ขวาบน, ซ้ายล่าง, ขวาล่าง
 */
export const getSlotPositions = (count: number): Array<[number, number]> => {
  if (count <= 1) return [[0, 0]];
  if (count === 2) return [[0, 0], [1, 0]];
  if (count === 3) return [[0, 0], [1, 0], [1, 1]];
  return Array.from({ length: count }, (_, i) => [Math.floor(i / 2), i % 2] as [number, number]);
};

export const toThaiShortDate = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`;
};

/** รูปลายเซ็นของผู้อนุมัติ (แจ้ง onError เมื่อไม่มีรูป เพื่อแสดงชื่อแทน) */
export const ApproverSignatureImg: React.FC<{ employeeId: number; onError: () => void }> = ({ employeeId, onError }) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getAvatarUrl(`/api/employees/${employeeId}/signature`) || ''}
      alt="ลายเซ็นผู้อนุมัติ"
      onError={onError}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '0.3mm',
        transform: 'translateX(-50%)',
        height: '9mm',
        maxWidth: '48mm',
        objectFit: 'contain',
        pointerEvents: 'none',
      }}
    />
  );
};

/** กล่องลงนามในตารางผลการพิจารณา */
export const SignatureCell: React.FC<{ slot: ApprovalSlot; heading: string }> = ({ slot, heading }) => {
  // มีรูปลายเซ็น → แสดงรูปบนเส้น, ไม่มีรูป → แสดงชื่อผู้อนุมัติแทน
  const [signatureFailed, setSignatureFailed] = useState(false);
  const showSignature = !!slot.signedEmployeeId && !signatureFailed;
  return (
  <td style={{ width: '50%', border: '1px solid #000', verticalAlign: 'top', padding: 0 }}>
    <div style={{ textAlign: 'center', borderBottom: '1px solid #000', padding: '0.8mm 0' }}>{heading}</div>
    {/* เว้นระยะด้านบนให้พอสำหรับรูปลายเซ็น ไม่ให้ชนเส้นหัวตาราง */}
    <div style={{ padding: '9mm 2mm 1mm 2mm' }}>
      <div>
        ลงชื่อ
        <span
          style={{
            position: 'relative',
            display: 'inline-block',
            minWidth: '58mm',
            borderBottom: '1px dotted #000',
            lineHeight: 1.15,
            textAlign: 'center',
            padding: '0 1.5mm',
          }}
        >
          {showSignature ? '\u00A0' : slot.signedName || '\u00A0'}
          {showSignature && slot.signedEmployeeId ? (
            <ApproverSignatureImg employeeId={slot.signedEmployeeId} onError={() => setSignatureFailed(true)} />
          ) : null}
        </span>
      </div>
      <div>ตำแหน่ง<Fill value={slot.positionHint || (slot.approverType === 'CEO' ? 'กรรมการผู้จัดการ' : '')} minWidth="54.5mm" /></div>
      <div>วันที่<Fill value={slot.signedDate} minWidth="60mm" /></div>
    </div>
  </td>
  );
};

/** ช่องว่างในตาราง (ไม่มีเส้นขอบ ตามต้นฉบับ) */
export const EmptyCell: React.FC = () => <td style={{ width: '50%', border: 'none', padding: 0 }} />;

/** ตาราง "ผลการพิจารณา" 2 x 2 ตามจำนวนขั้นตอนของสายการอนุมัติ */
export const ApprovalSignatureTable: React.FC<{ slots: ApprovalSlot[] }> = ({ slots }) => {
  const positions = getSlotPositions(slots.length);
  const rowCount = Math.max(...positions.map(([r]) => r)) + 1;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', lineHeight: 1.55, tableLayout: 'fixed' }}>
      <tbody>
        {Array.from({ length: rowCount }, (_, row) => (
          <tr key={row}>
            {[0, 1].map((col) => {
              const idx = positions.findIndex(([r, c]) => r === row && c === col);
              if (idx < 0) return <EmptyCell key={col} />;
              const slot = slots[idx];
              return <SignatureCell key={col} slot={slot} heading={getSlotHeading(slot)} />;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** หัวกระดาษ: โลโก้บริษัทกึ่งกลาง + เส้นคั่นซ้าย/ขวา */
export const DocumentLogoHeader: React.FC<{ companyLogo: string | null; top?: string }> = ({ companyLogo, top = '6mm' }) => (
  <div style={{ position: 'absolute', top, left: '6mm', right: '5mm', height: '15mm', display: 'flex', alignItems: 'flex-end' }}>
    <div style={{ flex: 1, borderTop: '1px solid #000', marginBottom: '3.3mm' }} />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={companyLogo || '/syaco-logo.png'}
      alt="Company Logo"
      style={{ height: '15mm', width: 'auto', objectFit: 'contain', margin: '0 2mm' }}
    />
    <div style={{ flex: 1, borderTop: '1px solid #000', marginBottom: '3.3mm' }} />
  </div>
);

/** ท้ายกระดาษ: เส้นคั่นเต็มความกว้าง + ที่อยู่บริษัท (ชิดขอบล่างของหน้าเสมอ) */
export const DocumentAddressFooter: React.FC<{ address: string }> = ({ address }) => (
  <div style={{ position: 'absolute', left: '6mm', right: '2mm', top: '284mm' }}>
    <div style={{ borderTop: '1px solid #1f2937' }} />
    <div style={{ fontSize: '8.5pt', lineHeight: 1.4, color: '#2E75B6', marginTop: '1mm', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {address}
    </div>
  </div>
);

/** ช่องลงชื่อพร้อมรูปลายเซ็นวางเหนือเส้นประ (ไม่ดันระยะบรรทัด) */
export const SignatureLine: React.FC<{ src: string | null; onError?: () => void; minWidth?: string; alt?: string }> = ({
  src,
  onError,
  minWidth = '42mm',
  alt = 'ลายเซ็น',
}) => (
  <span
    style={{
      position: 'relative',
      display: 'inline-block',
      minWidth,
      borderBottom: '1px dotted #000',
      lineHeight: 1.15,
      verticalAlign: 'baseline',
    }}
  >
    {' '}
    {src && (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onError={onError}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '0.3mm',
          transform: 'translateX(-50%)',
          height: '12mm',
          maxWidth: '44mm',
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />
    )}
  </span>
);

/** โลโก้และที่อยู่บริษัทจากหน้าตั้งค่าข้อมูลบริษัท */
export const useCompanyDocumentInfo = (isOpen: boolean) => {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyAddress, setCompanyAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    organizationService
      .getCompany()
      .then((comp) => {
        if (!isMounted || !comp) return;
        if (comp.logoData) {
          setCompanyLogo(comp.logoData.startsWith('data:') ? comp.logoData : `data:image/png;base64,${comp.logoData}`);
        }
        if (comp.address?.trim()) setCompanyAddress(comp.address.trim());
      })
      .catch((err) => console.error('Failed to load company info for document preview:', err));
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  return { companyLogo, companyAddress: companyAddress || DEFAULT_COMPANY_ADDRESS };
};

/** URL รูปลายเซ็นของพนักงาน (ดึงใหม่ทุกครั้งที่เปิด) */
export const useEmployeeSignature = (isOpen: boolean, employeeId?: number | null) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(isOpen && employeeId ? getAvatarUrl(`/api/employees/${employeeId}/signature?v=${Date.now()}`) : null);
  }, [isOpen, employeeId]);
  return { src, clear: () => setSrc(null) };
};

/**
 * ช่องลงนามตามสายการอนุมัติของเอกสาร
 * 1) มี timeline (ยื่นแล้ว) → ใช้ขั้นตอนจริง พร้อมข้อมูลผู้ที่อนุมัติแล้ว / ผู้ใช้ที่ถึงคิวอนุมัติ
 * 2) ยังไม่ยื่น → จำลองสายการอนุมัติที่ตรงกับพนักงานจากหน้าตั้งค่า
 * 3) ไม่พบสายการอนุมัติ → ช่องเริ่มต้น 3 ช่องตามต้นฉบับ
 */
export const useApprovalSlots = (params: {
  isOpen: boolean;
  documentType: string;
  employeeId?: number | null;
  timeline?: ApprovalTimeline | null;
  canApproveCurrentStep?: boolean;
}): ApprovalSlot[] => {
  const { isOpen, documentType, employeeId, timeline, canApproveCurrentStep } = params;
  const { user } = useAuth();
  const [viewerPosition, setViewerPosition] = useState<string | null>(null);
  const [simulatedSlots, setSimulatedSlots] = useState<ApprovalSlot[] | null>(null);
  const showViewerPreview = !!(isOpen && canApproveCurrentStep && user?.employeeId);
  const hasTimeline = !!timeline?.steps?.length;

  useEffect(() => {
    if (!showViewerPreview || !user?.employeeId) {
      setViewerPosition(null);
      return;
    }
    let isMounted = true;
    employeeService
      .getById(user.employeeId)
      .then((emp) => isMounted && setViewerPosition(emp?.positionName || null))
      .catch(() => isMounted && setViewerPosition(null));
    return () => {
      isMounted = false;
    };
  }, [showViewerPreview, user?.employeeId]);

  useEffect(() => {
    if (!isOpen || hasTimeline || !employeeId) {
      setSimulatedSlots(null);
      return;
    }
    let isMounted = true;
    approvalService
      .simulateWorkflow({ employeeId, documentType })
      .then(async (res) => {
        if (!isMounted || !res?.success || !res.steps?.length) return;
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
      .catch((err) => console.error('Failed to load approval flow for document preview:', err));
    return () => {
      isMounted = false;
    };
  }, [isOpen, hasTimeline, employeeId, documentType]);

  if (hasTimeline && timeline) {
    const todayThai = toThaiShortDate(new Date().toISOString());
    return [...timeline.steps]
      .sort((a, b) => a.stepNo - b.stepNo)
      .map((s) => {
        const approved = s.status === 'COMPLETED' && (s.actionDecision === 'APPROVE' || !s.actionDecision);
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
          positionHint: approved ? s.actionByPositionName || null : null,
          status: s.status,
        };
      });
  }

  return simulatedSlots || DEFAULT_SLOTS;
};
