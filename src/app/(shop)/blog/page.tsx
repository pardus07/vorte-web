import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { BookOpen, Calendar, Tag, User } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description: "Vorte Tekstil blog yazıları. İç giyim trendleri, bakım önerileri ve daha fazlası.",
  alternates: { canonical: "/blog" },
};

export default async function BlogListPage() {
  const posts = await db.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      authorName: true,
      tags: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
        <p className="mt-2 text-gray-500">İç giyim trendleri, bakım önerileri ve haberler</p>
      </div>

      {posts.length === 0 ? (
        <div className="py-20 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-400">Henüz blog yazısı bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-md"
            >
              {post.coverImage ? (
                <div
                  className="h-48 bg-cover bg-center transition-transform group-hover:scale-105"
                  style={{ backgroundImage: `url(${post.coverImage})` }}
                />
              ) : (
                <div className="flex h-48 items-center justify-center bg-gray-100">
                  <BookOpen className="h-10 w-10 text-gray-300" />
                </div>
              )}
              <div className="p-5">
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#7AC143] transition-colors line-clamp-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-3">{post.excerpt}</p>
                )}
                <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {post.authorName}
                  </span>
                  {post.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.publishedAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                {post.tags && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {post.tags.split(",").slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                        <Tag className="h-2.5 w-2.5" /> {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
