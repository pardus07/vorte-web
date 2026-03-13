import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TypeScript kontrolü lokalde yapılıyor, build süresini kısaltmak için atla
  typescript: {
    ignoreBuildErrors: true,
  },
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
        // OG image: /og-image.jpg → API route (clean URL, WhatsApp/Facebook uyumlu)
        source: "/og-image.jpg",
        destination: "/api/og-image",
      },
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
