'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Gift,
  Shield,
  HeartPulse,
  Coins,
  Smile,
  HelpCircle,
} from 'lucide-react';
import { benefitService } from '@/services/benefitService';
import { BenefitItem, CreateBenefitPayload, UpdateBenefitPayload } from '@/types/benefit';

interface ManageBenefitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: any }> = {
  STATUTORY: { label: 'กฎหมายแรงงาน', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Shield },
  HEALTH: { label: 'สุขภาพ & ประกัน', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: HeartPulse },
  ALLOWANCE: { label: 'เบี้ยเลี้ยง & ช่วยเหลือ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Coins },
  WELLNESS: { label: 'กิจกรรม & สันทนาการ', color: 'bg-pink-50 text-pink-700 border-pink-200', icon: Smile },
  FINANCIAL: { label: 'การเงิน & กองทุน', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Coins },
  OTHER: { label: 'ทั่วไป / อื่นๆ', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: HelpCircle },
};

export const ManageBenefitsModal: React.FC<ManageBenefitsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BenefitItem | null>(null);
  const [benefitCode, setBenefitCode] = useState('');
  const [benefitName, setBenefitName] = useState('');
  const [category, setCategory] = useState('HEALTH');
  const [description, setDescription] = useState('');
  const [isStatutory, setIsStatutory] = useState(false);
  const [status, setStatus] = useState('ACTIVE');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBenefits();
      resetForm();
    }
  }, [isOpen]);

  const loadBenefits = async () => {
    try {
      setLoading(true);
      const data = await benefitService.getAll();
      setBenefits(data);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'ไม่สามารถโหลดรายการสวัสดิการได้');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setBenefitCode('');
    setBenefitName('');
    setCategory('HEALTH');
    setDescription('');
    setIsStatutory(false);
    setStatus('ACTIVE');
    setErrorMessage(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: BenefitItem) => {
    setEditingItem(item);
    setBenefitCode(item.benefitCode);
    setBenefitName(item.benefitName);
    setCategory(item.category || 'HEALTH');
    setDescription(item.description || '');
    setIsStatutory(item.isStatutory);
    setStatus(item.status);
    setIsFormOpen(true);
    setErrorMessage(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!editingItem && !benefitCode.trim()) {
      setErrorMessage('กรุณาระบุรหัสสวัสดิการ (Benefit Code)');
      return;
    }
    if (!benefitName.trim()) {
      setErrorMessage('กรุณาระบุชื่อสิทธิประโยชน์/สวัสดิการ');
      return;
    }

    try {
      setFormSubmitting(true);

      if (editingItem) {
        const payload: UpdateBenefitPayload = {
          benefitName: benefitName.trim(),
          category,
          description: description.trim() || undefined,
          isStatutory,
          status,
        };
        await benefitService.update(editingItem.id, payload);
        setSuccessMessage('แก้ไขสิทธิประโยชน์สำเร็จ');
      } else {
        const payload: CreateBenefitPayload = {
          benefitCode: benefitCode.trim().toUpperCase(),
          benefitName: benefitName.trim(),
          category,
          description: description.trim() || undefined,
          isStatutory,
          status,
        };
        await benefitService.create(payload);
        setSuccessMessage('เพิ่มสิทธิประโยชน์/สวัสดิการใหม่สำเร็จ');
      }

      await loadBenefits();
      resetForm();
      if (onUpdated) onUpdated();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await benefitService.delete(id);
      setSuccessMessage('ลบสิทธิประโยชน์สำเร็จ');
      setDeleteConfirmId(null);
      await loadBenefits();
      if (onUpdated) onUpdated();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'ไม่สามารถลบสิทธิประโยชน์ได้');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const filteredBenefits = benefits.filter((b) => {
    const matchesSearch =
      b.benefitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.benefitCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || b.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B2046] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Gift className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">จัดการสิทธิประโยชน์และสวัสดิการบริษัท</h2>
              <p className="text-xs text-slate-300">
                กำหนดรายการสวัสดิการ เพื่อนำไปเลือกผูกกับสัญญาจ้างงานแต่ละประเภทแบบไดนามิก
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Top Bar: Controls & Add Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="ค้นหารหัส หรือชื่อสวัสดิการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 bg-white"
              >
                <option value="ALL">ทุกหมวดหมู่ ({benefits.length})</option>
                <option value="STATUTORY">กฎหมายแรงงาน</option>
                <option value="HEALTH">สุขภาพ & ประกัน</option>
                <option value="ALLOWANCE">เบี้ยเลี้ยง & ช่วยเหลือ</option>
                <option value="WELLNESS">กิจกรรม & สันทนาการ</option>
                <option value="FINANCIAL">การเงิน & กองทุน</option>
                <option value="OTHER">อื่นๆ</option>
              </select>
            </div>

            {!isFormOpen && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B2046] hover:bg-[#14326d] rounded-xl transition-all shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ เพิ่มสวัสดิการใหม่</span>
              </button>
            )}
          </div>

          {/* Add / Edit Form Card */}
          {isFormOpen && (
            <form
              onSubmit={handleFormSubmit}
              className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#0B2046]" />
                  {editingItem ? 'แก้ไขสิทธิประโยชน์ / สวัสดิการ' : 'สร้างสิทธิประโยชน์ / สวัสดิการใหม่'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  ยกเลิก
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    รหัสสวัสดิการ (Benefit Code) *
                  </label>
                  <input
                    type="text"
                    value={benefitCode}
                    disabled={Boolean(editingItem)}
                    onChange={(e) => setBenefitCode(e.target.value.toUpperCase())}
                    placeholder="เช่น HEALTH_AIA, FITNESS"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 disabled:bg-slate-100 disabled:text-slate-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">ตัวพิมพ์ใหญ่และขีดล่างเท่านั้น</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ชื่อสวัสดิการ (Benefit Name) *
                  </label>
                  <input
                    type="text"
                    value={benefitName}
                    onChange={(e) => setBenefitName(e.target.value)}
                    placeholder="เช่น ประกันสุขภาพกลุ่ม AIA, ค่าอาหารกลางวัน"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    หมวดหมู่สวัสดิการ
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 bg-white"
                  >
                    <option value="HEALTH">สุขภาพ & ประกัน (HEALTH)</option>
                    <option value="ALLOWANCE">เบี้ยเลี้ยง & ช่วยเหลือ (ALLOWANCE)</option>
                    <option value="WELLNESS">กิจกรรม & สันทนาการ (WELLNESS)</option>
                    <option value="FINANCIAL">การเงิน & กองทุน (FINANCIAL)</option>
                    <option value="STATUTORY">กฎหมายแรงงาน (STATUTORY)</option>
                    <option value="OTHER">ทั่วไป / อื่นๆ (OTHER)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    สถานะการใช้งาน
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 bg-white"
                  >
                    <option value="ACTIVE">เปิดใช้งาน (Active)</option>
                    <option value="INACTIVE">ปิดการใช้งาน (Inactive)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    คำอธิบาย / เงื่อนไขความคุ้มครอง
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="เช่น คุ้มครองผู้ป่วยในและนอก วงเงิน 30,000 บาท/ปี"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#0B2046] hover:bg-[#14326d] rounded-xl transition-colors disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'บันทึกการแก้ไข' : 'สร้างสวัสดิการ'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Benefits Table */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
            {loading ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#0B2046]" />
                <span className="text-xs">กำลังโหลดสวัสดิการ...</span>
              </div>
            ) : filteredBenefits.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                ไม่พบข้อมูลสวัสดิการที่ตรงกับเงื่อนไข
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">รหัส</th>
                    <th className="py-3 px-4">ชื่อสวัสดิการ & รายละเอียด</th>
                    <th className="py-3 px-4">หมวดหมู่</th>
                    <th className="py-3 px-4 text-center">ประเภทสัญญาที่ผูก</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBenefits.map((item) => {
                    const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.OTHER;
                    const CatIcon = cat.icon;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {item.benefitCode}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{item.benefitName}</span>
                            {item.isStatutory && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800 font-medium">
                                สิทธิตามกฎหมาย
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border ${cat.color}`}
                          >
                            <CatIcon className="w-3 h-3" />
                            {cat.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {item.assignedTypesCount || 0} สัญญา
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              เปิดใช้งาน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              ปิดใช้งาน
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-slate-500 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {!item.isStatutory && (
                              <button
                                onClick={() => setDeleteConfirmId(item.id)}
                                disabled={(item.assignedTypesCount || 0) > 0}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
                                title={
                                  (item.assignedTypesCount || 0) > 0
                                    ? 'ไม่สามารถลบได้เนื่องจากถูกผูกในสัญญาจ้าง'
                                    : 'ลบ'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

        {/* Delete Confirmation Dialog */}
        {deleteConfirmId && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-10">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                ยืนยันการลบสิทธิประโยชน์
              </h4>
              <p className="text-xs text-slate-500">
                คุณแน่ใจหรือไม่ว่าต้องการลบสิทธิประโยชน์นี้? การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
                >
                  {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>ยืนยันลบ</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>รวมทั้งสิ้น {benefits.length} สิทธิประโยชน์</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
