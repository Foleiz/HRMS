'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Menu, X } from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { Button } from '@/components/ui';
import {
  MANUAL_ARTICLES,
  MANUAL_CATEGORIES,
  getManualArticleBySlug,
} from '@/data/manual';
import { ManualSidebar } from '@/components/manual/ManualSidebar';
import { ManualArticleView } from '@/components/manual/ManualArticleView';
import type { ManualRoleTag } from '@/types/manual';

interface RoleCardOption {
  id: ManualRoleTag;
  title: string;
  dotClass: string;
  idleClass: string;
  activeClass: string;
}

const ROLE_CARD_OPTIONS: RoleCardOption[] = [
  {
    id: 'ALL',
    title: 'ทุกบทบาท',
    dotClass: 'bg-slate-600 dark:bg-slate-300',
    idleClass:
      'border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100/70',
    activeClass:
      'border-2 border-primary bg-primary text-white shadow-xs',
  },
  {
    id: 'EMPLOYEE',
    title: 'พนักงานทั่วไป',
    dotClass: 'bg-sky-500',
    idleClass:
      'border border-sky-200 dark:border-sky-800/80 bg-sky-50/60 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200 hover:border-sky-300 hover:bg-sky-50',
    activeClass:
      'border-2 border-sky-600 bg-sky-600 text-white shadow-xs',
  },
  {
    id: 'MANAGER',
    title: 'หัวหน้างาน',
    dotClass: 'bg-indigo-500',
    idleClass:
      'border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200 hover:border-indigo-300 hover:bg-indigo-50',
    activeClass:
      'border-2 border-indigo-600 bg-indigo-600 text-white shadow-xs',
  },
  {
    id: 'HR',
    title: 'ฝ่ายบุคคล (HR)',
    dotClass: 'bg-emerald-500',
    idleClass:
      'border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 hover:border-emerald-300 hover:bg-emerald-50',
    activeClass:
      'border-2 border-emerald-600 bg-emerald-600 text-white shadow-xs',
  },
  {
    id: 'FINANCE',
    title: 'ฝ่ายการเงิน',
    dotClass: 'bg-amber-500',
    idleClass:
      'border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 hover:border-amber-300 hover:bg-amber-50',
    activeClass:
      'border-2 border-amber-500 bg-amber-500 text-white shadow-xs',
  },
  {
    id: 'EXECUTIVE',
    title: 'ผู้บริหาร (CEO)',
    dotClass: 'bg-purple-500',
    idleClass:
      'border border-purple-200 dark:border-purple-800/80 bg-purple-50/60 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200 hover:border-purple-300 hover:bg-purple-50',
    activeClass:
      'border-2 border-purple-600 bg-purple-600 text-white shadow-xs',
  },
  {
    id: 'ADMIN',
    title: 'ผู้ดูแลระบบ',
    dotClass: 'bg-rose-500',
    idleClass:
      'border border-rose-200 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 hover:border-rose-300 hover:bg-rose-50',
    activeClass:
      'border-2 border-rose-600 bg-rose-600 text-white shadow-xs',
  },
];

interface ManualWorkspaceProps {
  slug?: string;
}

export const ManualWorkspace: React.FC<ManualWorkspaceProps> = ({ slug }) => {
  const { setBreadcrumb } = useBreadcrumb();
  const [selectedRole, setSelectedRole] = useState<ManualRoleTag>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const effectiveSlug = slug || MANUAL_ARTICLES[0]?.slug || '';
  const article = useMemo(
    () => getManualArticleBySlug(effectiveSlug),
    [effectiveSlug]
  );
  const category = useMemo(
    () =>
      article
        ? MANUAL_CATEGORIES.find((c) => c.id === article.categoryId)
        : undefined,
    [article]
  );

  const { prevArticle, nextArticle } = useMemo(() => {
    if (!article) {
      return { prevArticle: undefined, nextArticle: undefined };
    }
    const idx = MANUAL_ARTICLES.findIndex((a) => a.slug === article.slug);
    return {
      prevArticle: idx > 0 ? MANUAL_ARTICLES[idx - 1] : undefined,
      nextArticle:
        idx >= 0 && idx < MANUAL_ARTICLES.length - 1
          ? MANUAL_ARTICLES[idx + 1]
          : undefined,
    };
  }, [article]);

  useEffect(() => {
    if (slug && article) {
      setBreadcrumb({ section: 'คู่มือการใช้งาน', page: article.title });
    } else {
      setBreadcrumb({ page: 'คู่มือการใช้งาน' });
    }
    return () => setBreadcrumb(null);
  }, [slug, article, setBreadcrumb]);

  const handlePrint = () => {
    window.print();
  };

  if (!article || !category) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center space-y-4">
        <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          ไม่พบบทความคู่มือที่คุณต้องการ
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          บทความอาจถูกย้ายหรือลิงก์ไม่ถูกต้อง กรุณากลับไปเลือกจากหน้าหลักคู่มือการใช้งาน
        </p>
        <div>
          <Link href="/manual">
            <Button variant="primary" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              กลับหน้าคู่มือการใช้งาน
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans pb-12 space-y-5">
      {/* Top Hero Card (ตามแบบรูปที่ 2: ไม่มีปุ่มเปิดตัวช่วยงาน และไม่มีช่องค้นหา) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4 print:hidden">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-blue-950/60 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              คู่มือการใช้งานระบบ HRMS
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              ศูนย์รวมวิธีใช้งานครบทั้ง {MANUAL_CATEGORIES.length} หมวด ({MANUAL_ARTICLES.length}{' '}
              บทความ) พร้อมภาพหน้าจอจริง ขั้นตอนทีละขั้น และป้ายระบุบทบาทผู้ใช้งาน
            </p>
          </div>
        </div>

        {/* Role Filter Cards (การ์ดเลือกบทบาทแบบเรียบง่าย) */}
        <div className="space-y-2.5 pt-1">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            เลือกดูตามบทบาท
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {ROLE_CARD_OPTIONS.map((role) => {
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`text-center rounded-xl px-3 py-2.5 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isSelected
                      ? `${role.activeClass} font-bold`
                      : `${role.idleClass} font-semibold`
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-white' : role.dotClass
                    }`}
                  />
                  <span className="text-xs leading-snug">{role.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile module toggle bar */}
      <div className="flex lg:hidden items-center justify-between gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 print:hidden">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
          {article.title}
        </span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
          <span>เลือกโมดูล</span>
        </button>
      </div>

      {/* Mobile collapsible sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden print:hidden">
          <ManualSidebar
            categories={MANUAL_CATEGORIES}
            articles={MANUAL_ARTICLES}
            activeSlug={article.slug}
            selectedRole={selectedRole}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectArticle={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* 2-Column Layout: ซ้ายแสดงโมดูล (ค้างตามเมื่อเลื่อนลง) + ขวา/กลางแสดงเนื้อหาพร้อมภาพหน้าจอจริง */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <div className="hidden lg:block lg:sticky lg:top-0 self-start shrink-0 print:hidden">
          <ManualSidebar
            categories={MANUAL_CATEGORIES}
            articles={MANUAL_ARTICLES}
            activeSlug={article.slug}
            selectedRole={selectedRole}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        <ManualArticleView
          article={article}
          category={category}
          prevArticle={prevArticle}
          nextArticle={nextArticle}
          onPrint={handlePrint}
        />
      </div>
    </div>
  );
};
