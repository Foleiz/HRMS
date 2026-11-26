import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // สำหรับ deploy: สร้าง .next/standalone (server.js + dependencies ที่ใช้จริง) รันบนเครื่อง RAM น้อยได้ ไม่ต้องติดตั้ง node_modules ทั้งชุด
  output: 'standalone',
  // ให้เปิดโหมด dev ผ่าน IP ได้ (Radmin VPN 26.x, LAN) — Next 16 บล็อก host ที่ไม่ใช่ localhost โดยค่าเริ่มต้น
  allowedDevOrigins: ['26.*.*.*', '192.168.*.*', '10.*.*.*'],
  async redirects() {
    return [
      {
        source: '/master/banks',
        destination: '/master?tab=banks',
        permanent: true,
      },
      {
        source: '/ess/leave',
        destination: '/documents/leave',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
