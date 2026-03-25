"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Globe,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  LayoutTemplate,
  Menu,
  FileClock,
  Columns,
} from "lucide-react";

interface PageItem {
  id: string;
  title: string;
  slug: string;
  template: string;
  published: boolean;
  showInMenu: boolean;
  showInFooter: boolean;
  order: number;
  updatedAt: string;
}

const templateLabels: Record<string, { label: string; color: string }> = {
  default: { label: "Varsayılan", color: "gray" },
  fullwidth: { label: "Tam Genişlik", color: "blue" },
  sidebar: { label: "Kenar Çubuklu", color: "purple" },
};

const templatePillClasses: Record<string, string> = {
  default: "bg-gray-50 text-gray-600",
  fullwidth: "bg-blue-50 text-blue-600",
  sidebar: "bg-purple-50 text-purple-600",
};

function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b bg-gray-50/80 px-6 py-3.5">
        <div className="grid grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-3 w-16 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b border-gray-50 px-6 py-4">
          <div className="grid grid-cols-8 items-center gap-4">
            <div className="col-span-1 flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
            <div className="mx-auto h-2.5 w-2.5 animate-pulse rounded-full bg-gray-100" />
            <div className="mx-auto h-2 w-2 animate-pulse rounded-full bg-gray-100" />
            <div className="mx-auto h-2 w-2 animate-pulse rounded-full bg-gray-100" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
            <div className="flex justify-end gap-1">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SayfalarPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/pages?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPages(data.pages);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sayfayı silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
    if (res.ok) fetchPages();
  };

  const publishedCount = pages.filter((p) => p.published).length;
  const draftCount = pages.filter((p) => !p.published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Sayfalar
          </h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Sitenizde görünen statik sayfaları yönetin
          </p>
        </div>
        <Link
          href="/admin/sayfalar/yeni"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333]"
        >
          <Plus className="h-4 w-4" />
          Yeni Sayfa
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Toplam Sayfa */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] text-gray-500">Toplam Sayfa</p>
              <p className="text-2xl font-bold tracking-tight text-gray-900">
                {loading ? "—" : pages.length}
              </p>
            </div>
          </div>
        </div>

        {/* Yayında */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Globe className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-[13px] text-gray-500">Yayında</p>
              <p className="text-2xl font-bold tracking-tight text-gray-900">
                {loading ? "—" : publishedCount}
              </p>
            </div>
          </div>
        </div>

        {/* Taslak */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <FileClock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[13px] text-gray-500">Taslak</p>
              <p className="text-2xl font-bold tracking-tight text-gray-900">
                {loading ? "—" : draftCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Sayfa adı veya slug ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-shadow placeholder:text-gray-400 focus:border-[#7AC143]/40 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
        >
          <Columns className="h-4 w-4" />
          <span className="hidden sm:inline">Filtre</span>
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : pages.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center px-6 py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <FileText className="h-7 w-7 text-gray-300" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-900">
              Henüz sayfa oluşturulmadı
            </h3>
            <p className="mt-1 text-[13px] text-gray-500">
              İlk sayfanızı oluşturarak başlayın
            </p>
            <Link
              href="/admin/sayfalar/yeni"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333]"
            >
              <Plus className="h-4 w-4" />
              Yeni Sayfa
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="px-6 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Sayfa
                  </th>
                  <th className="px-6 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Slug
                  </th>
                  <th className="px-6 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Şablon
                  </th>
                  <th className="px-6 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Durum
                  </th>
                  <th className="px-6 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Menü
                  </th>
                  <th className="px-6 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Footer
                  </th>
                  <th className="px-6 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Güncelleme
                  </th>
                  <th className="px-6 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pages.map((page) => {
                  const tpl = templateLabels[page.template] || {
                    label: page.template,
                    color: "gray",
                  };
                  const pillClass =
                    templatePillClasses[page.template] ||
                    "bg-gray-50 text-gray-600";

                  return (
                    <tr
                      key={page.id}
                      className="group transition-colors hover:bg-gray-50/60"
                    >
                      {/* Page Title */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-500">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">
                              {page.title}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              #{page.order}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="px-6 py-4">
                        <code className="rounded-md bg-gray-50 px-2 py-0.5 font-mono text-[12px] text-gray-500">
                          /{page.slug}
                        </code>
                      </td>

                      {/* Template Pill */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${pillClass}`}
                        >
                          <LayoutTemplate className="h-3 w-3" />
                          {tpl.label}
                        </span>
                      </td>

                      {/* Status - dot based */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              page.published
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          />
                          <span
                            className={`text-[12px] font-medium ${
                              page.published
                                ? "text-green-700"
                                : "text-gray-500"
                            }`}
                          >
                            {page.published ? "Yayında" : "Taslak"}
                          </span>
                        </span>
                      </td>

                      {/* Menu Indicator - small colored dot */}
                      <td className="px-6 py-4 text-center">
                        {page.showInMenu ? (
                          <span className="mx-auto inline-block h-2.5 w-2.5 rounded-full bg-blue-500" title="Menüde görünür" />
                        ) : (
                          <span className="mx-auto inline-block h-2.5 w-2.5 rounded-full bg-gray-200" title="Menüde yok" />
                        )}
                      </td>

                      {/* Footer Indicator - small colored dot */}
                      <td className="px-6 py-4 text-center">
                        {page.showInFooter ? (
                          <span className="mx-auto inline-block h-2.5 w-2.5 rounded-full bg-violet-500" title="Footer'da görünür" />
                        ) : (
                          <span className="mx-auto inline-block h-2.5 w-2.5 rounded-full bg-gray-200" title="Footer'da yok" />
                        )}
                      </td>

                      {/* Updated At */}
                      <td className="px-6 py-4">
                        <span className="text-[12px] text-gray-400">
                          {new Date(page.updatedAt).toLocaleDateString(
                            "tr-TR",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Önizle"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                          <Link
                            href={`/admin/sayfalar/${page.id}`}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(page.id)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="border-t border-gray-100 px-6 py-3">
            <p className="text-[12px] text-gray-400">
              Toplam {pages.length} sayfa listeleniyor
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
