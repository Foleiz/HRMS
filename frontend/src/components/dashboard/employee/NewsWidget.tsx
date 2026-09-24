'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { announcementService } from '@/services/announcementService';
import { Announcement } from '@/types/announcement';

export const NewsWidget: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newsItem, setNewsItem] = useState<{
    title: string;
    details: string;
  }>({
    title: 'ตรวจสุขภาพประจำปีของบริษัท',
    details: 'วันที่ 30 สิงหาคม 2569 เวลา 11.00 น. นิทรรศการและจุดตรวจสุขภาพประจำปี ณ อาคารบริการ',
  });

  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        const feed = await announcementService.getMyFeed();
        if (feed && feed.length > 0) {
          const first = feed[0];
          const dateStr = first.publishedAt
            ? new Date(first.publishedAt).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : '30 สิงหาคม 2569';
          setNewsItem({
            title: first.title,
            details: `วันที่ ${dateStr} - ${first.content || ''}`,
          });
        }
      } catch (err) {
        // ใช้ค่าตามภาพอ้างอิง
      }
    };
    fetchLatestNews();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
      {/* Header: Soft Blue */}
      <div className="bg-[#6D8EB8] text-white px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wide">ข่าวสาร</h3>
      </div>

      {/* News Content */}
      <div className="p-3.5 space-y-3">
        {/* News Accordion Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-800 line-clamp-1">
              {newsItem.title}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isExpanded && (
            <div className="px-3 pb-3 pt-0 text-[11px] text-slate-500 leading-relaxed border-t border-slate-100">
              <p className="line-clamp-3 mt-1.5">{newsItem.details}</p>
            </div>
          )}
        </div>

        {/* View All Button */}
        <div className="flex justify-end pt-1">
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
