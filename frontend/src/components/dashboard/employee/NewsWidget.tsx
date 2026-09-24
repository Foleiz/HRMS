'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { announcementService } from '@/services/announcementService';
import { Announcement } from '@/types/announcement';

export const NewsWidget: React.FC = () => {
  const [newsList, setNewsList] = useState<{
    id: number | string;
    title: string;
    details: string;
    date: string;
  }[]>([
    {
      id: 1,
      title: 'ตรวจสุขภาพประจำปีของบริษัท',
      details: 'วันที่ 30 สิงหาคม 2569 เวลา 11.00 น. นิทรรศการและจุดตรวจสุขภาพประจำปี ณ อาคารบริการ',
      date: '30 ส.ค. 2569',
    },
    {
      id: 2,
      title: 'นโยบายการทำงานแบบไฮบริด (Hybrid Work)',
      details: 'แนวทางการปฏิบัติงานแบบผสมผสาน ประจำไตรมาสที่ 3 เพื่อความยืดหยุ่นในการทำงาน',
      date: '15 ส.ค. 2569',
    },
  ]);
  const [expandedId, setExpandedId] = useState<number | string>(1);

  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        const feed = await announcementService.getMyFeed();
        if (feed && feed.length > 0) {
          const mapped = feed.slice(0, 3).map((item: Announcement) => {
            const dateStr = item.publishedAt
              ? new Date(item.publishedAt).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'ล่าสุด';
            return {
              id: item.id,
              title: item.title,
              details: `วันที่ ${dateStr} - ${item.content || ''}`,
              date: dateStr,
            };
          });
          setNewsList(mapped);
          setExpandedId(mapped[0]?.id || 1);
        }
      } catch (err) {
        // ใช้ค่าเริ่มต้น
      }
    };
    fetchLatestNews();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between flex-1 h-full min-h-[220px]">
      {/* Header: Soft Blue */}
      <div className="bg-[#6D8EB8] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-bold tracking-wide">ข่าวสาร</h3>
      </div>

      {/* News Content Area (ขยายเต็มความสูง) */}
      <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
        {/* News Items List */}
        <div className="space-y-2 overflow-y-auto">
          {newsList.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? '' : item.id)}
                  className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">
                    {item.title}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-2.5 pb-2.5 pt-0 text-[11px] text-slate-500 leading-relaxed border-t border-slate-100">
                    <p className="line-clamp-4 mt-1">{item.details}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* View All Button pinned at bottom */}
        <div className="flex justify-end pt-2 border-t border-slate-100/80 mt-auto shrink-0">
          <Link
            href="/announcements"
            className="text-[11px] font-semibold text-slate-500 hover:text-[#0B2046] hover:underline px-2 py-1 rounded transition-colors flex items-center gap-1"
          >
            <span>ดูทั้งหมด</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
