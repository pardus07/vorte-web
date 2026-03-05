import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.vorte.com.tr",
      },
    ],
  },
  // Runtime uploads: standalone mode public/ dizininden serve etmez,
  // /uploads/* isteklerini API route'a yönlendir
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
