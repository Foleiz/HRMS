'use client';

import React from 'react';

export interface PageHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'card' | 'plain';
  className?: string;
  children?: React.ReactNode;
}

/**
 * มาตรฐาน PageHeader กลางของระบบ HRMS
 * แสดงกล่องไอคอนสี่เหลี่ยมขอบมน (rounded-2xl) พื้นหลัง bg-slate-100 dark:bg-slate-800
 * ไอคอนสีกรมท่า text-[#0B2046] dark:text-slate-100 ตามแบบมาตรฐาน UI ของระบบ
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  badge,
  actions,
  variant = 'card',
  className = '',
  children,
}) => {
  const isCard = variant === 'card';

  return (
    <div
      className={`${
        isCard
          ? 'bg-white dark:bg-slate-800/90 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs'
          : ''
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center text-[#0B2046] dark:text-slate-100 shadow-2xs shrink-0 transition-colors">
            <Icon className={iconClassName || 'w-5 h-5'} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}

      {children}
    </div>
  );
};
