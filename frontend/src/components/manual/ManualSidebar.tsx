'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Compass,
  User,
  FileText,
  CalendarCheck,
  Clock,
  CreditCard,
  Users,
  CheckCircle2,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';
import type {
  ManualArticle,
  ManualCategory,
  ManualRoleTag,
} from '@/types/manual';

export const MANUAL_CATEGORY_ICONS: Record<
  ManualCategory['iconName'],
  React.ComponentType<{ className?: string }>
> = {
  Compass,
  User,
  FileText,
  CalendarCheck,
  Clock,
  CreditCard,
  Users,
  CheckCircle2,
  BarChart3,
  Settings,
};

interface ManualSidebarProps {
  categories: ManualCategory[];
  articles: ManualArticle[];
  activeSlug?: string;
  selectedRole: ManualRoleTag;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectArticle?: () => void;
}

export const ManualSidebar: React.FC<ManualSidebarProps> = ({
  categories,
  articles,
  activeSlug,
  selectedRole,
  searchQuery,
  onSearchChange,
  onSelectArticle,
}) => {
  const activeArticle = useMemo(
    () => articles.find((a) => a.slug === activeSlug),
    [articles, activeSlug]
  );

  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach((c) => {
      initial[c.id] = !activeArticle || c.id === activeArticle.categoryId;
    });
    return initial;
  });

  const filteredArticlesByCategory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const map: Record<string, ManualArticle[]> = {};

    for (const cat of categories) {
      map[cat.id] = articles.filter((a) => {
        if (a.categoryId !== cat.id) return false;
        if (
          selectedRole !== 'ALL' &&
          !a.roles.includes('ALL') &&
          !a.roles.includes(selectedRole)
        ) {
          return false;
        }
        if (!q) return true;
        const haystack = [
          a.title,
          a.summary,
          a.menuPath,
          ...a.keywords,
          ...a.sections.map((s) => `${s.title} ${s.description ?? ''}`),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    return map;
  }, [categories, articles, selectedRole, searchQuery]);

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 print:hidden">
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs space-y-3.5">
        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหา เช่น ตกเบิก, ใบลา..."
            className="w-full text-xs pl-8 pr-7 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="ล้างคำค้นหา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category tree */}
        <nav className="space-y-1 max-h-[calc(100vh-13rem)] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const catArticles = filteredArticlesByCategory[cat.id] ?? [];
            if (catArticles.length === 0) return null;
            const Icon = MANUAL_CATEGORY_ICONS[cat.iconName];
            const isExpanded =
              Boolean(searchQuery.trim()) ||
              selectedRole !== 'ALL' ||
              expandedCats[cat.id] ||
              cat.id === activeArticle?.categoryId;

            return (
              <div key={cat.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {cat.order}. {cat.title}
                    </span>
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="pl-4 ml-3 border-l border-slate-200 dark:border-slate-700 space-y-0.5 pb-1">
                    {catArticles.map((art) => {
                      const isActive = art.slug === activeSlug;
                      return (
                        <Link
                          key={art.slug}
                          href={`/manual/${art.slug}`}
                          onClick={onSelectArticle}
                          className={`block px-2.5 py-1.5 rounded-lg text-xs transition-colors leading-snug ${
                            isActive
                              ? 'bg-primary text-white font-semibold shadow-2xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          {art.sidebarTitle ?? art.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
