'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Eye, EyeOff, ShieldCheck, User } from 'lucide-react';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';
import { Employee } from '@/types/employee';
import { RoleSummary, UserAccount, CreateUserRequest, UpdateUserRequest } from '@/types/settings';

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate: (data: CreateUserRequest) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateUserRequest) => Promise<void>;
  userToEdit?: UserAccount | null;
  employees: Employee[];
  roles: RoleSummary[];
}

interface RoleSelectionState {
  roleId: number;
  isActive: boolean;
}

export const UserDrawer: React.FC<UserDrawerProps> = ({
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  userToEdit,
  employees,
  roles,
}) => {
  const isEditMode = !!userToEdit;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [corporateEmail, setCorporateEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<RoleSelectionState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (userToEdit) {
      setUsername(userToEdit.username);
      setPassword('');
      setSelectedEmployeeId(userToEdit.employeeId);
      setCorporateEmail(userToEdit.corporateEmail || '');
      setSelectedRoles(
        userToEdit.roles.map((r) => ({
          roleId: r.roleId,
          isActive: r.isActive,
        }))
      );
    } else {
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setSelectedEmployeeId('');
      setCorporateEmail('');
      // Default with 1 role card
      const defaultRole = roles.find((r) => r.roleCode === 'EMPLOYEE') || roles[0];
      if (defaultRole) {
        setSelectedRoles([{ roleId: defaultRole.id, isActive: true }]);
      } else {
        setSelectedRoles([]);
      }
    }
    setErrorMsg(null);
  }, [userToEdit, isOpen, roles]);

  // เมื่อเลือกพนักงาน -> Auto-fill อีเมลองค์กร & สร้าง Username แนะนำถ้าว่าง
  const handleEmployeeChange = (empId: number | '') => {
    setSelectedEmployeeId(empId);
    if (!empId) {
      setCorporateEmail('');
      return;
    }

    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      // Auto-fill corporate email
      const generatedEmail = `${emp.firstName.toLowerCase()}.${emp.lastName.charAt(0).toLowerCase()}@enterprise.co.th`;
      setCorporateEmail(emp.contact?.organizationEmail || generatedEmail);

      // Auto-suggest username if empty and in create mode
      if (!isEditMode && !username) {
        setUsername(emp.employeeCode ? emp.employeeCode.toLowerCase() : `usr-${emp.id}`);
      }
    }
  };

  const handleAddRoleCard = () => {
    if (!roles || roles.length === 0) return;
    // หา Role ที่ยังไม่ได้เลือก
    const assignedIds = new Set(selectedRoles.map((r) => r.roleId));
    const availableRole = roles.find((r) => !assignedIds.has(r.id)) || roles[0];
    if (availableRole) {
      setSelectedRoles([...selectedRoles, { roleId: availableRole.id, isActive: true }]);
    }
  };

  const handleRemoveRoleCard = (index: number) => {
    if (selectedRoles.length <= 1) return; // Keep at least one
    setSelectedRoles(selectedRoles.filter((_, i) => i !== index));
  };

  const handleRoleChange = (index: number, newRoleId: number) => {
    const updated = [...selectedRoles];
    updated[index].roleId = newRoleId;
    setSelectedRoles(updated);
  };

  const handleRoleToggleActive = (index: number) => {
    const updated = [...selectedRoles];
    updated[index].isActive = !updated[index].isActive;
    setSelectedRoles(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedEmployeeId) {
      setErrorMsg('กรุณาเลือกพนักงาน');
      return;
    }

    if (!isEditMode && !username.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้งาน');
      return;
    }

    if (!isEditMode && !password) {
      setErrorMsg('กรุณากรอกรหัสผ่าน');
      return;
    }

    if (selectedRoles.length === 0) {
      setErrorMsg('กรุณาเลือกบทบาทอย่างน้อย 1 บทบาท');
      return;
    }

    // Check duplicate roles
    const roleIdSet = new Set<number>();
    for (const r of selectedRoles) {
      if (roleIdSet.has(r.roleId)) {
        setErrorMsg('ไม่สามารถเลือกบทบาทซ้ำกันในรายการได้');
        return;
      }
      roleIdSet.add(r.roleId);
    }

    const activeRoleIds = selectedRoles.filter((r) => r.isActive).map((r) => r.roleId);
    if (activeRoleIds.length === 0) {
      setErrorMsg('กรุณาเปิดใช้งานอย่างน้อย 1 บทบาท');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && userToEdit) {
        await onSubmitUpdate(userToEdit.id, {
          corporateEmail: corporateEmail.trim(),
          status: userToEdit.status,
          roleIds: activeRoleIds,
        });
      } else {
        await onSubmitCreate({
          employeeId: Number(selectedEmployeeId),
          username: username.trim(),
          password,
          corporateEmail: corporateEmail.trim(),
          roleIds: activeRoleIds,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {isEditMode ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form id="user-drawer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {errorMsg}
              </div>
            )}

            {/* 1. ชื่อผู้ใช้งาน */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อผู้ใช้งาน <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isEditMode}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น USER001"
                className={`w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all ${
                  isEditMode ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''
                }`}
              />
              {isEditMode && (
                <p className="text-[11px] text-slate-400 mt-1">ชื่อผู้ใช้งานไม่สามารถเปลี่ยนแปลงได้</p>
              )}
            </div>

            {/* 2. รหัสผ่าน */}
            {!isEditMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  รหัสผ่าน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="เช่น 123456"
                    className="w-full h-11 pl-3.5 pr-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className={`w-3.5 h-3.5 ${password.length >= 8 ? 'text-emerald-500' : 'text-amber-500'}`} />
                    <span className={password.length >= 8 ? 'text-emerald-600' : 'text-amber-600'}>
                      {password.length >= 8 ? 'ระดับความปลอดภัย: แข็งแรง' : 'ระดับความปลอดภัย: ปานกลาง (แนะนำ 8 ตัวอักษรขึ้นไป)'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 3. เลือกพนักงาน */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                เลือกพนักงาน <span className="text-rose-500">*</span>
              </label>
              <EmployeeSelect
                employees={employees}
                value={selectedEmployeeId}
                onChange={handleEmployeeChange}
                disabled={isEditMode}
                placeholder="เลือกพนักงาน..."
                required
              />
            </div>

            {/* 4. อีเมลองค์กร */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                อีเมลองค์กร <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={corporateEmail}
                onChange={(e) => setCorporateEmail(e.target.value)}
                placeholder="เช่น wichai.s@enterprise.co.th"
                className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all"
              />
            </div>

            {/* 5. เลือกบทบาท */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">
                  เลือกบทบาท <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">กำหนดได้หลายบทบาท</span>
              </div>

              <div className="space-y-3">
                {selectedRoles.map((roleItem, index) => (
                  <div
                    key={index}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Badge Number Circle (Navy) */}
                      <div className="w-7 h-7 rounded-full bg-[#0B2046] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {index + 1}
                      </div>

                      {/* Role Dropdown */}
                      <select
                        value={roleItem.roleId}
                        onChange={(e) => handleRoleChange(index, Number(e.target.value))}
                        className="flex-1 h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.roleCode} — {r.roleName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Bottom row: Status toggle and Delete button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-[11px] font-medium text-slate-600">เปิดใช้งาน</span>
                        <div
                          onClick={() => handleRoleToggleActive(index)}
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                            roleItem.isActive ? 'bg-[#0B2046]' : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                              roleItem.isActive ? 'left-4.5' : 'left-1'
                            }`}
                          />
                        </div>
                      </label>

                      {selectedRoles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRoleCard(index)}
                          className="flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบ</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Role Button */}
                <button
                  type="button"
                  onClick={handleAddRoleCard}
                  className="w-full py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#0B2046] hover:border-[#0B2046] hover:bg-slate-50/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ เพิ่มบทบาท</span>
                </button>
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="user-drawer-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/10 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
