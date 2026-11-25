'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { PayrollRecord, PayrollDetailItem, PayrollItem } from '@/types/payroll';
import { salaryService } from '@/services/salaryService';
import { Button, Input, NumberInput, ModalShell, ModalHeader } from '@/components/ui';
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
  const [editingItem, setEditingItem] = useState<PayrollDetailItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');

  const openAddForm = (type: 'EARNING' | 'DEDUCTION') => {
    setEditingItem(null);
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

  const openEditForm = (item: PayrollDetailItem) => {
    setAddingSection(null);
    setEditingItem(item);
    setEditName(item.itemName);
    setEditAmount(String(Math.abs(item.amount)));
    setEditNote(item.note || '');
    setError(null);
  };

  const closeEditForm = () => {
    setEditingItem(null);
    setError(null);
    setEditName('');
    setEditAmount('');
    setEditNote('');
  };

  const handleUpdate = async () => {
    if (!record || !editingItem) return;
    const amount = Number(editAmount);
    if (!editName.trim()) {
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
      const updated = await salaryService.updatePayrollAdjustment(record.id, editingItem.id, {
        amount,
        itemName: editName.trim(),
        note: editNote.trim() || undefined,
      });
      setDetails(updated);
      closeEditForm();
      onChanged?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'แก้ไขรายการไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
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
    closeEditForm();
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
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 min-h-screen h-full shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-700/60 animate-in slide-in-from-right duration-300 overflow-hidden">
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
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {item.itemName}
                            {item.isManual && <ManualBadge source={item.source} />}
                          </div>
                          {canEdit && item.isManual && (
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                            >
                              แตะเพื่อแก้ไข
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                            ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3.5 text-center text-xs text-slate-400 dark:text-slate-500">
                      {record.status === 'DRAFT' ? 'ยังไม่ได้ประมวลผล' : 'ไม่มีรายการรายได้'}
                    </div>
                  )}
                </div>

                {/* ปุ่มเพิ่มรายการได้ */}
                {canEdit && (
                  <Button
                    fullWidth
                    size="sm"
                    variant="primary"
                    onClick={() => openAddForm('EARNING')}
                    icon={<Plus className="w-3.5 h-3.5" />}
                    className="mt-2"
                  >
                    เพิ่มรายการได้
                  </Button>
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
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {item.itemName}
                              {item.isManual && <ManualBadge source={item.source} />}
                            </div>
                            {canEdit && item.isManual && (
                              <button
                                type="button"
                                onClick={() => openEditForm(item)}
                                className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                              >
                                แตะเพื่อแก้ไข
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                              -฿{absAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </div>
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

                {/* ปุ่มเพิ่มรายการหัก */}
                {canEdit && (
                  <Button
                    fullWidth
                    size="sm"
                    variant="primary"
                    onClick={() => openAddForm('DEDUCTION')}
                    icon={<Plus className="w-3.5 h-3.5" />}
                    className="mt-2"
                  >
                    เพิ่มรายการหัก
                  </Button>
                )}
              </div>

              {/* เงินเดือนสุทธิ */}
              <div className="rounded-2xl p-4 sm:px-5 sm:py-4.5 flex items-center justify-between bg-primary border border-primary/80 dark:border-white/10 shadow-md">
                <span className="text-xs sm:text-sm font-semibold text-white/90">เงินเดือนสุทธิ</span>
                <span className="text-base sm:text-lg font-bold text-white font-mono tabular-nums tracking-tight">
                  {netSalary > 0
                    ? `฿${netSalary.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                    : '-'}
                </span>
              </div>

              {error && !addingSection && !editingItem && <p className="text-[11px] text-rose-600 text-center">{error}</p>}
            </>
          )}
        </div>

        {/* Popup เพิ่มรายการได้ / เพิ่มรายการหัก (อยู่ภายใน Drawer) */}
        {addingSection && (
          <div
            className="absolute inset-0 z-30 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
            onClick={closeAddForm}
          >
            <div
              className="relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader
                title={addingSection === 'EARNING' ? 'เพิ่มรายการได้' : 'เพิ่มรายการหัก'}
                subtitle={`${record.employeeName} (${record.employeeCode})`}
                onClose={closeAddForm}
                className="py-2.5 px-8"
              />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAdd();
                }}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="p-4 space-y-3 overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      ชื่อหัวข้อ <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder={addingSection === 'EARNING' ? 'เช่น ค่าเบี้ยเลี้ยงต่างจังหวัด' : 'เช่น ค่าปรับขาดงาน, ค่าอุปกรณ์'}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      disabled={saving}
                      maxLength={100}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      จำนวนเงิน <span className="text-rose-500">*</span>
                    </label>
                    <NumberInput
                      value={newAmount}
                      onChange={setNewAmount}
                      prefix="฿"
                      placeholder="0.00"
                      disabled={saving}
                    />
                  </div>

                  {addingSection === 'EARNING' && (
                    <div className="space-y-1.5 pt-0.5">
                      <OptionCheckCard checked={newTaxable} onChange={setNewTaxable} title="คิดเป็นเงินได้เพื่อภาษี" />
                      <OptionCheckCard checked={newSso} onChange={setNewSso} title="คิดเป็นค่าจ้างเพื่อประกันสังคม" />
                    </div>
                  )}

                  {error && (
                    <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                      {error}
                    </p>
                  )}
                </div>

                <div className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeAddForm}
                    className="py-1.5 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <Button
                    type="submit"
                    size="sm"
                    loading={saving}
                    disabled={!newName.trim() || !newAmount}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    {saving ? 'กำลังคำนวณใหม่...' : 'เพิ่มรายการและคำนวณใหม่'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Popup แก้ไขรายการ (อยู่ภายใน Drawer) */}
        {editingItem && (
          <div
            className="absolute inset-0 z-30 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
            onClick={closeEditForm}
          >
            <div
              className="relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader
                title={editingItem.itemType === 'EARNING' ? 'แก้ไขรายการได้' : 'แก้ไขรายการหัก'}
                subtitle={`${record.employeeName} (${record.employeeCode})`}
                onClose={closeEditForm}
                className="py-2.5 px-8"
              />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdate();
                }}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="p-4 space-y-3 overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      ชื่อหัวข้อ <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="ชื่อหัวข้อ"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={saving}
                      maxLength={100}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      จำนวนเงิน <span className="text-rose-500">*</span>
                    </label>
                    <NumberInput
                      value={editAmount}
                      onChange={setEditAmount}
                      prefix="฿"
                      placeholder="0.00"
                      disabled={saving}
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                      {error}
                    </p>
                  )}
                </div>

                <div className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      if (!editingItem) return;
                      await handleDelete(editingItem.id);
                      closeEditForm();
                    }}
                    className="py-1.5 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    ลบรายการ
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={closeEditForm}
                      className="py-1.5 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      ยกเลิก
                    </button>
                    <Button
                      type="submit"
                      size="sm"
                      loading={saving}
                      disabled={!editName.trim() || !editAmount}
                    >
                      {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

const ManualBadge: React.FC<{ source?: string | null }> = ({ source }) => {
  if (source === 'BONUS') {
    return (
      <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium align-middle dark:bg-amber-900/20 dark:text-amber-400">
        โบนัส
      </span>
    );
  }
  if (source === 'COMMISSION') {
    return (
      <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium align-middle dark:bg-amber-900/20 dark:text-amber-400">
        ค่าคอมฯ
      </span>
    );
  }
  return null;
};
