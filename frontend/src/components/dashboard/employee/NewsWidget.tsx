'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { announcementService } from '@/services/announcementService';
import { Announcement } from '@/types/announcement';

interface NewsItem {
  id: number | string;
  title: string;
  details: string;
  date: string;
}

export const NewsWidget: React.FC = () => {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchLatestNews = async () => {
      setLoading(true);
      try {
        const feed = await announcementService.getMyFeed();
        if (feed && Array.isArray(feed) && feed.length > 0) {
          const mapped: NewsItem[] = feed.slice(0, 4).map((item: Announcement) => {
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
              details: item.content || 'ไม่มีรายละเอียดเพิ่มเติม',
              date: dateStr,
            };
          });

          if (isMounted) {
            setNewsList(mapped);
            setExpandedId(mapped[0]?.id || '');
          }
        } else {
          if (isMounted) {
            setNewsList([]);
          }
        }
      } catch (err) {
        console.error('Failed to load announcements:', err);
        if (isMounted) {
          setNewsList([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLatestNews();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between flex-1 h-full min-h-0">
      {/* Header: Soft Blue */}
      <div className="bg-[#6D8EB8] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-bold tracking-wide">ข่าวสารและประกาศ</h3>
        <span className="text-[11px] font-normal text-white/90">ข้อมูลทางการ</span>
      </div>

      {/* News Content Area */}
      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">
            กำลังโหลดข่าวสาร...
          </div>
        ) : newsList.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            ยังไม่มีข่าวสารหรือประกาศใหม่ในขณะนี้
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
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
                    <div className="flex flex-col pr-2">
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400">{item.date}</span>
                    </div>
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
        )}

        {/* Read More Link */}
        <Link
          href="/my-news"
          className="pt-2 text-xs font-semibold text-[#0B2046] hover:text-blue-700 flex items-center justify-end gap-1 transition-colors cursor-pointer mt-auto border-t border-slate-100 shrink-0"
        >
          <span>อ่านทั้งหมด</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
