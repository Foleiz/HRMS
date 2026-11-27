'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * แปลง URL รูปภาพที่ชี้ไปยัง `/api/...` ให้เป็นเส้นทางสัมพัทธ์ของ `apiClient`
 * (เช่น `http://localhost:5229/api/employees/1/signature?v=1` -> `/employees/1/signature?v=1`)
 */
function extractProtectedApiPath(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return null;
  }
  const apiIdx = trimmed.indexOf('/api/');
  if (apiIdx >= 0) {
    return trimmed.slice(apiIdx + 4); // คงเครื่องหมาย `/` นำหน้า เช่น `/employees/1/signature`
  }
  return null;
}

/**
 * โหลดรูปภาพจาก API ที่ต้องใช้ JWT (`Authorization: Bearer ...`) แล้วคืนค่าเป็น `blob:` Object URL
 */
export async function fetchAuthImageObjectUrl(
  rawUrl: string,
  signal?: AbortSignal
): Promise<string> {
  const apiPath = extractProtectedApiPath(rawUrl);
  if (!apiPath) return rawUrl;

  const res = await apiClient.get<Blob>(apiPath, {
    responseType: 'blob',
    signal,
  });
  return URL.createObjectURL(res.data);
}

/**
 * React Hook สำหรับแสดงรูปภาพจาก Endpoint ที่ต้องยืนยันตัวตน (เช่น รูปลายเซ็นพนักงาน)
 */
export function useAuthImageUrl(
  rawUrl?: string | null,
  enabled: boolean = true
): { src: string | null; failed: boolean } {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !rawUrl) {
      setSrc(null);
      setFailed(false);
      return;
    }

    const apiPath = extractProtectedApiPath(rawUrl);
    if (!apiPath) {
      setSrc(rawUrl);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;
    let active = true;

    setFailed(false);
    apiClient
      .get<Blob>(apiPath, {
        responseType: 'blob',
        signal: controller.signal,
      })
      .then((res) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!active || controller.signal.aborted) return;
        setSrc(null);
        setFailed(true);
      });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [rawUrl, enabled]);

  return { src, failed };
}
