'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  ExternalLink,
  Info,
  Lightbulb,
  AlertTriangle,
  MapPin,
  Printer,
  ZoomIn,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { isPathAccessible } from '@/lib/routePermissions';
import { WIZARD_FLOWS } from '@/config/wizardTours';
import {
  MANUAL_ROLE_META,
  type ManualArticle,
  type ManualCategory,
  type ManualScreenshot,
} from '@/types/manual';
import { ManualLightbox } from './ManualLightbox';

interface ManualArticleViewProps {
  article: ManualArticle;
  category: ManualCategory;
  prevArticle?: ManualArticle;
  nextArticle?: ManualArticle;
  onPrint: () => void;
}

export const ManualArticleView: React.FC<ManualArticleViewProps> = ({
  article,
  category,
  prevArticle,
  nextArticle,
  onPrint,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [lightboxShot, setLightboxShot] = useState<ManualScreenshot | null>(null);

  const canOpenTarget = (() => {
    if (!article.actionHref) return false;
    if (!user) return true;
    const cleanPath = article.actionHref.split('?')[0];
    return isPathAccessible(cleanPath, user).allowed;
  })();

  const relatedTour = article.relatedTourId
    ? WIZARD_FLOWS.find((f) => f.id === article.relatedTourId)
    : undefined;

  const canStartTour = (() => {
    if (!relatedTour || !relatedTour.pages[0]) return false;
    if (!user) return true;
    const cleanPath = relatedTour.pages[0].route.split('?')[0];
    return isPathAccessible(cleanPath, user).allowed;
  })();

  return (
    <>
      <article className="flex-1 min-w-0 space-y-6">
        {/* Article Hero Header */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary dark:bg-blue-950/60 dark:text-blue-300">
                หมวด {category.order}: {category.title}
              </span>
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80"
                aria-label="บทบาทที่ใช้งานได้"
              >
                {article.roles.map((r) => {
                  const meta = MANUAL_ROLE_META[r];
                  return (
                    <span
                      key={r}
                      title={meta.label}
                      className={`h-2.5 w-6 rounded-full ${meta.barClass} transition-transform hover:scale-110 cursor-help`}
                    />
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer shrink-0 print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ / PDF</span>
            </button>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {article.title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {article.summary}
            </p>
          </div>

          {/* Menu Path + Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/70">
            <div className="flex items-start sm:items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5 sm:mt-0" />
              <span className="font-medium shrink-0">ตำแหน่งเมนู:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                {article.menuPath}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
              {article.actionHref &&
                (canOpenTarget ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                    onClick={() => router.push(article.actionHref!)}
                    className="whitespace-nowrap"
                  >
                    เปิดหน้านี้
                  </Button>
                ) : (
                  <span
                    title="บัญชีของคุณไม่มีสิทธิ์เข้าถึงเมนูนี้ แต่สามารถอ่านคู่มือเพื่อทำความเข้าใจได้"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 whitespace-nowrap"
                  >
                    <Lock className="w-3 h-3" />
                    <span>เฉพาะผู้มีสิทธิ์เมนูนี้</span>
                  </span>
                ))}

              {relatedTour && canStartTour && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Compass className="w-3.5 h-3.5" />}
                  onClick={() => router.push(relatedTour.pages[0].route)}
                  className="whitespace-nowrap"
                >
                  เริ่มตัวช่วยงาน
                </Button>
              )}
            </div>
          </div>

          {/* Hero Screenshot */}
          {article.heroScreenshot && (
            <figure className="pt-2">
              <button
                type="button"
                onClick={() => setLightboxShot(article.heroScreenshot!)}
                className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-zoom-in text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.heroScreenshot.src}
                  alt={article.heroScreenshot.alt}
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/75 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                  <ZoomIn className="w-3.5 h-3.5" />
                  คลิกเพื่อขยายภาพ
                </span>
              </button>
              <figcaption className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                {article.heroScreenshot.caption}
              </figcaption>
            </figure>
          )}
        </div>

        {/* Sections */}
        {article.sections.map((section, secIdx) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-primary/10 dark:bg-blue-950/60 text-primary dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                {secIdx + 1}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {section.title}
              </h2>
            </div>

            {section.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {section.description}
              </p>
            )}

            {/* Bullets */}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="space-y-2 pl-1">
                {section.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Step-by-step cards */}
            {section.steps && section.steps.length > 0 && (
              <ol className="space-y-3">
                {section.steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {i + 1}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {step.description}
                      </p>
                      {step.tips && step.tips.length > 0 && (
                        <ul className="pt-1.5 space-y-1">
                          {step.tips.map((tip, ti) => (
                            <li
                              key={ti}
                              className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5"
                            >
                              <span className="text-primary font-bold">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {/* Section Screenshots */}
            {section.screenshots && section.screenshots.length > 0 && (
              <div className="grid grid-cols-1 gap-4 pt-1">
                {section.screenshots.map((shot, si) => (
                  <figure key={si}>
                    <button
                      type="button"
                      onClick={() => setLightboxShot(shot)}
                      className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-zoom-in text-left"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shot.src}
                        alt={shot.alt}
                        className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                      />
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/75 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                        <ZoomIn className="w-3.5 h-3.5" />
                        คลิกเพื่อขยายภาพ
                      </span>
                    </button>
                    <figcaption className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                      {shot.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            {/* Callout */}
            {section.callout && (
              <div
                className={`flex items-start gap-3 p-4 rounded-xl border text-sm leading-relaxed ${
                  section.callout.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : section.callout.type === 'tip'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                }`}
              >
                {section.callout.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                ) : section.callout.type === 'tip' ? (
                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold text-xs uppercase tracking-wide">
                    {section.callout.title}
                  </p>
                  <p className="text-xs sm:text-sm opacity-90">
                    {section.callout.content}
                  </p>
                </div>
              </div>
            )}
          </section>
        ))}

        {/* Prev / Next Navigation */}
        {(prevArticle || nextArticle) && (
          <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
            {prevArticle && (
              <Link
                href={`/manual/${prevArticle.slug}`}
                title={prevArticle.title}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/70 shadow-2xs transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ก่อนหน้า</span>
              </Link>
            )}

            {nextArticle && (
              <Link
                href={`/manual/${nextArticle.slug}`}
                title={nextArticle.title}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-2xs transition-colors"
              >
                <span>ถัดไป</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}
      </article>

      <ManualLightbox
        screenshot={lightboxShot}
        onClose={() => setLightboxShot(null)}
      />
    </>
  );
};
