'use client';

import React from 'react';
import { DashboardRole } from '../DashboardHeader';

interface AttendancePieChartProps {
  role: DashboardRole;
}

export const AttendancePieChart: React.FC<AttendancePieChartProps> = ({ role }) => {
  // สถิติสถานะการเข้าทำงานตามแต่ละ Role สอดคล้องกับการ์ดสถิติซ้ายมือ
  const getData = () => {
    switch (role) {
      case 'DEPT_MGR':
        return [
          { label: 'มาทำงานปกติ', count: 9, color: '#3B82F6', percentage: 90 }, // Blue
          { label: 'ลางาน/นอกสถานที่', count: 1, color: '#22C55E', percentage: 10 }, // Green
          { label: 'มาสาย/ยังไม่ลงเวลา', count: 0, color: '#EAB308', percentage: 0 }, // Yellow
        ];
      case 'DIV_MGR':
        return [
          { label: 'มาทำงานปกติ', count: 138, color: '#3B82F6', percentage: 92 },
          { label: 'ลางาน/นอกสถานที่', count: 10, color: '#22C55E', percentage: 6.7 },
          { label: 'มาสาย/ยังไม่ลงเวลา', count: 2, color: '#EAB308', percentage: 1.3 },
        ];
      case 'CEO':
      case 'ADMIN':
      default:
        return [
          { label: 'มาทำงานปกติ', count: 145, color: '#3B82F6', percentage: 96.6 },
          { label: 'ลางาน/นอกสถานที่', count: 2, color: '#22C55E', percentage: 1.4 },
          { label: 'มาสาย/ยังไม่ลงเวลา', count: 3, color: '#EAB308', percentage: 2.0 },
        ];
    }
  };

  const data = getData();
  const total = data.reduce((acc, curr) => acc + curr.count, 0) || 1;

  // วาด SVG Pie Chart โดยคำนวณ Path coordinates
  let cumulativeAngle = 0;
  const radius = 64;
  const centerX = 80;
  const centerY = 80;

  const slices = data.map((item) => {
    const fraction = item.count / total;
    if (fraction <= 0) return null;

    const startAngle = cumulativeAngle;
    const angle = fraction * 2 * Math.PI;
    const endAngle = startAngle + angle;
    cumulativeAngle = endAngle;

    // SVG arc path
    const x1 = centerX + radius * Math.cos(startAngle - Math.PI / 2);
    const y1 = centerY + radius * Math.sin(startAngle - Math.PI / 2);
    const x2 = centerX + radius * Math.cos(endAngle - Math.PI / 2);
    const y2 = centerY + radius * Math.sin(endAngle - Math.PI / 2);

    const largeArcFlag = angle > Math.PI ? 1 : 0;
    const pathData =
      fraction >= 0.999
        ? `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 1 1 ${centerX - 0.01} ${centerY - radius} Z`
        : `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      ...item,
      pathData,
    };
  }).filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col items-center justify-between flex-1 h-full min-h-[220px]">
      <div className="w-full text-left shrink-0">
        <h4 className="text-xs font-bold text-slate-800">
          สถานะการเข้าทำงานวันนี้
        </h4>
      </div>

      {/* SVG Pie Chart (สีน้ำเงิน ฟ้า เขียว เหลือง ตามรูปภาพอ้างอิง) */}
      <div className="my-auto py-3 relative flex items-center justify-center">
        <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
          {slices.map((s, idx) => (
            <path
              key={idx}
              d={s!.pathData}
              fill={s!.color}
              className="transition-all hover:opacity-90 hover:scale-105 origin-center cursor-pointer"
            >
              <title>{`${s!.label}: ${s!.count} คน (${s!.percentage}%)`}</title>
            </path>
          ))}
        </svg>
      </div>

      {/* Color Legend */}
      <div className="w-full space-y-1.5 pt-3 border-t border-slate-100 text-[11px] mt-auto shrink-0">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.label}</span>
            </div>
            <span className="font-semibold text-slate-800">
              {item.count} คน ({item.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
