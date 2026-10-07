import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ให้เปิดโหมด dev ผ่าน IP ได้ (Radmin VPN 26.x, LAN) — Next 16 บล็อก host ที่ไม่ใช่ localhost โดยค่าเริ่มต้น
  allowedDevOrigins: ['26.*.*.*', '192.168.*.*', '10.*.*.*'],
  async redirects() {
    return [
      {
        source: '/master/banks',
        destination: '/master?tab=banks',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
