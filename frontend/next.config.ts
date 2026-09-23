import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
