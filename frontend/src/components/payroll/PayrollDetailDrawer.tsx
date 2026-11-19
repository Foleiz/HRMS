'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { PayrollRecord, PayrollDetailItem, PayrollItem } from '@/types/payroll';
import { salaryService } from '@/services/salaryService';
import { Button, Input, NumberInput, ModalShell } from '@/components/ui';
import { OptionCheckCard, TAX_OPTION_TEXT, SSO_OPTION_TEXT } from '@/components/ui/OptionCheckCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
  /** แก้ไขได้เมื่อรอบอยู่ในสถานะ DRAFT/REVIEW และผู้ใช้เป็น HR */
  canEdit?: boolean;
  /** รายการรายได้/รายหักทั้งหมด (ใช้เลือกเพิ่มรายการ manual) */
  payrollItems?: PayrollItem[];
  /** เรียกหลังเพิ่ม/ลบรายการสำเร็จ (ระบบคำนวณใหม่ทั้งรอบ) */
  onChanged?: () => void;
}


export const PayrollDetailDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  record,
  canEdit = false,
  payrollItems = [],
  onChanged,
}) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PayrollDetailItem[]>([]);
  const [newAmount, setNewAmount] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // เพิ่มหัวข้อใหม่ทุกครั้ง (ชื่อซ้ำกับหัวข้อกำหนดเองที่มีอยู่ ระบบใช้หัวข้อเดิม)
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'EARNING' | 'DEDUCTION'>('EARNING');
  const [newTaxable, setNewTaxable] = useState(true);
  const [newSso, setNewSso] = useState(false);
  const [addingSection, setAddingSection] = useState<'EARNING' | 'DEDUCTION' | null>(null);

  const openAddForm = (type: 'EARNING' | 'DEDUCTION') => {
    setAddingSection(type);
    setNewType(type);
    setNewName('');
    setNewAmount('');
    setNewNote('');
    setError(null);
  };

  const closeAddForm = () => {
    setAddingSection(null);
    setError(null);
    setNewName('');
    setNewAmount('');
    setNewNote('');
  };

  const handleAdd = async () => {
    if (!record) return;
    const amount = Number(newAmount);
    if (!newName.trim()) {
      setError('กรุณาระบุชื่อหัวข้อรายการ');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('กรุณาระบุจำนวนเงินมากกว่า 0');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await salaryService.addPayrollAdjustment(record.id, {
        payrollItemId: 0,
        amount,
        newItemName: newName.trim(),
        newItemType: newType,
        newItemIsTaxable: newType === 'EARNING' && newTaxable,
        newItemIsSocialSecurity: newType === 'EARNING' && newSso,
        note: newNote.trim() || undefined,
      });
      setDetails(updated);
      closeAddForm();
      onChanged?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'เพิ่มรายการไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (detailId: number) => {
    if (!record) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await salaryService.deletePayrollAdjustment(record.id, detailId);
      setDetails(updated);
      onChanged?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'ลบรายการไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    closeAddForm();
    if (isOpen && record) {
      setLoading(true);
      salaryService
        .getPayrollDetails(record.id)
        .then((data) => setDetails(data))
        .catch((err) => {
          console.error('Failed to load payroll details:', err);
          setDetails([]);
        })
        .finally(() => setLoading(false));
    } else {
      setDetails([]);
    }
    setError(null);
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const earnings = details.filter((d) => d.itemType === 'EARNING');
  const deductions = details.filter((d) => d.itemType === 'DEDUCTION');

  const totalGross = details.length > 0 ? earnings.reduce((sum, item) => sum + item.amount, 0) : (record.totalGrossIncome ?? 0);
  const totalDed = details.length > 0 ? deductions.reduce((sum, item) => sum + Math.abs(item.amount), 0) : (record.totalDeductionAmount ?? 0);
  const netSalary = details.length > 0 ? (totalGross - totalDed) : (record.netPayableSalary ?? (totalGross - totalDed));

  return (
    <ModalShell
      placement="right"
      onBackdropClick={onClose}
      className="z-50 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 min-h-screen h-full shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-700/60 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{record.employeeName}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
              {record.employeeCode} · {record.departmentName} · รายละเอียดสลิปเงินเดือน
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 dark:text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs">กำลังโหลดรายละเอียด...</span>
            </div>
          ) : (
            <>
              {/* รายได้ (Earnings) */}
              <div>
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">รายได้</h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700/60 overflow-hidden bg-white dark:bg-slate-800">
                  {earnings.length > 0 ? (
                    earnings.map((item) => (
                      <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {item.itemName}
                          {item.isManual && <ManualBadge source={item.source} />}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                            ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </div>
                          {canEdit && item.isManual && (
                            <DeleteButton disabled={saving} onClick={() => handleDelete(item.id)} />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3.5 text-center text-xs text-slate-400 dark:text-slate-500">
                      {record.status === 'DRAFT' ? 'ยังไม่ได้ประมวลผล' : 'ไม่มีรายการรายได้'}
                    </div>
                  )}
                </div>

                {/* ปุ่มเพิ่มรายการได้ หรือ ฟอร์มเพิ่มรายการได้ */}
                {canEdit && (
                  addingSection === 'EARNING' ? (
                    <div className="mt-2.5 border border-dashed border-emerald-300 dark:border-emerald-700/60 rounded-xl p-4 space-y-3 bg-emerald-50/20 dark:bg-emerald-950/10 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-1 border-b border-emerald-200/50 dark:border-emerald-800/50">
                        <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400">เพิ่มรายการได้</h5>
                        <button
                          type="button"
                          onClick={closeAddForm}
                          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                      <Input
                        type="text"
                        placeholder="ชื่อหัวข้อ เช่น ค่าเบี้ยเลี้ยงต่างจังหวัด"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        disabled={saving}
                        maxLength={100}
                        autoFocus
                      />
                      <div className="grid grid-cols-[9rem_1fr] gap-2">
                        <NumberInput value={newAmount} onChange={setNewAmount} prefix="฿" placeholder="จำนวนเงิน" disabled={saving} />
                        <Input
                          type="text"
                          placeholder="หมายเหตุ (แสดงบนสลิป)"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          disabled={saving}
                          maxLength={200}
                        />
                      </div>
                      <div className="space-y-2">
                        <OptionCheckCard checked={newTaxable} onChange={setNewTaxable} {...TAX_OPTION_TEXT} />
                        <OptionCheckCard checked={newSso} onChange={setNewSso} {...SSO_OPTION_TEXT} />
                      </div>
                      {error && <p className="text-[11px] text-rose-600">{error}</p>}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={closeAddForm}
                          className="py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        >
                          ยกเลิก
                        </button>
                        <Button fullWidth onClick={handleAdd} loading={saving} disabled={!newName || !newAmount} icon={<Plus className="w-3.5 h-3.5" />}>
                          {saving ? 'กำลังคำนวณใหม่...' : 'เพิ่มรายการและคำนวณใหม่'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      fullWidth
                      size="sm"
                      variant="secondary"
                      onClick={() => openAddForm('EARNING')}
                      icon={<Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      className="mt-2 text-emerald-700 dark:text-emerald-400 border-dashed border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                    >
                      เพิ่มรายการได้
                    </Button>
                  )
                )}
              </div>

              {/* รายการหัก (Deductions) */}
              <div>
                <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-2">รายการหัก</h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700/60 overflow-hidden bg-white dark:bg-slate-800">
                  {deductions.length > 0 ? (
                    deductions.map((item) => {
                      const absAmount = Math.abs(item.amount);
                      return (
                        <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {item.itemName}
                            {item.isManual && <ManualBadge source={item.source} />}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                              -฿{absAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </div>
                            {canEdit && item.isManual && (
                              <DeleteButton disabled={saving} onClick={() => handleDelete(item.id)} />
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3.5 text-center text-xs text-slate-400 dark:text-slate-500">
                      {record.status === 'DRAFT' ? 'ยังไม่ได้ประมวลผล' : 'ไม่มีรายการหัก'}
                    </div>
                  )}
                </div>

                {/* ปุ่มเพิ่มรายการหัก หรือ ฟอร์มเพิ่มรายการหัก */}
                {canEdit && (
                  addingSection === 'DEDUCTION' ? (
                    <div className="mt-2.5 border border-dashed border-rose-300 dark:border-rose-700/60 rounded-xl p-4 space-y-3 bg-rose-50/20 dark:bg-rose-950/10 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-1 border-b border-rose-200/50 dark:border-rose-800/50">
                        <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400">เพิ่มรายการหัก</h5>
                        <button
                          type="button"
                          onClick={closeAddForm}
                          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                      <Input
                        type="text"
                        placeholder="ชื่อหัวข้อ เช่น ค่าปรับขาดงาน, ค่าอุปกรณ์"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        disabled={saving}
                        maxLength={100}
                        autoFocus
                      />
                      <div className="grid grid-cols-[9rem_1fr] gap-2">
                        <NumberInput value={newAmount} onChange={setNewAmount} prefix="฿" placeholder="จำนวนเงิน" disabled={saving} />
                        <Input
                          type="text"
                          placeholder="หมายเหตุ (แสดงบนสลิป)"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          disabled={saving}
                          maxLength={200}
                        />
                      </div>
                      {error && <p className="text-[11px] text-rose-600">{error}</p>}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={closeAddForm}
                          className="py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        >
                          ยกเลิก
                        </button>
                        <Button fullWidth onClick={handleAdd} loading={saving} disabled={!newName || !newAmount} icon={<Plus className="w-3.5 h-3.5" />}>
                          {saving ? 'กำลังคำนวณใหม่...' : 'เพิ่มรายการและคำนวณใหม่'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      fullWidth
                      size="sm"
                      variant="secondary"
                      onClick={() => openAddForm('DEDUCTION')}
                      icon={<Plus className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                      className="mt-2 text-rose-700 dark:text-rose-400 border-dashed border-rose-300 dark:border-rose-800/60 hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
                    >
                      เพิ่มรายการหัก
                    </Button>
                  )
                )}
              </div>

              {/* เงินเดือนสุทธิ */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between bg-white dark:bg-slate-800 shadow-2xs">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">เงินเดือนสุทธิ</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {netSalary > 0
                    ? `฿${netSalary.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                    : '-'}
                </span>
              </div>

              {error && !addingSection && <p className="text-[11px] text-rose-600 text-center">{error}</p>}


            </>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

const ManualBadge: React.FC<{ source?: string | null }> = ({ source }) => (
  <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium align-middle dark:bg-amber-900/20 dark:text-amber-400">
    {source === 'BONUS' ? 'โบนัส' : source === 'COMMISSION' ? 'ค่าคอมฯ' : 'ระบุเอง'}
  </span>
);

const DeleteButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title="ลบรายการนี้"
    className="w-6 h-6 rounded-md flex items-center justify-center text-rose-500 hover:bg-rose-50 cursor-pointer disabled:opacity-40"
  >
    <Trash2 className="w-3.5 h-3.5" />
  </button>
);
