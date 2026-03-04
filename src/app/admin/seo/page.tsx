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

export default function SEOPage() {
  const [products, setProducts] = useState<ProductSEO[]>([]);
  const [productStats, setProductStats] = useState<Stats & { withCategory: number }>({ total: 0, withTitle: 0, withDescription: 0, withCategory: 0 });
  const [blogStats, setBlogStats] = useState<Stats>({ total: 0, withTitle: 0, withDescription: 0 });
  const [pageStats, setPageStats] = useState<Stats>({ total: 0, withTitle: 0, withDescription: 0 });
  const [redirects, setRedirects] = useState<RedirectItem[]>([]);
  const [notFoundLogs, setNotFoundLogs] = useState<NotFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "redirects" | "404">("overview");

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
    { key: "overview", label: "Genel Bakış" },
    { key: "products", label: `Ürünler (${products.length})` },
    { key: "redirects", label: `Yönlendirmeler (${redirects.length})` },
    { key: "404", label: `404 Log (${notFoundLogs.length})` },
  ];

  if (loading) return <div className="py-20 text-center text-gray-400">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SEO Araçları</h1>
        <p className="mt-1 text-sm text-gray-500">SEO skoru: %{seoScore}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === tab.key ? "border-[#7AC143] text-[#7AC143]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs text-gray-500">Ürün SEO Başlık</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{productStats.withTitle}/{productStats.total}</p>
              <div className="mt-2 h-1.5 rounded bg-gray-200"><div className="h-full rounded bg-[#7AC143]" style={{ width: `${productStats.total ? (productStats.withTitle / productStats.total) * 100 : 0}%` }} /></div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs text-gray-500">Ürün SEO Açıklama</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{productStats.withDescription}/{productStats.total}</p>
              <div className="mt-2 h-1.5 rounded bg-gray-200"><div className="h-full rounded bg-[#7AC143]" style={{ width: `${productStats.total ? (productStats.withDescription / productStats.total) * 100 : 0}%` }} /></div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs text-gray-500">Blog SEO</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{blogStats.withTitle}/{blogStats.total}</p>
              <div className="mt-2 h-1.5 rounded bg-gray-200"><div className="h-full rounded bg-blue-500" style={{ width: `${blogStats.total ? (blogStats.withTitle / blogStats.total) * 100 : 0}%` }} /></div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs text-gray-500">Sayfa SEO</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{pageStats.withTitle}/{pageStats.total}</p>
              <div className="mt-2 h-1.5 rounded bg-gray-200"><div className="h-full rounded bg-purple-500" style={{ width: `${pageStats.total ? (pageStats.withTitle / pageStats.total) * 100 : 0}%` }} /></div>
            </div>
          </div>

          {/* Warnings */}
          {(missingTitle.length > 0 || missingDesc.length > 0) && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-700">
                <AlertTriangle className="h-4 w-4" /> SEO Uyarıları
              </div>
              <ul className="mt-2 space-y-1 text-sm text-yellow-600">
                {missingTitle.length > 0 && <li>• {missingTitle.length} ürünün SEO başlığı eksik</li>}
                {missingDesc.length > 0 && <li>• {missingDesc.length} ürünün SEO açıklaması eksik</li>}
                {notFoundLogs.length > 0 && <li>• {notFoundLogs.length} adet 404 sayfası kaydı var</li>}
              </ul>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <a href="/sitemap.xml" target="_blank" className="flex items-center gap-2 rounded-lg border bg-white p-4 text-sm text-gray-600 hover:bg-gray-50">
              <ExternalLink className="h-4 w-4 text-gray-400" /> Sitemap Önizleme
            </a>
            <a href="/robots.txt" target="_blank" className="flex items-center gap-2 rounded-lg border bg-white p-4 text-sm text-gray-600 hover:bg-gray-50">
              <ExternalLink className="h-4 w-4 text-gray-400" /> robots.txt
            </a>
            <a href="https://search.google.com/test/rich-results" target="_blank" className="flex items-center gap-2 rounded-lg border bg-white p-4 text-sm text-gray-600 hover:bg-gray-50">
              <ExternalLink className="h-4 w-4 text-gray-400" /> Rich Results Test
            </a>
          </div>
        </div>
      )}

      {/* Products */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {/* Bulk update */}
          <div className="rounded-lg border bg-white p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-500">Toplu SEO Güncelleme</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Başlık Kalıbı</label>
                <input type="text" value={titleTemplate} onChange={(e) => setTitleTemplate(e.target.value)} className="form-input w-full text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Açıklama Kalıbı</label>
                <input type="text" value={descTemplate} onChange={(e) => setDescTemplate(e.target.value)} className="form-input w-full text-sm" />
              </div>
            </div>
            <p className="text-xs text-gray-400">Kullanılabilir değişkenler: {"{name}"}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedProducts(selectedProducts.length === missingTitle.length ? [] : missingTitle.map((p) => p.id))}
                className="text-xs text-[#7AC143] hover:underline"
              >
                {selectedProducts.length === missingTitle.length ? "Seçimi kaldır" : `Eksik olanları seç (${missingTitle.length})`}
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={selectedProducts.length === 0 || bulkSaving}
                className="rounded-lg bg-[#7AC143] px-4 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50"
              >
                <RefreshCw className="mr-1 inline h-4 w-4" />
                {bulkSaving ? "Güncelleniyor..." : `${selectedProducts.length} Ürünü Güncelle`}
              </button>
            </div>
          </div>

          {/* Product list */}
          <div className="rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium w-8">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={(e) => setSelectedProducts(e.target.checked ? products.map((p) => p.id) : [])}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Ürün</th>
                  <th className="px-4 py-3 font-medium text-center">Başlık</th>
                  <th className="px-4 py-3 font-medium text-center">Açıklama</th>
                  <th className="px-4 py-3 font-medium text-center">Kategori</th>
                  <th className="px-4 py-3 font-medium text-right">Test</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(p.id)}
                        onChange={(e) => setSelectedProducts(e.target.checked
                          ? [...selectedProducts, p.id]
                          : selectedProducts.filter((id) => id !== p.id)
                        )}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">/urun/{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.seoTitle ? <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" /> : <AlertTriangle className="mx-auto h-4 w-4 text-yellow-500" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.seoDescription ? <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" /> : <AlertTriangle className="mx-auto h-4 w-4 text-yellow-500" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.googleCategory ? <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" /> : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(`https://www.vorte.com.tr/urun/${p.slug}`)}`}
                        target="_blank"
                        className="text-xs text-[#7AC143] hover:underline"
                      >
                        Test
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Redirects */}
      {activeTab === "redirects" && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-medium text-gray-500">Yeni Yönlendirme Ekle</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500">Eski URL</label>
                <input
                  type="text"
                  value={newRedirect.fromPath}
                  onChange={(e) => setNewRedirect({ ...newRedirect, fromPath: e.target.value })}
                  className="form-input w-full text-sm"
                  placeholder="/eski-sayfa"
                />
              </div>
              <ArrowRight className="mb-2 h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500">Yeni URL</label>
                <input
                  type="text"
                  value={newRedirect.toPath}
                  onChange={(e) => setNewRedirect({ ...newRedirect, toPath: e.target.value })}
                  className="form-input w-full text-sm"
                  placeholder="/yeni-sayfa"
                />
              </div>
              <button
                onClick={handleAddRedirect}
                disabled={redirectSaving}
                className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2 text-sm font-medium text-white hover:bg-[#6aad38] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Ekle
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Kaynak</th>
                  <th className="px-4 py-3 font-medium">Hedef</th>
                  <th className="px-4 py-3 font-medium text-center">Tür</th>
                  <th className="px-4 py-3 font-medium text-center">Hit</th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {redirects.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.fromPath}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.toPath}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${r.permanent ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.permanent ? "301" : "302"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">{r.hits}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteRedirect(r.id)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {redirects.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">Henüz yönlendirme yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 404 Logs */}
      {activeTab === "404" && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium text-center">Hit</th>
                  <th className="px-4 py-3 font-medium">Son Erişim</th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {notFoundLogs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.path}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${log.hits > 10 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                        {log.hits}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(log.lastHitAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRedirectFrom404(log.path)}
                        className="rounded px-2 py-1 text-xs text-[#7AC143] hover:bg-[#7AC143]/10"
                      >
                        → Yönlendir
                      </button>
                    </td>
                  </tr>
                ))}
                {notFoundLogs.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">404 kaydı yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
