"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Search, Edit, Trash2, Eye, Globe, Menu, LayoutTemplate } from "lucide-react";

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

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sayfayı silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
    if (res.ok) fetchPages();
  };

  const templateLabels: Record<string, string> = {
    default: "Varsayılan",
    fullwidth: "Tam Genişlik",
    sidebar: "Kenar Çubuklu",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sayfalar</h1>
          <p className="mt-1 text-sm text-gray-500">{pages.length} sayfa</p>
        </div>
        <Link
          href="/admin/sayfalar/yeni"
          className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6aad38]"
        >
          <Plus className="h-4 w-4" /> Yeni Sayfa
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Sayfa ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input w-full pl-10"
        />
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">Sayfa</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Şablon</th>
              <th className="px-4 py-3 font-medium text-center">Durum</th>
              <th className="px-4 py-3 font-medium text-center">Menü</th>
              <th className="px-4 py-3 font-medium text-center">Footer</th>
              <th className="px-4 py-3 font-medium">Güncelleme</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{page.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">/{page.slug}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <LayoutTemplate className="h-3 w-3" />
                    {templateLabels[page.template] || page.template}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${page.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {page.published ? "Yayında" : "Taslak"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {page.showInMenu && <Menu className="mx-auto h-4 w-4 text-blue-500" />}
                </td>
                <td className="px-4 py-3 text-center">
                  {page.showInFooter && <Globe className="mx-auto h-4 w-4 text-blue-500" />}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(page.updatedAt).toLocaleDateString("tr-TR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <a href={`/${page.slug}`} target="_blank" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
                    </a>
                    <Link href={`/admin/sayfalar/${page.id}`} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(page.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && pages.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  Henüz sayfa bulunmuyor
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && <div className="py-10 text-center text-gray-400">Yükleniyor...</div>}
    </div>
  );
}
