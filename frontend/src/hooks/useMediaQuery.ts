'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook ตรวจสอบ media query — ใช้สำหรับ responsive behavior
 * @param query CSS media query string เช่น '(min-width: 1024px)'
 * @returns boolean ว่า query ตรงหรือไม่
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    // Set initial value
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * ตรวจว่าเป็นจอ Desktop (≥ 1024px) หรือไม่
 * ถ้า false = เป็นมือถือ/แท็บเล็ต
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
