import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/farmer/:path*",
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/farmer",
        destination: "/dashboard",
        permanent: true,
      }
    ];
  }
};

export default nextConfig;
// 
