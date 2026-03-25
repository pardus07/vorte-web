"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle,
  Clock,
  Tag,
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  User,
} from "lucide-react";

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

type StatusFilter = "all" | "published" | "draft";

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu blog yazisini silmek istediginize emin misiniz?")) return;
    const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    if (res.ok) fetchPosts();
  };

  const totalPages = Math.ceil(total / 20);

  // Derived stats
  const stats = useMemo(() => {
    const published = posts.filter((p) => p.published).length;
    const draft = posts.filter((p) => !p.published).length;
    const allTags = new Set<string>();
    posts.forEach((p) => {
      if (p.tags) {
        p.tags.split(",").forEach((t) => allTags.add(t.trim()));
      }
    });
    return { total, published, draft, tags: allTags.size };
  }, [posts, total]);

  // Pagination helpers
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Tumu" },
    { key: "published", label: "Yayinda" },
    { key: "draft", label: "Taslak" },
  ];

  // Skeleton rows for loading state
  const SkeletonRow = () => (
    <tr className="border-b border-gray-50">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-20 animate-pulse rounded-lg bg-gray-100" />
          <div className="space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-1">
          <div className="h-5 w-14 animate-pulse rounded-full bg-gray-100" />
          <div className="h-5 w-12 animate-pulse rounded-full bg-gray-100" />
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="mx-auto h-5 w-16 animate-pulse rounded-full bg-gray-100" />
      </td>
      <td className="px-5 py-4">
        <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
      </td>
      <td className="px-5 py-4">
        <div className="flex justify-end gap-1">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Blog Yonetimi</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            {total} yazi kayitli, iceriklerinizi buradan yonetin
          </p>
        </div>
        <Link
          href="/admin/blog/yeni"
          className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#333] hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Yeni Yazi
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Toplam Yazi
              </p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Yayinda
              </p>
              <p className="text-2xl font-bold text-green-600">{stats.published}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Taslak
              </p>
              <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Etiketler
              </p>
              <p className="text-2xl font-bold text-purple-600">{stats.tags}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Status Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Yazi basligi veya slug ara..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
          />
        </div>
        <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setStatus(f.key);
                setPage(1);
              }}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all ${
                status === f.key
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80 text-left">
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Yazi
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Yazar
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Etiketler
                </th>
                <th className="px-5 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Durum
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Tarih
                </th>
                <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Islem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                        <BookOpen className="h-7 w-7 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">
                          Henuz blog yazisi bulunmuyor
                        </p>
                        <p className="mt-0.5 text-[12px] text-gray-300">
                          Yeni bir yazi olusturmak icin yukaridaki butonu kullanin
                        </p>
                      </div>
                      <Link
                        href="/admin/blog/yeni"
                        className="mt-2 flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-[#333] hover:shadow-md active:scale-[0.98]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Yazi Olustur
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr
                    key={post.id}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    {/* Post Title + Cover */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {post.coverImage ? (
                          <div
                            className="h-12 w-20 shrink-0 rounded-lg bg-gray-200 bg-cover bg-center"
                            style={{
                              backgroundImage: `url(${post.coverImage})`,
                              aspectRatio: "16/9",
                            }}
                          />
                        ) : (
                          <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                            <BookOpen className="h-5 w-5 text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-gray-900">
                            {post.title}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400">
                            /blog/{post.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Author */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-[12px] text-gray-500">{post.authorName}</span>
                      </div>
                    </td>

                    {/* Tags */}
                    <td className="px-5 py-3.5">
                      {post.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {post.tags
                            .split(",")
                            .slice(0, 3)
                            .map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag.trim()}
                              </span>
                            ))}
                          {post.tags.split(",").length > 3 && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                              +{post.tags.split(",").length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[12px] text-gray-300">--</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          post.published
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            post.published ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                        {post.published ? "Yayinda" : "Taslak"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-[12px] text-gray-500">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : new Date(post.createdAt).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {post.published && (
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            title="Onizle"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
                        <Link
                          href={`/admin/blog/${post.id}`}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          title="Duzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5">
            <p className="text-[13px] text-gray-500">
              Toplam <span className="font-semibold text-gray-700">{total}</span> yazi,{" "}
              <span className="font-semibold text-gray-700">{page}</span>/{totalPages} sayfa
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageNumbers().map((p, idx) =>
                p === "..." ? (
                  <span
                    key={`dots-${idx}`}
                    className="flex h-8 w-8 items-center justify-center text-[12px] text-gray-400"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${
                      page === p
                        ? "bg-[#1A1A1A] text-white shadow-sm"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Spinner (overlay for refetch) */}
      {loading && posts.length > 0 && (
        <div className="flex items-center justify-center gap-3 py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#7AC143]" />
          <span className="text-sm text-gray-400">Guncelleniyor...</span>
        </div>
      )}
    </div>
  );
}
