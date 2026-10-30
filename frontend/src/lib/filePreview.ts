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
