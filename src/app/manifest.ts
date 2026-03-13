import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vorte Tekstil — Erkek Boxer & Kadın Külot",
    short_name: "Vorte",
    description:
      "Yapay zeka destekli üretim, %95 taranmış penye pamuk kalitesiyle erkek boxer ve kadın külot. Toptan ve perakende.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#333333",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
