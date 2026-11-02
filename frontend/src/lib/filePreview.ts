/**
 * Utility สำหรับการเปิดดูไฟล์แนบในแท็บใหม่ของเบราว์เซอร์
 * ออกแบบให้เปิดแท็บใหม่ทันทีขณะรับ user event ป้องกันเบราว์เซอร์ Pop-up Blocker บล็อก
 */

export const openBlobInNewTab = async (
  downloadFn: () => Promise<Blob>,
  fileName?: string | null,
  onError?: (errorMessage: string) => void
): Promise<void> => {
  // 1. เปิดแท็บเปล่าขึ้นมาก่อนทันทีขณะที่ยังอยู่ใน user gesture context เพื่อไม่ให้โดน popup blocker
  const newTab = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  if (newTab) {
    try {
      newTab.document.title = fileName ? `กำลังเปิด: ${fileName}` : 'กำลังโหลดเอกสาร...';
      newTab.document.body.style.backgroundColor = '#0f172a';
      newTab.document.body.style.color = '#94a3b8';
      newTab.document.body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      newTab.document.body.style.display = 'flex';
      newTab.document.body.style.alignItems = 'center';
      newTab.document.body.style.justifyContent = 'center';
      newTab.document.body.style.height = '100vh';
      newTab.document.body.style.margin = '0';
      newTab.document.body.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 15px; font-weight: 600; color: #f8fafc; margin-bottom: 6px;">กำลังโหลดเอกสารแนบ...</div>
          <div style="font-size: 12px; color: #64748b; font-family: monospace;">${fileName || ''}</div>
        </div>
      `;
    } catch {
      // ข้ามกรณีที่เบราว์เซอร์จำกัดสิทธิ์การเข้าถึง document ชั่วคราว
    }
  }

  try {
    const blob = await downloadFn();
    const ext = (fileName || '').split('.').pop()?.toLowerCase();
    let mimeType = blob.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'webp') mimeType = 'image/webp';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'pdf') mimeType = 'application/pdf';
      else if (ext === 'svg') mimeType = 'image/svg+xml';
      else if (ext === 'txt') mimeType = 'text/plain';
      else mimeType = 'application/octet-stream';
    }

    const viewBlob = new Blob([blob], { type: mimeType });
    const url = URL.createObjectURL(viewBlob);

    if (newTab && !newTab.closed) {
      newTab.location.href = url;
    } else {
      window.open(url, '_blank');
    }

    // ทำลาย blob URL หลังผ่านไป 60 วินาทีเพื่อคืนหน่วยความจำ
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  } catch (err) {
    if (newTab && !newTab.closed) {
      newTab.close();
    }
    onError?.('ไม่สามารถเปิดไฟล์แนบได้ หรือไม่มีสิทธิ์เข้าถึงไฟล์นี้');
  }
};

/**
 * Utility สำหรับการเปิดดูเอกสารแบบฟอร์ม A4 (การลา, ลาออก, คำร้องทั่วไป, หนังสือรับรอง) ในแท็บใหม่ของเบราว์เซอร์
 */
export const openDocumentInNewTab = (
  paperSelector: string,
  documentTitle: string = 'เอกสาร'
) => {
  if (typeof window === 'undefined') return;

  const targetEl = document.querySelector<HTMLElement>(paperSelector);
  if (!targetEl) return;

  const newWin = window.open('', '_blank');
  if (!newWin) return;

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  newWin.document.open();
  newWin.document.write(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="${window.location.origin}/" />
  <title>${documentTitle}</title>
  ${styles}
  <style>
    body {
      margin: 0;
      padding: 24px 16px;
      background-color: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      box-sizing: border-box;
      font-family: var(--font-prompt), 'Sarabun', sans-serif;
    }
    .standalone-paper-wrapper {
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border: 1px solid #cbd5e1;
      margin: 0 auto;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .print-toolbar {
        display: none !important;
      }
      .standalone-paper-wrapper {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar" style="position: fixed; top: 16px; right: 16px; z-index: 9999; display: flex; gap: 8px;">
    <button onclick="window.print()" style="display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #0B2046; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.15);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
      พิมพ์เอกสาร
    </button>
  </div>
  <div class="standalone-paper-wrapper">
    ${targetEl.outerHTML}
  </div>
</body>
</html>`);
  newWin.document.close();
};
