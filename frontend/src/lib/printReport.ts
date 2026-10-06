/**
 * พิมพ์/บันทึกเป็น PDF เฉพาะเนื้อหารายงาน (ไม่ติด Sidebar/เมนู) ผ่าน iframe แยก
 * - A4 แนวนอน มีหัวกระดาษ (ชื่อรายงาน, เงื่อนไข, วันที่พิมพ์)
 * - ย่อให้พอดีความกว้างกระดาษ, ตารางที่เลื่อนได้จะแสดงเต็ม
 * - ซ่อนส่วนที่ไม่ต้องพิมพ์ด้วย class "print:hidden" หรือ attribute data-print-hide
 * ภาษาไทยแสดงถูกต้องเพราะใช้ฟอนต์ของเบราว์เซอร์ (เลือก "บันทึกเป็น PDF" ในหน้าต่างพิมพ์)
 */
export function printReport(node: HTMLElement | null, opts: { title: string; subtitle?: string }) {
  if (!node || typeof document === 'undefined') return;

  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-print-hide]').forEach((el) => el.remove());

  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', left: '-10000px', top: '0', width: '1400px', height: '900px', border: '0' });
  iframe.srcdoc = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(opts.title)}</title>${styles}
<style>
  @page { size: A4 landscape; margin: 10mm; }
  html, body { background: #fff !important; margin: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #0f172a; }
  .rp-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; border-bottom: 1.5px solid #0B2046; padding: 0 2px 6px; margin-bottom: 12px; }
  .rp-head h1 { margin: 0; font-size: 17px; font-weight: 700; color: #0B2046; }
  .rp-head .sub { font-size: 11px; color: #475569; margin-top: 2px; }
  .rp-head .meta { font-size: 10px; color: #64748b; white-space: nowrap; }
  #rp-body .overflow-x-auto, #rp-body .overflow-auto, #rp-body .overflow-hidden { overflow: visible !important; }
  #rp-body .sticky { position: static !important; }
  #rp-body table { page-break-inside: auto; }
  #rp-body tr { page-break-inside: avoid; }
  #rp-body .shadow-sm, #rp-body .shadow { box-shadow: none !important; }
</style></head><body>
<div class="rp-head"><div><h1>${esc(opts.title)}</h1>${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ''}</div><div class="meta">พิมพ์เมื่อ ${esc(printedAt)}</div></div>
<div id="rp-body">${clone.outerHTML}</div>
</body></html>`;

  iframe.onload = () => {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    const body = doc?.getElementById('rp-body');
    if (!doc || !win || !body) {
      iframe.remove();
      return;
    }
    // กว้างพื้นที่พิมพ์ A4 แนวนอน (ขอบ 10 มม.) ≈ 1047px — ย่อเนื้อหาที่กว้างกว่าให้พอดี
    const pageW = 1040;
    const w = body.scrollWidth;
    if (w > pageW) (body.style as CSSStyleDeclaration & { zoom: string }).zoom = String(pageW / w);

    win.addEventListener('afterprint', () => setTimeout(() => iframe.remove(), 300), { once: true });
    const ready = doc.fonts ? doc.fonts.ready : Promise.resolve();
    ready.then(() =>
      setTimeout(() => {
        win.focus();
        win.print();
      }, 250)
    );
    setTimeout(() => iframe.remove(), 120000);
  };

  document.body.appendChild(iframe);
}
