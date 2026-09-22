'use client';

import React, { useState } from 'react';
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Shield,
  Calendar,
  Building,
  Briefcase,
  AlertTriangle,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { Employee } from '@/types/employee';
import {
  WorkflowSimulationResult,
  DOCUMENT_TYPE_LABELS,
} from '@/types/approval';
import { approvalService } from '@/services/approvalService';
import { useToast } from '@/context/ToastContext';

interface WorkflowSimulatorViewProps {
  employees: Employee[];
}

const DOCUMENT_TYPE_KEYS = Object.keys(DOCUMENT_TYPE_LABELS);

export const WorkflowSimulatorView: React.FC<WorkflowSimulatorViewProps> = ({ employees }) => {
  const { error } = useToast();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [documentType, setDocumentType] = useState<string>('LEAVE_REQUEST');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );

  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<WorkflowSimulationResult | null>(null);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      error('กรุณาเลือกพนักงานผู้ยื่นคำขอ');
      return;
    }

    try {
      setLoading(true);
      const res = await approvalService.simulateWorkflow({
        employeeId: Number(selectedEmployeeId),
        documentType,
        effectiveDate: effectiveDate || undefined,
      });
      setSimulationResult(res);
    } catch (err: any) {
      error(err?.response?.data?.message || err.message || 'ไม่สามารถจำลองสายการอนุมัติได้');
      setSimulationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedEmployeeId('');
    setDocumentType('LEAVE_REQUEST');
    setEffectiveDate(new Date().toISOString().substring(0, 10));
    setSimulationResult(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Simulation Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              ทดสอบจำลองเส้นทางการอนุมัติเอกสาร
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ระบบจะคำนวณสายการบังคับบัญชา แผนก ระดับตำแหน่ง และการมอบอำนาจอนุมัติแทนเพื่อแสดงลำดับผู้พิจารณาจริง
            </p>
          </div>
          {simulationResult && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ล้างการจำลอง</span>
            </button>
          )}
        </div>

        <form onSubmit={handleRunSimulation} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* พนักงานผู้ยื่นคำขอ */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              พนักงานผู้ยื่นคำขอ <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none cursor-pointer"
            >
              <option value="">-- กรุณาเลือกพนักงานเพื่อทดสอบ --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} - {emp.firstName} {emp.lastName}{' '}
                  {emp.departmentName ? `(${emp.departmentName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ประเภทเอกสาร */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ประเภทเอกสาร <span className="text-rose-500">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none cursor-pointer"
            >
              {DOCUMENT_TYPE_KEYS.map((dt) => (
                <option key={dt} value={dt}>
                  {DOCUMENT_TYPE_LABELS[dt]}
                </option>
              ))}
            </select>
          </div>

          {/* วันที่มีผลจำลอง */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              วันที่มีผลจำลอง <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none"
            />
          </div>

          <div className="md:col-span-4 flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !selectedEmployeeId}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-sm font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>เริ่มการจำลองเส้นทาง</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Simulation Results */}
      {simulationResult && (
        <div className="space-y-6">
          {simulationResult.success ? (
            <>
              {/* Match Header Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-emerald-800">
                      จับคู่สายการอนุมัติสำเร็จ
                    </div>
                    <div className="text-base font-bold text-emerald-950 mt-0.5">
                      {simulationResult.flowName} ({simulationResult.flowCode})
                    </div>
                  </div>
                </div>

                {simulationResult.requester && (
                  <div className="flex items-center gap-3 bg-white/80 border border-emerald-200/80 rounded-xl px-4 py-2 text-xs text-slate-700">
                    <User className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">
                        {simulationResult.requester.fullName} ({simulationResult.requester.employeeCode})
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {simulationResult.requester.positionName || 'ไม่ระบุตำแหน่ง'} •{' '}
                        {simulationResult.requester.departmentName || 'ไม่ระบุแผนก'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Flow Steps Graph */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">
                    เส้นทางลำดับการพิจารณาอนุมัติ ({simulationResult.steps.length} ขั้นตอน)
                  </h4>
                  <span className="text-xs text-slate-400">
                    * ลูกศรแสดงลำดับการส่งต่อเอกสารจากซ้ายไปขวา
                  </span>
                </div>

                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 overflow-x-auto pb-4">
                  {/* Step 0: Requester Card */}
                  <div className="w-full lg:w-60 bg-slate-50 border border-slate-200 rounded-2xl p-4 shrink-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        จุดเริ่มต้น
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">
                        ผู้ยื่นคำขอ
                      </span>
                    </div>
                    <div className="font-bold text-slate-800 text-xs truncate">
                      {simulationResult.requester?.fullName || 'ผู้ยื่นคำขอ'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      รหัส: {simulationResult.requester?.employeeCode || '-'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {simulationResult.requester?.positionName || '-'}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center text-slate-300 lg:shrink-0">
                    <ArrowRight className="w-5 h-5" />
                  </div>

                  {/* Steps */}
                  {simulationResult.steps.map((step, idx) => {
                    const isLast = idx === simulationResult.steps.length - 1;
                    return (
                      <React.Fragment key={step.stepNo}>
                        <div
                          className={`w-full lg:w-72 rounded-2xl p-4 shrink-0 space-y-2.5 border transition-all ${
                            step.hasDelegation
                              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200/50'
                              : 'bg-white border-slate-200 hover:border-[#0B2046]/30 shadow-xs'
                          }`}
                        >
                          {/* Step Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-[#0B2046] text-white text-[11px] font-bold flex items-center justify-center">
                                {step.stepNo}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                ขั้นที่ {step.stepNo}
                              </span>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0B2046]/10 text-[#0B2046]">
                              {step.approverTypeLabel}
                            </span>
                          </div>

                          {/* Approver Details */}
                          {step.approver ? (
                            <div className="space-y-1">
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {step.approver.fullName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                รหัส: {step.approver.employeeCode}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {step.approver.positionName || 'ไม่ระบุตำแหน่ง'} •{' '}
                                {step.approver.departmentName || 'ไม่ระบุแผนก'}
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>ไม่พบผู้ดำรงตำแหน่งหรือสิทธิ์นี้ในสายงาน</span>
                            </div>
                          )}

                          {/* Active Delegation Alert */}
                          {step.hasDelegation && step.delegatedTo && (
                            <div className="p-2.5 bg-amber-100/80 border border-amber-300 rounded-xl text-[11px] text-amber-900 space-y-1">
                              <div className="flex items-center gap-1 font-bold text-amber-950">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>มีการมอบอำนาจอนุมัติแทน</span>
                              </div>
                              <div className="text-[11px] font-semibold text-amber-900">
                                ปฏิบัติการแทน: {step.delegatedTo.fullName} ({step.delegatedTo.employeeCode})
                              </div>
                              <div className="text-[10px] text-amber-700">
                                ตำแหน่ง: {step.delegatedTo.positionName || '-'}
                              </div>
                              {step.delegationPeriod && (
                                <div className="text-[10px] text-amber-700">
                                  ช่วงเวลา: {step.delegationPeriod}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Step Badge Footer */}
                          <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100">
                            <span>{step.isRequired ? 'จำเป็นต้องอนุมัติ' : 'ผ่านโดยไม่มีก็ได้'}</span>
                            <span className="text-emerald-600 font-medium">รอการพิจารณา</span>
                          </div>
                        </div>

                        {/* Connector Arrow */}
                        {!isLast && (
                          <div className="flex items-center justify-center text-slate-300 lg:shrink-0">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Final Step: Completion */}
                  <div className="flex items-center justify-center text-slate-300 lg:shrink-0">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="w-full lg:w-48 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shrink-0 text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <div className="text-xs font-bold text-emerald-900">อนุมัติเสร็จสมบูรณ์</div>
                    <div className="text-[10px] text-emerald-700">เอกสารมีผลบังคับใช้</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800 space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <div className="font-bold text-sm">ไม่พบสายการอนุมัติที่ตรงเงื่อนไข</div>
              <div className="text-xs text-rose-600 max-w-md mx-auto">
                {simulationResult.message || 'ไม่มีสายการอนุมัติที่ตรงกับแผนกหรือระดับตำแหน่งของพนักงานคนนี้ กรุณาสร้างสายการอนุมัติในแท็บผังสายการอนุมัติ'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
