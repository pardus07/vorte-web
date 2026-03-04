"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Tag } from "lucide-react";

interface BlogItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  published: boolean;
  publishedAt: string | null;
  authorName: string;
  tags: string | null;
  createdAt: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/admin/blog?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu blog yazısını silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    if (res.ok) fetchPosts();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="mt-1 text-sm text-gray-500">{total} yazı</p>
        </div>
        <Link
          href="/admin/blog/yeni"
          className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6aad38]"
        >
          <Plus className="h-4 w-4" /> Yeni Yazı
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Yazı ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input w-full pl-10"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="form-input"
        >
          <option value="all">Tümü</option>
          <option value="published">Yayında</option>
          <option value="draft">Taslak</option>
        </select>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">Yazı</th>
              <th className="px-4 py-3 font-medium">Yazar</th>
              <th className="px-4 py-3 font-medium">Etiketler</th>
              <th className="px-4 py-3 font-medium text-center">Durum</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {post.coverImage ? (
                      <div className="h-10 w-14 rounded bg-gray-200 bg-cover bg-center" style={{ backgroundImage: `url(${post.coverImage})` }} />
                    ) : (
                      <div className="flex h-10 w-14 items-center justify-center rounded bg-gray-100">
                        <BookOpen className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{post.title}</p>
                      <p className="text-xs text-gray-400 font-mono">/{post.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{post.authorName}</td>
                <td className="px-4 py-3">
                  {post.tags && (
                    <div className="flex flex-wrap gap-1">
                      {post.tags.split(",").slice(0, 3).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          <Tag className="h-2.5 w-2.5" />{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${post.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {post.published ? "Yayında" : "Taslak"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("tr-TR")
                    : new Date(post.createdAt).toLocaleDateString("tr-TR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {post.published && (
                      <a href={`/blog/${post.slug}`} target="_blank" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Eye className="h-4 w-4" />
                      </a>
                    )}
                    <Link href={`/admin/blog/${post.id}`} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(post.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && posts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">Henüz blog yazısı bulunmuyor</td>
              </tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-500">{total} yazı</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      {loading && <div className="py-10 text-center text-gray-400">Yükleniyor...</div>}
    </div>
  );
}
