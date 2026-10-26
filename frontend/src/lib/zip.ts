/**
 * สร้างไฟล์ .zip ฝั่ง browser แบบไม่บีบอัด (store) — ไม่ต้องลง library เพิ่ม
 * เหมาะกับไฟล์ที่บีบอัดอยู่แล้ว เช่น PDF / JPG / PNG / DOCX
 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (data: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const dosDateTime = (d: Date) => ({
  time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
  date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
});

/** ชื่อไฟล์ซ้ำในชุดเดียวกัน → เติม (2), (3) ก่อนนามสกุล */
const uniqueName = (name: string, used: Set<string>) => {
  let candidate = name || 'file';
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const dot = name.lastIndexOf('.');
    candidate = dot > 0 ? `${name.slice(0, dot)} (${i})${name.slice(dot)}` : `${name} (${i})`;
    i++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

export async function createZip(files: { name: string; data: Blob }[]): Promise<Blob> {
  const enc = new TextEncoder();
  const used = new Set<string>();
  const { time, date } = dosDateTime(new Date());
  const parts: BlobPart[] = [];
  const central: ArrayBuffer[] = [];
  let cdSize = 0;
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(uniqueName(f.name, used));
    const data = new Uint8Array(await f.data.arrayBuffer());
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 filename (ชื่อไทยไม่เพี้ยน)
    local.setUint16(8, 0, true); // store
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    parts.push(local.buffer as ArrayBuffer, nameBytes, data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, time, true);
    cd.setUint16(14, date, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, nameBytes.length, true);
    cd.setUint32(42, offset, true);
    const cdBytes = new Uint8Array(46 + nameBytes.length);
    cdBytes.set(new Uint8Array(cd.buffer), 0);
    cdBytes.set(nameBytes, 46);
    central.push(cdBytes.buffer as ArrayBuffer);
    cdSize += cdBytes.length;

    offset += 30 + nameBytes.length + data.length;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...parts, ...central, end.buffer as ArrayBuffer], { type: 'application/zip' });
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
