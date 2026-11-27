'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Receipt,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { useLoadPhase } from '@/hooks/useLoadPhase';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useToast } from '@/context/ToastContext';
import { reportService } from '@/services/reportService';
import { organizationService } from '@/services/organizationService';
import type { PayrollTaxSummary } from '@/types/reports';
import type { Department } from '@/types/organization';
import { getSmartYearRange } from '@/lib/yearUtils';
import { TH_MONTHS } from '@/lib/thaiDate';
import { printReport } from '@/lib/printReport';
import ExportMenu, { ReportExportFormat } from './ExportMenu';
import { Legend, MonthlyColumns, VIZ, fmtBaht } from './ReportCharts';
import {
  AvatarName,
  IconButton,
  KpiCard,
  KpiGrid,
  ReportEmpty,
  ReportFilterBar,
  ReportLoading,
  ReportPanel,
  ReportTableCard,
  TableEmpty,
} from './ReportShell';

export interface TaxReportTabProps {
  canExportTax: boolean;
  canExportSso: boolean;
}

const monthsUpTo = (year: number) => {
  const now = new Date();
  const last = year < now.getFullYear() ? 12 : year === now.getFullYear() ? now.getMonth() + 1 : 0;
  return Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => m <= last);
};

/** รายงานภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และประกันสังคม (สปส. 1-10) */
export default function TaxReportTab({ canExportTax, canExportSso }: TaxReportTabProps) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [taxMonth, setTaxMonth] = useState<number>(new Date().getMonth() + 1);
  const [taxTrend, setTaxTrend] = useState<{ tax: (number | null)[]; sso: (number | null)[] } | null>(null);
  const [taxDepartment, setTaxDepartment] = useState<number | 'ALL'>('ALL');
  const [taxSearch, setTaxSearch] = useState<string>('');
  const [taxData, setTaxData] = useState<PayrollTaxSummary | null>(null);
  const [isLoadingTax, setIsLoadingTax] = useState(false);
  const taxPhase = useLoadPhase(isLoadingTax);
  const [isExportingTax, setIsExportingTax] = useState(false);
  const [isExportingSso, setIsExportingSso] = useState(false);
  const [taxPage, setTaxPage] = useState(1);
  const [taxRowsPerPage, setTaxRowsPerPage] = useState(10);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    organizationService
      .getDepartments()
      .then((depts) => setDepartments(depts))
      .catch(() => undefined);
  }, []);

  const loadPayrollTax = useCallback(async () => {
    try {
      setIsLoadingTax(true);
      const deptId = taxDepartment === 'ALL' ? undefined : Number(taxDepartment);
      const data = await reportService.getPayrollTaxSummary(taxYear, taxMonth, deptId);
      setTaxData(data);
      setTaxPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานภาษีและประกันสังคมได้';
      toastRef.current.error(msg);
    } finally {
      setIsLoadingTax(false);
    }
  }, [taxYear, taxMonth, taxDepartment]);

  useEffect(() => {
    loadPayrollTax();
  }, [loadPayrollTax]);

  useEffect(() => {
    let cancelled = false;
    const deptId = taxDepartment === 'ALL' ? undefined : Number(taxDepartment);
    const months = monthsUpTo(taxYear);
    Promise.allSettled(months.map((m) => reportService.getPayrollTaxSummary(taxYear, m, deptId))).then((res) => {
      if (cancelled) return;
      const tax: (number | null)[] = Array(12).fill(null);
      const sso: (number | null)[] = Array(12).fill(null);
      res.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.periodStatus !== 'NONE' && r.value.items.length > 0) {
          tax[months[i] - 1] = r.value.totalWithholdingTax;
          sso[months[i] - 1] = r.value.totalSsoRemittance;
        }
      });
      setTaxTrend({ tax, sso });
    });
    return () => {
      cancelled = true;
    };
  }, [taxYear, taxDepartment]);

  const handleExportPayrollTax = async (format: ReportExportFormat = 'csv') => {
    if (format === 'pdf') {
      printReport(printRef.current, {
        title: 'รายงานภาษีและประกันสังคม',
        subtitle: `เดือน ${TH_MONTHS[taxMonth - 1]} พ.ศ. ${taxYear + 543}`,
      });
      return;
    }
    try {
      setIsExportingTax(true);
      const deptId = taxDepartment === 'ALL' ? undefined : taxDepartment;
      await reportService.downloadPayrollTaxCsv(taxYear, taxMonth, deptId, format);
      toast.success('ดาวน์โหลดรายงานภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.1) สำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดรายงาน ภ.ง.ด.1');
    } finally {
      setIsExportingTax(false);
    }
  };

  const handleExportSso = async (format: ReportExportFormat = 'csv') => {
    if (format === 'pdf') {
      printReport(printRef.current, {
        title: 'รายงานภาษีและประกันสังคม',
        subtitle: `เดือน ${TH_MONTHS[taxMonth - 1]} พ.ศ. ${taxYear + 543}`,
      });
      return;
    }
    try {
      setIsExportingSso(true);
      const deptId = taxDepartment === 'ALL' ? undefined : taxDepartment;
      await reportService.downloadSsoCsv(taxYear, taxMonth, deptId, format);
      toast.success('ดาวน์โหลดรายงานนำส่งเงินสมทบประกันสังคม (สปส. 1-10) สำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดรายงาน สปส. 1-10');
    } finally {
      setIsExportingSso(false);
    }
  };

  const filteredTaxItems = useMemo(() => {
    if (!taxData?.items) return [];
    if (!taxSearch.trim()) return taxData.items;
    const q = taxSearch.toLowerCase().trim();
    return taxData.items.filter(
      (item) =>
        item.employeeName.toLowerCase().includes(q) ||
        item.employeeCode.toLowerCase().includes(q) ||
        item.departmentName.toLowerCase().includes(q) ||
        item.citizenIdMasked.toLowerCase().includes(q)
    );
  }, [taxData?.items, taxSearch]);

  const totalTaxPages = Math.ceil(filteredTaxItems.length / taxRowsPerPage) || 1;
  const currentTaxPage = Math.min(taxPage, totalTaxPages);
  const pagedTaxItems = filteredTaxItems.slice(
    (currentTaxPage - 1) * taxRowsPerPage,
    currentTaxPage * taxRowsPerPage
  );

  const fmtCurrency = (v: number) =>
    v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <ReportFilterBar
        loading={isLoadingTax}
        right={
          <div className="flex flex-wrap items-center gap-2">
            {canExportTax && (
              <ExportMenu
                label="ภ.ง.ด.1"
                onExport={handleExportPayrollTax}
                disabled={isExportingTax || !taxData || taxData.items.length === 0}
              />
            )}
            {canExportSso && (
              <ExportMenu
                label="สปส. 1-10"
                formats={['xlsx', 'csv']}
                onExport={handleExportSso}
                disabled={isExportingSso || !taxData || taxData.items.length === 0}
              />
            )}
          </div>
        }
      >
        <CustomSelect
          value={taxMonth}
          onChange={(e) => setTaxMonth(Number(e.target.value))}
          className="min-w-[140px]"
        >
          {TH_MONTHS.map((m, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {m}
            </option>
          ))}
        </CustomSelect>

        <CustomSelect
          value={taxYear}
          onChange={(e) => setTaxYear(Number(e.target.value))}
          className="min-w-[130px]"
        >
          {getSmartYearRange({ forwardYears: 1, backYears: 5, selectedYear: taxYear }).map((y) => (
            <option key={y} value={y}>
              พ.ศ. {y + 543}
            </option>
          ))}
        </CustomSelect>

        <CustomSelect
          value={taxDepartment}
          onChange={(val) => {
            const parsed = String(val) === 'ALL' ? 'ALL' : Number(val);
            setTaxDepartment(parsed);
          }}
          placeholder="ทุกแผนก"
          className="min-w-[160px]"
          options={[
            { value: 'ALL', label: 'ทุกแผนก' },
            ...departments.map((dept) => ({ value: dept.id, label: dept.departmentName })),
          ]}
        />

        <IconButton onClick={loadPayrollTax} title="รีเฟรช">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTax ? 'animate-spin' : ''}`} />
        </IconButton>
      </ReportFilterBar>

      {taxPhase.initialLoading && !taxData ? (
        <ReportLoading text="กำลังโหลดรายงานภาษีและประกันสังคม..." />
      ) : !taxData ? (
        <ReportEmpty text="ไม่พบข้อมูลภาษีและประกันสังคมตามเงื่อนไขที่เลือก" />
      ) : (
        <div ref={printRef} className="space-y-5">
          {(() => {
            const totalDeductionsAmount =
              taxData.totalDeductions ?? taxData.items.reduce((sum, it) => sum + (it.totalDeductions || 0), 0);
            const totalOtherDeductions =
              taxData.totalOtherDeductions ??
              Math.max(0, totalDeductionsAmount - taxData.totalWithholdingTax - taxData.totalSsoEmployee);

            return (
              <KpiGrid cols={5}>
                <KpiCard
                  icon={DollarSign}
                  tone="blue"
                  label="เงินได้พึงประเมินรวม"
                  value={fmtCurrency(taxData.totalGrossIncome)}
                  unit="บาท"
                  tooltip="เงินเดือน + ค่าล่วงเวลา + เงินได้อื่นๆ รวมทุกคน"
                />
                <KpiCard
                  icon={Receipt}
                  tone="rose"
                  label="ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1)"
                  value={fmtCurrency(taxData.totalWithholdingTax)}
                  unit="บาท"
                  tooltip="ยอดภาษีหัก ณ ที่จ่ายรายเดือนรวมทุกคน"
                />
                <KpiCard
                  icon={ShieldCheck}
                  tone="sky"
                  label="ปกส. หักจากลูกจ้าง (5%)"
                  value={fmtCurrency(taxData.totalSsoEmployee)}
                  unit="บาท"
                  tooltip="หัก 5% ของฐานเงินเดือน (สูงสุด 750 บาท/คน)"
                />
                <KpiCard
                  icon={TrendingDown}
                  tone="amber"
                  label="รายการหักอื่นๆ"
                  value={fmtCurrency(totalOtherDeductions)}
                  unit="บาท"
                  tooltip="หักมาสาย ขาดงาน หรือรายการหักอื่นๆ รวมกัน"
                />
                <KpiCard
                  icon={CheckCircle2}
                  tone="emerald"
                  label="เงินเดือนสุทธินำจ่าย"
                  value={fmtCurrency(taxData.totalNetSalary)}
                  unit="บาท"
                  tooltip="เงินได้รวม − ภาษี − ประกันสังคม − รายการหักอื่นๆ"
                />
              </KpiGrid>
            );
          })()}

          {/* สถานะรอบเงินเดือน */}
          {!isLoadingTax &&
            (taxData.periodStatus === 'NONE' ? (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                ยังไม่มีรอบเงินเดือนของเดือนนี้ — สร้างและคำนวณรอบเงินเดือนก่อน รายงานจึงจะมีข้อมูล
              </div>
            ) : ['APPROVED', 'PROCESSING', 'PAID', 'CLOSED'].includes(taxData.periodStatus) ? (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                รอบเงินเดือนอนุมัติแล้ว ({taxData.periodStatus}) — ตัวเลขพร้อมใช้ยื่น ภ.ง.ด.1 / สปส.1-10
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                รอบเงินเดือนยังไม่อนุมัติ ({taxData.periodStatus}) — ตัวเลขอาจเปลี่ยน ยังไม่ควรใช้ยื่นจริง
              </div>
            ))}

          {/* แนวโน้มทั้งปี */}
          {taxTrend && taxTrend.tax.some((v) => v != null) && (
            <ReportPanel
              title={`ภาษีหัก ณ ที่จ่าย และเงินสมทบประกันสังคม ปี พ.ศ. ${taxYear + 543}`}
              subtitle="ยอดรวมรายเดือน (บาท) · เดือนที่ยังไม่มีรอบเงินเดือนจะว่างไว้ · แถบไฮไลต์ = เดือนที่เลือก"
              right={
                <Legend
                  items={[
                    { label: 'ภาษี ภ.ง.ด.1', color: VIZ.s1 },
                    { label: 'ประกันสังคมรวมนำส่ง', color: VIZ.s3 },
                  ]}
                />
              }
            >
              <MonthlyColumns
                highlightMonth={taxMonth}
                tipFormat={fmtBaht}
                series={[
                  { key: 'tax', label: 'ภาษี ภ.ง.ด.1', color: VIZ.s1, values: taxTrend.tax },
                  { key: 'sso', label: 'ประกันสังคมรวมนำส่ง', color: VIZ.s3, values: taxTrend.sso },
                ]}
              />
            </ReportPanel>
          )}

          {/* Detailed Tax & SSO Table */}
          <ReportTableCard
            searchValue={taxSearch}
            onSearchChange={(val) => {
              setTaxSearch(val);
              setTaxPage(1);
            }}
            searchPlaceholder="ค้นหาชื่อ รหัสพนักงาน หรือเลขบัตรประชาชน..."
            refreshing={taxPhase.refreshing}
            minWidthClassName="min-w-[1100px]"
            pagination={{
              total: filteredTaxItems.length,
              page: currentTaxPage,
              pageSize: taxRowsPerPage,
              onPageChange: setTaxPage,
              onPageSizeChange: (newSize) => {
                setTaxRowsPerPage(newSize);
                setTaxPage(1);
              },
              pageSizeOptions: [10, 20, 50, 100, 200],
            }}
          >
            <thead className="bg-primary text-white font-semibold">
              <tr className="whitespace-nowrap">
                <th className="w-10 py-3.5 px-3 text-center whitespace-nowrap">#</th>
                <th className="py-3.5 px-3 whitespace-nowrap">พนักงาน</th>
                <th className="py-3.5 px-3 whitespace-nowrap">รหัสพนักงาน</th>
                <th className="py-3.5 px-3 whitespace-nowrap">เลขประจำตัวประชาชน</th>
                <th className="py-3.5 px-3 whitespace-nowrap">แผนก / ตำแหน่ง</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">เงินได้พึงประเมิน (+)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">ภาษี ภ.ง.ด.1 (−)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">ปกส. ลูกจ้าง (−)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">หักอื่นๆ (−)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">รวมรายการหัก</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">เงินเดือนสุทธิ (=)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">ปกส. นายจ้าง</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">รวมนำส่ง ปกส.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
              {pagedTaxItems.length === 0 ? (
                <TableEmpty
                  colSpan={13}
                  text={
                    taxData.periodStatus === 'NONE'
                      ? `ไม่พบข้อมูลงวดการจ่ายเงินเดือนประจำเดือน${TH_MONTHS[taxMonth - 1]} ${taxYear + 543}`
                      : 'ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา'
                  }
                />
              ) : (
                pagedTaxItems.map((item, idx) => {
                  const rowNum = (currentTaxPage - 1) * taxRowsPerPage + idx + 1;
                  const ssoTotal = item.ssoEmployee + item.ssoEmployer;
                  const otherDed =
                    item.otherDeductions ??
                    Math.max(0, (item.totalDeductions || 0) - (item.withholdingTax || 0) - (item.ssoEmployee || 0));
                  const totalDed =
                    item.totalDeductions ?? (item.withholdingTax || 0) + (item.ssoEmployee || 0) + otherDed;

                  return (
                    <tr
                      key={item.employeeId}
                      className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 whitespace-nowrap">{rowNum}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <AvatarName id={item.employeeId} name={item.employeeName} />
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {item.employeeCode}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {item.citizenIdMasked}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{item.departmentName}</div>
                        <div className="text-[11px] text-slate-400">{item.positionName}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {fmtCurrency(item.grossIncome)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {item.withholdingTax > 0 ? fmtCurrency(item.withholdingTax) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        {fmtCurrency(item.ssoEmployee)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {otherDed > 0 ? fmtCurrency(otherDed) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {fmtCurrency(totalDed)}
                      </td>
                      <td className="bg-emerald-50/40 py-3 px-3 text-right font-extrabold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 whitespace-nowrap">
                        {fmtCurrency(item.netSalary)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {fmtCurrency(item.ssoEmployer)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {fmtCurrency(ssoTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </ReportTableCard>
        </div>
      )}
    </div>
  );
}
