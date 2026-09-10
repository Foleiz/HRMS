'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { employeeService } from '@/services/employeeService';
import { Employee, CreateEmployeePayload } from '@/types/employee';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  Phone,
  Mail,
  Building,
  CreditCard,
  Eye,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Hospital,
  MapPin,
} from 'lucide-react';

export default function EmployeesPage() {
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State for creating employee
  const [formData, setFormData] = useState<CreateEmployeePayload>({
    employeeCode: '',
    prefix: 'นาย',
    firstName: '',
    lastName: '',
    citizenId: '',
    birthDate: '',
    gender: 'ชาย',
    personalPhone: '',
    personalEmail: '',
    organizationEmail: '',
    socialSecurityNo: '',
    hospitalName: '',
  });

  const loadEmployees = async (search?: string) => {
    try {
      setIsLoading(true);
      const data = await employeeService.getAll(search);
      setEmployees(data);
    } catch (err: unknown) {
      console.error('Failed to load employees:', err);
      setErrorMessage('ไม่สามารถโหลดข้อมูลพนักงานได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadEmployees(searchTerm);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await employeeService.create(formData);
      setSuccessMessage('บันทึกข้อมูลพนักงานและเข้ารหัส PDPA สำเร็จเรียบร้อย');
      setIsModalOpen(false);
      setFormData({
        employeeCode: '',
        prefix: 'นาย',
        firstName: '',
        lastName: '',
        citizenId: '',
        birthDate: '',
        gender: 'ชาย',
        personalPhone: '',
        personalEmail: '',
        organizationEmail: '',
        socialSecurityNo: '',
        hospitalName: '',
      });
      loadEmployees();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMessage(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลพนักงาน "${name}"?`)) return;
    try {
      await employeeService.delete(id);
      setSuccessMessage('ลบข้อมูลพนักงานเรียบร้อย');
      loadEmployees();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMessage(error.response?.data?.message || 'ไม่สามารถลบข้อมูลพนักงานได้');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                ทะเบียนข้อมูลพนักงาน (Employee Directory)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                คุ้มครองข้อมูลส่วนบุคคล (PDPA) ด้วยการเข้ารหัสมาตรฐาน AES-256
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasPermission('EMP_MANAGE') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B2046] hover:bg-[#143268] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              เพิ่มพนักงานใหม่
            </button>
          )}
        </div>
      </div>

      {/* 2. Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearch} className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาด้วยรหัส, ชื่อ-สกุล หรือเลขบัตร..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
          />
        </form>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>พบข้อมูลพนักงานทั้งหมด:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
            {employees.length} คน
          </span>
        </div>
      </div>

      {/* 4. Employees Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">พนักงาน</th>
                <th className="py-3.5 px-4">เลขประจำตัว ปชช. (PDPA)</th>
                <th className="py-3.5 px-4">ช่องทางติดต่อ</th>
                <th className="py-3.5 px-4">ประกันสังคม</th>
                <th className="py-3.5 px-4">บัญชีเงินเดือน</th>
                <th className="py-3.5 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    กำลังโหลดข้อมูลพนักงาน...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    ไม่พบข้อมูลพนักงานตามเงื่อนไขที่ระบุ
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* พนักงาน */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {emp.firstName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">
                            {emp.fullName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {emp.employeeCode}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* เลขบัตร ปชช. (Masked PDPA) */}
                    <td className="py-3.5 px-4">
                      {emp.citizenIdMasked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-mono font-medium border border-emerald-200/60">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {emp.citizenIdMasked}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* ช่องทางติดต่อ */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-xs text-slate-600">
                        {emp.contact?.organizationEmail && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{emp.contact.organizationEmail}</span>
                          </div>
                        )}
                        {emp.contact?.personalPhone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{emp.contact.personalPhone}</span>
                          </div>
                        )}
                        {!emp.contact?.organizationEmail && !emp.contact?.personalPhone && (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </td>

                    {/* ประกันสังคม */}
                    <td className="py-3.5 px-4">
                      {emp.socialSecurity ? (
                        <div className="text-xs space-y-0.5">
                          <div className="font-mono text-slate-700 font-medium">
                            {emp.socialSecurity.socialSecurityNoMasked || '-'}
                          </div>
                          {emp.socialSecurity.hospitalName && (
                            <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                              {emp.socialSecurity.hospitalName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* บัญชีเงินเดือน */}
                    <td className="py-3.5 px-4">
                      {emp.bankAccounts && emp.bankAccounts.length > 0 ? (
                        <div className="text-xs space-y-0.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {emp.bankAccounts[0].bankName || emp.bankAccounts[0].bankCode || 'ธนาคาร'}
                          </div>
                          <div className="font-mono text-slate-500">
                            {emp.bankAccounts[0].accountNumber}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsDetailOpen(true);
                          }}
                          title="ดูรายละเอียดข้อมูล"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission('EMP_MANAGE') && (
                          <button
                            onClick={() => handleDelete(emp.id, emp.fullName)}
                            title="ลบข้อมูลพนักงาน"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Detail Drawer / Modal */}
      {isDetailOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {selectedEmployee.firstName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedEmployee.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    รหัสพนักงาน: {selectedEmployee.employeeCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* ข้อมูลทั่วไป */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  ข้อมูลส่วนบุคคล (Personal Profile)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">เลขบัตรประชาชน (PDPA)</span>
                    <span className="font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block mt-1">
                      {selectedEmployee.citizenIdMasked || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">วันเดือนปีเกิด</span>
                    <span className="font-medium text-slate-800 block mt-1">
                      {selectedEmployee.birthDate || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">เพศ</span>
                    <span className="font-medium text-slate-800 block mt-1">
                      {selectedEmployee.gender || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ข้อมูลติดต่อ */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  ช่องทางติดต่อ (Contact Information)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">อีเมลองค์กร</span>
                    <span className="font-medium text-slate-800 block mt-1">
                      {selectedEmployee.contact?.organizationEmail || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">เบอร์โทรศัพท์</span>
                    <span className="font-medium text-slate-800 block mt-1">
                      {selectedEmployee.contact?.personalPhone || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ประกันสังคม & ธนาคาร */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  ประกันสังคม & บัญชีธนาคาร
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">เลขประกันสังคม (PDPA)</span>
                    <span className="font-mono font-medium text-slate-800 block mt-1">
                      {selectedEmployee.socialSecurity?.socialSecurityNoMasked || '-'}
                    </span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      สถานพยาบาล: {selectedEmployee.socialSecurity?.hospitalName || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">บัญชีจ่ายเงินเดือน</span>
                    {selectedEmployee.bankAccounts && selectedEmployee.bankAccounts.length > 0 ? (
                      <div className="mt-1">
                        <span className="font-medium text-slate-800 block">
                          {selectedEmployee.bankAccounts[0].bankName}
                        </span>
                        <span className="font-mono text-slate-500 block text-[11px]">
                          เลขบัญชี: {selectedEmployee.bankAccounts[0].accountNumber}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 block mt-1">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Create Employee */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">เพิ่มข้อมูลพนักงานใหม่</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    ข้อมูลเลขประจำตัวประชาชนและประกันสังคมจะถูกเข้ารหัสอัตโนมัติด้วย AES-256 ทันทีที่บันทึกลงระบบ
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      รหัสพนักงาน <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น EMP006"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">คำนำหน้า</label>
                    <select
                      value={formData.prefix}
                      onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="นาง">นาง</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อจริง <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ชื่อ"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      นามสกุล <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="นามสกุล"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เลขประจำตัวประชาชน (13 หลัก)
                    </label>
                    <input
                      type="text"
                      maxLength={13}
                      placeholder="เลขบัตร ปชช."
                      value={formData.citizenId}
                      onChange={(e) => setFormData({ ...formData, citizenId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      placeholder="08x-xxx-xxxx"
                      value={formData.personalPhone}
                      onChange={(e) => setFormData({ ...formData, personalPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลองค์กร</label>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={formData.organizationEmail}
                      onChange={(e) => setFormData({ ...formData, organizationEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">สถานพยาบาลประกันสังคม</label>
                    <input
                      type="text"
                      placeholder="โรงพยาบาล"
                      value={formData.hospitalName}
                      onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#0B2046] hover:bg-[#143268] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    'บันทึกข้อมูลพนักงาน'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
