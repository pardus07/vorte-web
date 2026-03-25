"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search as SearchIcon,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  Trash2,
  ArrowRight,
  RefreshCw,
  Type,
  FileText,
  Globe,
  Newspaper,
  Link2,
  ShieldAlert,
  Map,
  Bot,
  TestTube,
  FileSearch,
  ArrowUpRight,
} from "lucide-react";

interface ProductSEO {
  id: string;
  name: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  googleCategory: string | null;
}

interface RedirectItem {
  id: string;
  fromPath: string;
  toPath: string;
  permanent: boolean;
  hits: number;
  active: boolean;
}

interface NotFoundItem {
  id: string;
  path: string;
  hits: number;
  lastHitAt: string;
}

interface Stats {
  total: number;
  withTitle: number;
  withDescription: number;
}

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                    */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-gray-100" />
          <div className="h-5 w-16 rounded bg-gray-100" />
        </div>
      </div>
      <div className="mt-4 h-2 w-full rounded-full bg-gray-100" />
    </div>
  );
}

function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b bg-gray-50/80 px-5 py-3">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 w-20 rounded bg-gray-200" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-5 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3 flex-1 rounded bg-gray-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-5">
        <div>
          <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="ml-auto h-16 w-16 animate-pulse rounded-full bg-gray-100" />
      </div>
      {/* Tab skeleton */}
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-32 animate-pulse rounded-xl bg-gray-200/60" />
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonTable />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Circular progress indicator                                        */
/* ------------------------------------------------------------------ */
function CircularScore({ score }: { score: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="5"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold text-gray-900">{score}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
        <Icon className="h-7 w-7 text-gray-300" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-[13px] text-gray-400">{description}</p>
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function SEOPage() {
  const [products, setProducts] = useState<ProductSEO[]>([]);
  const [productStats, setProductStats] = useState<Stats & { withCategory: number }>({ total: 0, withTitle: 0, withDescription: 0, withCategory: 0 });
  const [blogStats, setBlogStats] = useState<Stats>({ total: 0, withTitle: 0, withDescription: 0 });
  const [pageStats, setPageStats] = useState<Stats>({ total: 0, withTitle: 0, withDescription: 0 });
  const [redirects, setRedirects] = useState<RedirectItem[]>([]);
  const [notFoundLogs, setNotFoundLogs] = useState<NotFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "redirects" | "404">("overview");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk SEO form
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [titleTemplate, setTitleTemplate] = useState("{name} | Vorte Tekstil | Toptan ve Perakende");
  const [descTemplate, setDescTemplate] = useState("{name} - Kaliteli iç giyim ürünleri. Toptan ve perakende satış. Ücretsiz kargo fırsatı.");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Redirect form
  const [newRedirect, setNewRedirect] = useState({ fromPath: "", toPath: "" });
  const [redirectSaving, setRedirectSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/seo");
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
      setProductStats(data.productStats);
      setBlogStats(data.blogStats);
      setPageStats(data.pageStats);
      setRedirects(data.redirects);
      setNotFoundLogs(data.notFoundLogs);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBulkUpdate = async () => {
    if (selectedProducts.length === 0) return;
    setBulkSaving(true);
    await fetch("/api/admin/seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk_seo_update",
        productIds: selectedProducts,
        titleTemplate,
        descriptionTemplate: descTemplate,
      }),
    });
    setBulkSaving(false);
    setSelectedProducts([]);
    fetchData();
  };

  const handleAddRedirect = async () => {
    if (!newRedirect.fromPath || !newRedirect.toPath) return;
    setRedirectSaving(true);
    await fetch("/api/admin/seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_redirect", ...newRedirect, permanent: true }),
    });
    setNewRedirect({ fromPath: "", toPath: "" });
    setRedirectSaving(false);
    fetchData();
  };

  const handleDeleteRedirect = async (id: string) => {
    await fetch("/api/admin/seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_redirect", id }),
    });
    fetchData();
  };

  const handleRedirectFrom404 = async (path: string) => {
    const toPath = prompt(`${path} için yönlendirme hedefi:`, "/");
    if (!toPath) return;
    await fetch("/api/admin/seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_redirect_from_404", path, toPath }),
    });
    fetchData();
  };

  const missingTitle = products.filter((p) => !p.seoTitle);
  const missingDesc = products.filter((p) => !p.seoDescription);

  const seoScore = productStats.total > 0
    ? Math.round(((productStats.withTitle + productStats.withDescription) / (productStats.total * 2)) * 100)
    : 0;

  const tabs = [
    { key: "overview" as const, label: "Genel Bakis" },
    { key: "products" as const, label: `Urunler (${products.length})` },
    { key: "redirects" as const, label: `Yonlendirmeler (${redirects.length})` },
    { key: "404" as const, label: `404 Log (${notFoundLogs.length})` },
  ];

  // Filtered lists
  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const filteredRedirects = searchQuery
    ? redirects.filter(
        (r) =>
          r.fromPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.toPath.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : redirects;

  const filtered404 = searchQuery
    ? notFoundLogs.filter((l) =>
        l.path.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notFoundLogs;

  /* ---------- Loading state ---------- */
  if (loading) return <LoadingSkeleton />;

  /* ---------- Stat card configs ---------- */
  const statCards = [
    {
      label: "Urun SEO Baslik",
      value: productStats.withTitle,
      total: productStats.total,
      icon: Type,
      color: "blue" as const,
      pct: productStats.total ? Math.round((productStats.withTitle / productStats.total) * 100) : 0,
    },
    {
      label: "Urun SEO Aciklama",
      value: productStats.withDescription,
      total: productStats.total,
      icon: FileText,
      color: "green" as const,
      pct: productStats.total ? Math.round((productStats.withDescription / productStats.total) * 100) : 0,
    },
    {
      label: "Blog SEO",
      value: blogStats.withTitle,
      total: blogStats.total,
      icon: Globe,
      color: "purple" as const,
      pct: blogStats.total ? Math.round((blogStats.withTitle / blogStats.total) * 100) : 0,
    },
    {
      label: "Sayfa SEO",
      value: pageStats.withTitle,
      total: pageStats.total,
      icon: Newspaper,
      color: "pink" as const,
      pct: pageStats.total ? Math.round((pageStats.withTitle / pageStats.total) * 100) : 0,
    },
  ];

  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", bar: "bg-blue-500" },
    green: { bg: "bg-green-50", text: "text-green-600", bar: "bg-green-500" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", bar: "bg-purple-500" },
    pink: { bg: "bg-pink-50", text: "text-pink-600", bar: "bg-pink-500" },
  };

  const quickLinks = [
    { href: "/sitemap.xml", label: "Sitemap Onizleme", desc: "XML sitemap dosyasini goruntuler", icon: Map },
    { href: "/robots.txt", label: "robots.txt", desc: "Arama motoru erisim kurallarini goruntule", icon: Bot },
    { href: "https://search.google.com/test/rich-results", label: "Rich Results Test", desc: "Google zengin sonuc testini calistir", icon: TestTube },
    { href: "https://pagespeed.web.dev/", label: "PageSpeed Insights", desc: "Sayfa hizi ve performans analizi", icon: FileSearch },
  ];

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <div className="flex items-center gap-5">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            SEO Araclari
          </h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Urunler, blog yazilari ve sayfalarin SEO durumunu yonetin
          </p>
        </div>
        <CircularScore score={seoScore} />
      </div>

      {/* ============================================================ */}
      {/*  TAB NAVIGATION                                               */}
      {/* ============================================================ */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search - shown for products, redirects, 404 tabs */}
        {activeTab !== "overview" && (
          <div className="relative ml-auto">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm placeholder:text-gray-400 focus:border-[#7AC143]/40 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
            />
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  OVERVIEW TAB                                                 */}
      {/* ============================================================ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {statCards.map((card) => {
              const cm = colorMap[card.color];
              const CardIcon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${cm.bg}`}
                    >
                      <CardIcon className={`h-5 w-5 ${cm.text}`} />
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-gray-500">
                        {card.label}
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {card.value}
                        <span className="text-sm font-normal text-gray-400">
                          /{card.total}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${cm.bar} transition-all duration-500`}
                        style={{ width: `${card.pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-gray-400">
                      %{card.pct}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SEO Warnings */}
          {(missingTitle.length > 0 || missingDesc.length > 0 || notFoundLogs.length > 0) && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    SEO Uyarilari
                  </p>
                  <p className="text-[12px] text-amber-600">
                    Asagidaki sorunlari gidererek SEO skorunuzu artirin
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {missingTitle.length > 0 && (
                  <li className="flex items-center gap-2 text-sm text-amber-800">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                    <span>
                      <strong>{missingTitle.length}</strong> urunun SEO basligi eksik
                    </span>
                  </li>
                )}
                {missingDesc.length > 0 && (
                  <li className="flex items-center gap-2 text-sm text-amber-800">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                    <span>
                      <strong>{missingDesc.length}</strong> urunun SEO aciklamasi eksik
                    </span>
                  </li>
                )}
                {notFoundLogs.length > 0 && (
                  <li className="flex items-center gap-2 text-sm text-amber-800">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                    <span>
                      <strong>{notFoundLogs.length}</strong> adet 404 sayfasi kaydi var
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Quick links */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Hizli Erisim
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {quickLinks.map((link) => {
                const LinkIcon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-gray-100">
                        <LinkIcon className="h-4 w-4 text-gray-500" />
                      </div>
                      <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-gray-300 transition-colors group-hover:text-gray-500" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-900">
                      {link.label}
                    </p>
                    <p className="mt-0.5 text-[12px] text-gray-400">
                      {link.desc}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  PRODUCTS TAB                                                 */}
      {/* ============================================================ */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {/* Bulk update card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <RefreshCw className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Toplu SEO Guncelleme
                </h3>
                <p className="text-[12px] text-gray-500">
                  Secili urunlere sablonlu baslik ve aciklama atayin
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-gray-500">
                  Baslik Kalibi
                </label>
                <input
                  type="text"
                  value={titleTemplate}
                  onChange={(e) => setTitleTemplate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-[#7AC143]/40 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-gray-500">
                  Aciklama Kalibi
                </label>
                <input
                  type="text"
                  value={descTemplate}
                  onChange={(e) => setDescTemplate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-[#7AC143]/40 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                />
              </div>
            </div>

            <p className="mt-2 text-[11px] text-gray-400">
              Kullanilabilir degiskenler:{" "}
              <code className="rounded bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] text-gray-500">
                {"{name}"}
              </code>
            </p>

            <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() =>
                  setSelectedProducts(
                    selectedProducts.length === missingTitle.length
                      ? []
                      : missingTitle.map((p) => p.id)
                  )
                }
                className="text-[13px] font-medium text-[#7AC143] hover:underline"
              >
                {selectedProducts.length === missingTitle.length
                  ? "Secimi kaldir"
                  : `Eksik olanlari sec (${missingTitle.length})`}
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={selectedProducts.length === 0 || bulkSaving}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${bulkSaving ? "animate-spin" : ""}`}
                />
                {bulkSaving
                  ? "Guncelleniyor..."
                  : `${selectedProducts.length} Urunu Guncelle`}
              </button>
            </div>
          </div>

          {/* Product table */}
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Urun bulunamadi"
              description={
                searchQuery
                  ? "Arama kriterlerinize uygun urun yok"
                  : "Henuz urun eklenmemis"
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="w-12 px-5 py-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedProducts.length === filteredProducts.length &&
                          filteredProducts.length > 0
                        }
                        onChange={(e) =>
                          setSelectedProducts(
                            e.target.checked
                              ? filteredProducts.map((p) => p.id)
                              : []
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300 text-[#7AC143] focus:ring-[#7AC143]/20"
                      />
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Urun
                    </th>
                    <th className="px-5 py-3 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Baslik
                    </th>
                    <th className="px-5 py-3 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Aciklama
                    </th>
                    <th className="px-5 py-3 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Kategori
                    </th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Test
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(p.id)}
                          onChange={(e) =>
                            setSelectedProducts(
                              e.target.checked
                                ? [...selectedProducts, p.id]
                                : selectedProducts.filter(
                                    (id) => id !== p.id
                                  )
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-[#7AC143] focus:ring-[#7AC143]/20"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-gray-400">
                          /urun/{p.slug}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {p.seoTitle ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-50">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50">
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {p.seoDescription ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-50">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50">
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {p.googleCategory ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-50">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                          </span>
                        ) : (
                          <span className="text-[12px] text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <a
                          href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(`https://www.vorte.com.tr/urun/${p.slug}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-medium text-[#7AC143] transition-colors hover:bg-[#7AC143]/10"
                        >
                          Test
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  REDIRECTS TAB                                                */}
      {/* ============================================================ */}
      {activeTab === "redirects" && (
        <div className="space-y-6">
          {/* Add redirect form */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Link2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Yeni Yonlendirme Ekle
                </h3>
                <p className="text-[12px] text-gray-500">
                  Eski URL&apos;leri yeni adreslere kalici yonlendirin
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-[12px] font-medium text-gray-500">
                  Eski URL
                </label>
                <input
                  type="text"
                  value={newRedirect.fromPath}
                  onChange={(e) =>
                    setNewRedirect({ ...newRedirect, fromPath: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-[#7AC143]/40 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                  placeholder="/eski-sayfa"
                />
              </div>

              <div className="flex h-[42px] items-center justify-center">
                <div className="rounded-full bg-gray-100 p-2">
                  <ArrowRight className="h-4 w-4 text-gray-500" />
                </div>
              </div>

              <div className="flex-1">
                <label className="mb-1.5 block text-[12px] font-medium text-gray-500">
                  Yeni URL
                </label>
                <input
                  type="text"
                  value={newRedirect.toPath}
                  onChange={(e) =>
                    setNewRedirect({ ...newRedirect, toPath: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-[#7AC143]/40 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                  placeholder="/yeni-sayfa"
                />
              </div>

              <button
                onClick={handleAddRedirect}
                disabled={redirectSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {redirectSaving ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </div>

          {/* Redirects table */}
          {filteredRedirects.length === 0 ? (
            <EmptyState
              icon={Link2}
              title={searchQuery ? "Sonuc bulunamadi" : "Henuz yonlendirme yok"}
              description={
                searchQuery
                  ? "Arama kriterlerinize uygun yonlendirme bulunamadi"
                  : "Yukaridaki formu kullanarak ilk yonlendirmenizi ekleyin"
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Kaynak
                    </th>
                    <th className="w-10" />
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Hedef
                    </th>
                    <th className="px-5 py-3 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Tur
                    </th>
                    <th className="px-5 py-3 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Hit
                    </th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Islem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRedirects.map((r) => (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[12px] text-gray-700">
                          {r.fromPath}
                        </span>
                      </td>
                      <td className="text-center">
                        <ArrowRight className="mx-auto h-3.5 w-3.5 text-gray-300" />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[12px] text-gray-500">
                          {r.toPath}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            r.permanent
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {r.permanent ? "301" : "302"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-[13px] text-gray-500">
                        {r.hits}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteRedirect(r.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  404 LOG TAB                                                  */}
      {/* ============================================================ */}
      {activeTab === "404" && (
        <div className="space-y-6">
          {filtered404.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title={searchQuery ? "Sonuc bulunamadi" : "404 kaydi yok"}
              description={
                searchQuery
                  ? "Arama kriterlerinize uygun 404 kaydi bulunamadi"
                  : "Harika! Kirik link bulunamadi"
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      URL
                    </th>
                    <th className="px-5 py-3 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Hit
                    </th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Son Erisim
                    </th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Islem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered404.map((log) => (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono rounded-lg bg-gray-50 px-2 py-0.5 text-[12px] text-gray-700">
                          {log.path}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            log.hits > 10
                              ? "bg-red-50 text-red-600"
                              : log.hits >= 5
                                ? "bg-amber-50 text-amber-600"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {log.hits}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-400">
                        {new Date(log.lastHitAt).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleRedirectFrom404(log.path)}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium text-[#7AC143] transition-colors hover:bg-[#7AC143]/10"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                          Yonlendir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
